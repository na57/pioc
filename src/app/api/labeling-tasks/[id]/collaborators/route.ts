import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function getCollaboratorsHandler(
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

    const collaborators = await labelingTaskModel.findCollaboratorsByTaskId(taskId);
    return NextResponse.json({ success: true, data: collaborators });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch collaborators', error: String(error) },
      { status: 500 }
    );
  }
}

async function addCollaboratorHandler(
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
        { success: false, message: 'Only creator can add collaborators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const isAlreadyCollaborator = await labelingTaskModel.checkUserIsCollaborator(taskId, Number(user_id));
    if (isAlreadyCollaborator) {
      return NextResponse.json(
        { success: false, message: 'User is already a collaborator' },
        { status: 400 }
      );
    }

    const collaboratorId = await labelingTaskModel.addCollaborator(taskId, Number(user_id));
    return NextResponse.json({ success: true, data: { id: collaboratorId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to add collaborator', error: String(error) },
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

export const GET = wrapHandler(getCollaboratorsHandler);
export const POST = wrapHandler(addCollaboratorHandler);
