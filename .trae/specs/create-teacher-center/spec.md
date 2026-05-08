# 教师中心应用 Spec

## Why
为了便于管理者全面了解教师的情况，实现教师画像功能，需要一个类似于课程中心的应用来展示教师的基本信息、科研情况、教学情况等数据，并支持AI智能总结。

## What Changes
- 新增教师中心应用页面 (`/teacher-center`)
- 新增教师详情页面 (`/teacher-center/[gh]`)
- 新增教师中心API路由 (`/api/teacher-center`)
- 新增教师中心配置文件（支持自定义文件名，通过config.yaml指定）
- 新增教师中心数据服务 (`src/lib/services/teacherCenterData.ts`)
- 新增教师中心配置模块 (`src/lib/config/teacher-center.ts`)

## Impact
- 新增应用：教师中心
- 受影响模块：应用菜单、路由配置、主配置(config.yaml)
- 数据结构：教职工基本信息、岗位信息、专业技术职务、科研论文、科研著作、科研专利、科研获奖、岗位聘任、考核、奖励、教学授课、教学项目、教学工作量、督导记录等

## ADDED Requirements

### Requirement: 教师列表页面
The system SHALL provide a teacher list page that allows users to search and browse teachers.

#### Scenario: Success case
- **WHEN** user visits `/teacher-center`
- **THEN** display a list of teachers with search and filter capabilities
- **AND** support searching by name, employee number
- **AND** support filtering by department (select dropdown)
- **AND** support filtering by status (在岗、离职等)
- **AND** support pagination

### Requirement: 教师详情页面
The system SHALL provide a teacher detail page that displays comprehensive information about a specific teacher.

#### Scenario: Success case
- **WHEN** user clicks on a teacher in the list
- **THEN** navigate to `/teacher-center/[gh]` page
- **AND** display teacher's basic information in header
- **AND** provide tabs for different information categories:
  - **基本信息**：个人详细信息展示
  - **教职生涯**：融合展示岗位聘任、专业技术职务、考核信息、奖励信息、部门调动、聘用合同等
  - **科研情况**：融合展示科技论文、科研著作、科研专利、科研获奖，图文并茂
  - **教学情况**：融合展示授课信息、教学工作量、教学项目、督导记录、课堂统计等
- **AND** provide AI summary functionality

### Requirement: 科研情况Tab
The system SHALL provide a comprehensive research tab that integrates all research data with visual presentation.

#### Scenario: Success case
- **WHEN** user views the "科研情况" tab
- **THEN** display integrated research dashboard including:
  - 统计卡片：论文总数、著作总数、专利总数、获奖总数
  - 论文列表：论文名称、发表期刊、发表日期、收录情况、影响因子
  - 著作列表：著作名称、出版社、出版日期、ISBN
  - 专利列表：专利名称、专利类型、申请日期、授权状态
  - 获奖列表：获奖名称、获奖级别、获奖日期、颁奖单位
  - 可视化图表：科研成果趋势图、类型分布图
- **AND** support filtering and searching within each section

### Requirement: 教职生涯Tab
The system SHALL provide a career timeline tab that integrates all career-related information.

#### Scenario: Success case
- **WHEN** user views the "教职生涯" tab
- **THEN** display career timeline including:
  - 岗位聘任信息：岗位名称、聘任日期、聘任级别
  - 专业技术职务：职务名称、评定日期、聘任情况
  - 考核信息：考核年度、考核结果
  - 奖励信息：奖励名称、奖励级别、获奖日期
  - 部门调动：调动日期、原部门、新部门
  - 聘用合同：合同类型、签订日期、到期日期
- **AND** display in chronological order (timeline view)
- **AND** highlight current status

### Requirement: 教学情况Tab
The system SHALL provide a comprehensive teaching tab that integrates all teaching-related data.

#### Scenario: Success case
- **WHEN** user views the "教学情况" tab
- **THEN** display integrated teaching dashboard including:
  - 统计卡片：本科授课门数、研究生授课门数、总教学工作量、督导听课次数
  - 授课信息列表：
    - 本科生授课：课程名称、教学班号、学期、上课班级、学生人数
    - 研究生授课：课程名称、教学班号、学期、学生人数
  - 教学工作量统计：按学期统计授课学时、课程门数
  - 教学研究项目：项目名称、项目类别、立项时间、本人排名
  - 督导记录：听课时间、评分、评价建议
  - 课堂统计（如有）：专注度、活跃度、抬头率等AI课堂数据
  - 指导学生竞赛获奖：竞赛名称、获奖等级、获奖时间
- **AND** support filtering by semester
- **AND** display charts for teaching workload trends

