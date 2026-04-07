import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function removeCollaboratorHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, userId: collaboratorUserId } = await params;
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
        { success: false, message: 'Only creator can remove collaborators' },
        { status: 403 }
      );
    }

    const removed = await labelingTaskModel.removeCollaborator(taskId, Number(collaboratorUserId));
    if (!removed) {
      return NextResponse.json(
        { success: false, message: 'Failed to remove collaborator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to remove collaborator', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const DELETE = wrapHandler(removeCollaboratorHandler);
