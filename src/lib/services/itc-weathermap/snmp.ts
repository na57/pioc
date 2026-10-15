/**
 * ITC 网络天气图 SNMP 客户端
 * 基于 Go 版本移植，支持 SNMP v2c GET/GETNEXT/GETBULK
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

export class SNMPClient {
  private host: string;
  private community: string;
  private timeout: number;
  private retries: number;
  private port: number;
  private requestId: number;

  constructor(options: SNMPClientOptions) {
    this.host = options.host;
    this.community = options.community;
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 2;
    this.port = options.port || 161;
    this.requestId = 0;
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
    let v = 0;
    for (const x of b) v = (v << 8) | x;
    return v;
  }

  /**
   * 发送 SNMP 请求并等待响应
   */
  private async sendRequest(pduType: number, oids: string[]): Promise<VarBind[]> {
    const socket = dgram.createSocket('udp4');

    return new Promise((resolve, reject) => {
      let lastError: Error | null = null;
      let attempts = 0;
      let closed = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        try { socket.close(); } catch { /* ignore */ }
      };

      const fail = (err: Error) => {
        cleanup();
        reject(err);
      };

      const armTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // timeout -> close & retry (或最终失败)
          if (closed) return;
          cleanup();
          if (attempts <= this.retries) {
            // 重开一个 socket 重试：用嵌套 sendRequest 递归
            // 但直接在 promise 链里递归会把 resolve/reject 弄乱，
            // 改成：timeout 不 close socket，只负责触发一次 retry
            // 这里已经 close 了，只能直接 fail，让上层 ping 用 withTimeout 降级
            reject(lastError || new Error(`SNMP timeout (${attempts}/${this.retries + 1})`));
          } else {
            reject(lastError || new Error('SNMP request failed'));
          }
        }, this.timeout);
      };

      const trySend = () => {
        if (closed) return;
        attempts++;
        const msg = this.buildPDU(pduType, oids);

        armTimeout();

        socket.send(msg, 0, msg.length, this.port, this.host, (err) => {
          if (closed) return;
          if (err) {
            lastError = err;
            if (attempts <= this.retries) {
              setTimeout(trySend, 200);
            } else {
              fail(lastError || new Error('SNMP send failed'));
            }
          }
        });
      };

      socket.on('message', (msg) => {
        if (closed) return;
        try {
          const vbs = this.parseResponse(msg);
          cleanup();
          resolve(vbs);
        } catch (err) {
          lastError = err as Error;
          if (attempts <= this.retries) {
            setTimeout(trySend, 200);
          } else {
            fail(lastError);
          }
        }
      });

      socket.on('error', (err) => {
        if (closed) return;
        lastError = err;
        if (attempts <= this.retries) {
          setTimeout(trySend, 200);
        } else {
          fail(err);
        }
      });

      trySend();
    });
  }

  /**
   * 构建 PDU（对齐 Go 程序的 build）
   */
  private buildPDU(pduType: number, oids: string[]): Buffer {
    this.requestId++;

    let vbs = Buffer.alloc(0);
    for (const oid of oids) {
      const vb = Buffer.concat([
        this.encOID(oid),
        this.tlv(TAG_NULL, Buffer.alloc(0)),
      ]);
      vbs = Buffer.concat([vbs, this.tlv(0x30, vb)]);
    }

    // request-id
    let p = this.encInt(this.requestId);
    if (pduType === PDU_GETBULK) {
      p = Buffer.concat([p, this.encInt(0), this.encInt(50)]);
    } else {
      p = Buffer.concat([p, this.encInt(0), this.encInt(0)]);
    }
    p = Buffer.concat([p, this.tlv(0x30, vbs)]);

    // message: version | community | pdu
    const m = Buffer.concat([
      this.encInt(1),  // version = 1 (v2c)
      this.encStr(this.community),
      this.tlv(pduType, p),
    ]);

    return this.tlv(0x30, m);
  }

  /**
   * 解析响应（对齐 Go 程序的 readTLV 风格）
   */
  private parseResponse(msg: Buffer): VarBind[] {
    // 外层 SEQUENCE
    let { content: outer, next } = this.readTLV(msg, 0);

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
          case TAG_COUNTER64:
            v.num = this.decUint(valTLV.content);
            break;
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
  async get(oids: string[]): Promise<Map<string, VarBind>> {
    const vbs = await this.sendRequest(PDU_GET, oids);
    const result = new Map<string, VarBind>();
    for (const vb of vbs) {
      result.set(vb.oid, vb);
    }
    return result;
  }

  /**
   * GETNEXT 请求
   */
  async getNext(oid: string): Promise<VarBind | null> {
    const vbs = await this.sendRequest(PDU_GETNEXT, [oid]);
    return vbs[0] || null;
  }

  /**
   * GETBULK 请求
   */
  async getBulk(oids: string[]): Promise<VarBind[]> {
    return this.sendRequest(PDU_GETBULK, oids);
  }

  /**
   * WALK 请求（使用 GETBULK）
   */
  async walk(baseOID: string, maxNodes: number = 4000): Promise<VarBind[]> {
    const result: VarBind[] = [];
    let currentOID = baseOID;

    for (let i = 0; i < 200 && result.length < maxNodes; i++) {
      try {
        const vbs = await this.sendRequest(PDU_GETNEXT, [currentOID]);
        
        if (vbs.length === 0) {
          break;
        }

        for (const vb of vbs) {
          if (!vb.oid.startsWith(baseOID + '.')) {
            return result;
          }
          result.push(vb);
          currentOID = vb.oid;
        }
      } catch (error) {
        console.error('[SNMP] Walk error:', error);
        break;
      }
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