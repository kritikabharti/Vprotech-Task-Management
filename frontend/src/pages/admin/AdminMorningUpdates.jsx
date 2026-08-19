import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

export default function AdminMorningUpdates() {
  const [date, setDate] = useState(todayISO());
  const [department, setDepartment] = useState('');

  const [departments, setDepartments] = useState([]);
  const [missing, setMissing] = useState([]);
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(true);

  const navigate = useNavigate();

  /*
   * Handles both possible API response structures:
   *
   * response.data.data.results
   * response.data.results
   */
  const unwrapResponse = (response) => {
    return response?.data?.data ?? response?.data ?? {};
  };

  const getReports = (response) => {
    const payload = unwrapResponse(response);

    if (Array.isArray(payload?.reports)) {
      return payload.reports;
    }

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    return [];
  };

  const getResults = (response) => {
    const payload = unwrapResponse(response);

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    return [];
  };

  /*
   * Load Departments
   */
  const loadDepartments = useCallback(async () => {
    setDepartmentLoading(true);

    try {
      const response = await axiosClient.get('/departments', {
        params: {
          limit: 100,
          status: 'active',
        },
      });

      const payload = unwrapResponse(response);

      const departmentList = Array.isArray(payload?.departments)
        ? payload.departments
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

      setDepartments(departmentList);
    } catch (err) {
      console.error('Department loading error:', err);

      setDepartments([]);

      toast.error(
        err?.response?.data?.message ||
          'Failed to load departments.'
      );
    } finally {
      setDepartmentLoading(false);
    }
  }, []);

  /*
   * Load Morning Updates
   */
  const loadMorningUpdates = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        date,
      };

      if (department) {
        params.department = department;
      }

      const [missingRes, reportsRes] = await Promise.all([
        axiosClient.get('/tasks/missing', {
          params,
        }),

        axiosClient.get('/tasks', {
          params: {
            from: date,
            to: date,
            ...(department
              ? { department }
              : {}),
            limit: 200,
          },
        }),
      ]);

      const missingResults = getResults(missingRes);
      const reportResults = getReports(reportsRes);

      setMissing(missingResults);
      setReports(reportResults);
    } catch (err) {
      console.error(
        'Admin Morning Updates Error:',
        err
      );

      setMissing([]);
      setReports([]);

      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.data?.message ||
          'Failed to load morning updates.'
      );
    } finally {
      setLoading(false);
    }
  }, [date, department]);

  /*
   * Load departments once
   */
  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  /*
   * Reload when date or department changes
   */
  useEffect(() => {
    loadMorningUpdates();
  }, [loadMorningUpdates]);

  /*
   * Submission Status Columns
   */
  const statusColumns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) =>
        row?.employee?.fullName ||
        'Unknown Employee',
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
   * Report Columns
   */
  const reportColumns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) =>
        row?.employee?.fullName ||
        'Unknown Employee',
    },

    {
      key: 'department',
      label: 'Department',
      render: (row) =>
        row?.department?.name ||
        row?.employee?.department?.name ||
        '-',
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
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          status={row?.status || 'pending'}
        />
      ),
    },
  ];

  /*
   * Make missing employee rows safe
   */
  const missingRows = missing.map(
    (item, index) => ({
      ...item,

      _id:
        item?.employee?._id ||
        item?.employee?.id ||
        item?._id ||
        `missing-${index}`,
    })
  );

  /*
   * Open Admin Review
   */
  const handleReportClick = (row) => {
    const reportId =
      row?._id ||
      row?.id;

    if (!reportId) {
      toast.error(
        'Unable to open this morning report.'
      );
      return;
    }

    navigate(`/admin/review/${reportId}`);
  };

  return (
    <div className="space-y-5">

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">

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

        <label className="label m-0">
          Department
        </label>

        <select
          className="input-field w-auto"
          value={department}
          onChange={(event) =>
            setDepartment(event.target.value)
          }
          disabled={departmentLoading}
        >
          <option value="">
            All Departments
          </option>

          {departments.map((item) => (
            <option
              key={item?._id || item?.id}
              value={item?._id || item?.id}
            >
              {item?.name || 'Unnamed Department'}
            </option>
          ))}
        </select>

      </div>


      {/* Submission Status */}
      <div className="card p-5">

        <h3 className="font-semibold text-navy-800 mb-4">
          Submission Status — {date}
        </h3>

        <DataTable
          columns={statusColumns}
          rows={missingRows}
          loading={loading}
          emptyTitle="No employees found"
          emptyDescription="No employee submission information is available for this date."
        />

      </div>


      {/* Morning Task Details */}
      <div className="card p-5">

        <h3 className="font-semibold text-navy-800 mb-4">
          Morning Task Details — {date}
        </h3>

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