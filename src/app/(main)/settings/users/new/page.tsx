import { CreateUserForm } from '@/features/settings/components/CreateUserForm';

export default function NewUserPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Tambah Pengguna</h1>
      <CreateUserForm />
    </div>
  );
}
