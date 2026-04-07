import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function getTaskHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const taskId = Number(id);

    const canAccess = await labelingTaskModel.checkUserCanAccessTask(taskId, user.id);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'No permission to access this task' },
        { status: 403 }
      );
    }

    const task = await labelingTaskModel.findTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    const collaborators = await labelingTaskModel.findCollaboratorsByTaskId(taskId);

    return NextResponse.json({
      success: true,
      data: { ...task, collaborators }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task', error: String(error) },
      { status: 500 }
    );
  }
}

async function updateTaskHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const taskId = Number(id);

    const task = await labelingTaskModel.findTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.created_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only creator can update task' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, status } = body;

    const updated = await labelingTaskModel.updateTask(taskId, {
      name,
      description,
      status
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update task', error: String(error) },
      { status: 500 }
    );
  }
}

async function deleteTaskHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const taskId = Number(id);

    const task = await labelingTaskModel.findTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.created_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only creator can delete task' },
        { status: 403 }
      );
    }

    const deleted = await labelingTaskModel.removeTask(taskId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete task', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const GET = wrapHandler(getTaskHandler);
export const PUT = wrapHandler(updateTaskHandler);
export const DELETE = wrapHandler(deleteTaskHandler);
