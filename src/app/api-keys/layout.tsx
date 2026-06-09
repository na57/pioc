import AppLayout from '@/components/layout/AppLayout';

export default function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
