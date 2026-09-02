import { NextRequest, NextResponse } from 'next/server';
import {
  createCourseDataProvider,
  Course,
  TeachingClass,
  ClassroomStats,
  Textbook,
  Department,
  CourseNature,
  CourseCategory,
  CourseType,
} from '@/lib/services/course-center';

// 定义API响应类型
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 督导记录类型
interface SupervisionRecord {
  wybs: string;
  wjdm: string;
  bpr: string;
  bprxm: string;
  cpr: string;
  cprxm: string;
  kcdm: string;
  kcmc: string;
  jxbid: string;
  zf: string;
  ydrs: string;
  sdrs: string;
  tksj: string;
  xnxqdm: string;
  xnxqmc: string;
  pglxdm: string;
  pgwjwybs: string;
  pgwjdm: string;
  pgbpr: string;
  pgbprxm: string;
  pgcpr: string;
  pgcprxm: string;
  pgkcdm: string;
  pgkcmc: string;
  pgzjyj: string;
  pgysjg: string;
  pgjxbid: string;
  pgglwid: string;
  pjjy: string;
  tstamp: string;
}

// 课程思政类型
interface CourseIdeology {
  px: string;
  szrhd: string;
  xqzj: string;
  zsdqr: string;
  szjhd: string;
  szyrcl: string;
  tstamp: string;
  jxbh: string;
}

// 图谱节点类型
interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  extraInfo?: string;
  children?: GraphNode[];
}

// 课程列表响应
interface CourseListResponse {
  data: Course[];
  total: number;
  page: number;
  per_page: number;
  max_page: number;
}

// 课程详情响应
interface CourseDetailResponse {
  course: Course | null;
}

// 教学班列表响应
interface TeachingClassListResponse {
  data: TeachingClass[];
}

// 课堂统计响应
interface ClassroomStatsResponse {
  data: ClassroomStats[];
}

// 教材列表响应
interface TextbookListResponse {
  data: Textbook[];
}

// 部门列表响应
interface DepartmentListResponse {
  departments: Department[];
}

// 课程性质列表响应
interface CourseNatureListResponse {
  natures: CourseNature[];
}

// 课程类别列表响应
interface CourseCategoryListResponse {
  categories: CourseCategory[];
}

/**
 * GET /api/course-center?action=xxx&...
 * 统一API路由处理课程中心相关请求
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    // 动态创建数据提供者实例（从配置文件中读取 provider 名称）
    const provider = await createCourseDataProvider();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await handleCourseList(searchParams, provider);
      case 'detail':
        return await handleCourseDetail(searchParams, provider);
      case 'departments':
        return await handleDepartments(searchParams, provider);
      case 'natures':
        return await handleNatures(searchParams, provider);
      case 'categories':
        return await handleCategories(searchParams, provider);
      case 'teaching-classes':
        return await handleTeachingClasses(searchParams, provider);
      case 'classroom-stats':
        return await handleClassroomStats(searchParams, provider);
      case 'textbooks':
        return await handleTextbooks(searchParams, provider);
      case 'supervision-records':
        return await handleSupervisionRecords(searchParams, provider);
      case 'course-ideology':
        return await handleCourseIdeology(searchParams, provider);
      case 'course-graph':
        return await handleCourseGraph(searchParams, provider);
      default:
        return NextResponse.json(
          { success: false, error: '未知的action参数' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('课程中心API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 读取课程类型参数
 */
function getCourseType(searchParams: URLSearchParams): CourseType {
  const type = searchParams.get('course_type');
  return type === 'graduate' ? 'graduate' : 'undergraduate';
}

/**
 * 处理课程列表请求
 */
async function handleCourseList(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CourseListResponse>>> {
  const keyword = searchParams.get('keyword') || undefined;
  const dept = searchParams.get('dept') || undefined;
  const status = searchParams.get('status') || undefined;
  const nature = searchParams.get('nature') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '10', 10);
  const courseType = getCourseType(searchParams);

  const result = await provider.queryCourses({
    keyword,
    dept,
    status,
    nature,
    category,
    type: courseType,
    page,
    pageSize: per_page,
  });

  const max_page = Math.ceil(result.total / per_page);

  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
      page,
      per_page,
      max_page,
    },
  });
}

