import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';

const MODULES = ['Auth', 'User', 'Department', 'Task', 'Report'];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const limit = 20;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await axiosClient.get('/audit-logs', {
          params: { page, limit, module: moduleFilter || undefined, from: from || undefined, to: to || undefined },
        });
        setLogs(res.data.logs);
        setTotal(res.meta.total);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, moduleFilter, from, to]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', render: (l) => new Date(l.timestamp).toLocaleString() },
    { key: 'user', label: 'User', render: (l) => l.user?.fullName || 'Unknown' },
    { key: 'role', label: 'Role', render: (l) => l.role },
    { key: 'module', label: 'Module', render: (l) => l.module },
    { key: 'action', label: 'Action', render: (l) => l.action.replace(/_/g, ' ') },
    { key: 'description', label: 'Description', render: (l) => l.description || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Module</label>
          <select className="input-field" value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}>
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={logs} loading={loading} emptyTitle="No audit log entries found" rowKey="_id" />
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
