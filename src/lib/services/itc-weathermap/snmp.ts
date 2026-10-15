/**
 * ITC 网络天气图 SNMP 客户端
 * 基于 Go 版本移植，支持 SNMP v2c GET/GETNEXT/GETBULK
 *
 * 性能设计：
 * - 每个客户端（每台设备）复用一个长驻 UDP socket，按 request-id 多路复用在途请求；
 * - 超时后用同一 request-id 真正重发（默认重试 1 次），而不是直接失败；
 * - walk 优先使用 GETBULK（默认每次 25 条），设备不支持时自动降级为 GETNEXT。
 */

import * as dgram from 'dgram';

// SNMP PDU 类型
const PDU_GET = 0xa0;
const PDU_GETNEXT = 0xa1;
const PDU_RESPONSE = 0xa2;
const PDU_GETBULK = 0xa5;

// BER 标签
const TAG_INTEGER = 0x02;
const TAG_OCTET_STRING = 0x04;
const TAG_NULL = 0x05;
const TAG_OID = 0x06;
const TAG_COUNTER32 = 0x41;
const TAG_GAUGE32 = 0x42;
const TAG_TIMETICKS = 0x43;
const TAG_COUNTER64 = 0x46;
const TAG_NO_SUCH_OBJ = 0x80;
const TAG_NO_SUCH_INST = 0x81;
const TAG_END_OF_MIB = 0x82;

// SNMP OID 常量
export const OID_IF_NAME = '1.3.6.1.2.1.31.1.1.1.1'; // ifName
export const OID_HC_IN = '1.3.6.1.2.1.31.1.1.1.6'; // ifHCInOctets
export const OID_HC_OUT = '1.3.6.1.2.1.31.1.1.1.10'; // ifHCOutOctets
export const OID_HIGH_SPEED = '1.3.6.1.2.1.31.1.1.1.15'; // ifHighSpeed
export const OID_OPER_STATUS = '1.3.6.1.2.1.2.2.1.8'; // ifOperStatus
export const OID_IF_ALIAS = '1.3.6.1.2.1.31.1.1.1.18'; // ifAlias
export const OID_SYS_DESCR = '1.3.6.1.2.1.1.1.0'; // sysDescr

export interface VarBind {
  oid: string;
  tag: number;
  num: number;
  /** Counter64 的精确值（num 超过 2^53 时会丢精度，计数器差分必须用 big） */
  big?: bigint;
  str: string;
  isStr: boolean;
  missing: boolean;
}

export interface SNMPClientOptions {
  host: string;
  community: string;
  timeout?: number;
  retries?: number;
  port?: number;
}

/** 单次请求的覆盖参数（冷启动快速探测等场景使用） */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  maxRepetitions?: number;
  /** walk 时 GETBULK 失败是否禁止降级 GETNEXT（快速探测不可达主机时，降级只会多等一轮超时） */
  noFallback?: boolean;
}

interface PendingRequest {
  id: number;
  buf: Buffer;
  resolve: (vbs: VarBind[]) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout | null;
  attempts: number; // 已发送次数
  maxAttempts: number;
  timeoutMs: number;
}

export class SNMPClient {
  private host: string;
  private community: string;
  private timeout: number;
  private retries: number;
  private port: number;
  private requestId: number;

  // 长驻 socket 与在途请求表（按 request-id 匹配响应）
  private socket: dgram.Socket | null = null;
  private socketReady: Promise<void> | null = null;
  private closing = false;
  private pending = new Map<number, PendingRequest>();

  constructor(options: SNMPClientOptions) {
    this.host = options.host;
    this.community = options.community;
    this.timeout = options.timeout || 1500;
    this.retries = options.retries ?? 1;
    this.port = options.port || 161;
    this.requestId = 0;
  }

  // ========== 长驻 socket 管理 ==========

  /** 懒创建 socket；显式监听 error，未 bind 也可直接 send（隐式分配端口） */
  private ensureSocket(): Promise<void> {
    if (this.socketReady) return this.socketReady;
    this.closing = false;
    this.socketReady = new Promise<void>((resolve) => {
      const sock = dgram.createSocket('udp4');
      sock.on('message', (msg) => this.handleMessage(msg));
      sock.on('error', (err) => this.handleSocketError(sock, err));
      this.socket = sock;
      resolve();
    });
    return this.socketReady;
  }

  /** socket 级错误（如 ICMP 不可达）：废弃旧 socket，让在途请求在新 socket 上重发 */
  private handleSocketError(sock: dgram.Socket, err: Error): void {
    console.warn(`[SNMP] socket 错误 ${this.host}:`, err.message);
    try {
      sock.removeAllListeners();
      sock.close();
    } catch {
      /* ignore */
    }
    if (this.socket !== sock) return;
    this.socket = null;
    this.socketReady = null;
    for (const req of this.pending.values()) {
      this.dispatch(req, err);
    }
  }

