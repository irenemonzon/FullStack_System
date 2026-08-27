import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SignOutButton() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Sign out
    </button>
  );
}
