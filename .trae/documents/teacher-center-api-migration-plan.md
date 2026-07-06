# 教师中心 Provider 全 API 迁移计划（API 已补齐版）

## Summary

`docs/中台接口文档` 目录中 43 份教师中心相关接口文档已全部到位（含此前缺失的 7 个 API）。`ynu-provider.ts` 已接入全部 43 个 API 端点，实现了 `ITeacherDataProvider` 的所有方法。

但全 API 迁移尚未彻底完成：`teacherAIChat.ts` 仍通过旧文件 `teacherCenterData.ts` 使用 MySQL 查询教师数据。本计划将完成最终收尾：把 AI 问答服务切到 Provider 模式、清理旧数据库代码、核对字段映射、运行构建与接口验证。

## Current State Analysis

### 已接入 API 的方法（ynu-provider.ts）

| 方法 | 当前实现 | 已用 API 端点数量 |
| ---- | ---- | ---- |
| `queryTeachers` | API | 1 |
| `queryTeacherBasic` | API | 1 |
| `queryTeacherExtendedInfo` | API | 5 个并行 |
| `queryDepartments` | API | 1（复用教职工基本信息 API） |
| `queryStatuses` | API | 1（复用教职工基本信息 API） |
| `queryCareerTimeline` | API | 10 个并行 |
| `queryResearchData` | API | 8 个并行 |
| `queryTeachingData` | API | 17 个主 API 并行 + 2 个二次查询 |
| `generateAISummary` | API | `${provider.baseUrl}/chat/completions` |

### 工作完成状态

以下工作均已完成：

1. **AI 问答服务已切到 Provider 模式** ✅：`src/lib/services/teacherAIChat.ts` 已改为通过 `createTeacherDataProvider()` 调用 Provider 接口，类型从 `@/lib/services/teacher-center/types` 导入。
2. **旧数据服务文件已删除** ✅：`src/lib/services/teacherCenterData.ts` 已无引用并从项目中移除。
3. **配置冗余已清理** ✅：`config/teacher-center.yaml` 已删除 `dataSourceId` 和 `tables` 节点；`src/lib/config/teacher-center.ts` 已移除 `TeacherCenterDataService`、`queryTeacherCenterTable` 等数据库相关代码。
4. **字段映射已核对** ✅：已依据 `docs/中台接口文档` 核对 `ynu-provider.ts` 中所有字段转换，并修正了课堂统计、课程团队成员、部门调动、专业技术职务、考核信息、奖励信息、科研获奖、本科生/研究生课程信息、教学奖励、教研论文、研究生教材、工作量、督导记录等接口的字段映射。
5. **构建与验证已通过** ✅：已运行 `npm run build`、`npx tsc --noEmit`、`npm run lint`，并测试所有 teacher-center action 接口（list、detail、departments、statuses、career、research、teaching、ai-summary、chat）。

## Proposed Changes

### 文件 1: `/Users/na57/workshop/pioc/src/lib/services/teacherAIChat.ts`

**What**: 将数据查询从 `teacherCenterData.ts` 改为通过 `createTeacherDataProvider()` 调用 Provider 接口，类型定义改为从 `@/lib/services/teacher-center` 导入。

**Why**: 这是全 API 迁移的最后一块拼图。AI 问答服务目前在后台仍走 MySQL，必须改为走 Provider，才能彻底摆脱对数据库表配置的依赖。

**How**:

1. 替换导入：
   ```typescript
   import { createTeacherDataProvider } from '@/lib/services/teacher-center';
   import type {
     Teacher,
     TeacherExtendedInfo,
     CareerTimelineItem,
     ResearchStats,
     TeachingStats,
     ResearchPaper,
     ResearchBook,
     ResearchPatent,
     ResearchAward,
     Teaching,
     Workload,
     TeachingAward,
   } from '@/lib/services/teacher-center/types';
   ```
2. 在 `processTeacherChat` 及相关函数开头创建 provider：
   ```typescript
   const provider = await createTeacherDataProvider();
   ```
3. 将所有 `queryTeacherBasic(gh)` 等调用替换为 `provider.queryTeacherBasic(gh)` 等。
4. 删除对 `teacherCenterData.ts` 的所有引用。
5. 注意 `TeacherCenterData.ts` 中的 `DepartmentTransfer` 仍使用 `ydwmc/xdwmc`，而 `teacher-center/types.ts` 已更新为 `ydwh/xdwh`，迁移到 Provider 类型后需确保 AI 问答中的字段引用一致。

