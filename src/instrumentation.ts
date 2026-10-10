/**
 * Next.js 启动钩子
 *
 * 作用：在服务端进程启动时恢复「合规巡检」的定时任务。
 *
 * 背景：InspectionScheduler 的任务注册保存在进程内存（Map）中，
 * 应用重启后若不重新扫描数据库注册，已启用的巡检计划将全部静默失效
 * （界面上仍显示「启用」，但不会自动执行）。因此必须在启动时初始化。
 *
 * 注意：register() 在 edge runtime 也会被调用，node-cron 只能在 Node.js 运行时使用，
 * 故此处用 NEXT_RUNTIME 判断。
 *
 * 实现细节：守卫必须使用「if 块包裹」而非 early-return 形式。
 * webpack ConstPlugin 在编译期即可静态消除 `if (常量) { ... }` 的 false 分支
 * （分支内的动态 import 不会被解析打包），dev/prod 行为一致；
 * 而 early-return 之后的死代码需要 minifier 做控制流分析才能消除，
 * dev 模式下不生效，会导致 edge bundle 仍尝试解析 mysql2 依赖链而报错。
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { inspectionScheduler } = await import(
      '@/lib/services/it-asset-center/scheduler-service'
    );

    // 启动时数据库/表可能尚未就绪，做有限重试（最多 3 次，间隔 5 秒）
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await inspectionScheduler.initialize();
        return;
      } catch (error) {
        console.error(
          `[instrumentation] 巡检调度器初始化失败（第 ${attempt} 次）：`,
          error
        );
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    console.error('[instrumentation] 巡检调度器初始化最终失败，定时巡检将不会自动执行');
  }
}
