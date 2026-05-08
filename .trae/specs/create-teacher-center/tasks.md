# Tasks - 教师中心应用开发

## Task 1: 创建配置文件
- [ ] 创建 `config/teacher-center.yaml` 配置文件
  - [ ] 配置数据源ID
  - [ ] 配置教职工基本信息表映射
  - [ ] 配置专业技术职务表映射
  - [ ] 配置专技岗位聘任表映射
  - [ ] 配置管理岗位聘任表映射
  - [ ] 配置工勤岗位聘任表映射
  - [ ] 配置考核信息表映射
  - [ ] 配置奖励信息表映射
  - [ ] 配置部门调动表映射
  - [ ] 配置聘用合同表映射
  - [ ] 配置科研论文表映射
  - [ ] 配置科研著作表映射
  - [ ] 配置科研专利表映射
  - [ ] 配置科研获奖表映射
  - [ ] 配置本科生授课信息表映射
  - [ ] 配置研究生授课信息表映射
  - [ ] 配置本科生授课工作量表映射
  - [ ] 配置研究生授课工作量表映射
  - [ ] 配置本科生教学研究项目表映射
  - [ ] 配置研究生教学研究项目表映射
  - [ ] 配置督导记录表映射
  - [ ] 配置AI课堂统计表映射
  - [ ] 配置指导学生竞赛获奖表映射

## Task 2: 创建配置模块
- [ ] 创建 `src/lib/config/teacher-center.ts` 配置模块
  - [ ] 定义所有字段映射接口（含教学相关表）
  - [ ] 实现从config.yaml读取configFile名称的逻辑
  - [ ] 实现配置加载函数（支持自定义文件名）
  - [ ] 实现配置获取函数
  - [ ] 提供默认配置

## Task 3: 创建数据服务
- [ ] 创建 `src/lib/services/teacherCenterData.ts` 数据服务
  - [ ] 实现教师列表查询函数
  - [ ] 实现教师基本信息查询函数
  - [ ] 实现教职生涯数据查询函数（合并岗位、职务、考核、奖励、调动、合同）
  - [ ] 实现科研数据查询函数（论文、著作、专利、获奖）
  - [ ] 实现教学数据查询函数（授课信息、工作量、教学项目、督导记录、竞赛获奖）
  - [ ] 实现部门列表查询函数（用于筛选）
  - [ ] 实现状态列表查询函数（用于筛选）
  - [ ] 实现AI总结生成功能

## Task 4: 创建API路由
- [ ] 创建 `src/app/api/teacher-center/route.ts` API路由
  - [ ] 实现教师列表接口 (action=list)
  - [ ] 实现教师详情接口 (action=detail)
  - [ ] 实现部门列表接口 (action=departments)
  - [ ] 实现状态列表接口 (action=statuses)
  - [ ] 实现教职生涯接口 (action=career)
  - [ ] 实现科研数据接口 (action=research)
  - [ ] 实现教学数据接口 (action=teaching)
  - [ ] 实现AI总结接口 (action=ai-summary)

## Task 5: 创建页面布局
- [ ] 创建 `src/app/teacher-center/layout.tsx` 布局文件
  - [ ] 配置页面标题
  - [ ] 设置页面布局结构

## Task 6: 创建教师列表页
- [ ] 创建 `src/app/teacher-center/page.tsx` 列表页
  - [ ] 实现教师数据表格展示
  - [ ] 实现搜索功能（姓名、工号）
  - [ ] 实现部门筛选功能（下拉选择）
  - [ ] 实现状态筛选功能
  - [ ] 实现分页功能
  - [ ] 实现点击跳转详情页

## Task 7: 创建教师详情页
- [ ] 创建 `src/app/teacher-center/[gh]/page.tsx` 详情页
  - [ ] 实现头部信息展示（姓名、工号、单位、职称、照片）
  - [ ] 实现AI总结按钮和抽屉
  - [ ] 实现标签页切换功能（基本信息、教职生涯、科研情况、教学情况）

## Task 8: 创建科研情况Tab组件
- [ ] 创建 `src/app/teacher-center/components/ResearchDashboard.tsx`
  - [ ] 实现统计卡片组件（论文、著作、专利、获奖数量）
  - [ ] 实现科研成果趋势图（ECharts折线图）
  - [ ] 实现类型分布饼图
  - [ ] 实现论文列表展示
  - [ ] 实现著作列表展示
  - [ ] 实现专利列表展示
  - [ ] 实现获奖列表展示

## Task 9: 创建教职生涯Tab组件
- [ ] 创建 `src/app/teacher-center/components/CareerTimeline.tsx`
  - [ ] 实现时间线布局（Ant Design Timeline）
  - [ ] 整合岗位聘任数据
  - [ ] 整合专业技术职务数据
  - [ ] 整合考核信息数据
  - [ ] 整合奖励信息数据
  - [ ] 整合部门调动数据
  - [ ] 整合聘用合同数据
  - [ ] 实现时间排序和状态高亮

## Task 10: 创建教学情况Tab组件
- [ ] 创建 `src/app/teacher-center/components/TeachingDashboard.tsx`
  - [ ] 实现统计卡片组件（本科授课、研究生授课、工作量、督导次数）
  - [ ] 实现教学工作量趋势图
  - [ ] 实现授课类型分布图
  - [ ] 实现本科生授课列表
  - [ ] 实现研究生授课列表
  - [ ] 实现教学研究项目列表
  - [ ] 实现督导记录卡片列表
  - [ ] 实现指导学生竞赛获奖列表
  - [ ] 实现学期筛选功能

## Task 11: 数据库初始化脚本
- [ ] 创建 `scripts/init-teacher-center-db.ts` 初始化脚本
  - [ ] 创建教师中心相关表
  - [ ] 插入示例数据（可选）

## Task 12: 应用注册
- [ ] 在系统中注册教师中心应用
  - [ ] 配置应用菜单
  - [ ] 配置应用图标
  - [ ] 配置应用权限

## Task 13: 更新主配置支持
- [ ] 更新 `src/lib/config/index.ts` 支持教师中心配置
  - [ ] 添加teacherCenter配置类型
  - [ ] 实现读取configFile名称的逻辑

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 3
- Task 6 依赖 Task 4 和 Task 5
- Task 7 依赖 Task 4 和 Task 5
- Task 8 依赖 Task 7
- Task 9 依赖 Task 7
- Task 10 依赖 Task 7
- Task 12 依赖 Task 6、Task 7、Task 8、Task 9、Task 10
- Task 13 依赖 Task 2
