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

// 调用企业微信API获取智能表格信息
async function fetchSheetInfoFromWecom(appId: number, docid: string): Promise<{
  name: string;
  url: string;
  sheets: { sheet_id: string; name: string; type: string }[];
} | null> {
  try {
    // 获取应用信息（包含应用的secret）
    const app = await wecomAppModel.findById(appId);
    if (!app) {
      throw new Error('应用不存在');
    }

    // 获取账号信息（包含corp_id）
    const account = await wecomAccountModel.findById(app.account_id);
    if (!account) {
      throw new Error('所属账号不存在');
    }

    if (!account.corp_id) {
      throw new Error('账号未配置CorpId');
    }

    // 使用应用的secret作为corpsecret
    if (!app.secret) {
      throw new Error('应用未配置Secret');
    }

    // 获取access_token（使用账号的corp_id和应用的secret）
    const accessToken = await getAccessToken(account.corp_id, app.secret);
    if (!accessToken) {
      throw new Error('无法获取access_token');
    }

    // 调用企业微信API获取文档基础信息
    // API文档: https://developer.work.weixin.qq.com/document/path/97734
    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/wedoc/get_doc_base_info?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docid }),
      }
    );

    const text = await response.text();
    console.log('get_doc_base_info response:', text);
    
    if (!text) {
      console.error('获取智能表格信息返回空内容');
      return null;
    }
    
    const data = JSON.parse(text);

    if (data.errcode !== 0) {
      console.error('获取智能表格信息失败:', data.errmsg);
      return null;
    }

    // 检查是否为智能表格（doc_type: 10）
    if (data.doc_base_info?.doc_type !== 10) {
      console.error('该文档不是智能表格，doc_type:', data.doc_base_info?.doc_type);
      return null;
    }

    // 获取工作表列表
    // API文档: https://developer.work.weixin.qq.com/document/path/101154
    const sheetsResponse = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/get_sheet?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          docid,
          need_all_type_sheet: true 
        }),
      }
    );

    const sheetsText = await sheetsResponse.text();
    console.log('get_sheet response:', sheetsText);
    
    let sheets: { sheet_id: string; name: string; type: string }[] = [];
    if (sheetsText) {
      const sheetsData = JSON.parse(sheetsText);
      if (sheetsData.errcode === 0 && sheetsData.sheet_list) {
        sheets = sheetsData.sheet_list.map((sheet: any) => ({
          sheet_id: sheet.sheet_id,
          name: sheet.title,
          type: sheet.type,
        }));
      }
    }

    // 解析返回数据
    return {
      name: data.doc_base_info?.doc_name || `智能表格-${docid.slice(-6)}`,
      url: `https://doc.weixin.qq.com/sheet/${docid}`,
      sheets,
    };
  } catch (error) {
    console.error('获取表格信息失败:', error);
    return null;
  }
}

// GET /api/wecom-apps/:id/smart-sheets/:sheetId - 获取智能表格详情
async function getSmartSheetHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { sheetId } = await params;
    const id = parseInt(sheetId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: '无效的智能表格ID' },
        { status: 400 }
      );
    }

    const sheet = await smartSheetModel.findById(id);

    if (!sheet) {
      return NextResponse.json(
        { success: false, message: '智能表格不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: sheet });
  } catch (error) {
    console.error('Failed to fetch smart sheet:', error);
    return NextResponse.json(
      { success: false, message: '获取智能表格详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/wecom-apps/:id/smart-sheets/:sheetId/sync - 同步智能表格信息
async function syncSmartSheetHandler(
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

    const existingSheet = await smartSheetModel.findById(sheetDbId);
    if (!existingSheet) {
      return NextResponse.json(
        { success: false, message: '智能表格不存在' },
        { status: 404 }
      );
    }

    // 从企业微信API获取最新表格信息
    const sheetInfo = await fetchSheetInfoFromWecom(appId, existingSheet.docid);
    if (!sheetInfo) {
      return NextResponse.json(
        { success: false, message: '无法从企业微信获取表格信息，请检查DocId是否正确或账号配置是否有效' },
        { status: 400 }
      );
    }

    // 更新数据库中的表格信息
    await smartSheetModel.update(sheetDbId, {
      name: sheetInfo.name,
      url: sheetInfo.url,
      sheets_json: JSON.stringify(sheetInfo.sheets),
    });

    const sheet = await smartSheetModel.findById(sheetDbId);

    return NextResponse.json({
      success: true,
      message: '智能表格信息已同步',
      data: sheet,
    });
  } catch (error: any) {
    console.error('Failed to sync smart sheet:', error);
    return NextResponse.json(
      { success: false, message: '同步智能表格信息失败', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/wecom-apps/:id/smart-sheets/:sheetId - 删除智能表格
async function deleteSmartSheetHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { sheetId } = await params;
    const id = parseInt(sheetId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: '无效的智能表格ID' },
        { status: 400 }
      );
    }

    const existingSheet = await smartSheetModel.findById(id);
    if (!existingSheet) {
      return NextResponse.json(
        { success: false, message: '智能表格不存在' },
        { status: 404 }
      );
    }

    await smartSheetModel.remove(id);

    return NextResponse.json({
      success: true,
      message: '智能表格删除成功',
    });
  } catch (error: any) {
    console.error('Failed to delete smart sheet:', error);
    return NextResponse.json(
      { success: false, message: '删除智能表格失败', error: error.message || String(error) },
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

export const GET = wrapHandler(getSmartSheetHandler);
export const POST = wrapHandler(syncSmartSheetHandler);
export const DELETE = wrapHandler(deleteSmartSheetHandler);
