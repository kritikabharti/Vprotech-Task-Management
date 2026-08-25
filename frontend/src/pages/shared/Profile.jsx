import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { FiUser, FiUpload } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import useAuth from '../../hooks/useAuth';
import { updateUser } from '../../store/authSlice';
import { roleLabel, resolveAssetUrl } from '../../utils/format';

export default function Profile() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      designation: user?.designation || '',
    },
  });

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data: res } = await axiosClient.patch(`/users/${user._id}`, values);
      dispatch(updateUser(res.data.user));
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('profileImage', file);
    try {
      // IMPORTANT: don't set a Content-Type header manually here. The
      // axios instance's default header ('application/json') would
      // otherwise apply, and even 'multipart/form-data' set explicitly
      // breaks the upload because it omits the multipart boundary the
      // browser normally attaches. Passing FormData without a
      // Content-Type override lets the browser set the header itself
      // (including the boundary), which is what the backend's multer
      // parser needs to read the file. This was why photo uploads
      // failed / silently didn't update.
      const { data: res } = await axiosClient.post('/uploads/profile-image', formData, {
        headers: { 'Content-Type': undefined },
      });
      dispatch(updateUser({ profileImage: res.data.profileImage }));
      toast.success('Profile image updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      // Allow re-selecting the same file (e.g. after a failed upload)
      // by resetting the input - without this, choosing the identical
      // file twice in a row doesn't fire onChange the second time.
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="card p-6 flex items-center gap-5">
        <div className="h-20 w-20 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden shrink-0">
          {user?.profileImage ? (
            <img src={resolveAssetUrl(user.profileImage)} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <FiUser className="h-8 w-8 text-navy-400" />
          )}
        </div>
        <div>
          <p className="font-semibold text-navy-800">{user?.fullName}</p>
          <p className="text-sm text-navy-400">{roleLabel(user?.role)} · {user?.employeeCode}</p>
          <label className="btn-secondary mt-2 cursor-pointer inline-flex">
            <FiUpload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <h3 className="font-semibold text-navy-800">Edit Profile</h3>
        <div>
          <label className="label">Full Name</label>
          <input className="input-field" {...register('fullName', { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input-field bg-navy-50" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input-field" {...register('phone')} />
          </div>
        </div>
        <div>
          <label className="label">Designation</label>
          <input className="input-field" {...register('designation')} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
}
