import { ForgotPinForm } from '@/features/auth/components/ForgotPinForm';

export default function ForgotPinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Lupa PIN</h1>
        <p className="text-sm text-neutral-500">Budi Motor</p>
      </div>
      <ForgotPinForm />
    </div>
  );
}
