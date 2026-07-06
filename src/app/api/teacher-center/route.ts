import { NextRequest, NextResponse } from 'next/server';
import {
  createTeacherDataProvider,
  Teacher,
  TeacherExtendedInfo,
  CareerTimelineItem,
  ResearchStats,
  TeachingStats,
} from '@/lib/services/teacher-center';
import { getConfig } from '@/lib/config';

// 定义API响应类型
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 教师列表响应
interface TeacherListResponse {
  data: Teacher[];
  total: number;
}

// 教师详情响应
interface TeacherDetailResponse {
  basic: Teacher | null;
  extended: TeacherExtendedInfo | null;
}

// 部门列表响应
interface DepartmentListResponse {
  departments: { dwh: string; dwmc: string }[];
}

// 状态列表响应
interface StatusListResponse {
  statuses: { dqztm: string; dqztmmc: string }[];
}

// 教职生涯响应
interface CareerResponse {
  timeline: CareerTimelineItem[];
}

// 科研数据响应
interface ResearchResponse {
  papers: any[];
  books: any[];
  patents: any[];
  awards: any[];
  appraisals: any[];
  transfers: any[];
  reports: any[];
  artworks: any[];
  stats: ResearchStats;
}

// 教学数据响应
interface TeachingResponse {
  undergraduateTeaching: any[];
  graduateTeaching: any[];
  undergraduateWorkload: any[];
  graduateWorkload: any[];
  undergraduateProjects: any[];
  graduateProjects: any[];
  supervisionRecords: any[];
  classroomStats: any[];
  competitionAwards: any[];
  undergraduateCourseInfo: any[];
  graduateCourseInfo: any[];
  undergraduateTextbooks: any[];
  graduateTextbooks: any[];
  undergraduateTeachingAwards: any[];
  graduateTeachingAwards: any[];
  undergraduateTeachingPapers: any[];
  graduateTeachingPapers: any[];
  courseTeams: any[];
  textbookAwards: any[];
  stats: TeachingStats;
}

// AI总结响应
interface AISummaryResponse {
  summary: string;
  timeout: number;
}

/**
 * GET /api/teacher-center?action=xxx&...
 * 统一API路由处理教师中心相关请求
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    // 动态创建数据提供者实例（从配置文件中读取 provider 名称）
    const provider = await createTeacherDataProvider();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await handleTeacherList(searchParams, provider);
      case 'detail':
        return await handleTeacherDetail(searchParams, provider);
      case 'departments':
        return await handleDepartments(provider);
      case 'statuses':
        return await handleStatuses(provider);
      case 'career':
        return await handleCareer(searchParams, provider);
      case 'research':
        return await handleResearch(searchParams, provider);
      case 'teaching':
        return await handleTeaching(searchParams, provider);
      case 'ai-summary':
        return await handleAISummary(searchParams, provider);
      default:
        return NextResponse.json(
          { success: false, error: '未知的action参数' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('教师中心API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理教师列表请求
 */
async function handleTeacherList(
  searchParams: URLSearchParams, 
  provider: any
): Promise<NextResponse<ApiResponse<TeacherListResponse>>> {
  const keyword = searchParams.get('keyword') || undefined;
  const department = searchParams.get('department') || undefined;
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const result = await provider.queryTeachers({
    keyword,
    department,
    status,
    page,
    pageSize,
  });

  return NextResponse.json({
    success: true,
    data: result,
  });
}

/**
 * 处理教师详情请求
 */
