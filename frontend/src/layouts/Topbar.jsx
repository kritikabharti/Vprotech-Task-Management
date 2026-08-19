import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiMenu, FiLogOut, FiBell } from 'react-icons/fi';
import { toggleSidebar } from '../store/uiSlice';
import { logout } from '../store/authSlice';
import useAuth from '../hooks/useAuth';
import { roleLabel } from '../utils/format';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';

export default function Topbar({ title }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (_e) {
      // logging out client-side regardless of API result
    }
    dispatch(logout());
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-white border-b border-navy-100 px-4 lg:px-6 py-3">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-navy-600" onClick={() => dispatch(toggleSidebar())}>
          <FiMenu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-navy-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="relative text-navy-500 hover:text-navy-800"
          onClick={() => navigate(`/${user?.role}/notifications`)}
          aria-label="Notifications"
        >
          <FiBell className="h-5 w-5" />
        </button>
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-navy-800 leading-tight">{user?.fullName}</p>
          <p className="text-xs text-navy-400 leading-tight">{roleLabel(user?.role)}</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary px-3 py-1.5" title="Logout">
          <FiLogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
