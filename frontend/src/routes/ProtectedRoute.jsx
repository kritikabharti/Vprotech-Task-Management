import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// allowedRoles: undefined = any authenticated user; array = restrict to those roles.
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const dashboardPaths = {
    admin: '/admin/dashboard',
    team_lead: '/team-lead/dashboard',
    employee: '/employee/dashboard',
  };

  if (!dashboardPaths[role]) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={dashboardPaths[role]} replace />;
  }

  return <Outlet />;
}
