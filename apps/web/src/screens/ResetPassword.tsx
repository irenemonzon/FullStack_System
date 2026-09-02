import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { updatePasswordSchema } from "@support-hub/shared";
import { supabase } from "../lib/supabaseClient";
import { btn, input, label, size } from "../lib/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    const parsed = updatePasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your password");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSubmitting(false);

    if (updateError) {
      setError("Couldn't update your password. The reset link may have expired — request a new one.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
        <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="password" className={label}>
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={input}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={label}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={input}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={`${btn.primary} ${size.lg} w-full`}>
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </main>
  );
}
