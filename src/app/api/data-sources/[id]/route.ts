import { NextRequest, NextResponse } from 'next/server';
import { findByIdAndUserId, findByIdWithCreator, findByIdWithoutPassword, update, removeByIdAndUserId, type DataSourceWithCreator } from '@/lib/database/models/dataSource';
import { checkUserCanAccess } from '@/lib/database/models/dataSourceShare';
import { createAppProtectedHandler } from '@/lib/auth/middleware';

const appUrl = '/data-sources';

async function getDataSourceHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSourceId = Number(id);

    // 首先尝试获取用户自己的数据源（带创建者名称）
    const dataSourceWithCreator = await findByIdWithCreator(id);
    let isOwner = false;
    let dataSource: DataSourceWithCreator | Omit<DataSourceWithCreator, 'password'> | null = null;

    // 检查是否有权限访问（创建者或被分享者）
    if (dataSourceWithCreator) {
      isOwner = dataSourceWithCreator.created_by === session.userId;
      if (isOwner) {
        dataSource = dataSourceWithCreator;
      } else {
        // 不是创建者，检查是否被分享
        const canAccess = await checkUserCanAccess(dataSourceId, session.userId);
        if (!canAccess) {
          dataSource = null;
        } else {
          // 被分享者只能查看不包含密码的数据源信息
          dataSource = await findByIdWithoutPassword(id);
        }
      }
    }

    if (!dataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source not found' },
        { status: 404 }
      );
    }

    // 添加 is_owner 字段到返回数据中，方便前端判断权限
    return NextResponse.json({ success: true, data: { ...dataSource, is_owner: isOwner } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch data source', error: String(error) },
      { status: 500 }
    );
  }
}

async function updateDataSourceHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, host, port, username, password, db_name, description, status } = body;

    const existingDataSource = await findByIdAndUserId(id, session.userId);
    if (!existingDataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source not found' },
        { status: 404 }
      );
    }

    if (type && !['mysql', 'mongodb'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid data source type. Must be mysql or mongodb' },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      type?: 'mysql' | 'mongodb';
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      db_name?: string;
      description?: string;
      status?: number;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as 'mysql' | 'mongodb';
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = parseInt(port);
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (db_name !== undefined) updateData.db_name = db_name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status ? 1 : 0;

    const success = await update(id, updateData);
    if (success) {
      return NextResponse.json({ success: true, message: 'Data source updated successfully' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to update data source' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update data source', error: String(error) },
      { status: 500 }
    );
  }
}

async function deleteDataSourceHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingDataSource = await findByIdAndUserId(id, session.userId);
    if (!existingDataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source not found' },
        { status: 404 }
      );
    }

    const success = await removeByIdAndUserId(id, session.userId);
    if (success) {
      return NextResponse.json({ success: true, message: 'Data source deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to delete data source' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete data source', error: String(error) },
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

export const GET = wrapHandler(getDataSourceHandler);
export const PUT = wrapHandler(updateDataSourceHandler);
export const DELETE = wrapHandler(deleteDataSourceHandler);
