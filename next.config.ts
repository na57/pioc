import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 产出独立部署包（.next/standalone），生产镜像无需完整 node_modules / npm
  output: "standalone",
  reactCompiler: true,
  // 关闭 React Strict Mode，减少 dev 下 effect 双跑导致的 Promise 累积
  // （Turbopack dev 的 pendingOperations Map 有 2^24 上限 Bug，#96140）
  reactStrictMode: false,
};

export default nextConfig;
