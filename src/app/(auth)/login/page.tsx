import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Budi Motor</h1>
        <p className="text-sm text-neutral-500">Masuk untuk melanjutkan</p>
      </div>
      <LoginForm />
    </div>
  );
}