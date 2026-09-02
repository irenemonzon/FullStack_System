import { NavLink } from "react-router-dom";
import { useCurrentUser } from "../lib/queries/users";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;

export default function NavTabs() {
  const { data: me } = useCurrentUser();

  return (
    <nav className="flex items-center gap-1">
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
