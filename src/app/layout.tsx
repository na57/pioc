import type { Metadata } from 'next';
import { ConfigProvider, App } from 'antd';
import StyledComponentsRegistry from '@/lib/theme/AntdRegistry';
import theme from '@/lib/theme/config';
import { IconProvider } from '@/lib/icons';
import './globals.css';

export const metadata: Metadata = {
  title: '个人智慧运行中心 - PIOC',
  description: 'Personal Intelligence Operation Center',
};

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
