/**
 * 教师AI问答服务
 * 根据用户问题智能分析教师数据并返回答案
 */

import { getConfig } from '@/lib/config';
import { loadTeacherCenterConfig } from '@/lib/config/teacher-center';
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

// 问答历史记录
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  gh: string;
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  suggestions?: string[];
}

// 问题类型定义
type QuestionType =
  | 'basic_info' // 基本信息
  | 'teaching' // 教学情况
  | 'research' // 科研情况
  | 'career' // 职业发展
  | 'awards' // 获奖荣誉
  | 'comparison' // 对比分析
  | 'summary' // 综合评价
  | 'other'; // 其他

/**
 * 分析问题类型
 */
function analyzeQuestionType(question: string): QuestionType {
  const lowerQuestion = question.toLowerCase();

  // 基本信息相关
  if (
    /姓名|单位|职称|学历|学位|联系方式|简介|介绍|是谁/.test(lowerQuestion)
  ) {
    return 'basic_info';
  }

  // 教学情况相关
  if (
    /教学|授课|课程|工作量|课时|学生|督导|教材|教改/.test(lowerQuestion)
  ) {
    return 'teaching';
  }

  // 科研情况相关
  if (/科研|论文|著作|专利|项目|成果|学术/.test(lowerQuestion)) {
    return 'research';
  }

  // 职业发展相关
  if (/职业|生涯|履历|经历|晋升|职称|调动|合同/.test(lowerQuestion)) {
    return 'career';
  }

  // 获奖荣誉相关
  if (/获奖|荣誉|称号|奖励|表彰/.test(lowerQuestion)) {
    return 'awards';
  }

  // 对比分析相关
  if (/对比|比较|排名|水平|怎么样|如何/.test(lowerQuestion)) {
    return 'comparison';
  }

  // 综合评价相关
  if (/评价|总结|整体|综合|能力|表现/.test(lowerQuestion)) {
    return 'summary';
  }

  return 'other';
}

/**
 * 格式化教学数据为文本
 */
function formatTeachingData(teaching: {
  undergraduateTeaching: Teaching[];
  graduateTeaching: Teaching[];
  undergraduateWorkload: Workload[];
  graduateWorkload: Workload[];
  undergraduateTeachingAwards: TeachingAward[];
  graduateTeachingAwards: TeachingAward[];
  supervisionRecords: any[];
  stats: TeachingStats;
}): string {
  const parts: string[] = [];

  // 基本信息统计
  parts.push(`【教学统计】`);
  parts.push(`- 本科生授课：${teaching.stats.undergraduateCourseCount}门课程`);
  parts.push(`- 研究生授课：${teaching.stats.graduateCourseCount}门课程`);
  parts.push(`- 教学工作量：${teaching.stats.totalWorkloadHours}学时`);
  parts.push(`- 出版教材：${teaching.stats.textbookCount}部`);
  parts.push(`- 教学奖励：${teaching.stats.teachingAwardCount}项`);
  parts.push(`- 教研论文：${teaching.stats.teachingPaperCount}篇`);
  parts.push(`- 督导听课：${teaching.stats.supervisionCount}次`);

  // 最近授课情况
  if (teaching.undergraduateTeaching.length > 0) {
    parts.push(`\n【最近本科生授课】(显示前5条)`);
    teaching.undergraduateTeaching.slice(0, 5).forEach((item) => {
      parts.push(`- ${item.kcmc}（${item.xnxqmc}，${item.xdrs}人）`);
    });
  }

  if (teaching.graduateTeaching.length > 0) {
    parts.push(`\n【最近研究生授课】(显示前5条)`);
    teaching.graduateTeaching.slice(0, 5).forEach((item) => {
      parts.push(`- ${item.kcmc}（${item.xnxqmc}）`);
    });
  }

  // 教学奖励
  if (teaching.undergraduateTeachingAwards.length > 0) {
    parts.push(`\n【教学奖励】(显示前3条)`);
    teaching.undergraduateTeachingAwards.slice(0, 3).forEach((item) => {
      parts.push(`- ${item.jxcgmc}（${item.jljbm}，${item.hjnf}）`);
    });
  }

  // 督导记录
  if (teaching.supervisionRecords.length > 0) {
    parts.push(`\n【最近督导记录】(显示前3条)`);
    teaching.supervisionRecords.slice(0, 3).forEach((item) => {
      parts.push(`- ${item.kcmc}（${item.xnxqmc}，评分${item.zf}分）`);
    });
  }

  return parts.join('\n');
}

