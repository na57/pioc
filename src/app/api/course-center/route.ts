import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { getConfig } from '@/lib/config';
import { getCourseCenterConfig } from '@/lib/config/course-center';
import { findById } from '@/lib/database/models/dataSource';
import { findById as findDataObjectById } from '@/lib/database/models/dataObject';
import mysql from 'mysql2/promise';

const appUrl = '/course-center';

// 获取数据源连接
// 支持两种方式：
// 1. 从配置中获取全局 dataSourceId
// 2. 从数据对象中获取数据源ID（当表配置了 dataObjectId 时）
async function getDataSourceConnection(preferredDataObjectId?: number) {
  const config = getCourseCenterConfig();
  let dataSourceId = config.dataSourceId;

  // 如果指定了优先使用的数据对象ID，从数据对象获取数据源ID
  if (preferredDataObjectId) {
    const dataObject = await findDataObjectById(preferredDataObjectId);
    if (!dataObject) {
      throw new Error(`数据对象不存在: ${preferredDataObjectId}`);
    }
    if (dataObject.status !== 1) {
      throw new Error(`数据对象已禁用: ${preferredDataObjectId}`);
    }
    dataSourceId = dataObject.data_source_id;
  }

  // 如果没有全局 dataSourceId，尝试从第一个配置了 dataObjectId 的表获取
  if (!dataSourceId) {
    const tables = config.tables;
    for (const [, tableConfig] of Object.entries(tables)) {
      if (tableConfig.dataObjectId) {
        const dataObject = await findDataObjectById(tableConfig.dataObjectId);
        if (dataObject && dataObject.status === 1) {
          dataSourceId = dataObject.data_source_id;
          break;
        }
      }
    }
  }

  if (!dataSourceId) {
    throw new Error('数据源ID未配置，请在 config/course-center.yaml 中配置 dataSourceId，或为表配置 dataObjectId');
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

  return { pool, config };
}

// 获取本科生课程列表
async function getUndergraduateCourses(params: {
  keyword?: string;
  dept?: string;
  status?: string;
  page?: number;
  per_page?: number;
}) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.undergraduateCourse;
  const f = table.fields;

  try {
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (params.keyword) {
      whereConditions.push(`(${f.courseCode} LIKE ? OR ${f.courseName} LIKE ? OR ${f.deptName} LIKE ? OR ${f.responsiblePerson} LIKE ?)`);
      const keyword = `%${params.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }

    if (params.dept) {
      whereConditions.push(`${f.deptCode} = ?`);
      queryParams.push(params.dept);
    }

    if (params.status) {
      whereConditions.push(`${f.statusCode} = ?`);
      queryParams.push(params.status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${table.name} ${whereClause}`,
      queryParams
    );
    const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

    const page = params.page || 1;
    const per_page = params.per_page || 10;
    const offset = (page - 1) * per_page;

    const [rows] = await pool.query(
      `SELECT
        ${f.courseCode},
        ${f.courseName},
        ${f.responsiblePerson},
        ${f.deptCode},
        ${f.deptName},
        ${f.credits},
        ${f.totalHours},
        ${f.theoryHours},
        ${f.practiceHours},
        ${f.practiceWeeks},
        ${f.introduction},
        ${f.materials},
        ${f.referenceMaterials},
        ${f.natureCode},
        ${f.natureName},
        ${f.categoryCode},
        ${f.categoryName},
        ${f.teachingMethodCode},
        ${f.languageCode},
        ${f.languageName},
        ${f.statusCode},
        ${f.examTypeCode},
        ${f.examTypeName},
        ${f.description},
        ${f.objectives},
        ${f.englishObjectives},
        ${f.comprehensiveHours},
        ${f.englishName},
        ${f.timestamp}
      FROM ${table.name}
      ${whereClause}
      ORDER BY ${f.courseCode}
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
  dept?: string;
  status?: string;
  page?: number;
  per_page?: number;
}) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.graduateCourse;
  const f = table.fields;

  try {
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (params.keyword) {
      whereConditions.push(`(${f.courseCode} LIKE ? OR ${f.courseName} LIKE ? OR ${f.deptName} LIKE ? OR ${f.responsiblePerson} LIKE ?)`);
      const keyword = `%${params.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }

    if (params.dept) {
      whereConditions.push(`${f.deptCode} = ?`);
      queryParams.push(params.dept);
    }

    if (params.status) {
      whereConditions.push(`${f.statusCode} = ?`);
      queryParams.push(params.status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${table.name} ${whereClause}`,
      queryParams
    );
    const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

    const page = params.page || 1;
    const per_page = params.per_page || 10;
    const offset = (page - 1) * per_page;

    const [rows] = await pool.query(
      `SELECT
        ${f.courseCode},
        ${f.courseName},
        ${f.responsiblePerson},
        ${f.deptCode},
        ${f.deptName},
        ${f.credits},
        ${f.totalHours},
        ${f.theoryHours},
        ${f.practiceHours},
        ${f.practiceWeeks},
        ${f.introduction},
        ${f.materials},
        ${f.referenceMaterials},
        ${f.natureCode},
        ${f.natureName},
        ${f.categoryCode},
        ${f.categoryName},
        ${f.teachingMethodCode},
        ${f.languageCode},
        ${f.languageName},
        ${f.statusCode},
        ${f.examTypeCode},
        ${f.examTypeName},
        ${f.description},
        ${f.objectives},
        ${f.englishObjectives},
        ${f.comprehensiveHours},
        ${f.englishName},
        ${f.timestamp}
      FROM ${table.name}
      ${whereClause}
      ORDER BY ${f.courseCode}
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

// 获取所有开设单位
async function getAllDepartments(courseType: 'undergraduate' | 'graduate') {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  
  const table = courseType === 'graduate' ? tables.graduateCourse : tables.undergraduateCourse;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT ${f.deptCode} as code, ${f.deptName} as name FROM ${table.name} WHERE ${f.deptCode} IS NOT NULL AND ${f.deptCode} != '' AND ${f.deptName} IS NOT NULL AND ${f.deptName} != '' ORDER BY ${f.deptName}`
    );
    return (rows as Array<{ code: string; name: string }>).map(row => ({
      code: row.code,
      name: row.name,
    }));
  } finally {
    await pool.end();
  }
}

// 获取教学班列表
async function getTeachingClasses(params: {
  kcdm: string;
  courseType: 'undergraduate' | 'graduate';
}) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;

  const isGraduate = params.courseType === 'graduate';
  const table = isGraduate ? tables.graduateTeaching : tables.undergraduateTeaching;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.classCode},
        ${f.teacherCode},
        ${f.teacherName},
        ${f.semesterCode},
        ${f.semesterName},
        ${f.courseCode},
        ${f.courseName},
        ${f.weekInfo},
        ${f.dayOfWeek},
        ${f.className},
        ${f.deptName},
        ${f.campusCode},
        ${f.campusName},
        ${f.buildingCode},
        ${f.buildingName},
        ${f.roomCode},
        ${f.roomName},
        ${f.seatCount},
        ${f.studentCount}
      FROM ${table.name}
      WHERE ${f.courseCode} = ?
      ORDER BY ${f.semesterCode} DESC, ${f.classCode}`,
      [params.kcdm]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取课堂统计数据
async function getClassroomStats(jxbh: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.classroomStats;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.semesterName},
        ${f.teacherName},
        ${f.date},
        ${f.studentCount},
        ${f.attendanceRate},
        ${f.raiseHandCount},
        ${f.respondCount},
        ${f.focusRate}
      FROM ${table.name}
      WHERE ${f.classCode} = ?
      ORDER BY ${f.date} ASC`,
      [jxbh]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取教材使用情况
async function getTextbooks(kcdm: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.undergraduateTextbook;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.textbookName},
        ${f.isbn},
        ${f.author},
        ${f.publisher},
        ${f.publishDate},
        ${f.isNewEdition}
      FROM ${table.name}
      WHERE ${f.courseCode} = ?
      ORDER BY ${f.isNewEdition} DESC, ${f.publishDate} DESC`,
      [kcdm]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取督导记录
async function getSupervisionRecords(jxbid: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.supervisionRecord;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.teacherName},
        ${f.semesterCode},
        ${f.supervisorName},
        ${f.supervisionType},
        ${f.supervisionDate},
        ${f.evaluation},
        ${f.rating}
      FROM ${table.name}
      WHERE ${f.classCode} = ?
      ORDER BY ${f.supervisionDate} DESC`,
      [jxbid]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取本科生成绩
async function getUndergraduateGrades(jxbh: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.undergraduateGrade;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.studentId},
        ${f.studentName},
        ${f.courseCode},
        ${f.courseName},
        ${f.regularScore},
        ${f.midtermScore},
        ${f.finalScore},
        ${f.totalScore},
        ${f.gradePoint},
        ${f.credit}
      FROM ${table.name}
      WHERE ${f.classCode} = ?
      ORDER BY ${f.studentId} ASC`,
      [jxbh]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取研究生成绩
async function getGraduateGrades(jxbh: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.graduateGrade;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.studentId},
        ${f.studentName},
        ${f.courseCode},
        ${f.courseName},
        ${f.regularScore},
        ${f.midtermScore},
        ${f.finalScore},
        ${f.totalScore},
        ${f.gradePoint},
        ${f.credit}
      FROM ${table.name}
      WHERE ${f.classCode} = ?
      ORDER BY ${f.studentId} ASC`,
      [jxbh]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// 获取课程思政数据
async function getCourseIdeology(jxbh: string) {
  const { pool, config } = await getDataSourceConnection();
  const { tables } = config;
  const table = tables.courseIdeology;
  const f = table.fields;

  try {
    const [rows] = await pool.execute(
      `SELECT
        ${f.classCode},
        ${f.semesterCode},
        ${f.courseCode},
        ${f.courseName},
        ${f.teacherName},
        ${f.ideologyPoint},
        ${f.sequence}
      FROM ${table.name}
      WHERE ${f.classCode} = ?
      ORDER BY ${f.sequence} ASC`,
      [jxbh]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

// AI 总结函数
async function generateAISummary(params: {
  jxbh: string;
  courseType: 'undergraduate' | 'graduate';
  classroomStats: any[];
  supervisionRecords: any[];
  grades: any[];
  courseIdeology: any[];
}) {
  const config = getConfig();
  const aiConfig = config.ai;

  if (!aiConfig?.enabled || !aiConfig?.providers?.length) {
    throw new Error('AI 功能未启用或未配置');
  }

  // 使用第一个可用的 provider
  const provider = aiConfig.providers[0];
  const modelId = provider.models?.[0]?.modelId || 'minimax';

  // 构建提示词
  const prompt = buildSummaryPrompt(params);

  // 使用原生 fetch 调用 OpenAI 兼容 API
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: '你是一位经验丰富的高校教学管理部门专家，擅长分析教学数据并提供专业的教学评估总结。请从教学管理的角度，对教学班的教学情况进行全面、客观、专业的分析和总结。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AI API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '无法生成总结';
}

// 构建总结提示词
function buildSummaryPrompt(params: {
  jxbh: string;
  courseType: 'undergraduate' | 'graduate';
  classroomStats: any[];
  supervisionRecords: any[];
  grades: any[];
  courseIdeology: any[];
}) {
  const { jxbh, courseType, classroomStats, supervisionRecords, grades, courseIdeology } = params;

  let prompt = `请对以下${courseType === 'graduate' ? '研究生' : '本科生'}教学班（教学班号：${jxbh}）的教学情况进行专业分析和总结：\n\n`;

  // 课堂统计数据
  if (classroomStats.length > 0) {
    prompt += `## 一、课堂统计数据\n`;
    prompt += `共 ${classroomStats.length} 次课堂记录\n`;
    const avgAttention = classroomStats.reduce((sum, s) => sum + parseFloat(s.zzd || '0'), 0) / classroomStats.length;
    const avgActivity = classroomStats.reduce((sum, s) => sum + parseFloat(s.hyd || '0'), 0) / classroomStats.length;
    const avgHeadUp = classroomStats.reduce((sum, s) => sum + parseFloat(s.ttlv || '0'), 0) / classroomStats.length;
    const avgHeadDown = classroomStats.reduce((sum, s) => sum + parseFloat(s.dtlv || '0'), 0) / classroomStats.length;
    prompt += `平均专注度：${avgAttention.toFixed(2)}%，平均活跃度：${avgActivity.toFixed(2)}%\n`;
    prompt += `平均抬头率：${avgHeadUp.toFixed(2)}%，平均低头率：${avgHeadDown.toFixed(2)}%\n\n`;
  }

  // 督导记录
  if (supervisionRecords.length > 0) {
    prompt += `## 二、督导听课记录\n`;
    prompt += `共 ${supervisionRecords.length} 次督导听课\n`;
    supervisionRecords.forEach((record, index) => {
      prompt += `${index + 1}. ${record.xnxqmc}，参评人：${record.cprxm}，总分：${record.zf}分\n`;
      if (record.pjjy) prompt += `   评价建议：${record.pjjy.slice(0, 100)}${record.pjjy.length > 100 ? '...' : ''}\n`;
      if (record.pgzjyj) prompt += `   专家意见：${record.pgzjyj.slice(0, 100)}${record.pgzjyj.length > 100 ? '...' : ''}\n`;
    });
    prompt += `\n`;
  }

  // 成绩数据
  if (grades.length > 0) {
    const validGrades = grades.filter(g => g.sfyx === '1');
    const passCount = validGrades.filter(g => g.sfjg === '1').length;
    const avgScore = validGrades.reduce((sum, g) => sum + parseFloat(g.kccj || '0'), 0) / validGrades.length;
    const avgGPA = validGrades.reduce((sum, g) => sum + parseFloat(g.jd || '0'), 0) / validGrades.length;
    
    prompt += `## 三、学生成绩情况\n`;
    prompt += `总人数：${grades.length}人，有效成绩：${validGrades.length}人\n`;
    prompt += `及格人数：${passCount}人，及格率：${((passCount / validGrades.length) * 100).toFixed(2)}%\n`;
    prompt += `平均分：${avgScore.toFixed(2)}分，平均绩点：${avgGPA.toFixed(2)}\n\n`;
  }

  // 课程思政（仅本科生）
  if (courseType === 'undergraduate' && courseIdeology.length > 0) {
    prompt += `## 四、课程思政建设\n`;
    prompt += `共 ${courseIdeology.length} 个思政融入点\n`;
    courseIdeology.forEach((item, index) => {
      prompt += `${index + 1}. ${item.szrhd}\n`;
      if (item.xqzj) prompt += `   选取章节：${item.xqzj}\n`;
      if (item.szyrcl) prompt += `   育人策略：${item.szyrcl.slice(0, 80)}${item.szyrcl.length > 80 ? '...' : ''}\n`;
    });
    prompt += `\n`;
  }

  prompt += `\n请从以下几个方面进行分析和总结：\n`;
  prompt += `1. 教学整体情况评价（课堂氛围、学生参与度、教学效果等）\n`;
  prompt += `2. 存在的主要问题和不足\n`;
  prompt += `3. 改进建议和措施\n`;
  prompt += `4. 总体评价等级（优秀/良好/合格/需改进）及理由\n`;

  return prompt;
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
    } else if (action === 'textbooks') {
      const kcdm = searchParams.get('kcdm');

      if (!kcdm) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: kcdm' },
          { status: 400 }
        );
      }

      const data = await getTextbooks(kcdm);
      return NextResponse.json({ success: true, data });
    } else if (action === 'supervision-records') {
      const jxbid = searchParams.get('jxbid');

      if (!jxbid) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: jxbid' },
          { status: 400 }
        );
      }

      const data = await getSupervisionRecords(jxbid);
      return NextResponse.json({ success: true, data });
    } else if (action === 'grades') {
      const jxbh = searchParams.get('jxbh');
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate';

      if (!jxbh || !courseType) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: jxbh 或 course_type' },
          { status: 400 }
        );
      }

      const data = courseType === 'graduate' 
        ? await getGraduateGrades(jxbh)
        : await getUndergraduateGrades(jxbh);
      return NextResponse.json({ success: true, data });
    } else if (action === 'course-ideology') {
      const jxbh = searchParams.get('jxbh');

      if (!jxbh) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: jxbh' },
          { status: 400 }
        );
      }

      const data = await getCourseIdeology(jxbh);
      return NextResponse.json({ success: true, data });
    } else if (action === 'ai-summary') {
      const jxbh = searchParams.get('jxbh');
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate';

      if (!jxbh || !courseType) {
        return NextResponse.json(
          { success: false, message: '缺少必要参数: jxbh 或 course_type' },
          { status: 400 }
        );
      }

      // 获取所有相关数据
      const classroomStats = await getClassroomStats(jxbh) as any[];
      const supervisionRecords = await getSupervisionRecords(jxbh) as any[];
      const grades = (courseType === 'graduate' 
        ? await getGraduateGrades(jxbh)
        : await getUndergraduateGrades(jxbh)) as any[];
      const courseIdeology = (courseType === 'undergraduate' 
        ? await getCourseIdeology(jxbh)
        : []) as any[];

      // 生成 AI 总结
      const summary = await generateAISummary({
        jxbh,
        courseType,
        classroomStats,
        supervisionRecords,
        grades,
        courseIdeology,
      });

      return NextResponse.json({ success: true, data: summary });
    } else if (action === 'departments') {
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate' || 'undergraduate';
      const data = await getAllDepartments(courseType);
      return NextResponse.json({ success: true, data });
    } else {
      const courseType = searchParams.get('course_type') as 'undergraduate' | 'graduate' || 'undergraduate';
      const keyword = searchParams.get('keyword') || undefined;
      const dept = searchParams.get('dept') || undefined;
      const status = searchParams.get('status') || undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const per_page = parseInt(searchParams.get('per_page') || '10', 10);

      let result;
      if (courseType === 'graduate') {
        result = await getGraduateCourses({ keyword, dept, status, page, per_page });
      } else {
        result = await getUndergraduateCourses({ keyword, dept, status, page, per_page });
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
