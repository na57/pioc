import { NextRequest, NextResponse } from 'next/server';
import {
  findByUserId,
  create,
  findByNameAndUserId,
  findByTypeAndUserId,
  findByStatusAndUserId,
} from '@/lib/database/models/dataSource';
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

    let dataSources;
    if (type) {
      dataSources = await findByTypeAndUserId(type, session.userId);
    } else if (status !== null) {
      dataSources = await findByStatusAndUserId(parseInt(status), session.userId);
    } else {
      dataSources = await findByUserId(session.userId);
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
