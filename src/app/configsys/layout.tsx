import AppLayout from '@/components/layout/AppLayout';

export default function ConfigSysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
