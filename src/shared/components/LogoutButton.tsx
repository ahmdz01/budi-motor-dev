import { LogOut } from 'lucide-react';
import { signOut } from '@/features/auth/actions/signOut';

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-danger-600 hover:text-danger-700 flex items-center gap-1.5 text-sm font-medium"
      >
        <LogOut size={16} />
        Keluar
      </button>
    </form>
  );
}