  /** 收到 UDP 报文：提取 request-id 并分发给在途请求 */
  private handleMessage(msg: Buffer): void {
    let rid = 0;
    try {
      rid = this.extractRequestId(msg);
    } catch {
      return; // 不是合法 SNMP 响应，忽略
    }
    const req = this.pending.get(rid);
    if (!req) return; // 已超时或重复响应
    try {
      const vbs = this.parseResponse(msg);
      if (req.timer) clearTimeout(req.timer);
      this.pending.delete(rid);
      req.resolve(vbs);
    } catch (err) {
      this.dispatch(req, err as Error);
    }
  }

  /** 关闭并销毁客户端（强制重连时使用），拒绝全部在途请求 */
  close(): void {
    this.closing = true;
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.socketReady = null;
    for (const req of this.pending.values()) {
      if (req.timer) clearTimeout(req.timer);
      req.reject(new Error('SNMP client closed'));
    }
    this.pending.clear();
  }

  private nextRequestId(): number {
    this.requestId = (this.requestId % 0x7fffffff) + 1;
    return this.requestId;
  }

  /**
   * 发送（或重发）一个在途请求；超过最大尝试次数则 reject
   */
  private dispatch(req: PendingRequest, cause: Error): void {
    if (req.timer) {
      clearTimeout(req.timer);
      req.timer = null;
    }
    if (this.closing || req.attempts >= req.maxAttempts) {
      this.pending.delete(req.id);
      req.reject(cause);
      return;
    }

    void this.ensureSocket().then(() => {
      if (!this.pending.has(req.id)) return; // 期间已被响应或关闭
      req.attempts += 1;
      req.timer = setTimeout(() => {
        this.dispatch(req, new Error(`SNMP 请求超时 ${this.host} (${req.attempts}/${req.maxAttempts})`));
      }, req.timeoutMs);

      this.socket?.send(req.buf, 0, req.buf.length, this.port, this.host, (err) => {
        if (err) this.dispatch(req, err);
      });
    });
  }

  // ========== BER 编码工具 ==========

  /** 编码 BER 长度（支持短格式 <128 和长格式 >=128） */
  private encLen(n: number): Buffer {
    if (n < 0x80) return Buffer.from([n]);
    const bytes: number[] = [];
    let x = n;
    while (x > 0) { bytes.unshift(x & 0xff); x >>= 8; }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  }

  /** TLV 封装：tag + length + payload */
  private tlv(tag: number, payload: Buffer): Buffer {
    return Buffer.concat([Buffer.from([tag]), this.encLen(payload.length), payload]);
  }

  /** BER INTEGER 编码（含 tag） */
  private encInt(v: number): Buffer {
    const bytes: number[] = [];
    let x = v >>> 0; // treat as uint32
    while (x > 0) { bytes.unshift(x & 0xff); x >>= 8; }
    if (bytes.length === 0) bytes.push(0);
    // 补符号位
    if (bytes[0] & 0x80) bytes.unshift(0);
    return this.tlv(TAG_INTEGER, Buffer.from(bytes));
  }

  /** BER OCTET STRING */
  private encStr(s: string): Buffer {
    const b = Buffer.from(s, 'utf-8');
    return this.tlv(TAG_OCTET_STRING, b);
  }

  /** BER OID 编码 */
  private encOID(oid: string): Buffer {
    const parts = oid.split('.').map((p) => parseInt(p));
    const buf: number[] = [40 * parts[0] + parts[1]];
    for (let i = 2; i < parts.length; i++) {
      let v = parts[i];
      if (v === 0) { buf.push(0); continue; }
      const tmp: number[] = [];
      tmp.push(v & 0x7f);
      v >>= 7;
      while (v > 0) { tmp.push(v & 0x7f | 0x80); v >>= 7; }
      tmp.reverse();
      buf.push(...tmp);
    }
    return this.tlv(TAG_OID, Buffer.from(buf));
  }

  // ========== BER 解码工具 ==========

  /** 读取一个 TLV：返回 [tag, content, rest] */
  private readTLV(b: Buffer, offset: number): { tag: number; content: Buffer; rest: Buffer; next: number } {
    const tag = b[offset];
    let i = offset + 1;
    let l = b[i++];
    if (l & 0x80) {
      const n = l & 0x7f;
      l = 0;
      for (let k = 0; k < n; k++) { l = (l << 8) | b[i++]; }
    }
    const content = b.slice(i, i + l);
    const rest = b.slice(i + l);
    return { tag, content, rest, next: i + l };
  }

