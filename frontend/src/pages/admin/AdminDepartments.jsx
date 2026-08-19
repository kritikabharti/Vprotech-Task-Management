import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiSlash } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge';
import SearchBar from '../../components/SearchBar';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editingDept, setEditingDept] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await axiosClient.get('/departments', { params: { search: search || undefined, limit: 100 } });
      setDepartments(res.data.departments);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setModalMode('add'); setEditingDept(null); reset({ name: '', code: '', description: '' }); };
  const openEdit = (dept) => { setModalMode('edit'); setEditingDept(dept); reset({ name: dept.name, code: dept.code, description: dept.description }); };

  const onSubmit = async (values) => {
    try {
      if (modalMode === 'edit') {
        await axiosClient.patch(`/departments/${editingDept._id}`, values);
        toast.success('Department updated.');
      } else {
        await axiosClient.post('/departments', values);
        toast.success('Department created.');
      }
      setModalMode(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save department.');
    }
  };

  const doDeactivate = async () => {
    try {
      await axiosClient.delete(`/departments/${confirmTarget._id}`);
      toast.success('Department deactivated.');
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description', render: (d) => d.description || '-' },
    { key: 'status', label: 'Status', render: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (d) => (
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="text-navy-500 hover:text-navy-800" aria-label="Edit">
            <FiEdit2 className="h-4 w-4" />
          </button>
          {d.status === 'active' && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget(d); }} className="text-red-500 hover:text-red-700" aria-label="Deactivate">
              <FiSlash className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search departments" /></div>
        <button onClick={openAdd} className="btn-primary"><FiPlus className="h-4 w-4" /> Add Department</button>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={departments} loading={loading} emptyTitle="No departments found" />
      </div>

      <Modal
        open={!!modalMode}
        onClose={() => setModalMode(null)}
        title={modalMode === 'edit' ? 'Edit Department' : 'Add Department'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalMode(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="label">Name</label>
            <input className="input-field" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input-field" {...register('code', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} className="input-field" {...register('description')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={doDeactivate}
        danger
        title="Deactivate department?"
        message="It can no longer be assigned to new employees or team leads."
        confirmLabel="Deactivate"
      />
    </div>
  );
}
