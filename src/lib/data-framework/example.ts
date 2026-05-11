/**
 * 通用数据访问框架 - 使用示例
 *
 * 本文件展示如何使用 data-framework 快速构建数据驱动的应用
 */

import {
  TableConfig,
  AppBaseConfig,
  createConfigLoader,
  createDataQueryService,
  QueryOptions,
} from './index';

// ============================================
// 1. 定义字段映射类型
// ============================================

type CourseFields = Record<string, string>;
type StudentFields = Record<string, string>;

// 字段常量（用于类型提示）
const CourseFieldKeys = {
  courseCode: 'course_code',
  courseName: 'course_name',
  credits: 'credits',
  hours: 'total_hours',
  department: 'dept_code',
} as const;

const StudentFieldKeys = {
  studentId: 'student_id',
  name: 'student_name',
  gender: 'gender_code',
  major: 'major_code',
} as const;

// ============================================
// 2. 定义应用配置类型
// ============================================

interface EducationAppConfig extends AppBaseConfig {
  tables: {
    courses: TableConfig<CourseFields>;
    students: TableConfig<StudentFields>;
  };
}

// ============================================
// 3. 定义默认配置
// ============================================

const defaultEducationConfig: EducationAppConfig = {
  dataSourceId: '1', // 默认数据源
  tables: {
    courses: {
      name: 't_courses',
      fields: CourseFieldKeys,
    },
    students: {
      name: 't_students',
      fields: StudentFieldKeys,
    },
  },
};

// ============================================
// 4. 创建配置加载器
// ============================================

const configLoader = createConfigLoader<EducationAppConfig>(
  defaultEducationConfig,
  {
    configFileName: 'education-app.yaml',
    legacyConfigPath: 'apps.education', // 向后兼容路径
  }
);

// ============================================
// 5. 创建查询服务
// ============================================

const queryService = createDataQueryService(configLoader.getDataSourceId());

// ============================================
// 6. 使用示例
// ============================================

async function examples() {
  // 示例 1: 查询课程列表（带分页）
  async function queryCourses(page = 1, perPage = 10) {
    const result = await queryService.queryByTableConfig(
      configLoader.getTableConfig('courses'),
      {
        page,
        perPage,
        orderBy: 'course_code',
      }
    );

    if (result.success) {
      console.log(`查询到 ${result.total} 条课程记录`);
      return result.data;
    } else {
      console.error('查询失败:', result.error);
      return [];
    }
  }

  // 示例 2: 查询特定院系的学生
  async function queryStudentsByDepartment(departmentCode: string) {
    const result = await queryService.queryByTableConfig(
      configLoader.getTableConfig('students'),
      {
        where: { department: departmentCode },
        orderBy: 'student_id',
      }
    );

    return result;
  }

  // 示例 3: 使用数据对象方式查询
  // 在配置文件中可以改为使用 dataObjectId 而不是 name
  /*
  tables:
    courses:
      dataObjectId: 1  # 使用数据对象ID
      fields:
        courseCode: "course_code"
        courseName: "course_name"
        ...
  */
  async function queryUsingDataObject() {
    const result = await queryService.queryByTableConfig(
      {
        dataObjectId: 1, // 假设数据对象ID为1
        fields: {
          courseCode: 'course_code',
          courseName: 'course_name',
          credits: 'credits',
          hours: 'total_hours',
          department: 'dept_code',
        },
      },
      { page: 1, perPage: 20 }
    );

    return result;
  }

  // 示例 4: 多数据源查询
  // 不同表可以配置不同的数据源
  async function queryFromMultipleDataSources() {
    // 表1使用数据源 "1"
    const localCourses = await queryService.queryByTableConfig(
      {
        name: 't_courses',
        dataSourceId: '1', // 指定数据源
        fields: { courseCode: 'code', courseName: 'name' },
      },
      { page: 1, perPage: 10 }
    );

    // 表2使用数据源 "2"
    const remoteStudents = await queryService.queryByTableConfig(
      {
        name: 't_students',
        dataSourceId: '2', // 另一个数据源
        fields: { studentId: 'id', name: 'student_name' },
      },
      { page: 1, perPage: 10 }
    );

    return { localCourses, remoteStudents };
  }

  // 示例 5: 获取配置信息
  function showConfigInfo() {
    console.log('=== 配置信息 ===');
    console.log('全局数据源ID:', configLoader.getDataSourceId());
    console.log('配置的表:', configLoader.getTableNames());
    console.log('课程表配置:', configLoader.getTableConfig('courses'));
    console.log('配置文件路径:', configLoader.getConfigPath());
    console.log('配置文件存在:', configLoader.configExists());
  }
}

// ============================================
// 7. 完整的应用服务类示例
// ============================================

export class EducationAppService {
  private configLoader = createConfigLoader<EducationAppConfig>(
    defaultEducationConfig,
    { configFileName: 'education-app.yaml' }
  );

  private queryService = createDataQueryService(
    this.configLoader.getDataSourceId()
  );

  /**
   * 查询课程列表
   */
  async getCourses(page = 1, pageSize = 10) {
    const result = await this.queryService.queryByTableConfig(
      this.configLoader.getTableConfig('courses'),
      {
        page,
        perPage: pageSize,
        orderBy: 'course_code',
      }
    );

    return {
      data: result.data as Array<Record<keyof CourseFields, unknown>>,
      total: result.total || 0,
      error: result.error,
    };
  }

  /**
   * 查询学生列表
   */
  async getStudents(options: QueryOptions = {}) {
    const result = await this.queryService.queryByTableConfig(
      this.configLoader.getTableConfig('students'),
      options
    );

    return {
      data: result.data as Array<Record<keyof StudentFields, unknown>>,
      total: result.total || 0,
      error: result.error,
    };
  }

  /**
   * 重新加载配置
   */
  reloadConfig() {
    this.configLoader.reload();
    // 更新查询服务的全局数据源ID
    const newDataSourceId = this.configLoader.getDataSourceId();
    if (newDataSourceId) {
      this.queryService.setGlobalDataSourceId(newDataSourceId);
    }
  }
}

export default EducationAppService;