  private decOID(b: Buffer): string {
    if (b.length === 0) return '';
    const out: string[] = [];
    const first = b[0];
    if (first < 40) out.push('0', String(first));
    else if (first < 80) out.push('1', String(first - 40));
    else out.push('2', String(first - 80));
    let v = 0;
    for (let i = 1; i < b.length; i++) {
      v = (v << 7) | (b[i] & 0x7f);
      if ((b[i] & 0x80) === 0) { out.push(String(v)); v = 0; }
    }
    return out.join('.');
  }

  private decUint(b: Buffer): number {
    // 不能用位移：<< 会把结果强制成 32 位有符号整数，Counter32 超过 2^31 时会变负数
    let v = 0;
    for (const x of b) v = v * 256 + x;
    return v;
  }

  /** Counter64 精确解码（最多 8 字节无符号） */
  private decBigUint(b: Buffer): bigint {
    let v = BigInt(0);
    const base = BigInt(256);
    for (const x of b) v = v * base + BigInt(x);
    return v;
  }

  /**
   * 发送 SNMP 请求并等待响应（复用长驻 socket，超时自动重发）
   */
  private async sendRequest(pduType: number, oids: string[], opts: RequestOptions = {}): Promise<VarBind[]> {
    await this.ensureSocket();
    const id = this.nextRequestId();
    const buf = this.buildPDU(pduType, oids, id, opts);

    return new Promise((resolve, reject) => {
      const req: PendingRequest = {
        id,
        buf,
        resolve,
        reject,
        timer: null,
        attempts: 0,
        maxAttempts: 1 + (opts.retries ?? this.retries),
        timeoutMs: opts.timeout ?? this.timeout,
      };
      this.pending.set(id, req);
      this.dispatch(req, new Error('SNMP 请求未发出'));
    });
  }

  /**
   * 构建 PDU（对齐 Go 程序的 build）
   */
  private buildPDU(pduType: number, oids: string[], requestId: number, opts: RequestOptions = {}): Buffer {
    let vbs = Buffer.alloc(0);
    for (const oid of oids) {
      const vb = Buffer.concat([
        this.encOID(oid),
        this.tlv(TAG_NULL, Buffer.alloc(0)),
      ]);
      vbs = Buffer.concat([vbs, this.tlv(0x30, vb)]);
    }

    // request-id | error-status/non-repeaters | error-index/max-repetitions
    let p = this.encInt(requestId);
    if (pduType === PDU_GETBULK) {
      p = Buffer.concat([p, this.encInt(0), this.encInt(opts.maxRepetitions ?? 50)]);
    } else {
      p = Buffer.concat([p, this.encInt(0), this.encInt(0)]);
    }
    p = Buffer.concat([p, this.tlv(0x30, vbs)]);

    // message: version | community | pdu
    const m = Buffer.concat([
      this.encInt(1), // version = 1 (v2c)
      this.encStr(this.community),
      this.tlv(pduType, p),
    ]);

    return this.tlv(0x30, m);
  }

  /** 只解析响应中的 request-id，用于响应分发 */
  private extractRequestId(msg: Buffer): number {
    const { content: outer } = this.readTLV(msg, 0);
    let r = this.readTLV(outer, 0); // version
    r = this.readTLV(outer, r.next); // community
    const pduTLV = this.readTLV(outer, r.next);
    const idTLV = this.readTLV(pduTLV.content, 0);
    return this.decUint(idTLV.content);
  }

  /**
   * 解析响应（对齐 Go 程序的 readTLV 风格）
   */
  private parseResponse(msg: Buffer): VarBind[] {
    // 外层 SEQUENCE
    const { content: outer } = this.readTLV(msg, 0);

    // version
    let r = this.readTLV(outer, 0);
    // community
    r = this.readTLV(outer, r.next);
    // response PDU
    const pduTLV = this.readTLV(outer, r.next);

    if (pduTLV.tag !== PDU_RESPONSE) {
      throw new Error(`expected RESPONSE PDU, got 0x${pduTLV.tag.toString(16)}`);
    }
    const pdu = pduTLV.content;

    // request-id
    r = this.readTLV(pdu, 0);
    // error-status
    r = this.readTLV(pdu, r.next);
    const errorStatus = this.decUint(r.content);
    if (errorStatus !== 0) {
      throw new Error(`SNMP error status ${errorStatus}`);
    }
    // error-index
    r = this.readTLV(pdu, r.next);
    // varbind list
    const vbList = this.readTLV(pdu, r.next);

    const result: VarBind[] = [];
    let pos = 0;
    while (pos < vbList.content.length) {
      const vb = this.readTLV(vbList.content, pos);
      if (vb.tag !== 0x30) break;
      // OID
      const oidTLV = this.readTLV(vb.content, 0);
      const oid = this.decOID(oidTLV.content);
      // value
      const valTLV = this.readTLV(vb.content, oidTLV.next);

      const missing = [TAG_NO_SUCH_OBJ, TAG_NO_SUCH_INST, TAG_END_OF_MIB].includes(valTLV.tag);
      const v: VarBind = {
        oid,
        tag: valTLV.tag,
        num: 0,
        str: '',
        isStr: false,
        missing,
      };
      if (!missing) {
        switch (valTLV.tag) {
          case TAG_INTEGER:
          case TAG_COUNTER32:
          case TAG_GAUGE32:
          case TAG_TIMETICKS:
            v.num = this.decUint(valTLV.content);
            break;
          case TAG_COUNTER64: {
            const big = this.decBigUint(valTLV.content);
            v.big = big;
            v.num = Number(big);
            break;
          }
          case TAG_OCTET_STRING:
            v.str = valTLV.content.toString('utf-8');
            v.isStr = true;
            break;
          default:
            v.str = valTLV.content.toString('utf-8');
            v.isStr = true;
        }
      }
      result.push(v);
      pos = vb.next;
    }
    return result;
  }

