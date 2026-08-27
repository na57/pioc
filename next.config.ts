import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 关闭 React Strict Mode，减少 dev 下 effect 双跑导致的 Promise 累积
  // （Turbopack dev 的 pendingOperations Map 有 2^24 上限 Bug，#96140）
  reactStrictMode: false,
};

export default nextConfig;
