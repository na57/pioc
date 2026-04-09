import type { Metadata } from 'next';
import { ConfigProvider, App } from 'antd';
import StyledComponentsRegistry from '@/lib/theme/AntdRegistry';
import theme from '@/lib/theme/config';
import { IconProvider } from '@/lib/icons';
import { getConfig } from '@/lib/config';
import './globals.css';

export function generateMetadata(): Metadata {
  const config = getConfig();
  
  return {
    title: `${config.app.name} - PIOC`,
    description: config.app.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <StyledComponentsRegistry>
          <ConfigProvider theme={theme}>
            <App>
              <IconProvider>
                {children}
              </IconProvider>
            </App>
          </ConfigProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