### Requirement: AI教师画像总结
The system SHALL provide AI-powered summary of teacher's profile based on available data.

#### Scenario: Success case
- **WHEN** user clicks "AI总结" button
- **THEN** system collects all available teacher data (basic info, research, teaching, career)
- **AND** generates a comprehensive analysis including:
  - 教学科研整体评价
  - 主要成果亮点
  - 发展趋势分析
  - 综合评价等级

### Requirement: 数据源配置
The system SHALL support flexible data source configuration with customizable config file name.

#### Scenario: Success case
- **WHEN** admin configures `config.yaml` with teacher center config file name
- **THEN** system reads the specified configuration file
- **AND** supports both direct table names and data object IDs
- **AND** falls back to default config if not specified

**配置示例：**
```yaml
apps:
  teacherCenter:
    configFile: "teacher-center.yaml"  # 可自定义配置文件名
```

## Data Tables

### 核心表
1. **教职工基本信息明细** (`t_dws_gxjg_jzgjbxxmx`)
   - 工号(gh), 姓名(xm), 单位(dwh, dwmc), 性别(xbm, xbmmc)
   - 职称(zyjszwdm, zyjszwdmmc), 职务(dzzw)
   - 联系方式(yddh, dzyx), 照片(zp)
   - 当前状态码(dqztm, dqztmmc)

2. **岗位基本信息明细** (`t_dws_gxjg_gwjbxxmx`)
   - 岗位编码(gwbm), 岗位名称(gwmc)
   - 单位编码(dwbm), 单位名称(dwmc)

3. **教职工专业技术职务信息明细** (`t_dws_gxjg_jzgzyjszwxxmx`)
   - 工号(gh), 专业技术职务(zyjszwmmc)
   - 评定日期(pdrq), 聘任日期(prqsrq)

### 教职生涯相关表
4. **教职工专技岗位聘任信息明细** (`t_dws_gxjg_jzgzyjspxxxmx`)
   - 工号(gh), 岗位名称(zyjsgwmc)
   - 聘任日期(prrq), 岗位等级(zyjsgwlbdjmmc)

5. **教职工管理岗位聘任信息明细** (`t_dws_gxjg_jzgglgwprxxmx`)
   - 工号(gh), 岗位等级(glgwdjdmmc)
   - 聘任日期(prrq)

6. **教职工工勤岗位聘任信息明细** (`t_dws_gxjg_jzggqgwprxxmx`)
   - 工号(gh), 岗位等级(gqgwdjdmmc)
   - 聘任日期(prrq)

7. **教职工考核信息明细** (`t_dws_gxjg_jzgkhxxmx`)
   - 工号(gh), 考核年度(khnd)
   - 考核结果(khjgmc)

8. **教职工奖励信息明细** (`t_dws_gxjg_jzgjlxxmx`)
   - 工号(gh), 奖励名称(jlmc)
   - 奖励级别(jljbmc), 获奖日期(jlhq)

9. **教职工部门调动信息明细** (`t_dws_gxjg_jzgbmddxxmx`)
   - 工号(gh), 调动日期(ddrq)
   - 原部门(ydwmc), 新部门(xdwmc)

10. **教职工聘用合同管理信息明细** (`t_dws_gxjg_jzg聘用合同htglxxmx`)
    - 工号(gh), 合同类型(htlxmc)
    - 签订日期(qdrq), 到期日期(dqrq)

### 科研表
11. **科技论文及作者明细** (`t_dws_gxky_kjlwjzzmx`)
    - 论文编号(lwbh), 论文名称(lwzwmc)
    - 作者工号(lwdyzzgh), 作者姓名(lwdyzzmc)
    - 发表期刊(fbkwmc), 发表日期(lwfbrq)
    - 收录情况(lzslqkmc), 影响因子(yxyz)

12. **科研著作及作者明细** (`t_dws_gxky_kyzzjzzmx`)
    - 著作编号(zzbh), 著作名称(zzzwmc)
    - 第一作者工号(zzdyzzgh), 第一作者姓名(zzdyzzxm)
    - 出版社(cbs), 出版日期(cbrq), ISBN(isbnh)

13. **科研专利及作者明细** (`t_dws_gxky_kyzljzzmx`)
    - 专利成果编号(zlcgbh), 专利名称(zlcgmc)
    - 第一发明人工号(dyfmrgh), 第一发明人姓名(dyfmrxm)
    - 专利类型(zllxmc), 申请日期(zlsqrq), 授权日期(sqggrq)

14. **科研获奖成果及作者明细** (`t_dws_gxky_kyhjcgjzzmx`)
    - 获奖成果编号(hjcgbh), 获奖名称(hjmc)
    - 第一完成人工号(dywcrgh), 第一完成人姓名(dywcrxm)
    - 获奖级别(hjjbmc), 获奖日期(hjrq)