### 文件 2: `/Users/na57/workshop/pioc/src/lib/services/teacherCenterData.ts`

**What**: 删除该文件。

**Why**: 该文件是旧 MySQL 数据服务，仅被 `teacherAIChat.ts` 引用。AI 问答服务迁移到 Provider 后将无任何引用。

**How**: 确认无其他引用后直接删除。

### 文件 3: `/Users/na57/workshop/pioc/src/lib/services/teacher-center/index.ts`（若不存在则创建）

**What**: 确认或补齐 `createTeacherDataProvider` 和类型的统一导出，方便 `teacherAIChat.ts` 导入。

**Why**: 减少跨模块导入路径，保持与 `src/app/api/teacher-center/route.ts` 一致的导入方式。

**How**: 检查 `src/lib/services/teacher-center/index.ts` 是否已导出 `createTeacherDataProvider` 和所需类型；如未导出则补充。

### 文件 4: `/Users/na57/workshop/pioc/src/lib/services/teacher-center/providers/ynu-provider.ts`

**What**: 依据 `docs/中台接口文档` 核对并修正所有 API 字段映射。

**Why**: 虽然所有 API 已接入，但部分字段映射（如课堂统计、课程团队成员、本科生/研究生课程信息等）仍需与接口文档逐字核对，避免展示错误。

**How**:

1. 重点核对接口：
   - 云大学堂 AI 课堂统计结果：`classroomStats` 的 `JXBH` 过滤方式及 `ZZD/HYD/TTLV/DTLV/YSJLV/SJD` 等字段。
   - 本科生课程团队成员明细：`courseTeams` 的 `KCTDCY/KCFZR/DGZDRQ` 等字段。
   - 本科生/研究生课程信息：`KCJBMc/KCJBMC`、`KCFLMC/KCLBMC` 等字段。
   - 本科生/研究生教学奖励：`JXCGH/JXCGBH`、`JLJBM` 等字段。
   - 本科生/研究生教研论文：`LWTM`、`QKMC` 等字段。
2. 修正 `transformTeacher` 及各个 `map` 转换中的字段名。
3. 如接口返回字段与类型定义不一致，同步修正 `src/lib/services/teacher-center/types.ts`。

### 文件 5: `/Users/na57/workshop/pioc/config/teacher-center.yaml`

**What**: 删除 `dataSourceId` 和 `tables` 节点，仅保留 `provider` 和 `ai` 配置。

**Why**: 全 API 迁移后，教师中心不再通过数据库表读取数据，`tables` 配置成为死配置。

**How**:

1. 删除 `dataSourceId` 行。
2. 删除整个 `tables` 节点。
3. 保留：
   ```yaml
   provider: "ynu"
   ai:
     providerId: "local-minimax"
   ```

### 文件 6: `/Users/na57/workshop/pioc/src/lib/config/teacher-center.ts`

**What**: 移除数据库查询相关的代码，仅保留配置加载和 `provider`/`ai` 读取能力。

**Why**: `TeacherCenterDataService`、`queryTeacherCenterTable`、`getTeacherCenterQueryService` 等在全 API 迁移后不再使用。

**How**:

1. 移除 `createQueryFunction`、`BaseDataService`、`QueryOptions`、`QueryResult` 等不需要的导入。
2. 移除所有 `TableConfig` 字段映射类型（如 `TeacherBasicFieldMapping` 等），或仅保留最小类型以通过编译。
3. 移除 `queryTable`、`queryTeacherCenterTable`、`TeacherCenterDataService`、`teacherCenterDataService`、`getTeacherCenterQueryService`。
4. 保留 `createAppConfigBundle`、`loadTeacherCenterConfig`、`getTeacherCenterConfig`、`getTeacherCenterConfigLoader`。
5. 简化 `TeacherCenterConfig` 类型：移除 `tables` 属性，仅保留 `provider`、`ai`。
6. 同步简化 `defaultConfig`。

## 实施步骤

### 阶段一：AI 问答服务迁移到 Provider（P0）

1. 修改 `teacherAIChat.ts`，改用 `createTeacherDataProvider()` 获取数据。
2. 从 `teacher-center/types.ts` 导入所需类型。
3. 删除 `teacherCenterData.ts` 的导入。
4. 检查并修正 `DepartmentTransfer` 等字段引用（`ydwh/xdwh`）。

### 阶段二：删除旧数据服务文件（P0）

1. 确认 `teacherCenterData.ts` 已无任何引用。
2. 删除 `src/lib/services/teacherCenterData.ts`。

### 阶段三：字段映射核对（P1）

