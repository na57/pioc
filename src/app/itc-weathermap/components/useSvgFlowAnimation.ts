'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * SVG 流量光点动画兜底启动。
 *
 * 天气图的 SVG 通过 dangerouslySetInnerHTML 注入，光点是带 CSS animation 的
 * <path class="f">。当 SVG 在页面/标签隐藏（后台标签、面板未激活）期间插入时，
 * Chromium 会把新建动画停在 paused，且页面重新可见后不会自动恢复 —— 表现为
 * 首屏拓扑图静止、必须点一次「刷新」替换 innerHTML 后光点才流动。
 *
 * 本 hook 在每次 svg 更新后、以及页面从隐藏变为可见时，主动 play() 容器内
 * 所有处于 paused 的动画。返回的 ref 挂在注入 SVG 的容器 div 上即可。
 */
export function useSvgFlowAnimation<T extends HTMLElement = HTMLDivElement>(svg?: string) {
  const ref = useRef<T>(null);

  const kick = useCallback(() => {
    // subtree: true —— 动画在容器内的 <path> 上，默认只返回容器自身的动画
    const list = ref.current?.getAnimations?.({ subtree: true }) ?? [];
    for (const a of list) {
      if (a.playState === 'paused') a.play();
    }
  }, []);

  // 双 rAF：确保 React 已把新 innerHTML 落地、动画对象已创建
  useEffect(() => {
    if (!svg) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(kick));
    return () => cancelAnimationFrame(id);
  }, [svg, kick]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) kick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [kick]);

  return ref;
}