### 教学表
15. **本专科生教师授课信息** (`t_dws_gxjx_bzksjsskxx_v11mx`)
    - 教师工号(jsgh), 教师姓名(jsxm)
    - 教学班号(jxbh), 课程代码(kcdm), 课程名称(kcmc)
    - 学年学期(xnxqdm, xnxqmc)
    - 上课班级(skbjmc), 修读人数(xdrs)

16. **研究生教师授课信息** (`t_dws_gxjx_yjsjsskxxmx`)
    - 教师工号(jsgh), 教师姓名(jsxm)
    - 教学班号(jxbh), 课程代码(kcdm), 课程名称(kcmc)
    - 学年学期(xnxqdm, xnxqmc)
    - 院系名称(yxmc), 修读人数(xdrs)

17. **本科生教师授课工作量** (`t_ynu_gxjx_bzksjsskgzl`)
    - 教师号(jsh), 教师名(jsm)
    - 课程号(kch), 课程名(kcm)
    - 学年学期(xnxqdm, xnxqmc)
    - 选课人数(xkrs), 学时(xs), 排课学时(pkxs)

18. **研究生教师授课工作量** (`t_ynu_gxjx_yjsjsskgzl`)
    - 教师号(jsh), 教师名(jsm)
    - 课程号(kch), 课程名(kcm)
    - 学年学期(xnxqdm, xnxqmc)
    - 选课人数(xkrs), 学时(xs)

19. **本科生教学研究项目信息明细** (`t_dws_gxjx_bzksjxyjxmxxmx`)
    - 项目成员工号(xmcygh), 项目成员姓名(xmcyxm)
    - 项目名称(xmmc), 项目类别(xmlb)
    - 立项时间(lxsj), 本人排名(brpm)

20. **研究生教师教学研究项目** (`t_ynu_gxjx_yjsjssjxjyxm`)
    - 教师工号(jsgh), 教师姓名(jsxm)
    - 项目名称(xmmc), 项目类别(xmlb)
    - 立项日期(lxrq), 本人排名(brpm)

21. **督导记录** (`t_dws_ydxt_ydxtddjlmx`)
    - 被评人(bpr), 被评人姓名(bprxm)
    - 课程代码(kcdm), 课程名称(kcmc)
    - 听课时间(tksj), 总分(zf)
    - 评价建议(pjjy), 专家意见(pgzjyj)

22. **云大学堂AI课堂统计结果** (`t_ynu_gxjx_aikttjjg`)
    - 教学班号(jxbh), 学年学期(xnxqmc)
    - 专注度(zzd), 活跃度(hyd)
    - 抬头率(ttlv), 低头率(dtlv)

23. **教职工指导本科生竞赛获奖信息** (`t_ynu_gxjx_jzgzdbksjshjxx`)
    - 教师工号(jsgh), 教师姓名(jsxm)
    - 竞赛名称(jsmc), 获奖等级(hjdj)
    - 获奖时间(hjsj)

### 排除的敏感数据表
以下数据表因涉及个人隐私，**不包含**在本应用中：

| 表名 | 排除原因 |
|------|----------|
| 教职工收养情况信息 (`t_ynu_gxjg_jzgsyqkxx`) | 涉及家庭隐私敏感信息 |
| 教职工独子信息 (`t_ynu_gxjg_jzgdzxx`) | 涉及家庭隐私敏感信息 |
| 教职工银行账户信息明细 (`t_dws_gxjg_jzgyhzhxxmx`) | 涉及金融隐私敏感信息 |
| 教职工家庭成员信息明细 | 涉及家庭隐私敏感信息 |
| 教职工联系信息（详细） | 涉及个人隐私，基本信息中已包含必要的联系方式 |

> **说明**：以上敏感信息如需查阅，请向相关部门申请调阅。

## Technical Design

### 页面结构
```
teacher-center/
├── page.tsx                    # 教师列表页
├── [gh]/
│   └── page.tsx               # 教师详情页
├── layout.tsx                 # 布局文件
└── components/                # 组件目录
    ├── ResearchDashboard.tsx  # 科研情况综合展示组件
    ├── CareerTimeline.tsx     # 教职生涯时间线组件
    ├── TeachingDashboard.tsx  # 教学情况综合展示组件
    └── StatCard.tsx           # 统计卡片组件
```

### API 结构
```
api/teacher-center/
└── route.ts                   # 统一API路由
```