  /**
   * GET 请求
   */
  async get(oids: string[], opts?: RequestOptions): Promise<Map<string, VarBind>> {
    const vbs = await this.sendRequest(PDU_GET, oids, opts);
    const result = new Map<string, VarBind>();
    for (const vb of vbs) {
      result.set(vb.oid, vb);
    }
    return result;
  }

  /**
   * GETNEXT 请求
   */
  async getNext(oid: string, opts?: RequestOptions): Promise<VarBind | null> {
    const vbs = await this.sendRequest(PDU_GETNEXT, [oid], opts);
    return vbs[0] || null;
  }

  /**
   * GETBULK 请求（non-repeaters=0，max-repetitions 可配）
   */
  async getBulk(oids: string[], maxRepetitions: number = 25, opts?: RequestOptions): Promise<VarBind[]> {
    return this.sendRequest(PDU_GETBULK, oids, { ...opts, maxRepetitions });
  }

  /**
   * WALK 请求：优先 GETBULK，失败（设备不支持/响应异常）自动降级为 GETNEXT
   */
  async walk(baseOID: string, maxNodes: number = 4000, opts?: RequestOptions): Promise<VarBind[]> {
    try {
      return await this.walkBulk(baseOID, maxNodes, opts);
    } catch (err) {
      if (opts?.noFallback) throw err;
      console.warn(
        `[SNMP] GETBULK 失败 ${this.host} ${baseOID}，降级 GETNEXT:`,
        (err as Error).message,
      );
      return this.walkGetNext(baseOID, maxNodes, opts);
    }
  }

  /** GETBULK 版 walk：每轮最多取 maxRepetitions 条，直到走出子树 */
  private async walkBulk(baseOID: string, maxNodes: number, opts?: RequestOptions): Promise<VarBind[]> {
    const reps = opts?.maxRepetitions ?? 25;
    const prefix = `${baseOID}.`;
    const result: VarBind[] = [];
    let currentOID = baseOID;
    const maxRounds = Math.ceil(maxNodes / reps) + 4;

    for (let i = 0; i < maxRounds && result.length < maxNodes; i++) {
      const vbs = await this.getBulk([currentOID], reps, opts);
      if (vbs.length === 0) break;

      let advanced = false;
      for (const vb of vbs) {
        // 子树结束（endOfMibView 回显请求 OID）或第一条越界 OID：子树遍历完成
        if (vb.missing || !vb.oid.startsWith(prefix)) return result;
        result.push(vb);
        currentOID = vb.oid;
        advanced = true;
        if (result.length >= maxNodes) return result;
      }
      if (!advanced) break;
    }

    return result;
  }

  /** GETNEXT 版 walk（降级路径）：逐条串行 */
  private async walkGetNext(baseOID: string, maxNodes: number, opts?: RequestOptions): Promise<VarBind[]> {
    const prefix = `${baseOID}.`;
    const result: VarBind[] = [];
    let currentOID = baseOID;

    for (let i = 0; i < maxNodes && result.length < maxNodes; i++) {
      const vb = await this.getNext(currentOID, opts);
      if (!vb || vb.missing || !vb.oid.startsWith(prefix)) break;
      result.push(vb);
      currentOID = vb.oid;
    }

    return result;
  }

  /**
   * 测试连接
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.get([OID_SYS_DESCR]);
      return result.size > 0;
    } catch (error) {
      console.error('[SNMP] Ping failed:', error);
      return false;
    }
  }
}

/**
 * 创建 SNMP 客户端
 */
export function createSNMPClient(options: SNMPClientOptions): SNMPClient {
  return new SNMPClient(options);
}

export default SNMPClient;