/**
 * 格式化科研数据为文本
 */
function formatResearchData(research: {
  papers: ResearchPaper[];
  books: ResearchBook[];
  patents: ResearchPatent[];
  awards: ResearchAward[];
  stats: ResearchStats;
}): string {
  const parts: string[] = [];

  // 基本统计
  parts.push(`【科研统计】`);
  parts.push(`- 发表论文：${research.stats.paperCount}篇`);
  parts.push(`- 出版著作：${research.stats.bookCount}部`);
  parts.push(`- 申请专利：${research.stats.patentCount}项`);
  parts.push(`- 科研获奖：${research.stats.awardCount}项`);
  parts.push(`- 鉴定成果：${research.stats.appraisalCount}项`);
  parts.push(`- 转化成果：${research.stats.transferCount}项`);
  parts.push(`- 研究报告：${research.stats.reportCount}篇`);
  parts.push(`- 艺术作品：${research.stats.artworkCount}件`);

  // 最近论文
  if (research.papers.length > 0) {
    parts.push(`\n【代表性论文】(显示前5条)`);
    research.papers.slice(0, 5).forEach((item) => {
      parts.push(
        `- ${item.lwzwmc}${item.fbkwmc ? `（${item.fbkwmc}）` : ''}${item.lwfbrq ? `，${item.lwfbrq}` : ''}`
      );
    });
  }

  // 著作
  if (research.books.length > 0) {
    parts.push(`\n【出版著作】(显示前3条)`);
    research.books.slice(0, 3).forEach((item) => {
      parts.push(`- ${item.zzzwmc}${item.cbs ? `（${item.cbs}）` : ''}`);
    });
  }

  // 专利
  if (research.patents.length > 0) {
    parts.push(`\n【专利申请】(显示前3条)`);
    research.patents.slice(0, 3).forEach((item) => {
      parts.push(`- ${item.zlcgmc}（${item.zllxmc || '未知类型'}）`);
    });
  }

  // 科研获奖
  if (research.awards.length > 0) {
    parts.push(`\n【科研获奖】(显示前3条)`);
    research.awards.slice(0, 3).forEach((item) => {
      parts.push(`- ${item.hjmc}（${item.hjjbmc}）`);
    });
  }

  return parts.join('\n');
}

/**
 * 格式化基本信息为文本
 */
function formatBasicInfo(
  teacher: Teacher,
  extendedInfo: TeacherExtendedInfo
): string {
  const parts: string[] = [];

  parts.push(`【基本信息】`);
  parts.push(`- 姓名：${teacher.xm}`);
  parts.push(`- 工号：${teacher.gh}`);
  parts.push(`- 单位：${teacher.dwmc}`);
  parts.push(`- 职称：${teacher.zyjszwdmmc || '未知'}`);
  parts.push(`- 职务：${teacher.dzzw || '无'}`);
  parts.push(`- 性别：${teacher.xbmmc || '未知'}`);
  parts.push(`- 最高学历：${teacher.zgxlmmc || '未知'}`);
  parts.push(`- 最高学位：${teacher.zgxwmmc || '未知'}`);
  parts.push(`- 研究方向：${teacher.yjfx || '未填写'}`);
  parts.push(`- 当前状态：${teacher.dqztmmc || '未知'}`);

  if (teacher.csrq) {
    parts.push(`- 出生日期：${teacher.csrq}`);
  }

  if (teacher.yddh) {
    parts.push(`- 联系电话：${teacher.yddh}`);
  }

  if (teacher.dzyx) {
    parts.push(`- 电子邮箱：${teacher.dzyx}`);
  }

  if (teacher.cjgzny) {
    parts.push(`- 参加工作年月：${teacher.cjgzny}`);
  }

  if (teacher.lxrq) {
    parts.push(`- 来校日期：${teacher.lxrq}`);
  }

  // 扩展信息
  if (extendedInfo.supervisorInfo) {
    parts.push(`\n【导师信息】`);
    parts.push(`- 是否研究生导师：是`);
    parts.push(
      `- 导师类型：${extendedInfo.supervisorInfo.dslbmmc || '未知'}`
    );
    if (extendedInfo.supervisorInfo.xyjfx) {
      parts.push(`- 指导学生方向：${extendedInfo.supervisorInfo.xyjfx}`);
    }
  }

  if (extendedInfo.talents.length > 0) {
    parts.push(`\n【人才称号】`);
    extendedInfo.talents.forEach((t) => {
      parts.push(`- ${t.zjlbmmc}${t.pzdwjbmmc ? `（${t.pzdwjbmmc}）` : ''}`);
    });
  }

  if (extendedInfo.socialPartTimes.length > 0) {
    parts.push(`\n【社会兼职】`);
    extendedInfo.socialPartTimes.slice(0, 5).forEach((s) => {
      parts.push(`- ${s.shjzmmc}${s.jzzwmc ? `，${s.jzzwmc}` : ''}`);
    });
  }

  return parts.join('\n');
}

