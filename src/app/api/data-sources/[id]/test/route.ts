import { NextRequest, NextResponse } from 'next/server';
import { findByIdAndUserId } from '@/lib/database/models/dataSource';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const appUrl = '/data-sources';

async function testConnectionHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSource = await findByIdAndUserId(id, session.userId);

    if (!dataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source not found' },
        { status: 404 }
      );
    }

    const { type, host, port, username, password, db_name } = dataSource;

    if (type === 'mysql') {
      // Test MySQL connection
      const connection = await mysql.createConnection({
        host,
        port,
        user: username,
        password,
        database: db_name,
        connectTimeout: 5000,
      });

      try {
        await connection.execute('SELECT 1');
        await connection.end();
        return NextResponse.json({ 
          success: true, 
          message: 'MySQL 连接成功' 
        });
      } catch (error) {
        await connection.end();
        return NextResponse.json({ 
          success: false, 
          message: 'MySQL 连接失败: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    } else if (type === 'mongodb') {
      // Test MongoDB connection
      const uri = `mongodb://${username}:${encodeURIComponent(password)}@${host}:${port}/${db_name}`;
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
      });

      try {
        await client.connect();
        await client.db(db_name).command({ ping: 1 });
        await client.close();
        return NextResponse.json({ 
          success: true, 
          message: 'MongoDB 连接成功' 
        });
      } catch (error) {
        await client.close();
        return NextResponse.json({ 
          success: false, 
          message: 'MongoDB 连接失败: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { success: false, message: '不支持的数据源类型' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '测试连接失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const POST = wrapHandler(testConnectionHandler);
