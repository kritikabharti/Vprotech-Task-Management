import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiMenu, FiLogOut, FiBell } from 'react-icons/fi';
import { toggleSidebar } from '../store/uiSlice';
import { logout } from '../store/authSlice';
import useAuth from '../hooks/useAuth';
import { roleLabel } from '../utils/format';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';

// Route segments don't always match the role string (team_lead -> /team-lead).
const NOTIFICATIONS_PATH_BY_ROLE = {
  admin: '/admin/notifications',
  team_lead: '/team-lead/notifications',
  employee: '/employee/notifications',
};

export default function Topbar({ title }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    const loadUnreadCount = async () => {
      try {
        const { data: res } = await axiosClient.get('/notifications/unread-count');
        if (!cancelled) setUnreadCount(res.data.unreadCount || 0);
      } catch (_e) {
        // Silent: the bell simply won't show a badge until the next poll succeeds.
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated]);

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
          onClick={() => navigate(NOTIFICATIONS_PATH_BY_ROLE[user?.role] || '/login')}
          aria-label="Notifications"
        >
          <FiBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
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
