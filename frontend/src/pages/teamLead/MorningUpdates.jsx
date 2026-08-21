import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

export default function MorningUpdates() {
  const [date, setDate] = useState(todayISO());
  const [missing, setMissing] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadMorningUpdates = async () => {
      setLoading(true);

      try {
        const [missingRes, reportsRes] = await Promise.all([
          axiosClient.get('/tasks/missing', {
            params: { date },
          }),

          axiosClient.get('/tasks', {
            params: {
              from: date,
              to: date,
              limit: 100,
            },
          }),
        ]);

        const missingPayload =
          missingRes?.data?.data ??
          missingRes?.data ??
          {};

        const reportsPayload =
          reportsRes?.data?.data ??
          reportsRes?.data ??
          {};

        const missingResults = Array.isArray(missingPayload?.results)
          ? missingPayload.results
          : [];

        let reportResults = Array.isArray(reportsPayload?.reports)
          ? reportsPayload.reports
          : Array.isArray(reportsPayload?.results)
            ? reportsPayload.results
            : [];

        /*
         * MORNING PAGE
         *
         * Only show reports where the morning update
         * has been submitted.
         *
         * Keep approved / needs_correction because
         * those morning reports may still need to be viewed.
         */
        reportResults = reportResults.filter((report) => {
          const morningSubmitted =
            !!report?.morning?.submittedAt;

          const status = report?.status;

          return (
            morningSubmitted ||
            status === 'morning_submitted' ||
            status === 'approved' ||
            status === 'needs_correction'
          );
        });

        if (!mounted) return;

        setMissing(missingResults);
        setReports(reportResults);
      } catch (err) {
        console.error('Morning Updates Error:', err);

        if (!mounted) return;

        setMissing([]);
        setReports([]);

        toast.error(
          err?.response?.data?.message ||
          err?.response?.data?.data?.message ||
          'Failed to load morning updates.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMorningUpdates();

    return () => {
      mounted = false;
    };
  }, [date]);

  /*
   * Submission status table
   */
  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) =>
        row?.employee?.fullName || 'Unknown Employee',
    },

    {
      key: 'morning',
      label: 'Morning',
      render: (row) => (
        <StatusBadge
          status={row?.morning || 'missing'}
        />
      ),
    },

    {
      key: 'evening',
      label: 'Evening',
      render: (row) => (
        <StatusBadge
          status={row?.evening || 'missing'}
        />
      ),
    },
  ];

  /*
   * Morning task table
   */
  const reportColumns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) =>
        row?.employee?.fullName || 'Unknown Employee',
    },

    {
      key: 'planned',
      label: 'Tasks Planned',
      render: (row) =>
        row?.summary?.totalPlanned ??
        row?.totalPlanned ??
        0,
    },

    {
      key: 'completed',
      label: 'Completed',
      render: (row) =>
        row?.summary?.totalCompleted ??
        row?.totalCompleted ??
        0,
    },

    {
      key: 'status',
      label: 'Morning Status',
      render: (row) => (
        <StatusBadge
          status={row?.morning?.status || row?.status || 'pending'}
        />
      ),
    },
  ];

  /*
   * Missing employees
   */
  const missingRows = missing.map((item, index) => ({
    ...item,

    _id:
      item?.employee?._id ||
      item?.employee?.id ||
      item?._id ||
      `missing-${index}`,
  }));

  /*
   * IMPORTANT:
   *
   * Morning report opens the MORNING REVIEW page.
   */
  const handleReportClick = (row) => {
    const reportId =
      row?._id ||
      row?.id;

    if (!reportId) {
      toast.error('Unable to open this morning report.');
      return;
    }

    navigate(`/team-lead/morning-review/${reportId}`);
  };

  return (
    <div className="space-y-5">

      {/* Date Filter */}
      <div className="card p-4 flex items-center gap-3">
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

      {/* Submission Status */}
      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">
          Submission Status — {date}
        </h3>

        <DataTable
          columns={columns}
          rows={missingRows}
          loading={loading}
          emptyTitle="No employees found"
          emptyDescription="No employee submission information is available for this date."
        />
      </div>

      {/* Morning Task Details */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy-800">
              Morning Task Details — {date}
            </h3>

            <p className="text-xs text-navy-400 mt-1">
              Click an employee to review and approve their morning task.
            </p>
          </div>
        </div>

        <DataTable
          columns={reportColumns}
          rows={reports}
          loading={loading}
          onRowClick={handleReportClick}
          emptyTitle="No morning submissions yet"
          emptyDescription="Employees who submit a morning plan for this date will appear here."
        />
      </div>

    </div>
  );
}