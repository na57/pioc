import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as smartSheetModel from '@/lib/database/models/wecomSmartSheet';
import * as wecomAppModel from '@/lib/database/models/wecomApp';
import * as wecomAccountModel from '@/lib/database/models/wecomAccount';

const appUrl = '/wecom-apps';

// 获取企业微信access_token
async function getAccessToken(corpid: string, corpsecret: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`,
      { method: 'GET' }
    );
    
    const text = await response.text();
    console.log('gettoken response:', text);
    
    if (!text) {
      console.error('获取access_token返回空内容');
      return null;
    }
    
    const data = JSON.parse(text);
    
    if (data.errcode === 0) {
      return data.access_token;
    } else {
      console.error('获取access_token失败:', data.errmsg);
      return null;
    }
  } catch (error) {
    console.error('获取access_token异常:', error);
    return null;
  }
}

// POST /api/wecom-apps/:id/smart-sheets/:sheetId/sheets - 添加新工作表
async function createSheetHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id, sheetId } = await params;
    const appId = parseInt(id, 10);
    const sheetDbId = parseInt(sheetId, 10);

    if (isNaN(appId) || isNaN(sheetDbId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID或智能表格ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { docid, title } = body;

    if (!docid || !title) {
      return NextResponse.json(
        { success: false, message: 'DocId和工作表名称为必填项' },
        { status: 400 }
      );
    }

    // 获取应用信息（包含应用的secret）
    const app = await wecomAppModel.findById(appId);
    if (!app) {
      return NextResponse.json(
        { success: false, message: '应用不存在' },
        { status: 404 }
      );
    }

    // 获取账号信息（包含corp_id）
    const account = await wecomAccountModel.findById(app.account_id);
    if (!account) {
      return NextResponse.json(
        { success: false, message: '所属账号不存在' },
        { status: 404 }
      );
    }

    if (!account.corp_id) {
      return NextResponse.json(
        { success: false, message: '账号未配置CorpId' },
        { status: 400 }
      );
    }

    if (!app.secret) {
      return NextResponse.json(
        { success: false, message: '应用未配置Secret' },
        { status: 400 }
      );
    }

    // 获取access_token
    const accessToken = await getAccessToken(account.corp_id, app.secret);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: '无法获取access_token' },
        { status: 400 }
      );
    }

    // 调用企业微信API添加子表
    // API文档: https://developer.work.weixin.qq.com/document/path/99896
    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/add_sheet?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docid,
          properties: {
            title,
          },
        }),
      }
    );

    const text = await response.text();
    console.log('add_sheet response:', text);
    
    if (!text) {
      return NextResponse.json(
        { success: false, message: '创建工作表返回空内容' },
        { status: 500 }
      );
    }
    
    const data = JSON.parse(text);

    if (data.errcode !== 0) {
      return NextResponse.json(
        { success: false, message: `创建工作表失败: ${data.errmsg}` },
        { status: 400 }
      );
    }

    // 更新本地数据库中的工作表列表
    const existingSheet = await smartSheetModel.findById(sheetDbId);
    if (existingSheet && existingSheet.sheets_json) {
      try {
        const sheets = JSON.parse(existingSheet.sheets_json);
        sheets.push({
          sheet_id: data.properties.sheet_id,
          name: data.properties.title,
          type: 'smartsheet',
        });
        await smartSheetModel.update(sheetDbId, {
          sheets_json: JSON.stringify(sheets),
        });
      } catch (error) {
        console.error('更新本地工作表列表失败:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: '工作表创建成功',
      data: {
        sheet_id: data.properties.sheet_id,
        title: data.properties.title,
      },
    });
  } catch (error: any) {
    console.error('Failed to create sheet:', error);
    return NextResponse.json(
      { success: false, message: '创建工作表失败', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string; sheetId: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; sheetId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const POST = wrapHandler(createSheetHandler);
