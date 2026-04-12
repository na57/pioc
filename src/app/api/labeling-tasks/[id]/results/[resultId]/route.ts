import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function deleteResultHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, resultId } = await params;
    const taskId = Number(id);
    const resultIdNum = Number(resultId);

    const canAccess = await labelingTaskModel.checkUserCanAccessTask(taskId, user.id);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'No permission to access this task' },
        { status: 403 }
      );
    }

    // 获取当前作业的信息
    const task = await labelingTaskModel.findTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    // 获取要删除的标签结果
    const labelingResult = await labelingTaskModel.findResultById(resultIdNum);
    if (!labelingResult) {
      return NextResponse.json(
        { success: false, message: 'Label result not found' },
        { status: 404 }
      );
    }

    // 验证标签结果是否属于当前作业的数据对象
    // 允许删除同一数据对象下的任何标签（全局标签特性）
    if (labelingResult.data_object_id !== task.data_object_id) {
      return NextResponse.json(
        { success: false, message: 'No permission to delete this label' },
        { status: 403 }
      );
    }

    const removed = await labelingTaskModel.removeResult(resultIdNum);
    if (!removed) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete result' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete result', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string; resultId: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; resultId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const DELETE = wrapHandler(deleteResultHandler);
