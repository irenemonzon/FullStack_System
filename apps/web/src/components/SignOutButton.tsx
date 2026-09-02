import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { btn, size } from "../lib/ui";

export default function SignOutButton() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" onClick={handleSignOut} className={`${btn.secondary} ${size.sm}`}>
      Sign out
    </button>
  );
}
