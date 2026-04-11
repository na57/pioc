import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { getConfig } from '@/lib/config';
import { findById } from '@/lib/database/models/dataSource';
import mysql from 'mysql2/promise';

const appUrl = '/course-center';

// 获取数据源连接
async function getDataSourceConnection() {
  const config = getConfig();
  const appConfig = config.apps?.courseCenter;

  if (!appConfig) {
    throw new Error('课程中心应用配置未找到，请在config.yaml中配置apps.courseCenter');
  }

  const { dataSourceId } = appConfig;

  if (!dataSourceId) {
    throw new Error('数据源ID未配置，请在config.yaml中配置apps.courseCenter.dataSourceId');
  }

  const dataSource = await findById(dataSourceId);
  if (!dataSource) {
    throw new Error(`数据源不存在: ${dataSourceId}`);
  }

  if (dataSource.type !== 'mysql') {
    throw new Error('暂不支持非MySQL数据源');
  }

  const pool = mysql.createPool({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectionLimit: 5,
  });

  return { pool, appConfig };
}

// 获取本科生课程列表
async function getUndergraduateCourses(params: {
  keyword?: string;
  page?: number;
  per_page?: number;
}) {
  const { pool, appConfig } = await getDataSourceConnection();
  const { undergraduateCourseTableName } = appConfig;

  try {
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (params.keyword) {
      whereConditions.push('(kch LIKE ? OR kcmc LIKE ? OR kcksdwmc LIKE ? OR kcfzrh LIKE ?)');
      const keyword = `%${params.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${undergraduateCourseTableName} ${whereClause}`,
      queryParams
    );
    const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

    const page = params.page || 1;
    const per_page = params.per_page || 10;
    const offset = (page - 1) * per_page;

    const [rows] = await pool.query(
      `SELECT
        kch,
        kcmc,
        kcfzrh,
        kcksdwh,
        kcksdwmc,
        xf,
        zxs,
        llxs,
        syxs,
        sjxs,
        kcjj,
        jc,
        cksm,
        kcccm,
        kcccmc,
        kcflm,
        kcflmc,
        jxfsdm,
        skyzdm,
        skyzmc,
        kcztdm,
        kslxdm,
        kslxdmmc,
        kcsm,
        kcmb,
        ywkcmb,
        zhxs,
        kcywmc,
        gsyxbm,
        gsyxmc,
        tstamp
      FROM ${undergraduateCourseTableName}
      ${whereClause}
      ORDER BY kch
      LIMIT ${per_page} OFFSET ${offset}`,
      queryParams
    );

    const max_page = Math.ceil(total / per_page);

    return {
      data: rows,
      total,
      page,
      per_page,
      max_page,
    };
  } finally {
    await pool.end();
  }
}

// 获取研究生课程列表
async function getGraduateCourses(params: {
  keyword?: string;
  page?: number;
  per_page?: number;
}) {
  const { pool, appConfig } = await getDataSourceConnection();
  const { graduateCourseTableName } = appConfig;

  try {
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (params.keyword) {
      whereConditions.push('(kch LIKE ? OR kcmc LIKE ? OR kcksdwmc LIKE ? OR kcfzrh LIKE ?)');
      const keyword = `%${params.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${graduateCourseTableName} ${whereClause}`,
      queryParams
    );
    const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

    const page = params.page || 1;
    const per_page = params.per_page || 10;
    const offset = (page - 1) * per_page;

    const [rows] = await pool.query(
      `SELECT
        kch,
        kcmc,
        kcywmc,
        zhxs,
        zxs,
        llxs,
        syxs,
        kcjj,
        kcjbm,
        kcjbmc,
        kclbm,
        kclbmc,
        jc,
        cksm,
        skyylxm,
        kcfzrh,
        kcksdwh,
        kcksdwmc,
        kcksrq,
        sfyjc,
        sfyx,
        xf,
        sjxs,
        tstamp
      FROM ${graduateCourseTableName}
      ${whereClause}
      ORDER BY kch
      LIMIT ${per_page} OFFSET ${offset}`,
      queryParams
    );

    const max_page = Math.ceil(total / per_page);

    return {
      data: rows,
      total,
      page,
      per_page,
      max_page,
    };
  } finally {
    await pool.end();
  }
}

// 获取教学班列表
async function getTeachingClasses(params: {
  kcdm: string;
  courseType: 'undergraduate' | 'graduate';
}) {
  const { pool, appConfig } = await getDataSourceConnection();
  const { undergraduateTeachingTableName, graduateTeachingTableName } = appConfig;

  const isGraduate = params.courseType === 'graduate';
  const tableName = isGraduate 
    ? graduateTeachingTableName 
    : undergraduateTeachingTableName;

  // 本科生和研究生表的字段名不同
  const weekField = isGraduate ? 'zc as skzc' : 'skzc';
  const weekDayField = isGraduate ? 'xq as skxq' : 'skxq';
  const classNameField = isGraduate ? 'xszyjc as skbjmc' : 'skbjmc';
  const deptNameField = isGraduate ? 'yxmc as kcksdwmc' : 'kcksdwmc';

  try {
    const [rows] = await pool.execute(
      `SELECT
        jxbh,
        jsgh,
        jsxm,
        xnxqdm,
        xnxqmc,
        kcdm,
        kcmc,
        ${weekField},
        ${weekDayField},
        ksjc,
        jsjc,
        jasdm,
        jxdd,
        jsszxqh,
        jsszxqmc,
        skbjh,
        ${classNameField},
        kxh,
        kcksdwh,
        ${deptNameField},
        kkxnd,
        kkxqm,
        sksj,
        jxzy,
        krl,
        xdrs,
        xkxqh,
        xkrsxd,
        xknj,
        pkyq,
        jslxm,
        qsz,
        zzz,
        kcxzm,
        jxbmc,
        jxtz,
        kksm,
        tstamp
      FROM ${tableName}
      WHERE kcdm = ?
      ORDER BY xnxqdm DESC, jxbh`,
      [params.kcdm]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取课堂统计数据
async function getClassroomStats(jxbh: string) {
  const { pool, appConfig } = await getDataSourceConnection();
  const { classroomStatsTableName } = appConfig;

  try {
    const [rows] = await pool.execute(
      `SELECT
        xnxqmc,
        kckssj,
        kcjssj,
        rwcs,
        zzd,
        hyd,
        jszb,
        bszb,
        ysjlv,
        sjd,
        cjsj,
        dtlv,
        ttlv,
        tstamp,
        jxbh,
        wybs
      FROM ${classroomStatsTableName}
      WHERE jxbh = ?
      ORDER BY kckssj ASC`,
      [jxbh]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// GET请求处理
async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'teaching-classes') {
      const kcdm = searchParams.get('kcdm');
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate';

      if (!kcdm || !courseType) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: kcdm 或 course_type' },
          { status: 400 }
        );
      }

      const data = await getTeachingClasses({ kcdm, courseType });
      return NextResponse.json({ success: true, data });
    } else if (action === 'classroom-stats') {
      const jxbh = searchParams.get('jxbh');

      if (!jxbh) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: jxbh' },
          { status: 400 }
        );
      }

      const data = await getClassroomStats(jxbh);
      return NextResponse.json({ success: true, data });
    } else {
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate' || 'undergraduate';
      const keyword = searchParams.get('keyword') || undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const per_page = parseInt(searchParams.get('per_page') || '10', 10);

      let result;
      if (courseType === 'graduate') {
        result = await getGraduateCourses({ keyword, page, per_page });
      } else {
        result = await getUndergraduateCourses({ keyword, page, per_page });
      }

      return NextResponse.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Course center API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
