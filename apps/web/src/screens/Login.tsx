import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginSchema, resetPasswordSchema } from "@support-hub/shared";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/useSession";

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
    <main>
      <h1>300 Blankets · Support Hub</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p role="alert">{error}</p>}
        {resetSent && <p>Check your email for a password reset link.</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" onClick={handleForgotPassword}>
          Forgot password?
        </button>
      </form>
    </main>
  );
}