/**
 * 格式化职业发展为文本
 */
function formatCareerData(career: CareerTimelineItem[]): string {
  const parts: string[] = [];

  if (career.length === 0) {
    return '暂无职业发展记录';
  }

  parts.push(`【职业发展历程】(共${career.length}条记录)`);

  // 按类型分组统计
  const typeCount: Record<string, number> = {};
  career.forEach((item) => {
    typeCount[item.type] = (typeCount[item.type] || 0) + 1;
  });

  parts.push(`\n记录类型统计：`);
  if (typeCount['title']) parts.push(`- 职称晋升：${typeCount['title']}次`);
  if (typeCount['appointment'])
    parts.push(`- 岗位聘任：${typeCount['appointment']}次`);
  if (typeCount['assessment'])
    parts.push(`- 年度考核：${typeCount['assessment']}次`);
  if (typeCount['award']) parts.push(`- 获得奖励：${typeCount['award']}次`);
  if (typeCount['transfer'])
    parts.push(`- 部门调动：${typeCount['transfer']}次`);
  if (typeCount['contract']) parts.push(`- 合同签订：${typeCount['contract']}次`);
  if (typeCount['education'])
    parts.push(`- 学历学位：${typeCount['education']}次`);
  if (typeCount['resume']) parts.push(`- 工作经历：${typeCount['resume']}段`);

  // 显示重要节点
  parts.push(`\n【重要节点】(显示前10条)`);
  career.slice(0, 10).forEach((item) => {
    const typeName: Record<string, string> = {
      title: '职称晋升',
      appointment: '岗位聘任',
      assessment: '年度考核',
      award: '获得奖励',
      transfer: '部门调动',
      contract: '签订合同',
      education: '学历学位',
      resume: '工作经历',
    };
    const currentMark = item.isCurrent ? ' [当前]' : '';
    parts.push(
      `- ${item.date || '时间不详'} ${typeName[item.type]}: ${item.title}${currentMark}`
    );
  });

  return parts.join('\n');
}

/**
 * 构建提示词
 */
