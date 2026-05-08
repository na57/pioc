import AppLayout from '@/components/layout/AppLayout';

export const metadata = {
  title: '教师中心',
  description: '教师信息管理与教师画像',
};

export default function TeacherCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
