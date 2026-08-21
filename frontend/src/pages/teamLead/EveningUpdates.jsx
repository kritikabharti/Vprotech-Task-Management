import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEye, FiRefreshCw } from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

export default function EveningUpdates() {
  const [date, setDate] = useState(todayISO());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadEveningUpdates = async () => {
    setLoading(true);

    try {
      const response = await axiosClient.get('/tasks', {
        params: {
          from: date,
          to: date,
          limit: 100,
          page: 1,
        },
      });

      const data = response.data;

      /*
       * Support the possible API response formats:
       *
       * {
       *   data: {
       *     reports: [...]
       *   }
       * }
       *
       * or
       *
       * {
       *   reports: [...]
       * }
       */
      const allReports =
        data?.data?.reports ||
        data?.reports ||
        data?.data?.results ||
        data?.results ||
        [];

      if (!Array.isArray(allReports)) {
        setReports([]);
        return;
      }

      /*
       * Only show evening-related submissions.
       *
       * IMPORTANT:
       * The backend must already restrict /tasks results
       * according to req.user for Team Lead access.
       */
      const eveningReports = allReports.filter((report) =>
        [
          'evening_submitted',
          'approved',
          'needs_correction',
        ].includes(report.status)
      );

      setReports(eveningReports);
    } catch (err) {
      console.error('Evening updates error:', err);

      toast.error(
        err.response?.data?.message ||
          'Failed to load evening updates.'
      );

      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEveningUpdates();
  }, [date]);

  const getSummary = (report) => {
    return report?.summary || {};
  };

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (report) => (
        <div>
          <p className="font-medium text-navy-800">
            {report.employee?.fullName ||
              report.user?.fullName ||
              'Unknown Employee'}
          </p>

          {(report.employee?.employeeCode ||
            report.user?.employeeCode) && (
            <p className="text-xs text-navy-400">
              {report.employee?.employeeCode ||
                report.user?.employeeCode}
            </p>
          )}
        </div>
      ),
    },

    {
      key: 'planned',
      label: 'Planned',
      render: (report) =>
        getSummary(report).totalPlanned ?? 0,
    },

    {
      key: 'completed',
      label: 'Completed',
      render: (report) =>
        getSummary(report).totalCompleted ?? 0,
    },

    {
      key: 'partial',
      label: 'Partial',
      render: (report) =>
        getSummary(report).totalPartial ?? 0,
    },

    {
      key: 'notCompleted',
      label: 'Not Completed',
      render: (report) =>
        getSummary(report).totalNotCompleted ?? 0,
    },

    {
      key: 'completionPercentage',
      label: 'Completion %',
      render: (report) => {
        const percentage =
          getSummary(report).completionPercentage ?? 0;

        return (
          <span
            className={
              percentage >= 80
                ? 'font-semibold text-green-600'
                : percentage >= 50
                ? 'font-semibold text-yellow-600'
                : 'font-semibold text-red-600'
            }
          >
            {percentage}%
          </span>
        );
      },
    },

    {
      key: 'status',
      label: 'Status',
      render: (report) => (
        <StatusBadge status={report.status} />
      ),
    },

    {
      key: 'action',
      label: 'Action',
      render: (report) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            if (report._id) {
              navigate(`/team-lead/review/${report._id}`);
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"
        >
          <FiEye className="h-4 w-4" />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* Date Filter */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="label m-0">
            Date
          </label>

          <input
            type="date"
            max={todayISO()}
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="input-field w-auto"
          />
        </div>

        <button
          type="button"
          onClick={loadEveningUpdates}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Evening Updates */}
      <div className="card p-5">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy-800">
              Evening Completion Details
            </h3>

            <p className="text-sm text-navy-400 mt-1">
              Employee evening updates for {date}
            </p>
          </div>

          <span className="text-sm text-navy-400">
            {reports.length} submission
            {reports.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={reports}
          loading={loading}
          onRowClick={(report) => {
            if (report._id) {
              navigate(
                `/team-lead/review/${report._id}`
              );
            }
          }}
          emptyTitle="No evening submissions yet"
          emptyDescription="Employees who submit an evening update for this date will appear here."
        />
      </div>
    </div>
  );
}