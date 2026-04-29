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

// 调用企业微信API创建智能表格
async function createSmartSheetInWecom(
  appId: number,
  docName: string,
  adminUsers: string[]
): Promise<{ docid: string; url: string } | null> {
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

    // 调用企业微信API创建文档
    // API文档: https://developer.work.weixin.qq.com/document/path/97460
    const requestBody: {
      doc_type: number;
      doc_name: string;
      admin_users?: string[];
    } = {
      doc_type: 10, // 智能表格
      doc_name: docName,
    };

    if (adminUsers.length > 0) {
      requestBody.admin_users = adminUsers;
    }

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/wedoc/create_doc?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const text = await response.text();
    console.log('create_doc response:', text);
    
    if (!text) {
      console.error('创建智能表格返回空内容');
      return null;
    }
    
    const data = JSON.parse(text);

    if (data.errcode !== 0) {
      console.error('创建智能表格失败:', data.errmsg);
      return null;
    }

    return {
      docid: data.docid,
      url: data.url,
    };
  } catch (error) {
    console.error('创建智能表格失败:', error);
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

// GET /api/wecom-apps/:id/smart-sheets - 获取指定应用的智能表格列表
async function getSmartSheetsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);

    if (isNaN(appId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const name = searchParams.get('name') || undefined;
    const docid = searchParams.get('docid') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const all = searchParams.get('all') === 'true';

    const filters: smartSheetModel.WecomSmartSheetFilters = { 
      app_id: appId,
      created_by: session.userId, // 用户隔离：只查询当前用户的数据
    };
    if (name) filters.name = name;
    if (docid) filters.docid = docid;
    if (status !== undefined) filters.status = status;

    if (all) {
      const list = await smartSheetModel.findAllWithoutPagination(filters);
      return NextResponse.json({
        success: true,
        data: { list },
      });
    }

    const { list, total } = await smartSheetModel.findAll(page, pageSize, filters);

    return NextResponse.json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch smart sheets:', error);
    return NextResponse.json(
      { success: false, message: '获取智能表格列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/wecom-apps/:id/smart-sheets - 创建智能表格
async function createSmartSheetHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  let body: { 
    docid?: string; 
    doc_name?: string; 
    admin_users?: string[];
    create_new?: boolean;
  } = {};
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);

    if (isNaN(appId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID' },
        { status: 400 }
      );
    }

    body = await request.json();

    // 如果是创建新表格
    if (body.create_new) {
      if (!body.doc_name) {
        return NextResponse.json(
          { success: false, message: '文档名称为必填项' },
          { status: 400 }
        );
      }

      // 调用企业微信API创建新智能表格
      const createResult = await createSmartSheetInWecom(appId, body.doc_name, body.admin_users || []);
      if (!createResult) {
        return NextResponse.json(
          { success: false, message: '无法创建智能表格，请检查账号配置是否有效' },
          { status: 400 }
        );
      }

      // 获取新创建的表格信息
      const sheetInfo = await fetchSheetInfoFromWecom(appId, createResult.docid);
      if (!sheetInfo) {
        return NextResponse.json(
          { success: false, message: '智能表格已创建，但无法获取表格信息' },
          { status: 400 }
        );
      }

      const sheetId = await smartSheetModel.create({
        app_id: appId,
        docid: createResult.docid,
        name: sheetInfo.name,
        url: createResult.url,
        sheets_json: JSON.stringify(sheetInfo.sheets),
        status: 1,
        created_by: session.userId,
      });

      const sheet = await smartSheetModel.findById(sheetId);

      return NextResponse.json(
        { success: true, message: '智能表格创建成功', data: sheet },
        { status: 201 }
      );
    }

    // 添加现有表格
    if (!body.docid) {
      return NextResponse.json(
        { success: false, message: 'DocId为必填项' },
        { status: 400 }
      );
    }

    // 检查docid是否已存在
    const exists = await smartSheetModel.findByDocid(body.docid);
    if (exists) {
      return NextResponse.json(
        { success: false, message: `DocId "${body.docid}" 已存在` },
        { status: 400 }
      );
    }

    // 从企业微信API获取表格信息
    const sheetInfo = await fetchSheetInfoFromWecom(appId, body.docid);
    if (!sheetInfo) {
      return NextResponse.json(
        { success: false, message: '无法从企业微信获取表格信息，请检查DocId是否正确或账号配置是否有效' },
        { status: 400 }
      );
    }

    const sheetId = await smartSheetModel.create({
      app_id: appId,
      docid: body.docid,
      name: sheetInfo.name,
      url: sheetInfo.url,
      sheets_json: JSON.stringify(sheetInfo.sheets),
      status: 1,
      created_by: session.userId,
    });

    const sheet = await smartSheetModel.findById(sheetId);

    return NextResponse.json(
      { success: true, message: '智能表格添加成功', data: sheet },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create smart sheet:', error);

    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return NextResponse.json(
        { success: false, message: `创建失败：DocId "${body?.docid}" 已存在` },
        { status: 400 }
      );
    }

    if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return NextResponse.json(
        { success: false, message: '创建失败：所属应用不存在' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建智能表格失败', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const GET = wrapHandler(getSmartSheetsHandler);
export const POST = wrapHandler(createSmartSheetHandler);
