# 课程中心多 Provider 适配计划

## Context

教师中心已完成全 API 迁移，并形成了一套清晰的多 Provider 适配模式：

- 抽象接口：`ITeacherDataProvider`
- 工厂动态加载：`createTeacherDataProvider()` 按配置 `provider` 字段加载 `providers/{name}-provider.ts`
- 各校实现：约定文件名 `{name}-provider.ts`、类名 `{Name}DataProvider`
- 配置驱动：`config/teacher-center.yaml` 中 `provider: "ynu"`

课程中心目前已经具备类似的 Provider 雏形（`ICourseDataProvider`、`createCourseDataProvider`、云南大学 MySQL 实现），但实现上还不够完整：

- `ynu-provider.ts` 目前只实现了本科生课程查询，研究生课程查询被注释为“简化处理”。
- Provider 接口的查询方法缺少 `type: 'undergraduate' | 'graduate'` 参数，导致 API 层无法把课程类型透传给 Provider。
- 前端列表页虽然已有 URL 参数同步，但部分响应结构（`result.data` vs `result.data.data`）与 API 路由不一致。
- Provider 直接操作 MySQL Pool，代码重复较多，可复用 Data Framework 的 `queryCourseCenterTable` 做简单查询，复杂 SQL 仍保留原始查询。

本计划的目标是让课程中心具备与教师中心一致的 Provider 扩展能力，同时保持 Provider 仍然通过数据库/数据源获取数据，确保当前功能可用。

## Scope

**本次改造范围：**

1. 完善 `ICourseDataProvider` 接口，支持 `type` 参数区分本科/研究生。
2. 重构 `YnuDataProvider`，完整实现本科/研究生课程查询，并保持直接数据库访问。
3. 调整 API 路由，把 `course_type` 透传给 Provider。
4. 调整前端列表页，统一响应结构消费，确保筛选/分页/URL 同步稳定。
5. 类型检查与构建验证。

**本次不改造范围：**

- 不将课程中心 Provider 改为 API 调用（按用户要求保留数据库/数据源访问）。
- 不新增详情页的标签页或 AI 功能（详情页类型可从服务层导入，但不扩展接口方法）。

## Implementation Plan

### Phase 1: 接口与类型对齐

**文件：** `src/lib/services/course-center/types.ts`

1. 在 `QueryCoursesParams` 中新增 `type?: 'undergraduate' | 'graduate'`。
2. 在 `QueryTeachingClassesParams`、`QueryClassroomStatsParams`、`QueryTextbooksParams` 中新增 `type?: 'undergraduate' | 'graduate'`。
3. 修改 `queryCourseByCode` 签名，增加 `type?: 'undergraduate' | 'graduate'` 参数。
4. 在 `queryDepartments`、`queryCourseNatures`、`queryCourseCategories` 中增加 `type?: 'undergraduate' | 'graduate'` 参数。
5. 将 `src/app/course-center/page.tsx` 和 `src/app/course-center/[kch]/page.tsx` 中局部定义的 `Course`、`TeachingClass`、`ClassroomStats`、`Textbook` 等类型提升到服务层并导出，确保前后端使用同一类型。

### Phase 2: Provider 实现重构

**文件：** `src/lib/services/course-center/providers/ynu-provider.ts`

1. **复用 Data Framework 做简单查询：**
   - 使用 `queryCourseCenterTable` 替代手写 SQL 的 `queryCourseByCode`。
   - 对需要 `LIKE`、`DISTINCT` 或跨表判断的查询，保留原始 SQL，但封装一个统一的 `queryRaw` 私有方法。
2. **支持本科/研究生切换：**
   - `queryCourses` 根据 `params.type` 选择 `undergraduateCourse` 或 `graduateCourse` 表。
   - `queryCourseByCode` 根据 `type` 参数选择对应表。
   - `queryTeachingClasses` 根据 `type` 选择 `undergraduateTeaching` 或 `graduateTeaching` 表。
   - `queryTextbooks` 本科使用 `undergraduateTextbook` 表，研究生返回空数组（当前无研究生教材表配置）。
   - `queryClassroomStats` 本科/研究生共用 `classroomStats` 表（按 `courseCode` 过滤）。
   - `queryDepartments`、`queryCourseNatures`、`queryCourseCategories` 根据 `type` 选择对应课程表做 `DISTINCT`。
3. **保持数据库访问方式：**
   - 继续使用 `getDataSourcePool` 或直接 `mysql.createPool` 获取连接。
   - 不改为 API 调用。
4. **减少重复代码：**
   - 抽取 `buildCourseWhereClause` 私有方法，统一处理 keyword/dept/status/nature/category 筛选。
   - 抽取 `getCourseTableName(type)`、`getTeachingTableName(type)` 等辅助函数。

### Phase 3: API 路由对齐