/**
 * 处理课程详情请求
 */
async function handleCourseDetail(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CourseDetailResponse>>> {
  const kch = searchParams.get('kch');

  if (!kch) {
    return NextResponse.json(
      { success: false, error: '缺少kch参数' },
      { status: 400 }
    );
  }

  const courseType = getCourseType(searchParams);
  const course = await provider.queryCourseByCode(kch, courseType);

  return NextResponse.json({
    success: true,
    data: { course },
  });
}

/**
 * 处理部门列表请求
 */
async function handleDepartments(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<DepartmentListResponse>>> {
  const courseType = getCourseType(searchParams);
  const departments = await provider.queryDepartments(courseType);

  return NextResponse.json({
    success: true,
    data: { departments },
  });
}

/**
 * 处理课程性质列表请求
 */
async function handleNatures(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CourseNatureListResponse>>> {
  const courseType = getCourseType(searchParams);
  const natures = await provider.queryCourseNatures(courseType);

  return NextResponse.json({
    success: true,
    data: { natures },
  });
}

/**
 * 处理课程类别列表请求
 */
async function handleCategories(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CourseCategoryListResponse>>> {
  const courseType = getCourseType(searchParams);
  const categories = await provider.queryCourseCategories(courseType);

  return NextResponse.json({
    success: true,
    data: { categories },
  });
}

/**
 * 处理教学班列表请求
 */
async function handleTeachingClasses(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<TeachingClassListResponse>>> {
  const kch = searchParams.get('kch');

  if (!kch) {
    return NextResponse.json(
      { success: false, error: '缺少kch参数' },
      { status: 400 }
    );
  }

  const courseType = getCourseType(searchParams);
  const result = await provider.queryTeachingClasses({
    kch,
    type: courseType,
    page: 1,
    pageSize: 1000, // 教学班通常不多，一次性返回
  });

  return NextResponse.json({
    success: true,
    data: { data: result.data },
  });
}

/**
 * 处理督导记录请求
 */
async function handleSupervisionRecords(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<SupervisionRecord[]>>> {
  const jxbid = searchParams.get('jxbid');

  if (!jxbid) {
    return NextResponse.json(
      { success: false, error: '缺少jxbid参数' },
      { status: 400 }
    );
  }

  const records = await provider.querySupervisionRecords(jxbid);

  return NextResponse.json({
    success: true,
    data: records,
  });
}

/**
 * 处理课程思政请求
 */
async function handleCourseIdeology(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CourseIdeology[]>>> {
  const jxbh = searchParams.get('jxbh');

  if (!jxbh) {
    return NextResponse.json(
      { success: false, error: '缺少jxbh参数' },
      { status: 400 }
    );
  }

  const ideology = await provider.queryCourseIdeology(jxbh);

  return NextResponse.json({
    success: true,
    data: ideology,
  });
}

/**
 * 处理课程图谱请求
 * 返回完整的图谱数据，包含所有层级的节点
 * 结构：课程 -> 学期 -> 教学班 -> (课堂统计 | 督导信息 | 课程思政 | 成绩信息)
 */
async function handleCourseGraph(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<{ children: GraphNode[] }>>> {
  const kch = searchParams.get('kch');

  if (!kch) {
    return NextResponse.json(
      { success: false, error: '缺少kch参数' },
      { status: 400 }
    );
  }

  const courseType = getCourseType(searchParams);

  try {
    // 1. 获取教学班列表
    const teachingClassesResult = await provider.queryTeachingClasses({
      kch,
      type: courseType,
      page: 1,
      pageSize: 1000,
    });

    // 2. 按学期分组教学班
    const semesterMap = new Map<string, { xnxqdm: string; xnxqmc: string; classes: any[] }>();
    
    for (const tc of teachingClassesResult.data) {
      const xnxqdm = tc.xnxqdm || '未知学期';
      const xnxqmc = tc.xnxqmc || '未知学期';
      
      if (!semesterMap.has(xnxqdm)) {
        semesterMap.set(xnxqdm, {
          xnxqdm,
          xnxqmc,
          classes: [],
        });
      }
      semesterMap.get(xnxqdm)!.classes.push(tc);
    }

    const children: GraphNode[] = [];

    // 3. 遍历每个学期，构建学期节点和教学班子节点
    for (const [xnxqdm, semesterData] of semesterMap) {
      // 学期节点
      const semesterNode: GraphNode = {
        id: xnxqdm,
        node_type: 'semester',
        name: semesterData.xnxqmc || xnxqdm,
        extraInfo: `共 ${semesterData.classes.length} 个教学班`,
        children: [],
      };

      // 4. 遍历该学期下的教学班
      for (const tc of semesterData.classes) {
        const jxbh = tc.jxbh;
        const extraInfo = tc.jsxm ? `教师: ${tc.jsxm}` : '';

        // 教学班节点
        const teachingClassNode: GraphNode = {
          id: jxbh,
          node_type: 'teaching_class',
          name: tc.jxbmc || jxbh,
          extraInfo,
          children: [],
        };

        // 5. 获取课堂统计数据
        try {
          const statsResult = await provider.queryClassroomStats({
            kch,
            type: courseType,
            jxbh,
            page: 1,
            pageSize: 100,
          });

          if (statsResult.data.length > 0) {
            const latestStat = statsResult.data[0];
            teachingClassNode.children!.push({
              id: `${jxbh}_stats`,
              node_type: 'classroom_stats',
              name: `课堂统计 (${statsResult.data.length}条)`,
              status: `${latestStat.zzd || '0'}% 专注度`,
              extraInfo: `活跃度: ${latestStat.hyd || '0'}% | 抬头率: ${latestStat.ttlv || '0'}%`,
            });
          }
        } catch {
          // 静默失败，不影响其他数据
        }

        // 6. 获取督导信息
        try {
          const supervisionRecords = await provider.querySupervisionRecords(jxbh);

          if (supervisionRecords.length > 0) {
            teachingClassNode.children!.push({
              id: `${jxbh}_supervision`,
              node_type: 'supervision',
              name: `督导信息 (${supervisionRecords.length}条)`,
              extraInfo: `总分: ${supervisionRecords[0].zf || '-'}`,
            });
          }
        } catch {
          // 静默失败
        }

        // 7. 获取课程思政数据
        try {
          const ideology = await provider.queryCourseIdeology(jxbh);

          if (ideology.length > 0) {
            teachingClassNode.children!.push({
              id: `${jxbh}_ideology`,
              node_type: 'course_ideology',
              name: `课程思政 (${ideology.length}点)`,
              extraInfo: ideology.slice(0, 2).map((i: any) => i.szrhd).join('; '),
            });
          }
        } catch {
          // 静默失败
        }

        semesterNode.children!.push(teachingClassNode);
      }

      children.push(semesterNode);
    }

    return NextResponse.json({
      success: true,
      data: { children },
    });
  } catch (error) {
    console.error('课程图谱数据获取失败:', error);
    return NextResponse.json(
      { success: false, error: '获取课程图谱数据失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理课堂统计数据请求
 */
async function handleClassroomStats(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<ClassroomStatsResponse>>> {
  const kch = searchParams.get('kch');
  const jxbh = searchParams.get('jxbh') || undefined;

  if (!kch) {
    return NextResponse.json(
      { success: false, error: '缺少kch参数' },
      { status: 400 }
    );
  }

  const courseType = getCourseType(searchParams);
  const result = await provider.queryClassroomStats({
    kch,
    type: courseType,
    jxbh,
    page: 1,
    pageSize: 1000,
  });

  return NextResponse.json({
    success: true,
    data: { data: result.data },
  });
}

/**
 * 处理教材列表请求
 */
async function handleTextbooks(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<TextbookListResponse>>> {
  const kch = searchParams.get('kch');

  if (!kch) {
    return NextResponse.json(
      { success: false, error: '缺少kch参数' },
      { status: 400 }
    );
  }

  const courseType = getCourseType(searchParams);
  const result = await provider.queryTextbooks({
    kch,
    type: courseType,
    page: 1,
    pageSize: 1000,
  });

  return NextResponse.json({
    success: true,
    data: { data: result.data },
  });
}
