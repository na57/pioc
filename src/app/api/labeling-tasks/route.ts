import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function getTasksHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const tasks = await labelingTaskModel.findTasksByUserId(session.userId);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks', error: String(error) },
      { status: 500 }
    );
  }
}

async function createTaskHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
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
      created_by: session.userId,
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
