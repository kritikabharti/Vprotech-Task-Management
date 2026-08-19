import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { logout } from '../../store/authSlice';

export default function ChangePassword() {
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      await axiosClient.patch('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed. Please log in again.');
      reset();
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-navy-800">Change Password</h2>

        <div>
          <label className="label">Current Password</label>
          <input type="password" className="input-field" {...register('currentPassword', { required: 'Required' })} />
          {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="label">New Password</label>
          <input type="password" className="input-field" {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })} />
          {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            type="password"
            className="input-field"
            {...register('confirmPassword', {
              required: 'Required',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
