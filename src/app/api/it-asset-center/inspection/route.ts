/**
 * IT资产中心 - 合规巡检 API
 *
 * POST /api/it-asset-center/inspection
 *   - 触发一次合规巡检
 *   - body: { systemId: string, ruleIds: number[] }
 *
 * GET /api/it-asset-center/inspection?systemId=xxx
 *   - 获取指定信息系统在配置管理中的配置版本历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import {
  runComplianceInspection,
} from '@/lib/services/it-asset-center/compliance-inspection';

const appUrl = '/it-asset-center';

// POST: 触发一次合规巡检
async function postInspectionHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { systemId, ruleIds } = body;

    if (!systemId) {
      return NextResponse.json(
        { success: false, error: '缺少 systemId 参数' },
        { status: 400 }
      );
    }

    const result = await runComplianceInspection(
      systemId,
      ruleIds || [],
      session.username
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('合规巡检失败:', error);
    return NextResponse.json(
      { success: false, error: '合规巡检执行失败', detail: String(error) },
      { status: 500 }
    );
  }
}

// GET: 获取该信息系统在配置管理中的配置版本历史
async function getInspectionHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');

    if (!systemId) {
      return NextResponse.json(
        { success: false, error: '缺少 systemId 参数' },
        { status: 400 }
      );
    }

    // 先通过 provider 获取系统名称
    const { createItAssetDataProvider } = await import('@/lib/services/it-asset-center/factory');
    const provider = await createItAssetDataProvider();
    const system = await provider.querySystemById(systemId);
    if (!system) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 查找对应的配置（命名规则：合规巡检_系统名）
    const configName = `合规巡检_${system.name}`;
    const configs = await query<Array<{ id: string }>>(
      `SELECT id FROM configsys_configs WHERE name = ? LIMIT 1`,
      [configName]
    );

    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        configId: null,
      });
    }

    const configId = configs[0].id;

    // 查询该配置的所有版本
    const versions = await query<
      Array<{
        id: string;
        version_number: string;
        compliance_report: string | null;
        created_by: string;
        created_at: string;
      }>
    >(
      `SELECT id, version_number, compliance_report, created_by, created_at
       FROM configsys_versions
       WHERE config_id = ?
       ORDER BY created_at DESC`,
      [configId]
    );

    // 解析 compliance_report，提取关键信息
    const history = versions.map((v) => {
      let complianceSummary: {
        overallStatus?: string;
        summary?: string;
        ruleName?: string;
      } | null = null;

      if (v.compliance_report) {
        try {
          const report = JSON.parse(v.compliance_report);
          complianceSummary = {
            overallStatus: report.overallStatus,
            summary: report.summary,
            ruleName: report.ruleName,
          };
        } catch {
          // 解析失败忽略
        }
      }

      return {
        id: v.id,
        versionNumber: v.version_number,
        createdBy: v.created_by,
        createdAt: v.created_at,
        hasComplianceReport: !!v.compliance_report,
        complianceSummary,
      };
    });

    return NextResponse.json({
      success: true,
      data: history,
      configId,
    });
  } catch (error) {
    console.error('获取巡检版本历史失败:', error);
    return NextResponse.json(
      { success: false, error: '获取巡检版本历史失败', detail: String(error) },
      { status: 500 }
    );
  }
}

export const POST = createAppProtectedHandler(postInspectionHandler, appUrl);
export const GET = createAppProtectedHandler(getInspectionHandler, appUrl);