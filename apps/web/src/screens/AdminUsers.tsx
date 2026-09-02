import { useState, type FormEvent } from "react";
import { createUserSchema, type CreateUserInput, type User } from "@support-hub/shared";
import { useCreateUser, useCurrentUser, useDeleteUser, useUpdateUser, useUsers } from "../lib/queries/users";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/icons";
import { btn, card, input, label, pill, size } from "../lib/ui";

const ROLES: Array<{ value: User["role"]; label: string }> = [
  { value: "volunteer", label: "Volunteer" },
  { value: "lead", label: "Lead" },
  { value: "admin", label: "Admin" },
];

export default function AdminUsers() {
  const { data: me } = useCurrentUser();
  const { data: users, isFetching } = useUsers(true);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<User["role"]>("volunteer");
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleAddUser(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload: CreateUserInput = { email, password, fullName, role };
    const parsed = createUserSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check the details");
      return;
    }

    try {
      await createUser.mutateAsync(parsed.data);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("volunteer");
      setShowAddForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create this user");
    }
  }

  async function handleRoleChange(user: User, newRole: User["role"]) {
    setRowError(null);
    try {
      await updateUser.mutateAsync({ id: user.id, role: newRole });
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Couldn't update role");
    }
  }

  async function handleDelete(user: User) {
    setRowError(null);
    try {
      await deleteUser.mutateAsync(user.id);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Couldn't remove this user");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader showNav />

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <button type="button" onClick={() => setShowAddForm((v) => !v)} className={`${btn.secondary} ${size.sm}`}>
            {showAddForm ? "Cancel" : "Add user"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddUser} className={`${card} mt-4 flex flex-col gap-4 p-5`}>
            <div>
              <label htmlFor="fullName" className={label}>
                Full name
              </label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={input} />
            </div>
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="password" className={label}>
                Temporary password
              </label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="role" className={label}>
                Role
              </label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as User["role"])} className={input}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}

            <button type="submit" disabled={createUser.isPending} className={`${btn.primary} ${size.md} w-full`}>
              {createUser.isPending ? "Creating…" : "Create user"}
            </button>
          </form>
        )}

        {rowError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {rowError}
          </p>
        )}

        {isFetching && (
          <div className="mt-6 flex items-center gap-2 text-slate-400">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {users?.map((user) => {
            const isSelf = user.id === me?.id;
            return (
              <li key={user.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 truncate font-medium text-slate-900">
                    {user.fullName}
                    {isSelf && <span className="text-xs font-normal text-slate-400">(you)</span>}
                    {!user.active && <span className={`${pill} bg-slate-100 text-slate-500`}>Deactivated</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as User["role"])}
                    disabled={updateUser.isPending}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDelete(user)}
                    disabled={isSelf || deleteUser.isPending}
                    title={isSelf ? "You can't remove your own account" : undefined}
                    className={`${btn.danger} ${size.sm}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
