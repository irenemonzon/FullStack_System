import { useSession } from "../lib/useSession";
import SignOutButton from "../components/SignOutButton";

// Placeholder for Screen 1 (Check-in / Home). Sprint 3 replaces this
// with the real New guest / Returning guest flow — this just proves
// the Sprint 2 auth/routing loop works end-to-end.
export default function CheckIn() {
  const { session } = useSession();

  return (
    <main>
      <header>
        <span>300 Blankets · Support Hub</span>
        <span>{session?.user.email}</span>
        <SignOutButton />
      </header>
      <p>Signed in. Check-in screen (New guest / Returning guest) lands in Sprint 3.</p>
    </main>
  );
}
