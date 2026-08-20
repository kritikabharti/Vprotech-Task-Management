import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiSend, FiVolume2 } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (Team Leads + Employees)' },
  { value: 'team_lead', label: 'Team Leads only' },
  { value: 'employee', label: 'Employees only' },
];

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { title: '', message: '', audience: 'all' },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosClient.get('/notifications/announcements', { params: { limit: 50 } });
      setAnnouncements(res.data.announcements);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (values) => {
    try {
      await axiosClient.post('/notifications/announcement', values);
      toast.success('Announcement sent.');
      reset({ title: '', message: '', audience: 'all' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send announcement.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <h3 className="font-semibold text-navy-800">New Announcement</h3>
        <div>
          <label className="label">Title</label>
          <input className="input-field" placeholder="e.g. Office closed on Friday" {...register('title', { required: true })} />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea rows={4} className="input-field" placeholder="Write the announcement..." {...register('message', { required: true })} />
        </div>
        <div>
          <label className="label">Send to</label>
          <select className="input-field" {...register('audience')}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          <FiSend className="h-4 w-4" /> {isSubmitting ? 'Sending...' : 'Send Announcement'}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-navy-800">Past Announcements</h3>
        {loading ? (
          <LoadingSpinner label="Loading announcements..." />
        ) : announcements.length === 0 ? (
          <div className="card">
            <EmptyState icon={FiVolume2} title="No announcements yet" description="Announcements you send will show up here." />
          </div>
        ) : (
          <div className="card divide-y divide-navy-50">
            {announcements.map((a) => (
              <div key={a._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-navy-800">{a.title}</p>
                  <span className="text-xs text-navy-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-navy-600 mt-1">{a.message}</p>
                <p className="text-xs text-navy-400 mt-2">
                  Sent to {AUDIENCE_OPTIONS.find((o) => o.value === a.audience)?.label || a.audience}
                  {' · '}{a.recipientCount} recipient{a.recipientCount === 1 ? '' : 's'}
                  {a.createdBy?.fullName ? ` · by ${a.createdBy.fullName}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
