import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function getTasksHandler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tasks = await labelingTaskModel.findTasksByUserId(user.id);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks', error: String(error) },
      { status: 500 }
    );
  }
}

async function createTaskHandler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, data_object_id, tag_group_id } = body;

    if (!name || !data_object_id || !tag_group_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const taskId = await labelingTaskModel.createTask({
      name,
      description,
      data_object_id: Number(data_object_id),
      tag_group_id: Number(tag_group_id),
      created_by: user.id,
      status: 1
    });

    return NextResponse.json({ success: true, data: { id: taskId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create task', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getTasksHandler, appUrl);
export const POST = createAppProtectedHandler(createTaskHandler, appUrl);
