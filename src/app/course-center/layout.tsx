import AppLayout from '@/components/layout/AppLayout';

export default function CourseCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
