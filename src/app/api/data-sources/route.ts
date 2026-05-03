import { NextRequest, NextResponse } from 'next/server';
import {
  findByUserId,
  create,
  findByNameAndUserId,
  findByTypeAndUserId,
  findByStatusAndUserId,
} from '@/lib/database/models/dataSource';
import { findSharedDataSourceIdsByUserId } from '@/lib/database/models/dataSourceShare';
import { createAppProtectedHandler } from '@/lib/auth/middleware';

const appUrl = '/data-sources';

async function getDataSourcesHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    interface DataSourceWithShareInfo {
      id: string;
      name: string;
      type: 'mysql' | 'mongodb';
      host: string;
      port: number;
      username: string;
      db_name: string;
      description: string;
      status: number;
      created_by: number;
      created_at: Date;
      updated_at: Date;
      is_shared?: boolean;
      shared_by?: number;
      shared_by_name?: string;
    }

    let dataSources: DataSourceWithShareInfo[];
    if (type) {
      dataSources = await findByTypeAndUserId(type, session.userId);
    } else if (status !== null) {
      dataSources = await findByStatusAndUserId(parseInt(status), session.userId);
    } else {
      dataSources = await findByUserId(session.userId);
    }

    // 为自己的数据源添加 is_shared = false 标记
    dataSources = dataSources.map(ds => ({ ...ds, is_shared: false }));

    // 获取被分享的数据源ID列表
    const sharedIds = await findSharedDataSourceIdsByUserId(session.userId);
    if (sharedIds.length > 0) {
      // 这里简化处理，实际可能需要更复杂的查询来过滤类型和状态
      // 为了完整性，我们先获取所有被分享的数据源，然后在内存中过滤
      const { findAll } = await import('@/lib/database/models/dataSource');
      const { findSharesToUser } = await import('@/lib/database/models/dataSourceShare');
      const allDataSources = await findAll();
      const sharesInfo = await findSharesToUser(session.userId);

      const sharedDataSources = allDataSources
        .filter(ds => sharedIds.includes(Number(ds.id)) && ds.created_by !== session.userId)
        .map(ds => {
          const shareInfo = sharesInfo.find(s => Number(s.data_source_id) === Number(ds.id));
          return {
            ...ds,
            is_shared: true,
            shared_by: shareInfo?.shared_by,
            shared_by_name: shareInfo?.shared_by_name,
          };
        });

      // 合并自己的数据源和被分享的数据源
      dataSources = [...dataSources, ...sharedDataSources];
    }

    return NextResponse.json({ success: true, data: dataSources });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch data sources', error: String(error) },
      { status: 500 }
    );
  }
}

async function createDataSourceHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { name, type, host, port, username, password, db_name, description } = body;

    if (!name || !type || !host || !port || !username || !password || !db_name) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['mysql', 'mongodb'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid data source type. Must be mysql or mongodb' },
        { status: 400 }
      );
    }

    const existingDataSource = await findByNameAndUserId(name, session.userId);
    if (existingDataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source name already exists' },
        { status: 409 }
      );
    }

    const id = await create({
      name,
      type,
      host,
      port: parseInt(port),
      username,
      password,
      db_name,
      description,
      status: 1,
      created_by: session.userId,
    });
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create data source', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getDataSourcesHandler, appUrl);
export const POST = createAppProtectedHandler(createDataSourceHandler, appUrl);
