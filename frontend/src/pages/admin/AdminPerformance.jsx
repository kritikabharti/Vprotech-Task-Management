import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { todayISO } from '../../utils/format';

const TABS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom Range' },
];

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shortName(name) {
  if (!name) return '-';
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

// Company-wide version of the performance charts - same shape as
// TeamLeadPerformance.jsx, but with department/team lead/employee
// filters and no team scoping (Admin sees everyone, including Team
// Leads' own self-submitted reports, automatically - no special-casing
// needed here since /reports/* already returns them for Admin).
export default function AdminPerformance() {
  const [tab, setTab] = useState('weekly');
  const [weekStart, setWeekStart] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthValue());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [department, setDepartment] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [departments, setDepartments] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axiosClient.get('/departments', { params: { limit: 100, status: 'active' } }).then(({ data: res }) => setDepartments(res.data.departments)).catch(() => {});
    axiosClient.get('/users/team-leads', { params: { status: 'active' } }).then(({ data: res }) => setTeamLeads(res.data.teamLeads)).catch(() => {});
  }, []);

  const paramsForTab = () => {
    const base = { department: department || undefined, teamLead: teamLead || undefined };
    if (tab === 'weekly') return { ...base, weekStart };
    if (tab === 'monthly') return { ...base, month };
    return { ...base, from, to };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axiosClient.get(`/reports/${tab}`, { params: paramsForTab() });
      setRows(res.data.summary || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load performance data.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [tab, weekStart, month, from, to, department, teamLead]);

  const chartData = rows.map((r) => ({
    name: shortName(r.employee?.fullName),
    fullName: r.employee?.fullName,
    department: r.department?.name,
    Planned: r.totalPlannedTasks,
    Completed: r.totalCompletedTasks,
    'Completion %': r.overallCompletionPercentage,
  }));

  // Department-level roll-up for a second, higher-level view.
  const byDepartment = new Map();
  rows.forEach((r) => {
    const key = r.department?.name || 'Unassigned';
    if (!byDepartment.has(key)) byDepartment.set(key, { department: key, Planned: 0, Completed: 0 });
    const agg = byDepartment.get(key);
    agg.Planned += r.totalPlannedTasks;
    agg.Completed += r.totalCompletedTasks;
  });
  const deptChartData = Array.from(byDepartment.values());

  return (
    <div className="space-y-5">
      <div className="card p-1 flex flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[100px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        {tab === 'weekly' && (
          <div><label className="label">Any date in week</label><input type="date" max={todayISO()} className="input-field" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
        )}
        {tab === 'monthly' && (
          <div><label className="label">Month</label><input type="month" className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        )}
        {tab === 'custom' && (
          <>
            <div><label className="label">From</label><input type="date" max={todayISO()} className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="label">To</label><input type="date" max={todayISO()} className="input-field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        <div>
          <label className="label">Department</label>
          <select className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Team Lead</label>
          <select className="input-field" value={teamLead} onChange={(e) => setTeamLead(e.target.value)}>
            <option value="">All Team Leads</option>
            {teamLeads.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading performance data..." />
      ) : error ? (
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState title="No performance data" description="No submissions found for this selection." /></div>
      ) : (
        <>
          <div className="card p-5">
            <h3 className="font-semibold text-navy-800 mb-4">Department Performance</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Planned" fill="#87A6C7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill="#5CB85C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-navy-800 mb-4">Planned vs Completed Tasks (per employee)</h3>
            <div style={{ width: '100%', height: Math.max(260, chartData.length * 32) }}>
              <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
                  <Legend />
                  <Bar dataKey="Planned" fill="#87A6C7" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Completed" fill="#5CB85C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-navy-800 mb-4">Completion % by Employee</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} formatter={(v) => `${v}%`} />
                  <Bar dataKey="Completion %" fill="#3D6B9C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