function buildPrompt(
  question: string,
  questionType: QuestionType,
  teacher: Teacher,
  extendedInfo: TeacherExtendedInfo,
  career: CareerTimelineItem[],
  research: {
    papers: ResearchPaper[];
    books: ResearchBook[];
    patents: ResearchPatent[];
    awards: ResearchAward[];
    stats: ResearchStats;
  },
  teaching: {
    undergraduateTeaching: Teaching[];
    graduateTeaching: Teaching[];
    undergraduateWorkload: Workload[];
    graduateWorkload: Workload[];
    undergraduateTeachingAwards: TeachingAward[];
    graduateTeachingAwards: TeachingAward[];
    supervisionRecords: any[];
    stats: TeachingStats;
  }
): string {
  const parts: string[] = [];

  // 系统提示
  parts.push(`你是专业的教师信息分析助手。请基于以下教师数据回答用户问题。`);
  parts.push(`回答问题时要客观、准确、简洁，基于提供的数据进行分析和回答。\n`);

  // 根据问题类型提供相应的数据
  switch (questionType) {
    case 'basic_info':
      parts.push(formatBasicInfo(teacher, extendedInfo));
      break;
    case 'teaching':
      parts.push(formatTeachingData(teaching));
      break;
    case 'research':
      parts.push(formatResearchData(research));
      break;
    case 'career':
      parts.push(formatCareerData(career));
      break;
    case 'awards':
      // 组合奖励信息
      parts.push(`【教学奖励】(共${teaching.stats.teachingAwardCount}项)`);
      if (teaching.undergraduateTeachingAwards.length > 0) {
        teaching.undergraduateTeachingAwards.slice(0, 5).forEach((item) => {
          parts.push(`- ${item.jxcgmc}（${item.jljbm}，${item.hjnf}）`);
        });
      }
      parts.push(`\n【科研获奖】(共${research.stats.awardCount}项)`);
      if (research.awards.length > 0) {
        research.awards.slice(0, 5).forEach((item) => {
          parts.push(`- ${item.hjmc}（${item.hjjbmc}）`);
        });
      }
      break;
    case 'comparison':
    case 'summary':
      // 提供综合数据
      parts.push(formatBasicInfo(teacher, extendedInfo));
      parts.push(`\n${formatTeachingData(teaching)}`);
      parts.push(`\n${formatResearchData(research)}`);
      parts.push(`\n${formatCareerData(career)}`);
      break;
    default:
      // 其他情况也提供综合数据
      parts.push(formatBasicInfo(teacher, extendedInfo));
      parts.push(`\n${formatTeachingData(teaching)}`);
      parts.push(`\n${formatResearchData(research)}`);
  }

  parts.push(`\n【用户问题】${question}`);
  parts.push(`\n【回答要求 - 必须严格遵守】：
1. **话题限制**：只能回答关于教师 "${teacher.xm}"（工号：${teacher.gh}）的问题
   - 如果用户询问其他教师、其他话题或与该教师无关的内容，必须拒绝回答
   - 标准回复："我只能回答关于${teacher.xm}老师的问题，请问关于这位老师您想了解什么？"

2. **数据来源限制**：**绝对只能**使用上面提供的数据回答
   - 禁止编造、推测、想象任何数据中没有的信息
   - 禁止引用外部知识或通用信息
   - 禁止提供数据中没有的详细数字、日期、名称等

3. **未知信息处理**：如果数据中没有答案，必须回复：
   "根据现有数据，无法找到相关信息。"
   - 不要试图解释、猜测或提供"可能"的答案
   - 不要道歉或说"对不起"，直接说明数据中没有即可

4. **回答内容**：
   - 只陈述数据中明确包含的事实
   - 不要进行同行对比（如"优于平均水平"）
   - 不要做趋势预测（如"未来可能会"）
   - 不要评价（如"表现优秀"），只陈述事实

5. **格式**：简洁明了，直接回答问题，不需要开场白如"根据数据显示"等

请现在回答用户的问题。`);

  return parts.join('\n');
}

/**
 * 调用AI服务
 */
