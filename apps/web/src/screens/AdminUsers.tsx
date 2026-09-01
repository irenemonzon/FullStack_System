import { useState, type FormEvent } from "react";
import { createUserSchema, type CreateUserInput, type User } from "@support-hub/shared";
import { useCreateUser, useCurrentUser, useDeleteUser, useUpdateUser, useUsers } from "../lib/queries/users";
import SignOutButton from "../components/SignOutButton";
import NavTabs from "../components/NavTabs";

const ROLES: Array<{ value: User["role"]; label: string }> = [
  { value: "volunteer", label: "Volunteer" },
  { value: "lead", label: "Lead" },
  { value: "admin", label: "Admin" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const labelClass = "block text-sm font-medium text-slate-700";

// Not part of the Figma-defined volunteer flow (Screens 1-7) — an admin-only
// user management screen, gated by RequireAdmin at the route level and by
// requireRole("admin") on every /api/users write. Volunteers/leads never
// see the "Admin" link that opens this.
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
      <header className="flex items-center justify-between gap-6 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">300 Blankets · Support Hub</span>
          <NavTabs />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{me?.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showAddForm ? "Cancel" : "Add user"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddUser} className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <label htmlFor="fullName" className={labelClass}>
                Full name
              </label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Temporary password
              </label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
                className={inputClass}
              >
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

            <button
              type="submit"
              disabled={createUser.isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createUser.isPending ? "Creating…" : "Create user"}
            </button>
          </form>
        )}

        {rowError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {rowError}
          </p>
        )}

        {isFetching && <p className="mt-6 text-slate-600">Loading…</p>}

        <ul className="mt-6 flex flex-col gap-3">
          {users?.map((user) => {
            const isSelf = user.id === me?.id;
            return (
              <li key={user.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {user.fullName} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                    {!user.active && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Deactivated</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as User["role"])}
                    disabled={updateUser.isPending}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
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
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
