import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SignOutButton() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
