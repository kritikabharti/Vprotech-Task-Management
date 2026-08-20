import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiSunrise, FiSunset, FiList, FiBarChart2, FiBell, FiUser, FiLock, FiX,
  FiUsers, FiCheckSquare, FiBriefcase, FiFileText, FiTrendingUp, FiVolume2,
} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { closeSidebar } from '../store/uiSlice';
import logo from '../assets/logo.png';

const EMPLOYEE_LINKS = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/employee/morning-update', label: 'Morning Task Update', icon: FiSunrise },
  { to: '/employee/evening-update', label: 'Evening Task Update', icon: FiSunset },
  { to: '/employee/my-tasks', label: 'My Tasks / History', icon: FiList },
  { to: '/employee/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/employee/notifications', label: 'Notifications', icon: FiBell },
  { to: '/employee/profile', label: 'Profile', icon: FiUser },
  { to: '/employee/change-password', label: 'Change Password', icon: FiLock },
];

const TEAM_LEAD_LINKS = [
  { to: '/team-lead/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/team-lead/my-morning-task', label: 'My Morning Task', icon: FiSunrise },
  { to: '/team-lead/my-evening-task', label: 'My Evening Task', icon: FiSunset },
  { to: '/team-lead/employees', label: 'My Employees', icon: FiUsers },
  { to: '/team-lead/morning-updates', label: 'Morning Updates', icon: FiSunrise },
  { to: '/team-lead/evening-updates', label: 'Evening Updates', icon: FiSunset },
  { to: '/team-lead/review', label: 'Task Review', icon: FiCheckSquare },
  { to: '/team-lead/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/team-lead/performance', label: 'Performance', icon: FiTrendingUp },
  { to: '/team-lead/notifications', label: 'Notifications', icon: FiBell },
  { to: '/team-lead/profile', label: 'Profile', icon: FiUser },
  { to: '/team-lead/change-password', label: 'Change Password', icon: FiLock },
];

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/employees', label: 'Employees & Team Leads', icon: FiUsers },
  { to: '/admin/departments', label: 'Departments', icon: FiBriefcase },
  { to: '/admin/morning-updates', label: 'Morning Updates', icon: FiSunrise },
  { to: '/admin/evening-updates', label: 'Evening Updates', icon: FiSunset },
  { to: '/admin/review', label: 'Task Review', icon: FiCheckSquare },
  { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/admin/performance', label: 'Performance', icon: FiTrendingUp },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: FiFileText },
  { to: '/admin/announcements', label: 'Announcements', icon: FiVolume2 },
  { to: '/admin/notifications', label: 'Notifications', icon: FiBell },
  { to: '/admin/profile', label: 'Profile', icon: FiUser },
  { to: '/admin/change-password', label: 'Change Password', icon: FiLock },
];

const LINKS_BY_ROLE = {
  employee: EMPLOYEE_LINKS,
  team_lead: TEAM_LEAD_LINKS,
  admin: ADMIN_LINKS,
};

export default function Sidebar({ role }) {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const links = LINKS_BY_ROLE[role] || [];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-navy-900/50 lg:hidden" onClick={() => dispatch(closeSidebar())} />
      )}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-navy-800 text-navy-100 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-navy-700">
          <div className="flex items-center gap-2">
            <img src={logo} alt="VproTech Digital" className="h-9 w-auto bg-white rounded p-1" />
            <div>
              <p className="text-sm font-semibold text-white leading-tight">VproTech Digital</p>
              <p className="text-[11px] text-navy-300 leading-tight">Task Management</p>
            </div>
          </div>
          <button className="lg:hidden text-navy-300" onClick={() => dispatch(closeSidebar())}>
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => dispatch(closeSidebar())}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-navy-700 text-white border-r-2 border-brandGreen-500 font-medium'
                    : 'text-navy-200 hover:bg-navy-700/60 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-navy-700 text-[11px] text-navy-400">
          © {new Date().getFullYear()} VproTech Digital
        </div>
      </aside>
    </>
  );
}
