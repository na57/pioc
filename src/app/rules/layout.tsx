import AppLayout from '@/components/layout/AppLayout';

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