1. 逐份阅读 `docs/中台接口文档` 中的 43 份接口文档。
2. 核对 `ynu-provider.ts` 中所有字段转换逻辑。
3. 修正字段名不匹配或遗漏的字段。
4. 同步修正 `types.ts` 中与实际 API 字段不符的类型定义。

### 阶段四：清理配置（P1）✅ 已完成

1. 修改 `config/teacher-center.yaml`，删除 `dataSourceId` 和 `tables` 节点，保留 `provider` 和 `ai`。
2. 修改 `src/lib/config/teacher-center.ts`：
   - 简化 `TeacherCenterConfig` 类型，移除 `tables`。
   - 移除 `queryTeacherCenterTable`、`TeacherCenterDataService` 等。
   - 移除不再使用的 `TableConfig` 字段映射类型。
3. 为支持 API-only 应用，将 `src/lib/data-framework/types.ts` 中的 `AppBaseConfig.tables` 改为可选，并在 `config-loader.ts` 中增加 `tables` 为 `undefined` 时的保护。

### 阶段五：构建与验证（P1）

1. 安装/检查依赖：
   ```bash
   npm install
   ```
2. 类型检查：
   ```bash
   npx tsc --noEmit
   ```
3. 构建：
   ```bash
   npm run build
   ```
4. Lint：
   ```bash
   npm run lint
   ```
5. 接口功能测试：
   - 教师列表：`GET /api/teacher-center?action=list&page=1&pageSize=10`
   - 教师详情：`GET /api/teacher-center?action=detail&gh=H0003711`
   - 部门列表：`GET /api/teacher-center?action=departments`
   - 状态列表：`GET /api/teacher-center?action=statuses`
   - 教职生涯：`GET /api/teacher-center?action=career&gh=H0003711`
   - 科研数据：`GET /api/teacher-center?action=research&gh=H0003711`
   - 教学数据：`GET /api/teacher-center?action=teaching&gh=H0003711`
   - AI 总结：`GET /api/teacher-center?action=ai-summary&gh=H0003711`
   - AI 问答：`POST /api/teacher-center/chat`（body: `{ "gh": "H0003711", "message": "请介绍这位老师" }`）
6. 前端页面验证：
   - 访问 `/teacher-center` 教师列表页。
   - 访问 `/teacher-center/{gh}` 教师详情页。
   - 检查所有标签页数据是否正确加载。
   - 在 AI 问答标签页发送问题，确认回答基于 API 数据。

## Assumptions & Decisions

1. **认证方式**：继续使用环境变量 `YNU_API_KEY` 和 `YNU_API_SECRET` 获取 `access_token`。
2. **API 调用方式**：使用 POST body 传递查询参数，URL 中附带 `access_token`。
3. **API Base URL**：`https://dmp.ynu.edu.cn`。
4. **错误处理**：单个 API 失败不影响其他 API，返回空数据或默认值。
5. **并行策略**：同一页面的多个独立 API 使用 `Promise.all` 并行调用。
6. **Provider 回退**：`createTeacherDataProvider` 在配置读取失败时回退到 `ynu` Provider。
7. **配置清理原则**：`config/teacher-center.yaml` 仅保留 `provider` 和 `ai`；`src/lib/config/teacher-center.ts` 移除所有数据库查询相关代码。
8. **旧文件删除**：`teacherCenterData.ts` 在确认无引用后删除。

## Verification Steps

1. 类型检查：`npx tsc --noEmit`
2. 构建验证：`npm run build`
3. Lint 检查：`npm run lint`
4. 接口功能测试（见阶段五）
5. 前端页面验证（见阶段五）
6. 确认 `teacherCenterData.ts` 已从项目移除

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
| ---- | ---- | ---- |
| AI 问答服务迁移时类型不兼容 | 编译失败 | 从 `teacher-center/types.ts` 导入统一类型，必要时调整字段名 |
| 删除 `teacherCenterData.ts` 时遗漏引用 | 编译或运行时错误 | 全局搜索确认无引用后再删除 |
| 清理 `teacher-center.yaml` 后其他代码仍依赖 `tables` | 编译失败 | 同步修改 `src/lib/config/teacher-center.ts` 的 `TeacherCenterConfig` 类型，确保类型一致 |
| API 字段映射不准确 | 数据展示错误 | 依据接口文档逐项核对，重点核对课堂统计、课程团队、课程信息等新接口 |
| 部门/状态列表通过全量教职工信息去重获取，性能较差 | 列表页加载慢 | 当前先保证功能正确，后续可申请独立部门/状态接口优化 |
