import AppLayout from '@/components/layout/AppLayout';

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
