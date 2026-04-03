import AppLayout from '@/components/layout/AppLayout';

export default function MyTeachingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
