# 教师中心数据提供者重构计划

## 摘要

将教师中心应用的数据访问层重构为"抽象接口 + 具体实现"模式。定义 `ITeacherDataProvider` 接口，将现有数据库访问逻辑封装为 `YnuDataProvider`（云南大学实现），使系统能够支持不同学校通过实现该接口来接入不同的数据源（数据库或API）。

## 当前状态分析

### 现有架构
- **数据服务层**: `/src/lib/services/teacherCenterData.ts` - 包含所有数据获取方法，直接操作MySQL
- **配置层**: `/src/lib/config/teacher-center.ts` - 定义44个表的字段映射
- **API路由**: `/src/app/api/teacher-center/route.ts` - 调用数据服务方法
- **数据框架**: `/src/lib/data-framework/` - 提供通用查询能力

### 需要抽象的数据获取方法
1. `queryTeachers()` - 教师列表查询（分页、筛选）
2. `queryTeacherBasic()` - 单个教师基本信息
3. `queryTeacherExtendedInfo()` - 教师扩展信息
4. `queryDepartments()` - 部门列表（筛选用）
5. `queryStatuses()` - 状态列表（筛选用）
6. `queryCareerTimeline()` - 教职生涯时间线
7. `queryResearchData()` - 科研数据聚合
8. `queryTeachingData()` - 教学数据聚合
9. `generateAISummary()` - AI总结生成

### 数据类型
所有类型定义已在 `teacherCenterData.ts` 中定义，包括：
- `Teacher`, `TeacherExtendedInfo`, `TeacherTitle` 等基本信息类型
- `ResearchPaper`, `ResearchBook`, `ResearchStats` 等科研类型
- `Teaching`, `Workload`, `TeachingStats` 等教学类型
- `CareerTimelineItem` 时间线类型

## 提议的变更

### 1. 创建数据提供者接口和类型文件

**文件**: `/src/lib/services/teacher-center/types.ts`

创建新的类型定义文件，包含：
- 所有输入参数类型（`QueryTeachersParams`, `AISummaryInput` 等）
- 分页结果类型 `PaginatedResult<T>`
- 聚合数据类型 `ResearchData`, `TeachingData`
- `ITeacherDataProvider` 接口定义

**内容要点**:
```typescript
export interface ITeacherDataProvider {
  queryTeachers(params: QueryTeachersParams): Promise<PaginatedResult<Teacher>>;
  queryTeacherBasic(gh: string): Promise<Teacher | null>;
  queryTeacherExtendedInfo(gh: string): Promise<TeacherExtendedInfo>;
  queryDepartments(): Promise<Department[]>;
  queryStatuses(): Promise<Status[]>;
  queryCareerTimeline(gh: string): Promise<CareerTimelineItem[]>;
  queryResearchData(gh: string): Promise<ResearchData>;
  queryTeachingData(gh: string): Promise<TeachingData>;
  generateAISummary(data: AISummaryInput): Promise<string>;
}
```

### 2. 创建云南大学数据提供者实现

**文件**: `/src/lib/services/teacher-center/providers/ynu-provider.ts`

将现有 `teacherCenterData.ts` 中的实现迁移到此文件：
- 实现 `ITeacherDataProvider` 接口
- 保留所有现有的SQL查询逻辑
- 保留数据源连接管理
- 保留AI总结生成逻辑

**迁移策略**:
- 复制现有方法实现
- 调整方法签名以匹配接口
- 保持所有内部辅助方法（`executeQuery`, `getDataSourceConnection` 等）

### 3. 创建数据提供者工厂

**文件**: `/src/lib/services/teacher-center/factory.ts`

创建工厂函数：
```typescript
export function createTeacherDataProvider(schoolCode: string): ITeacherDataProvider {
  switch (schoolCode) {
    case 'ynu':
    default:
      return new YnuDataProvider();
  }
}
```

### 4. 创建统一的 Barrel 导出文件

**文件**: `/src/lib/services/teacher-center/index.ts`