async function callAI(
  prompt: string,
  teacherName: string,
  history?: ChatMessage[]
): Promise<string> {
  // 获取配置
  const mainConfig = await getConfig();
  const tcConfig = await loadTeacherCenterConfig();

  // 获取AI provider配置
  const providerId = tcConfig.ai?.providerId || mainConfig.ai?.defaultModel || 'openai';
  const provider = mainConfig.ai?.providers?.find((p) => p.providerId === providerId);

  if (!provider) {
    throw new Error(`未找到AI provider: ${providerId}`);
  }

  const aiModel = provider.models?.[0]?.modelId || 'gpt-4o';
  const aiApiUrl = `${provider.baseUrl}/chat/completions`;
  const aiApiKey = provider.apiKey;

  // 构建消息
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是专业的教师信息分析助手，专门回答关于教师"${teacherName}"的问题。

【重要限制 - 必须严格遵守】：
1. **话题限制**：只能回答关于"${teacherName}"这位教师的问题
   - 如果用户询问其他教师、其他不相关话题（如天气、新闻、其他专业知识等），必须拒绝回答
   - 标准回复："我只能回答关于${teacherName}老师的问题，请问关于这位老师您想了解什么？"

2. **数据来源限制**：**绝对只能**使用用户提供的教师数据回答
   - 禁止编造、推测、想象任何数据中没有的信息
   - 禁止引用外部知识、通用信息或训练数据
   - 禁止提供数据中没有的详细数字、日期、名称等具体信息
   - 不要进行合理的推断或基于常识的补充

3. **未知信息处理**：如果数据中没有答案，必须回复：
   "根据现有数据，无法找到相关信息。"
   - 不要试图解释、猜测或提供"可能"的答案
   - 不要道歉或说"对不起"
   - 不要建议用户"可能需要查询其他系统"

4. **禁止内容**：
   - 关于其他教师的信息
   - 关于学校整体的数据对比（如"优于平均水平"）
   - 关于其他单位或部门的信息
   - 推测性的结论（如"未来可能会"）
   - 评价性语言（如"表现优秀"、"成果丰硕"）
   - 数据中没有的详细信息

5. **回答风格**：
   - 只陈述数据中明确包含的事实
   - 简洁明了，直接回答问题
   - 不需要开场白如"根据数据显示"、"从资料中可以看出"等
   - 不要使用形容词修饰，只用客观数据` ,
    },
  ];

  // 添加历史消息（限制最近10条）
  if (history && history.length > 0) {
    messages.push(...history.slice(-10));
  }

  // 添加当前问题
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(aiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiApiKey}`,
    },
    body: JSON.stringify({
      model: aiModel,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
}

/**
 * 生成建议问题
 */
function generateSuggestions(questionType: QuestionType): string[] {
  const suggestions: Record<QuestionType, string[]> = {
    basic_info: [
      '这位老师的最高学历是什么？',
      '这位老师的研究方向是什么？',
      '这位老师有研究生导师资格吗？',
    ],
    teaching: [
      '这位老师教过哪些课程？',
      '这位老师的教学工作量如何？',
      '这位老师获得过哪些教学奖励？',
    ],
    research: [
      '这位老师发表过多少篇论文？',
      '这位老师的代表性科研成果有哪些？',
      '这位老师申请过多少项专利？',
    ],
    career: [
      '这位老师的职业发展历程是怎样的？',
      '这位老师有哪些重要职业节点？',
      '这位老师有过部门调动吗？',
    ],
    awards: [
      '这位老师获得过哪些荣誉？',
      '这位老师的人才称号有哪些？',
      '这位老师的科研成果获奖情况如何？',
    ],
    comparison: [
      '这位老师的科研能力如何？',
      '这位老师的教学水平怎么样？',
      '这位老师的综合表现如何？',
    ],
    summary: [
      '总结一下这位老师的整体情况',
      '这位老师的主要优势是什么？',
      '这位老师的发展潜力如何？',
    ],
    other: [
      '这位老师的基本情况如何？',
      '这位老师的教学和科研情况怎么样？',
      '这位老师有什么突出表现？',
    ],
  };

  return suggestions[questionType] || suggestions['other'];
}

/**
 * 处理教师AI问答
 */
export async function processTeacherChat(
  request: ChatRequest
): Promise<ChatResponse> {
  const { gh, message, history } = request;

  try {
    // 创建数据提供者
    const provider = await createTeacherDataProvider();

    // 分析问题类型
    const questionType = analyzeQuestionType(message);

    // 并行获取相关数据
    const [teacher, extendedInfo, career, research, teaching] = await Promise.all([
      provider.queryTeacherBasic(gh),
      provider.queryTeacherExtendedInfo(gh),
      provider.queryCareerTimeline(gh),
      provider.queryResearchData(gh),
      provider.queryTeachingData(gh),
    ]);

    if (!teacher) {
      return {
        answer: '抱歉，未找到该教师的信息。',
        suggestions: [],
      };
    }

    // 构建提示词
    const prompt = buildPrompt(
      message,
      questionType,
      teacher,
      extendedInfo,
      career,
      research,
      teaching
    );

    // 调用AI
    const answer = await callAI(prompt, teacher.xm, history);

    // 生成建议问题
    const suggestions = generateSuggestions(questionType);

    return {
      answer,
      suggestions,
    };
  } catch (error) {
    console.error('AI问答处理失败:', error);
    return {
      answer: '抱歉，处理您的问题时出现错误，请稍后重试。',
      suggestions: [
        '这位老师的基本情况如何？',
        '这位老师的教学和科研情况怎么样？',
      ],
    };
  }
}
