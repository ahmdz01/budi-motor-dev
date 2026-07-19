import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/lib/getCurrentUser';
import { ROLE_HOME } from '@/shared/constants/roleAccess';

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  redirect(ROLE_HOME[user.roleCode]);
}
