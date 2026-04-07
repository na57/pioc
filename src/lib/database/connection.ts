import mysql from 'mysql2/promise';
import { getConfig } from '@/lib/config';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const config = getConfig();
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.name,
      waitForConnections: true,
      connectionLimit: config.database.connectionLimit,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T> {
  const [results] = await getPool().query(sql, params as any) as [T, unknown];
  return results;
}

export async function getConnection() {
  return getPool().getConnection();
}

export default { getPool };
