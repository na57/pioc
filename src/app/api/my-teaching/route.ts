import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { getConfig } from '@/lib/config';
import { findById } from '@/lib/database/models/dataSource';
import mysql from 'mysql2/promise';

const appUrl = '/my-teaching';

// 从数据库获取学年学期列表
async function getSemestersFromDB(): Promise<Array<{
  XNXQDM: string;
  XNDM: string | null;
  XQDM: string | null;
  XNXQMC: string | null;
  XQMC: string | null;
  PX: string | null;
  SFDQXQ: string | null;
}>> {
  const config = getConfig();
  const appConfig = config.apps?.myTeaching;

  if (!appConfig) {
    throw new Error('我的授课应用配置未找到，请在config.yaml中配置apps.myTeaching');
  }

  const { dataSourceId, semesterTableName } = appConfig;

  if (!dataSourceId) {
    throw new Error('数据源ID未配置，请在config.yaml中配置apps.myTeaching.dataSourceId');
  }

  // 获取数据源配置
  const dataSource = await findById(dataSourceId);
  if (!dataSource) {
    throw new Error(`数据源不存在: ${dataSourceId}`);
  }

  if (dataSource.type !== 'mysql') {
    throw new Error('暂不支持非MySQL数据源');
  }

  // 创建数据库连接
  const pool = mysql.createPool({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectionLimit: 5,
  });

  try {
    const [rows] = await pool.execute(
      `SELECT 
        xnxqdm as XNXQDM,
        xndm as XNDM,
        xqdm as XQDM,
        xnxqmc as XNXQMC,
        xqmc as XQMC,
        px as PX,
        sfdqxq as SFDQXQ
      FROM ${semesterTableName}
      ORDER BY CAST(px AS UNSIGNED) ASC, xnxqdm DESC`
    );

    return rows as Array<{
      XNXQDM: string;
      XNDM: string | null;
      XQDM: string | null;
      XNXQMC: string | null;
      XQMC: string | null;
      PX: string | null;
      SFDQXQ: string | null;
    }>;
  } finally {
    await pool.end();
  }
}

// 从数据库获取当前用户的授课信息
async function getMyTeachingInfoFromDB(
  teacherId: string,
  params: {
    xnxqdm?: string;
    page?: number;
    per_page?: number;
  }
) {
  const config = getConfig();
  const appConfig = config.apps?.myTeaching;

  if (!appConfig) {
    throw new Error('我的授课应用配置未找到，请在config.yaml中配置apps.myTeaching');
  }

  const { dataSourceId, teachingInfoTableName } = appConfig;

  if (!dataSourceId) {
    throw new Error('数据源ID未配置，请在config.yaml中配置apps.myTeaching.dataSourceId');
  }

  // 获取数据源配置
  const dataSource = await findById(dataSourceId);
  if (!dataSource) {
    throw new Error(`数据源不存在: ${dataSourceId}`);
  }

  if (dataSource.type !== 'mysql') {
    throw new Error('暂不支持非MySQL数据源');
  }

  // 创建数据库连接
  const pool = mysql.createPool({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectionLimit: 5,
  });

  try {
    // 构建WHERE条件 - 强制使用当前登录用户的教师工号
    const whereConditions: string[] = ['jsgh = ?'];
    const queryParams: (string | number)[] = [teacherId];

    if (params.xnxqdm) {
      whereConditions.push('xnxqdm = ?');
      queryParams.push(params.xnxqdm);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 获取总记录数
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${teachingInfoTableName} ${whereClause}`,
      queryParams
    );
    const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

    // 分页参数
    const page = params.page || 1;
    const per_page = params.per_page || 10;
    const offset = (page - 1) * per_page;

    // 获取数据
    const [rows] = await pool.query(
      `SELECT 
        jxbh as JXBH,
        jsgh as JSGH,
        jsxm as JSXM,
        xnxqdm as XNXQDM,
        xnxqmc as XNXQMC,
        kcdm as KCDM,
        kcmc as KCMC,
        skzc as SKZC,
        skxq as SKXQ,
        ksjc as KSJC,
        jsjc as JSJC,
        jasdm as JASDM,
        jxdd as JXDD,
        jsszxqh as JSSZXQH,
        jsszxqmc as JSSZXQMC,
        skbjh as SKBJH,
        skbjmc as SKBJMC,
        kxh as KXH,
        kcksdwh as KCKSDWH,
        kcksdwmc as KCKSDWMC,
        kkxnd as KKXND,
        kkxqm as KKXQM,
        sksj as SKSJ,
        jxzy as JXZY,
        krl as KRL,
        xdrs as XDRS,
        xkxqh as XKXQH,
        xkrsxd as XKRSXD,
        xknj as XKNJ,
        pkyq as PKYQ,
        jslxm as JSLXM,
        qsz as QSZ,
        zzz as ZZZ,
        kcxzm as KCXZM,
        jxbmc as JXBMC,
        jxtz as JXTZ,
        kksm as KKSM,
        tstamp as TSTAMP
      FROM ${teachingInfoTableName}
      ${whereClause}
      ORDER BY xnxqdm DESC, kcdm
      LIMIT ${per_page} OFFSET ${offset}`,
      queryParams
    );

    const max_page = Math.ceil(total / per_page);

    return {
      data: rows as Array<{
        JXBH: string | null;
        JSGH: string | null;
        JSXM: string | null;
        XNXQDM: string | null;
        XNXQMC: string | null;
        KCDM: string | null;
        KCMC: string | null;
        SKZC: string | null;
        SKXQ: string | null;
        KSJC: string | null;
        JSJC: string | null;
        JASDM: string | null;
        JXDD: string | null;
        JSSZXQH: string | null;
        JSSZXQMC: string | null;
        SKBJH: string | null;
        SKBJMC: string | null;
        KXH: string | null;
        KCKSDWH: string | null;
        KCKSDWMC: string | null;
        KKXND: string | null;
        KKXQM: string | null;
        SKSJ: string | null;
        JXZY: string | null;
        KRL: string | null;
        XDRS: string | null;
        XKXQH: string | null;
        XKRSXD: string | null;
        XKNJ: string | null;
        PKYQ: string | null;
        JSLXM: string | null;
        QSZ: string | null;
        ZZZ: string | null;
        KCXZM: string | null;
        JXBMC: string | null;
        JXTZ: string | null;
        KKSM: string | null;
        TSTAMP: string | null;
      }>,
      total,
      page,
      per_page,
      max_page,
    };
  } finally {
    await pool.end();
  }
}

// GET请求处理
async function getHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'semesters') {
      // 从数据库获取学年学期列表
      const semesters = await getSemestersFromDB();
      return NextResponse.json({ success: true, data: semesters });
    } else {
      // 使用当前登录用户的username作为教师工号查询
      // username就是教师工号
      const teacherId = session.username;

      const xnxqdm = searchParams.get('xnxqdm') || undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const per_page = parseInt(searchParams.get('per_page') || '10', 10);

      const result = await getMyTeachingInfoFromDB(teacherId, {
        xnxqdm,
        page,
        per_page,
      });

      return NextResponse.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('My teaching API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
