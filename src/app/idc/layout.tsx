import AppLayout from '@/components/layout/AppLayout';

export default function IdcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
