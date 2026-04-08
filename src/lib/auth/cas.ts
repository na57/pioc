import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { parseString } from 'xml2js';
import { query } from '@/lib/database/connection';
import { findByUsername } from '@/lib/database/models/user';
import { getConfig } from '@/lib/config';

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  name: string;
  fromCas?: boolean;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  const config = getConfig();
  const jwtSecret = new TextEncoder().encode(config.security.jwtSecret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.security.jwtExpireDays}d`)
    .sign(jwtSecret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const config = getConfig();
  const jwtSecret = new TextEncoder().encode(config.security.jwtSecret);
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

function buildCasUrl(path: string): string {
  const config = getConfig().cas;
  return `${config.serverUrl}${config.pathPrefix}${path}`;
}

const CAS_CALLBACK_PATH = '/api/auth/cas/callback';

function buildServiceUrl(serviceUrl: string): string {
  // 移除 serviceUrl 末尾的斜杠，避免与 CAS_CALLBACK_PATH 拼接时产生双斜杠
  const baseUrl = serviceUrl.endsWith('/') ? serviceUrl.slice(0, -1) : serviceUrl;
  return `${baseUrl}${CAS_CALLBACK_PATH}`;
}

export function getCasLoginUrl(): string {
  const config = getConfig().cas;
  const serviceUrl = buildServiceUrl(config.serviceUrl);
  return buildCasUrl(config.loginPath) + `?service=${encodeURIComponent(serviceUrl)}`;
}

export function getCasValidateUrl(ticket: string): string {
  const config = getConfig().cas;
  const serviceUrl = buildServiceUrl(config.serviceUrl);
  return buildCasUrl(config.validatePath) + `?service=${encodeURIComponent(serviceUrl)}&ticket=${ticket}`;
}

function parseXml(xml: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => {
    if (o && typeof o === 'object') {
      return (o as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

export async function validateCasTicket(ticket: string): Promise<{
  valid: boolean;
  username?: string;
  attributes?: Record<string, string>;
}> {
  const validateUrl = getCasValidateUrl(ticket);
  const config = getConfig();

  console.log('CAS validate URL:', validateUrl);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(validateUrl, {
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    console.log('CAS validation HTTP status:', response.status);

    const text = await response.text();
    console.log('CAS validation response:', text);

    const result = await parseXml(text) as Record<string, unknown>;
    console.log('CAS parsed result:', JSON.stringify(result, null, 2));

    // XML 命名空间可能导致键名为 cas:serviceResponse
    let serviceResponse = result['serviceResponse'] as Record<string, unknown> | undefined;
    if (!serviceResponse) {
      serviceResponse = result['cas:serviceResponse'] as Record<string, unknown> | undefined;
    }

    if (!serviceResponse) {
      console.error('CAS validation: no serviceResponse found');
      return { valid: false };
    }

    let authenticationSuccess = serviceResponse['authenticationSuccess'] as Record<string, unknown> | undefined;
    if (!authenticationSuccess) {
      authenticationSuccess = serviceResponse['cas:authenticationSuccess'] as Record<string, unknown> | undefined;
    }

    if (!authenticationSuccess) {
      const authenticationFailure = serviceResponse['authenticationFailure'] || serviceResponse['cas:authenticationFailure'];
      if (authenticationFailure) {
        console.error('CAS authentication failed:', authenticationFailure);
      } else {
        console.error('CAS validation: no authenticationSuccess or authenticationFailure found');
      }
      return { valid: false };
    }

    // CAS 3.0: attributes 在 authenticationSuccess 内部
    // XML 解析后会保留命名空间前缀，如 cas:user, cas:attributes
    const attributes = authenticationSuccess['cas:attributes'] as Record<string, unknown> | undefined;

    const mapping = config.cas.attributeMapping;
    
    // 优先从 attributes 中获取用户名，其次是 authenticationSuccess 直接字段
    // 注意：XML 字段带有 cas: 命名空间前缀
    let username = '';
    if (attributes && `cas:${mapping.username}` in attributes) {
      username = String(attributes[`cas:${mapping.username}`]);
    } else if ('cas:user' in authenticationSuccess) {
      username = String(authenticationSuccess['cas:user']);
    } else if (attributes && 'cas:username' in attributes) {
      username = String(attributes['cas:username']);
    } else if ('cas:userName' in authenticationSuccess) {
      username = String(authenticationSuccess['cas:userName']);
    }

    if (!username) {
      console.error('CAS validation: no username found in response:', JSON.stringify(authenticationSuccess, null, 2));
      return { valid: false };
    }

    const userAttributes: Record<string, string> = {};
    if (attributes) {
      if (`cas:${mapping.email}` in attributes) userAttributes.email = String(attributes[`cas:${mapping.email}`]);
      if (`cas:${mapping.name}` in attributes) userAttributes.name = String(attributes[`cas:${mapping.name}`]);
      // 云南大学 CAS 使用 cn 或 userName 作为姓名
      if (!userAttributes.name && 'cas:cn' in attributes) userAttributes.name = String(attributes['cas:cn']);
      if (!userAttributes.name && 'cas:userName' in attributes) userAttributes.name = String(attributes['cas:userName']);
    }
    // 如果 attributes 中没有，尝试从 authenticationSuccess 直接获取
    if (!userAttributes.email && `cas:${mapping.email}` in authenticationSuccess) {
      userAttributes.email = String(authenticationSuccess[`cas:${mapping.email}`]);
    }
    if (!userAttributes.name && `cas:${mapping.name}` in authenticationSuccess) {
      userAttributes.name = String(authenticationSuccess[`cas:${mapping.name}`]);
    }

    return { valid: true, username, attributes: userAttributes };
  } catch (error) {
    console.error('CAS ticket validation error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return { valid: false };
  }
}

function generateRandomPassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function casLogin(username: string, email?: string, name?: string): Promise<string> {
  const config = getConfig();
  let user = await findByUsername(username);

  if (!user) {
    // CAS用户生成随机密码，防止被猜测
    const randomPassword = generateRandomPassword(32);
    await query(
      'INSERT INTO pioc_users (username, email, password, name, status) VALUES (?, ?, ?, ?, 1)',
      [username, email || `${username}@cas.local`, randomPassword, name || username]
    );
    user = await findByUsername(username);

    if (user && config.cas.defaultRoleId) {
      await query(
        'INSERT INTO pioc_user_roles (user_id, role_id) VALUES (?, ?)',
        [user.id, config.cas.defaultRoleId]
      );
    }
  }

  const token = await createToken({
    userId: user!.id,
    username: user!.username,
    email: user!.email,
    name: user!.name || username,
    fromCas: true,
  });

  await query(
    'INSERT INTO pioc_sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [user!.id, token, config.security.jwtExpireDays]
  );

  return token;
}

export async function logout(token: string): Promise<void> {
  await query('DELETE FROM pioc_sessions WHERE token = ?', [token]);
}

export async function getSession(): Promise<TokenPayload | null> {
  const config = getConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(config.security.sessionCookieName)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const sessions = await query<{ token: string }[]>(
    'SELECT token FROM pioc_sessions WHERE user_id = ? AND expires_at > NOW()',
    [payload.userId]
  );

  const tokenExists = sessions.some(s => s.token === token);
  if (!tokenExists) return null;

  return payload;
}

export async function setSessionCookie(token: string): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();
  cookieStore.set(config.security.sessionCookieName, token, {
    httpOnly: true,
    secure: config.security.httpsEnabled,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * config.security.jwtExpireDays,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();
  cookieStore.delete(config.security.sessionCookieName);
}
