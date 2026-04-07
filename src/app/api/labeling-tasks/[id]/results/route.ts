import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as labelingTaskModel from '@/lib/database/models/labeling-task';

const appUrl = '/labeling-tasks';

async function getResultsHandler(
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

    const { searchParams } = new URL(request.url);
    const dataEntryId = searchParams.get('data_entry_id');

    let results;
    if (dataEntryId) {
      results = await labelingTaskModel.findResultsByTaskAndEntry(taskId, dataEntryId);
    } else {
      results = await labelingTaskModel.findResultsByTaskId(taskId);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch results', error: String(error) },
      { status: 500 }
    );
  }
}

async function createResultHandler(
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

    const body = await request.json();
    const { data_object_id, data_entry_id, tag_id } = body;

    if (!data_object_id || !data_entry_id || !tag_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const resultId = await labelingTaskModel.createLabelingResult({
      task_id: taskId,
      data_object_id: Number(data_object_id),
      data_entry_id,
      tag_id: Number(tag_id),
      created_by: user.id
    });

    return NextResponse.json({ success: true, data: { id: resultId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create result', error: String(error) },
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

export const GET = wrapHandler(getResultsHandler);
export const POST = wrapHandler(createResultHandler);
