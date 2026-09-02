import { NavLink } from "react-router-dom";
import { useCurrentUser } from "../lib/queries/users";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
  }`;

export default function NavTabs() {
  const { data: me } = useCurrentUser();

  return (
    <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
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
