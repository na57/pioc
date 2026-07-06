import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import {
  createCourseDataProvider,
  Course,
  TeachingClass,
  ClassroomStats,
  Textbook,
  Department,
  CourseNature,
  CourseCategory,
} from '@/lib/services/course-center';

const appUrl = '/course-center';

// 定义API响应类型
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

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
        return await handleDepartments(provider);
      case 'natures':
        return await handleNatures(provider);
      case 'categories':
        return await handleCategories(provider);
      case 'teaching-classes':
        return await handleTeachingClasses(searchParams, provider);
      case 'classroom-stats':
        return await handleClassroomStats(searchParams, provider);
      case 'textbooks':
        return await handleTextbooks(searchParams, provider);
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

  const result = await provider.queryCourses({
    keyword,
    dept,
    status,
    nature,
    category,
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

  const course = await provider.queryCourseByCode(kch);

  return NextResponse.json({
    success: true,
    data: { course },
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
 * 处理课程性质列表请求
 */
async function handleNatures(
  provider: any
): Promise<NextResponse<ApiResponse<CourseNatureListResponse>>> {
  const natures = await provider.queryCourseNatures();

  return NextResponse.json({
    success: true,
    data: { natures },
  });
}

/**
 * 处理课程类别列表请求
 */
async function handleCategories(
  provider: any
): Promise<NextResponse<ApiResponse<CourseCategoryListResponse>>> {
  const categories = await provider.queryCourseCategories();

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

  const result = await provider.queryTeachingClasses({
    kch,
    page: 1,
    pageSize: 1000, // 教学班通常不多，一次性返回
  });

  return NextResponse.json({
    success: true,
    data: { data: result.data },
  });
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

  const result = await provider.queryClassroomStats({
    kch,
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

  const result = await provider.queryTextbooks({
    kch,
    page: 1,
    pageSize: 1000,
  });

  return NextResponse.json({
    success: true,
    data: { data: result.data },
  });
}
