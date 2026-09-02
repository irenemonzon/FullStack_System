import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginSchema, resetPasswordSchema } from "@support-hub/shared";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/useSession";
import { btn, input, label, size } from "../lib/ui";

export default function Login() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }
    navigate("/", { replace: true });
  }

  async function handleForgotPassword() {
    setError(null);
    setResetSent(false);

    const parsed = resetPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter your email above first, then tap “Forgot password?”");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError("Couldn't send reset email. Try again.");
      return;
    }
    setResetSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
            3B
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">300 Blankets</h1>
          <p className="text-sm text-slate-500">Support Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className={input}
            />
          </div>

          <div>
            <label htmlFor="password" className={label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={input}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          {resetSent && <p className="text-sm text-green-700">Check your email for a password reset link.</p>}

          <button type="submit" disabled={submitting} className={`${btn.primary} ${size.lg} w-full`}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" onClick={handleForgotPassword} className={`self-center text-sm ${btn.ghost}`}>
            Forgot password?
          </button>
        </form>
      </div>
    </main>
  );
}
