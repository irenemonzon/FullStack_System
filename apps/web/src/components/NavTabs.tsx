import { NavLink } from "react-router-dom";
import { useCurrentUser } from "../lib/queries/users";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 px-4 py-3 text-sm font-medium transition ${
    isActive ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
  }`;

// Shared tab bar for the three screens that live outside the single-guest
// check-in flow (Check-in itself, plus the two admin/dev-convenience
// screens it links out to) — CheckIn.tsx, GuestList.tsx, AdminUsers.tsx.
// "Admin" only renders once GET /api/users/me confirms the role, same
// gate RequireAdmin uses for the route itself.
export default function NavTabs() {
  const { data: me } = useCurrentUser();

  return (
    <nav className="flex gap-1 border-b border-slate-200 bg-white px-6">
      <NavLink to="/" end className={tabClass}>
        Check-in
      </NavLink>
      <NavLink to="/guests" className={tabClass}>
        All guests
      </NavLink>
      {me?.role === "admin" && (
        <NavLink to="/admin/users" className={tabClass}>
          Admin
        </NavLink>
      )}
    </nav>
  );
}