### 配置结构
```typescript
interface TeacherCenterConfig {
  dataSourceId?: string;
  configFile?: string;          // 配置文件名（从config.yaml读取）
  tables: {
    // 核心表
    teacherBasic: TableConfig<TeacherBasicFieldMapping>;
    teacherTitle: TableConfig<TeacherTitleFieldMapping>;
    // 教职生涯表
    positionAppointment: TableConfig<PositionAppointmentFieldMapping>;
    managementAppointment: TableConfig<ManagementAppointmentFieldMapping>;
    workerAppointment: TableConfig<WorkerAppointmentFieldMapping>;
    assessment: TableConfig<AssessmentFieldMapping>;
    award: TableConfig<AwardFieldMapping>;
    departmentTransfer: TableConfig<DepartmentTransferFieldMapping>;
    contract: TableConfig<ContractFieldMapping>;
    // 科研表
    researchPaper: TableConfig<ResearchPaperFieldMapping>;
    researchBook: TableConfig<ResearchBookFieldMapping>;
    researchPatent: TableConfig<ResearchPatentFieldMapping>;
    researchAward: TableConfig<ResearchAwardFieldMapping>;
    // 教学表
    undergraduateTeaching: TableConfig<TeachingFieldMapping>;
    graduateTeaching: TableConfig<TeachingFieldMapping>;
    undergraduateWorkload: TableConfig<WorkloadFieldMapping>;
    graduateWorkload: TableConfig<WorkloadFieldMapping>;
    undergraduateTeachingProject: TableConfig<TeachingProjectFieldMapping>;
    graduateTeachingProject: TableConfig<TeachingProjectFieldMapping>;
    supervisionRecord: TableConfig<SupervisionRecordFieldMapping>;
    classroomStats: TableConfig<ClassroomStatsFieldMapping>;
    studentCompetitionAward: TableConfig<CompetitionAwardFieldMapping>;
  };
}
```

### 路由配置
- 列表页: `/teacher-center`
- 详情页: `/teacher-center/[gh]` (gh=工号)

### 主配置扩展
在 `config.yaml` 中支持教师中心配置：
```yaml
apps:
  teacherCenter:
    configFile: "teacher-center.yaml"  # 可选，默认为teacher-center.yaml
```

## UI Design

### 列表页
- 搜索栏：姓名/工号搜索输入框
- 筛选栏：
  - 部门筛选（下拉选择）
  - 状态筛选（在岗、离职等）
- 表格：工号、姓名、单位、职称、当前状态、联系方式、操作按钮

### 详情页
- 头部：教师姓名、工号、单位、职称、照片、AI总结按钮
- 标签页：
  - **基本信息**：个人详细信息展示（Descriptions组件）
  - **教职生涯**：时间线形式展示岗位、职务、考核、奖励、调动、合同等
  - **科研情况**：综合仪表盘，包含统计卡片、图表、分类列表
  - **教学情况**：综合仪表盘，包含统计卡片、授课列表、工作量统计、教学项目、督导记录

### 科研情况Tab设计
```
┌─────────────────────────────────────────────────────┐
│ [论文: 25] [著作: 8] [专利: 12] [获奖: 5]           │  <- 统计卡片行
├─────────────────────────────────────────────────────┤
│ [科研成果趋势图]      [类型分布饼图]                │  <- 图表行
├─────────────────────────────────────────────────────┤
│ 论文列表 (表格/卡片)                                 │
│ 著作列表 (表格/卡片)                                 │
│ 专利列表 (表格/卡片)                                 │
│ 获奖列表 (表格/卡片)                                 │
└─────────────────────────────────────────────────────┘
```

### 教职生涯Tab设计
```
┌─────────────────────────────────────────────────────┐
│ ●──────●────────●────●────────●                     │  <- 时间线
│ 2020   2021     2022 2023     2024                  │
│ 岗位聘任: 副教授    考核: 优秀                       │
│ 部门调动: 计算机->软件                               │
└─────────────────────────────────────────────────────┘
```

### 教学情况Tab设计
```
┌─────────────────────────────────────────────────────┐
│ [本科授课: 5] [研究生授课: 3] [工作量: 320] [督导: 2]│  <- 统计卡片行
├─────────────────────────────────────────────────────┤
│ [教学工作量趋势图]    [授课类型分布]                │  <- 图表行
├─────────────────────────────────────────────────────┤
│ 本科生授课列表 (表格)                                │
│ 研究生授课列表 (表格)                                │
│ 教学研究项目 (表格)                                  │
│ 督导记录 (卡片列表)                                  │
│ 指导学生竞赛获奖 (表格)                              │
└─────────────────────────────────────────────────────┘
```

## Dependencies
- Ant Design v6 (UI组件)
- ECharts (图表)
- React Markdown (AI总结展示)
