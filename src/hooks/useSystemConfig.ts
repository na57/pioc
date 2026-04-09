'use client';

import { useState, useEffect } from 'react';
import { SystemConfig } from '@/types/system';

const defaultConfig: SystemConfig = {
  name: '个人智慧运行中心',
  shortName: 'PIOC',
  description: 'Personal Intelligence Operation Center',
  version: '1.0.0',
  copyright: '©2026 PIOC',
};

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/system/config');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setConfig({
              ...defaultConfig,
              ...data.data,
            });
          }
        }
      } catch {
        // 使用默认配置
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}

export default useSystemConfig;
