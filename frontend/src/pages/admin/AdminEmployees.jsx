import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiUserPlus, FiUserX, FiUserCheck, FiShuffle } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const ROLE_TABS = [
  { key: 'employee', label: 'Employees' },
  { key: 'team_lead', label: 'Team Leads' },
];

export default function AdminEmployees() {
  const [role, setRole] = useState('employee');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action }
  const limit = 10;
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosClient.get('/users', {
        params: { role, page, limit, search: search || undefined, department: departmentFilter || undefined, status: status || undefined },
      });
      setUsers(res.data.users);
      setTotal(res.meta.total);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [role, page, search, departmentFilter, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    axiosClient.get('/departments', { params: { limit: 100, status: 'active' } }).then(({ data: res }) => setDepartments(res.data.departments)).catch(() => {});
    axiosClient.get('/users/team-leads', { params: { status: 'active' } }).then(({ data: res }) => setTeamLeads(res.data.teamLeads)).catch(() => {});
  }, []);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const openAdd = () => { reset({ employeeCode: '', fullName: '', email: '', phone: '', designation: '', password: '', department: '', teamLead: '' }); setAddOpen(true); };

  const onAddUser = async (values) => {
    try {
      await axiosClient.post('/users', { ...values, role, department: values.department || undefined, teamLead: values.teamLead || undefined });
      toast.success(role === 'employee' ? 'Employee added.' : 'Team lead added.');
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add user.');
    }
  };

  const doToggleStatus = async () => {
    if (!confirmTarget) return;
    try {
      await axiosClient.patch(`/users/${confirmTarget.id}/${confirmTarget.action}`);
      toast.success(confirmTarget.action === 'deactivate' ? 'User deactivated.' : 'User reactivated.');
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const { register: registerAssign, handleSubmit: handleAssignSubmit, reset: resetAssign } = useForm();

  const openAssign = (user) => {
    setAssignTarget(user);
    resetAssign({ department: user.department?._id || '', teamLead: user.teamLead?._id || '' });
  };

  const onAssignSubmit = async (values) => {
    try {
      const payload = { department: values.department || null };
      if (role === 'employee') payload.teamLead = values.teamLead || null;
      await axiosClient.patch(`/users/${assignTarget._id}/assign`, payload);
      toast.success('Assignment updated.');
      setAssignTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update assignment.');
    }
  };

  const columns = [
    { key: 'employeeCode', label: 'ID' },
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name || '-' },
    ...(role === 'employee' ? [{ key: 'teamLead', label: 'Team Lead', render: (r) => r.teamLead?.fullName || '-' }] : []),
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); openAssign(r); }} className="text-navy-500 hover:text-navy-800" title="Reassign">
            <FiShuffle className="h-4 w-4" />
          </button>
          {r.status === 'active' ? (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ id: r._id, action: 'deactivate' }); }} className="text-red-500 hover:text-red-700" title="Deactivate">
              <FiUserX className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ id: r._id, action: 'reactivate' }); }} className="text-brandGreen-600 hover:text-brandGreen-700" title="Reactivate">
              <FiUserCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-1 flex w-fit">
        {ROLE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setRole(t.key); setPage(1); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${role === t.key ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="w-64"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, ID, or email" /></div>
          <select className="input-field w-auto" value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input-field w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <FiUserPlus className="h-4 w-4" /> {role === 'employee' ? 'Add Employee' : 'Add Team Lead'}
        </button>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={users} loading={loading} onRowClick={(r) => navigate(`/admin/users/${r._id}`)} emptyTitle="No users found" />
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={role === 'employee' ? 'Add Employee' : 'Add Team Lead'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onAddUser)} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add'}</button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={handleSubmit(onAddUser)}>
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
            <label className="label">Department</label>
            <select className="input-field" {...register('department')}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          {role === 'employee' && (
            <div>
              <label className="label">Team Lead</label>
              <select className="input-field" {...register('teamLead')}>
                <option value="">Select team lead</option>
                {teamLeads.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Temporary Password</label>
            <input type="text" className="input-field" placeholder="At least 8 characters" {...register('password', { required: true, minLength: 8 })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`Reassign ${assignTarget?.fullName || ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleAssignSubmit(onAssignSubmit)}>Save</button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={handleAssignSubmit(onAssignSubmit)}>
          <div>
            <label className="label">Department</label>
            <select className="input-field" {...registerAssign('department')}>
              <option value="">Unassigned</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          {role === 'employee' && (
            <div>
              <label className="label">Team Lead</label>
              <select className="input-field" {...registerAssign('teamLead')}>
                <option value="">Unassigned</option>
                {teamLeads.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
              </select>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={doToggleStatus}
        danger={confirmTarget?.action === 'deactivate'}
        title={confirmTarget?.action === 'deactivate' ? 'Deactivate user?' : 'Reactivate user?'}
        message={confirmTarget?.action === 'deactivate' ? 'They will no longer be able to log in.' : 'They will regain access to log in.'}
        confirmLabel={confirmTarget?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
      />
    </div>
  );
}
