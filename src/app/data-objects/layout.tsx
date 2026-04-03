import AppLayout from '@/components/layout/AppLayout';

export default function DataObjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