集中导出：
- 所有类型定义
- `ITeacherDataProvider` 接口
- `createTeacherDataProvider` 工厂函数
- 数据类型（从 types.ts 重新导出）

### 5. 重构 API 路由

**文件**: `/src/app/api/teacher-center/route.ts`

修改内容：
- 不再直接导入 `teacherCenterData.ts` 的方法
- 使用工厂创建数据提供者实例
- 所有方法调用改为通过提供者实例

**修改示例**:
```typescript
// 修改前
import { queryTeachers, ... } from '@/lib/services/teacherCenterData';

// 修改后
import { createTeacherDataProvider } from '@/lib/services/teacher-center';
const provider = createTeacherDataProvider(process.env.SCHOOL_CODE || 'ynu');

// 调用方式
const result = await provider.queryTeachers({...});
```

### 6. 保留向后兼容（可选）

**文件**: `/src/lib/services/teacherCenterData.ts`

保留原文件，但改为从新的提供者实现中导出：
```typescript
// 从新的统一入口导出，保持向后兼容
export * from './teacher-center';
```

或者完全删除，更新所有引用。

## 文件结构变更

```
src/lib/services/
├── teacher-center/                    # 新增目录
│   ├── index.ts                       # 统一导出
│   ├── types.ts                       # 接口和类型定义
│   ├── factory.ts                     # 提供者工厂
│   └── providers/
│       └── ynu-provider.ts            # 云南大学实现
└── teacherCenterData.ts               # 保留或删除（向后兼容）
```

## 实现步骤

### 步骤 1: 创建类型定义文件
- 创建 `/src/lib/services/teacher-center/types.ts`
- 定义 `ITeacherDataProvider` 接口
- 定义所有参数和返回类型
- 从原文件复制数据类型定义

### 步骤 2: 创建云南大学提供者
- 创建 `/src/lib/services/teacher-center/providers/ynu-provider.ts`
- 实现 `ITeacherDataProvider` 接口
- 迁移所有数据获取方法
- 迁移辅助方法（连接管理、查询执行等）

### 步骤 3: 创建工厂和索引文件
- 创建 `/src/lib/services/teacher-center/factory.ts`
- 创建 `/src/lib/services/teacher-center/index.ts`
- 实现 `createTeacherDataProvider` 工厂函数

### 步骤 4: 重构 API 路由
- 修改 `/src/app/api/teacher-center/route.ts`
- 使用新的数据提供者
- 测试所有API端点

### 步骤 5: 验证构建
- 运行 `npm run build`
- 修复任何类型错误或导入错误
- 确保没有运行时错误

## 假设和决策

1. **环境变量**: 使用 `SCHOOL_CODE` 环境变量来决定使用哪个数据提供者
2. **默认实现**: 默认使用 `ynu`（云南大学）实现，确保现有功能不受影响
3. **类型保留**: 所有现有数据类型保持不变，确保前端组件无需修改
4. **AI功能**: `generateAISummary` 也纳入接口，因为不同学校可能有不同的AI服务
5. **向后兼容**: 可选择保留原文件作为导出代理，或完全迁移后删除

## 验证步骤

1. **类型检查**: `npm run build` 无类型错误
2. **功能验证**: 
   - 教师列表页面正常加载
   - 教师详情页面正常加载
   - 科研数据面板正常显示
   - 教学数据面板正常显示
   - AI总结功能正常工作
3. **代码审查**: 确认接口设计合理，易于其他学校实现

## 扩展指南（供其他学校参考）

其他学校实现数据提供者的步骤：

1. 创建新的提供者类实现 `ITeacherDataProvider`
2. 在工厂中添加新的 case
3. 设置 `SCHOOL_CODE` 环境变量

示例：
```typescript
// providers/school-b-provider.ts
export class SchoolBDataProvider implements ITeacherDataProvider {
  async queryTeachers(params) {
    // 调用学校B的API
  }
  // ... 其他方法实现
}

// factory.ts
case 'school-b':
  return new SchoolBDataProvider();
```
