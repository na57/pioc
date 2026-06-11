import { NextRequest, NextResponse } from 'next/server';
import { createApiHandlerWithoutSignature } from '@/lib/auth/api-auth';

/**
 * IDC 审批流程结束回调接口
 * 用于接收身份中台（IDC）审批流程结束后的通知
 *
 * 请求地址: POST /api/external/v1/idc/approval/callback
 * 认证方式: API Key + API Secret（不验证签名）
 * 所需权限: write
 *
 * 请求头:
 *   - X-API-Key: API Key (例如: pk_xxx)
 *   - X-API-Secret: API Secret
 */

// 审批回调请求体接口 - 保持开放，接收任意字段
export interface ApprovalCallbackRequest {
  [key: string]: unknown;
}

// POST /api/external/v1/idc/approval/callback - 接收审批结束回调
const postHandler = createApiHandlerWithoutSignature(async (request, auth) => {
  try {
    const body: ApprovalCallbackRequest = await request.json();

    // 输出接收到的数据到控制台
    console.log('========================================');
    console.log('IDC 审批流程结束回调通知');
    console.log('========================================');
    console.log('接收时间:', new Date().toISOString());
    console.log('API Key ID:', auth.apiKey.id);
    console.log('调用用户ID:', auth.userId);
    console.log('请求体:', JSON.stringify(body, null, 2));
    console.log('========================================');

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: 'Callback received successfully',
      data: {
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('IDC 审批回调处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process callback',
        error: String(error),
      },
      { status: 500 }
    );
  }
}, ['write']);

export const POST = postHandler;

// 支持 OPTIONS 请求（用于 CORS 预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-API-Secret',
    },
  });
}
