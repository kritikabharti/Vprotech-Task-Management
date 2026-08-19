import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import { setCredentials } from '../../store/authSlice';
import logo from '../../assets/logo.png';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      const { data } = await axiosClient.post('/auth/login', values);
      const { token, user } = data.data;
      dispatch(setCredentials({ token, user }));
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      const dashboardPaths = {
        admin: '/admin/dashboard',
        team_lead: '/team-lead/dashboard',
        employee: '/employee/dashboard',
      };
      navigate(dashboardPaths[user.role] || '/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="VproTech Digital" className="h-16 w-auto bg-white rounded-lg p-2 shadow-lg" />
          <h1 className="mt-4 text-xl font-semibold text-white">VproTech Digital</h1>
          <p className="text-sm text-navy-300">Employee Daily Task Management</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-navy-800 mb-1">Sign in to your account</h2>
          <p className="text-sm text-navy-400 mb-6">Enter your work email and password.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="input-field pl-9"
                  placeholder="you@vprotech.com"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 h-4 w-4" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field pl-9 pr-9"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-navy-400 mt-6">
          Internal system for VproTech Digital employees only.
        </p>
      </div>
    </div>
  );
}
