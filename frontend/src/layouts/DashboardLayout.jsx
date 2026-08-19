import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useAuth from '../hooks/useAuth';

export default function DashboardLayout({ title }) {
  const { role } = useAuth();

  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