async function handleTeacherDetail(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<TeacherDetailResponse>>> {
  const gh = searchParams.get('gh');

  if (!gh) {
    return NextResponse.json(
      { success: false, error: '缺少gh参数' },
      { status: 400 }
    );
  }

  const [basic, extended] = await Promise.all([
    provider.queryTeacherBasic(gh),
    provider.queryTeacherExtendedInfo(gh),
  ]);

  return NextResponse.json({
    success: true,
    data: { basic, extended: extended || null },
  });
}

/**
 * 处理部门列表请求
 */
async function handleDepartments(
  provider: any
): Promise<NextResponse<ApiResponse<DepartmentListResponse>>> {
  const departments = await provider.queryDepartments();

  return NextResponse.json({
    success: true,
    data: { departments },
  });
}

/**
 * 处理状态列表请求
 */
async function handleStatuses(
  provider: any
): Promise<NextResponse<ApiResponse<StatusListResponse>>> {
  const statuses = await provider.queryStatuses();

  return NextResponse.json({
    success: true,
    data: { statuses },
  });
}

/**
 * 处理教职生涯请求
 */
async function handleCareer(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<CareerResponse>>> {
  const gh = searchParams.get('gh');

  if (!gh) {
    return NextResponse.json(
      { success: false, error: '缺少gh参数' },
      { status: 400 }
    );
  }

  const timeline = await provider.queryCareerTimeline(gh);

  return NextResponse.json({
    success: true,
    data: { timeline },
  });
}

/**
 * 处理科研数据请求
 */
async function handleResearch(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<ResearchResponse>>> {
  const gh = searchParams.get('gh');

  if (!gh) {
    return NextResponse.json(
      { success: false, error: '缺少gh参数' },
      { status: 400 }
    );
  }

  const { papers, books, patents, awards, appraisals, transfers, reports, artworks, stats } = await provider.queryResearchData(gh);

  return NextResponse.json({
    success: true,
    data: {
      papers,
      books,
      patents,
      awards,
      appraisals,
      transfers,
      reports,
      artworks,
      stats,
    },
  });
}

/**
 * 处理教学数据请求
 */
async function handleTeaching(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<TeachingResponse>>> {
  const gh = searchParams.get('gh');

  if (!gh) {
    return NextResponse.json(
      { success: false, error: '缺少gh参数' },
      { status: 400 }
    );
  }

  const {
    undergraduateTeaching,
    graduateTeaching,
    undergraduateWorkload,
    graduateWorkload,
    undergraduateProjects,
    graduateProjects,
    supervisionRecords,
    classroomStats,
    competitionAwards,
    undergraduateCourseInfo,
    graduateCourseInfo,
    undergraduateTextbooks,
    graduateTextbooks,
    undergraduateTeachingAwards,
    graduateTeachingAwards,
    undergraduateTeachingPapers,
    graduateTeachingPapers,
    courseTeams,
    textbookAwards,
    stats,
  } = await provider.queryTeachingData(gh);

  return NextResponse.json({
    success: true,
    data: {
      undergraduateTeaching,
      graduateTeaching,
      undergraduateWorkload,
      graduateWorkload,
      undergraduateProjects,
      graduateProjects,
      supervisionRecords,
      classroomStats,
      competitionAwards,
      undergraduateCourseInfo,
      graduateCourseInfo,
      undergraduateTextbooks,
      graduateTextbooks,
      undergraduateTeachingAwards,
      graduateTeachingAwards,
      undergraduateTeachingPapers,
      graduateTeachingPapers,
      courseTeams,
      textbookAwards,
      stats,
    },
  });
}

/**
 * 处理AI总结请求
 */
async function handleAISummary(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<AISummaryResponse>>> {
  const gh = searchParams.get('gh');

  if (!gh) {
    return NextResponse.json(
      { success: false, error: '缺少gh参数' },
      { status: 400 }
    );
  }

  // 获取AI配置中的timeout
  const config = getConfig();
  const timeout = config.ai?.timeout || 60;

  // 并行获取所有需要的数据
  const [basic, extended, career, research, teaching] = await Promise.all([
    provider.queryTeacherBasic(gh),
    provider.queryTeacherExtendedInfo(gh),
    provider.queryCareerTimeline(gh),
    provider.queryResearchData(gh),
    provider.queryTeachingData(gh),
  ]);

  if (!basic) {
    return NextResponse.json(
      { success: false, error: '教师不存在' },
      { status: 404 }
    );
  }

  const summary = await provider.generateAISummary({
    teacher: basic,
    extendedInfo: extended,
    career,
    research: research.stats,
    teaching: teaching.stats,
  });

  return NextResponse.json({
    success: true,
    data: { summary, timeout },
  });
}
