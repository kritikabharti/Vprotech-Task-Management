import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiBell, FiCheck } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosClient.get('/notifications', { params: { limit: 50 } });
      setNotifications(res.data.notifications);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await axiosClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (_e) {
      toast.error('Could not update notification.');
    }
  };

  const markAllRead = async () => {
    try {
      await axiosClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_e) {
      toast.error('Could not update notifications.');
    }
  };

  if (loading) return <LoadingSpinner full label="Loading notifications..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-800">Notifications</h2>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="btn-secondary">
            <FiCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <EmptyState icon={FiBell} title="No notifications yet" description="You'll see approvals, returns, and reminders here." />
        </div>
      ) : (
        <div className="card divide-y divide-navy-50">
          {notifications.map((n) => (
            <div key={n._id} className={`flex items-start justify-between gap-3 p-4 ${!n.isRead ? 'bg-navy-50/60' : ''}`}>
              <div>
                <p className="text-sm text-navy-800">{n.message}</p>
                <p className="text-xs text-navy-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead(n._id)} className="text-xs text-navy-500 hover:text-navy-800 whitespace-nowrap">
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