**文件：** `src/app/api/course-center/route.ts`

1. 在 `handleCourseList` 中读取 `course_type` 参数，并传入 `provider.queryCourses({ ..., type: course_type })`。
2. 在 `handleCourseDetail` 中读取 `course_type` 参数，并传入 `provider.queryCourseByCode(kch, course_type)`。
3. 在 `handleTeachingClasses`、`handleTextbooks`、`handleClassroomStats` 中读取 `course_type` 并传入对应 Provider 方法。
4. 在 `handleDepartments`、`handleNatures`、`handleCategories` 中读取 `course_type` 并传入。
5. 移除未使用的 `createAppProtectedHandler` 和 `appUrl`（若确实未使用），避免 lint 警告。
6. 保持响应格式：
   - 列表：`{ success: true, data: { data, total, page, per_page, max_page } }`
   - 其他：`{ success: true, data: { ... } }`

### Phase 4: 前端页面调整

**文件：** `src/app/course-center/page.tsx`

1. 将本地 `Course` 类型改为从 `@/lib/services/course-center` 导入。
2. 适配 API 响应格式：
   - `setCourses(result.data.data)`（当前直接使用 `result.data`，与路由不一致）。
   - `setPagination` 使用 `result.data.page`、`result.data.per_page`、`result.data.total`。
3. 修复分页 `onChange` 重复调用 `fetchCourses` 的问题：
   - `onChange` 只更新 `pagination` 状态，由 `useEffect` 统一触发 `fetchCourses` 和 URL 同步。
4. 搜索/重置/类型切换时重置到第 1 页，避免旧页码残留。
5. URL 参数初始化逻辑基本已具备，仅需确保 `type` 为空时默认为 `undergraduate` 且不会写入 URL（当前 `if (courseType)` 会写入，可保留）。

**文件：** `src/app/course-center/[kch]/page.tsx`

1. 将本地 `Course`、`TeachingClass`、`ClassroomStats`、`Textbook` 类型改为从 `@/lib/services/course-center` 导入。
2. 获取课程详情时增加 `course_type` 参数（可先尝试 `undergraduate`，找不到再回退到 `graduate`，或从列表页 URL 传入）。
3. 返回列表时保留上一页 URL 参数（若当前使用 `router.push('/course-center')`，改为 `router.back()` 或构造带参 URL）。

### Phase 5: 配置与导出

**文件：** `src/lib/config/course-center.ts`

1. 确认 `CourseCenterConfig` 已包含 `provider?: string`（当前已有 `provider: 'ynu'`）。
2. 在配置导出中增加 `reloadCourseCenterConfig()` 便捷函数，内部调用 `appBundle.reloadConfig()` 和 `clearProviderCache()`，与教师中心保持一致。

**文件：** `config/course-center.yaml`

1. 在文件顶部显式添加 `provider: "ynu"`（当前配置文件中缺少该字段，依赖 `src/lib/config/course-center.ts` 中的默认值）。

**文件：** `src/lib/services/course-center/index.ts`

1. 导出新增/调整后的类型，确保 `@/lib/services/course-center` 统一入口可用。

### Phase 6: 验证

1. **类型检查：**
   ```bash
   npx tsc --noEmit
   ```
2. **构建：**
   ```bash
   npm run build
   ```
3. **浏览器验证：**
   - 访问 `/course-center`，默认加载本科课程。
   - 切换“研究生课程”，确认 URL 参数 `type=graduate` 生效且列表刷新。
   - 使用搜索、单位、状态筛选，确认 URL 同步；刷新页面或复制 URL 在新标签页打开，筛选状态保留。
   - 分页切换后刷新页面，页码保留。
   - 点击课程进入详情页，再返回列表，确认筛选参数保留。

## Critical Files

- `src/lib/services/course-center/types.ts`
- `src/lib/services/course-center/providers/ynu-provider.ts`
- `src/app/api/course-center/route.ts`
- `src/app/course-center/page.tsx`
- `src/app/course-center/[kch]/page.tsx`
- `src/lib/config/course-center.ts`
- `config/course-center.yaml`

## Risks & Mitigations

| 风险 | 影响 | 缓解措施 |
| ---- | ---- | ---- |
| 研究生表字段映射与本科不一致 | 查询结果字段错误 | 严格按 `config/course-center.yaml` 中的字段映射构造 SQL |
| 修改响应格式导致前端消费失败 | 页面白屏或数据不显示 | 同步修改 `page.tsx` 中的 `result.data` 访问路径 |
| URL 参数同步与数据请求循环 | 重复请求或死循环 | 使用 `isFirstRender` ref 控制首次渲染，分页只更新状态不直接请求 |
| Provider 缓存导致配置热加载不生效 | 切换 provider 后仍使用旧实例 | 提供 `reloadCourseCenterConfig()` 并调用 `clearProviderCache()` |
