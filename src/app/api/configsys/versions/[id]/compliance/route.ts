import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { configComplianceService } from '@/lib/ai/config-compliance-service';

const appUrl = '/configsys';

// 合规检查
async function postComplianceHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    const isAdmin = userRoles.includes('系统管理员');

    // 获取版本和配置信息（包含关联的规则内容）
    const versions = await query<
      Array<{
        id: string;
        config_id: string;
        version_number: string;
        content: string;
        config_name: string;
        config_description: string;
        config_owner: string;
        compliance_rule_id: number | null;
        compliance_rule_name: string | null;
        compliance_rule: string | null;
      }>
    >(
      `SELECT v.*, c.name as config_name, c.description as config_description,
              c.compliance_rule_id, c.created_by as config_owner,
              r.name as compliance_rule_name, r.content as compliance_rule
       FROM configsys_versions v
       JOIN configsys_configs c ON v.config_id = c.id
       LEFT JOIN pioc_rules r ON c.compliance_rule_id = r.id
       WHERE v.id = ?`,
      [id]
    );

    if (versions.length === 0) {
      return NextResponse.json(
        { success: false, message: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versions[0];

    // 检查权限
    if (!isAdmin && version.config_owner !== userId) {
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [version.config_id, userId]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此版本' },
          { status: 403 }
        );
      }
    }

    // 检查是否有合规规则
    if (!version.compliance_rule_id || !version.compliance_rule) {
      return NextResponse.json(
        { success: false, message: '请先设置合规规则' },
        { status: 400 }
      );
    }

    // 调用AI服务进行合规检查
    const result = await configComplianceService.checkCompliance(
      version.content,
      version.compliance_rule,
      version.compliance_rule_id,
      version.compliance_rule_name || undefined,
      version.config_name
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.userMessage || '合规检查失败', error: result.error },
        { status: 500 }
      );
    }

    // 构建合规报告
    const complianceReport = {
      checkedAt: new Date().toISOString(),
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      ruleSummary: result.ruleSummary,
      overallStatus: result.overallStatus,
      findings: result.findings,
      summary: result.summary,
    };

    // 保存合规报告
    await query(
      `UPDATE configsys_versions SET compliance_report = ? WHERE id = ?`,
      [JSON.stringify(complianceReport), id]
    );

    return NextResponse.json({
      success: true,
      data: complianceReport,
      message: '合规检查完成',
    });
  } catch (error) {
    console.error('合规检查失败:', error);
    return NextResponse.json(
      { success: false, message: '合规检查失败', error: String(error) },
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

export const POST = wrapHandler(postComplianceHandler);
