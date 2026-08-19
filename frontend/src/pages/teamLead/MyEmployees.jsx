import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiUserPlus, FiUserX } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function MyEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id } - deactivate only; reactivation is admin-only per business rules
  const limit = 10;
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosClient.get('/users', {
        params: { role: 'employee', page, limit, search: search || undefined, status: status || undefined },
      });
      setEmployees(res.data.users);
      setTotal(res.meta.total);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onAddEmployee = async (values) => {
    try {
      await axiosClient.post('/users', { ...values, role: 'employee' });
      toast.success('Employee added.');
      setAddOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add employee.');
    }
  };

  const doDeactivate = async () => {
    if (!confirmTarget) return;
    try {
      await axiosClient.patch(`/users/${confirmTarget.id}/deactivate`);
      toast.success('Employee deactivated.');
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const columns = [
    { key: 'employeeCode', label: 'ID' },
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'designation', label: 'Designation', render: (r) => r.designation || '-' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) =>
        r.status === 'active' ? (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmTarget({ id: r._id }); }}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
          >
            <FiUserX className="h-3.5 w-3.5" /> Deactivate
          </button>
        ) : (
          <span className="text-xs text-navy-400">Contact admin to reactivate</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="w-64"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, ID, or email" /></div>
          <select className="input-field w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary"><FiUserPlus className="h-4 w-4" /> Add Employee</button>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={employees} loading={loading} onRowClick={(r) => navigate(`/team-lead/employees/${r._id}`)} emptyTitle="No employees found" />
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Employee"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onAddEmployee)} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Employee'}
            </button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={handleSubmit(onAddEmployee)}>
          <div>
            <label className="label">Employee ID</label>
            <input className="input-field" {...register('employeeCode', { required: true })} />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" {...register('fullName', { required: true })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input-field" {...register('phone')} />
          </div>
          <div>
            <label className="label">Designation</label>
            <input className="input-field" {...register('designation')} />
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input type="text" className="input-field" {...register('password', { required: true, minLength: 8 })} placeholder="At least 8 characters" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={doDeactivate}
        danger
        title="Deactivate employee?"
        message="They will no longer be able to log in."
        confirmLabel="Deactivate"
      />
    </div>
  );
}
