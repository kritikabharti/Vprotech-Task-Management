// import { useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
// import {
//   FiUsers,
//   FiSearch,
//   FiMail,
//   FiPhone,
//   FiBriefcase,
//   FiEye,
//   FiRefreshCw,
// } from 'react-icons/fi';

// import axiosClient from '../../api/axiosClient';
// import DataTable from '../../components/DataTable';
// import LoadingSpinner from '../../components/LoadingSpinner';
// import ErrorState from '../../components/ErrorState';
// import StatusBadge from '../../components/StatusBadge';


// /* ---------------------------------------------------------
//    Helpers
// --------------------------------------------------------- */

// function unwrapResponse(response) {
//   return response?.data?.data ?? response?.data ?? {};
// }

// function getUsers(response) {
//   const payload = unwrapResponse(response);

//   if (Array.isArray(payload?.users)) {
//     return payload.users;
//   }

//   if (Array.isArray(payload?.results)) {
//     return payload.results;
//   }

//   return [];
// }


// /* ---------------------------------------------------------
//    My Employees
// --------------------------------------------------------- */

// export default function MyEmployees() {
//   const navigate = useNavigate();

//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState('');


//   /* -------------------------------------------------------
//      Load employees
//   ------------------------------------------------------- */

//   const loadEmployees = useCallback(async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       /*
//        * IMPORTANT:
//        *
//        * We use the existing /users endpoint.
//        *
//        * Backend automatically applies:
//        *
//        * teamLead = req.user._id
//        * role = employee
//        *
//        * for Team Leads.
//        *
//        * Therefore a Team Lead can only receive
//        * employees belonging to their own team.
//        */

//       const response = await axiosClient.get('/users', {
//         params: {
//           role: 'employee',
//           status: 'active',
//           limit: 100,
//         },
//       });

//       const users = getUsers(response);

//       setEmployees(users);
//     } catch (err) {
//       console.error('My Employees Error:', err);

//       const message =
//         err?.response?.data?.message ||
//         err?.response?.data?.data?.message ||
//         'Failed to load employees.';

//       setError(message);
//       setEmployees([]);

//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   }, []);


//   /* -------------------------------------------------------
//      Initial load
//   ------------------------------------------------------- */

//   useEffect(() => {
//     loadEmployees();
//   }, [loadEmployees]);


//   /* -------------------------------------------------------
//      Search
//   ------------------------------------------------------- */

//   const searchText = search.trim().toLowerCase();

//   const filteredEmployees = employees.filter((employee) => {
//     if (!searchText) return true;

//     return (
//       employee?.fullName
//         ?.toLowerCase()
//         .includes(searchText) ||

//       employee?.employeeCode
//         ?.toLowerCase()
//         .includes(searchText) ||

//       employee?.email
//         ?.toLowerCase()
//         .includes(searchText) ||

//       employee?.phone
//         ?.toLowerCase()
//         .includes(searchText) ||

//       employee?.designation
//         ?.toLowerCase()
//         .includes(searchText) ||

//       employee?.department?.name
//         ?.toLowerCase()
//         .includes(searchText)
//     );
//   });


//   /* -------------------------------------------------------
//      Open employee
//   ------------------------------------------------------- */

//   const handleViewEmployee = (employee) => {
//     const id = employee?._id || employee?.id;

//     if (!id) {
//       toast.error('Employee ID is missing.');
//       return;
//     }

//     navigate(`/team-lead/employees/${id}`);
//   };


//   /* -------------------------------------------------------
//      Table columns
//   ------------------------------------------------------- */

//   const columns = [
//     {
//       key: 'employee',
//       label: 'Employee',
//       render: (row) => (
//         <div className="flex items-center gap-3">

//           {row?.profileImage ? (
//             <img
//               src={row.profileImage}
//               alt={row?.fullName || 'Employee'}
//               className="h-10 w-10 rounded-full object-cover"
//             />
//           ) : (
//             <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700">
//               {row?.fullName
//                 ?.charAt(0)
//                 ?.toUpperCase() || 'E'}
//             </div>
//           )}

//           <div className="min-w-0">
//             <p className="font-medium text-navy-800 truncate">
//               {row?.fullName || 'Unknown Employee'}
//             </p>

//             <p className="text-xs text-navy-400 truncate">
//               {row?.employeeCode || '-'}
//             </p>
//           </div>

//         </div>
//       ),
//     },

//     {
//       key: 'email',
//       label: 'Email',
//       render: (row) => (
//         <div className="flex items-center gap-2">
//           <FiMail className="h-4 w-4 text-navy-400" />

//           <span className="text-sm text-navy-600">
//             {row?.email || '-'}
//           </span>
//         </div>
//       ),
//     },

//     {
//       key: 'phone',
//       label: 'Phone',
//       render: (row) => (
//         <div className="flex items-center gap-2">
//           <FiPhone className="h-4 w-4 text-navy-400" />

//           <span className="text-sm text-navy-600">
//             {row?.phone || '-'}
//           </span>
//         </div>
//       ),
//     },

//     {
//       key: 'designation',
//       label: 'Designation',
//       render: (row) => (
//         <div className="flex items-center gap-2">
//           <FiBriefcase className="h-4 w-4 text-navy-400" />

//           <span className="text-sm text-navy-600">
//             {row?.designation || 'Employee'}
//           </span>
//         </div>
//       ),
//     },

//     {
//       key: 'department',
//       label: 'Department',
//       render: (row) =>
//         row?.department?.name ||
//         row?.department?.code ||
//         '-',
//     },

//     {
//       key: 'status',
//       label: 'Status',
//       render: (row) => (
//         <StatusBadge
//           status={row?.status || 'active'}
//         />
//       ),
//     },

//     {
//       key: 'actions',
//       label: 'Action',
//       render: (row) => (
//         <button
//           type="button"
//           className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900 border border-navy-200 rounded-lg px-3 py-1.5"
//           onClick={(event) => {
//             event.stopPropagation();
//             handleViewEmployee(row);
//           }}
//         >
//           <FiEye className="h-4 w-4" />
//           View
//         </button>
//       ),
//     },
//   ];


//   /* -------------------------------------------------------
//      Loading
//   ------------------------------------------------------- */

//   if (loading) {
//     return (
//       <LoadingSpinner
//         full
//         label="Loading employees..."
//       />
//     );
//   }


//   /* -------------------------------------------------------
//      Error
//   ------------------------------------------------------- */

//   if (error) {
//     return (
//       <div className="max-w-6xl mx-auto space-y-5">

//         <div>
//           <h1 className="text-2xl font-semibold text-navy-800">
//             My Employees
//           </h1>

//           <p className="text-sm text-navy-400 mt-1">
//             Employees assigned to your team
//           </p>
//         </div>

//         <div className="card">
//           <ErrorState
//             message={error}
//             onRetry={loadEmployees}
//           />
//         </div>

//       </div>
//     );
//   }


//   /* -------------------------------------------------------
//      Render
//   ------------------------------------------------------- */

//   return (
//     <div className="max-w-7xl mx-auto space-y-5">

//       {/* --------------------------------------------------
//           Header
//       -------------------------------------------------- */}

//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

//         <div>
//           <div className="flex items-center gap-3">

//             <div className="h-11 w-11 rounded-xl bg-navy-100 flex items-center justify-center">
//               <FiUsers className="h-5 w-5 text-navy-700" />
//             </div>

//             <div>
//               <h1 className="text-2xl font-semibold text-navy-800">
//                 My Employees
//               </h1>

//               <p className="text-sm text-navy-400 mt-1">
//                 Employees assigned to your team
//               </p>
//             </div>

//           </div>
//         </div>


//         <button
//           type="button"
//           onClick={loadEmployees}
//           className="btn-secondary inline-flex items-center justify-center gap-2"
//         >
//           <FiRefreshCw className="h-4 w-4" />
//           Refresh
//         </button>

//       </div>


//       {/* --------------------------------------------------
//           Summary
//       -------------------------------------------------- */}

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

//         <div className="card p-5">

//           <div className="flex items-center justify-between">

//             <div>
//               <p className="text-sm text-navy-400">
//                 Total Employees
//               </p>

//               <p className="text-3xl font-semibold text-navy-800 mt-1">
//                 {employees.length}
//               </p>
//             </div>

//             <div className="h-11 w-11 rounded-xl bg-navy-100 flex items-center justify-center">
//               <FiUsers className="h-5 w-5 text-navy-700" />
//             </div>

//           </div>

//         </div>


//         <div className="card p-5">

//           <div className="flex items-center justify-between">

//             <div>
//               <p className="text-sm text-navy-400">
//                 Active Employees
//               </p>

//               <p className="text-3xl font-semibold text-navy-800 mt-1">
//                 {
//                   employees.filter(
//                     (employee) =>
//                       employee?.status === 'active'
//                   ).length
//                 }
//               </p>
//             </div>

//             <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center">
//               <FiUsers className="h-5 w-5 text-green-600" />
//             </div>

//           </div>

//         </div>

//       </div>


//       {/* --------------------------------------------------
//           Search
//       -------------------------------------------------- */}

//       <div className="card p-4">

//         <div className="relative">

//           <FiSearch
//             className="
//               absolute
//               left-3
//               top-1/2
//               -translate-y-1/2
//               h-4
//               w-4
//               text-navy-400
//             "
//           />

//           <input
//             type="text"
//             value={search}
//             onChange={(event) =>
//               setSearch(event.target.value)
//             }
//             placeholder="Search employee by name, ID, email, phone or designation..."
//             className="input-field pl-10"
//           />

//         </div>

//       </div>


//       {/* --------------------------------------------------
//           Employee Table
//       -------------------------------------------------- */}

//       <div className="card p-5">

//         <div className="flex items-center justify-between mb-4">

//           <div>
//             <h2 className="font-semibold text-navy-800">
//               Team Employees
//             </h2>

//             <p className="text-xs text-navy-400 mt-1">
//               {search
//                 ? `${filteredEmployees.length} employee(s) found`
//                 : `${employees.length} employee(s)`}
//             </p>
//           </div>

//         </div>


//         <DataTable
//           columns={columns}
//           rows={filteredEmployees}
//           loading={loading}
//           error={null}
//           onRetry={loadEmployees}
//           onRowClick={handleViewEmployee}
//           emptyTitle={
//             search
//               ? 'No employees found'
//               : 'No employees assigned'
//           }
//           emptyDescription={
//             search
//               ? 'Try a different search term.'
//               : 'Employees assigned to your team will appear here.'
//           }
//         />

//       </div>

//     </div>
//   );
// }



import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  FiUsers,
  FiSearch,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiEye,
  FiRefreshCw,
  FiUser,
  FiCheckCircle,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import StatusBadge from '../../components/StatusBadge';
import { resolveAssetUrl } from '../../utils/format';

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function unwrapResponse(response) {
  /*
   * Supports all of these response shapes:
   *
   * {
   *   data: {
   *     users: []
   *   }
   * }
   *
   * {
   *   data: {
   *     data: {
   *       users: []
   *     }
   *   }
   * }
   */

  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
}

function getUsers(response) {
  const payload = unwrapResponse(response);

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

/* =========================================================
   SAFE EMPLOYEE ID
========================================================= */

function getEmployeeId(employee) {
  return employee?._id || employee?.id || null;
}

/* =========================================================
   MY EMPLOYEES
========================================================= */

export default function MyEmployees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  /* =======================================================
     LOAD EMPLOYEES
  ======================================================= */

  const loadEmployees = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      /*
       * IMPORTANT
       *
       * Do NOT send teamLead here.
       *
       * Backend automatically applies:
       *
       * teamLead = req.user._id
       * role = employee
       *
       * for Team Leads.
       *
       * This prevents a Team Lead from seeing another
       * Team Lead's employees.
       */

      const response = await axiosClient.get('/users', {
        params: {
          role: 'employee',
          status: 'active',
          page: 1,
          limit: 100,
        },
      });

      const users = getUsers(response);

      /*
       * Additional frontend safety.
       *
       * Backend is already responsible for the real scope.
       * This only removes malformed/non-employee records
       * if an unexpected response is returned.
       */

      const employeeUsers = users.filter(
        (user) => !user?.role || user.role === 'employee'
      );

      setEmployees(employeeUsers);
    } catch (err) {
      console.error('My Employees Error:', err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        'Failed to load employees.';

      setError(message);
      setEmployees([]);

      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const searchText = search.trim().toLowerCase();

  const filteredEmployees = useMemo(() => {
    if (!searchText) {
      return employees;
    }

    return employees.filter((employee) => {
      const fullName =
        employee?.fullName?.toLowerCase() || '';

      const employeeCode =
        employee?.employeeCode?.toLowerCase() || '';

      const email =
        employee?.email?.toLowerCase() || '';

      const phone =
        employee?.phone?.toLowerCase() || '';

      const designation =
        employee?.designation?.toLowerCase() || '';

      const department =
        employee?.department?.name?.toLowerCase() || '';

      const departmentCode =
        employee?.department?.code?.toLowerCase() || '';

      return (
        fullName.includes(searchText) ||
        employeeCode.includes(searchText) ||
        email.includes(searchText) ||
        phone.includes(searchText) ||
        designation.includes(searchText) ||
        department.includes(searchText) ||
        departmentCode.includes(searchText)
      );
    });
  }, [employees, searchText]);

  /* =======================================================
     VIEW EMPLOYEE
  ======================================================= */

  const handleViewEmployee = useCallback(
    (employee) => {
      const id = getEmployeeId(employee);

      if (!id) {
        toast.error(
          'Employee ID is missing. Please refresh the employee list.'
        );
        return;
      }

      navigate(`/team-lead/employees/${id}`);
    },
    [navigate]
  );

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'Employee',
        render: (row) => {
          const imageUrl = row?.profileImage
            ? resolveAssetUrl(row.profileImage)
            : null;

          return (
            <div className="flex items-center gap-3 min-w-[220px]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={row?.fullName || 'Employee'}
                  className="h-10 w-10 rounded-full object-cover border border-navy-100 shrink-0"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.nextElementSibling?.classList.remove(
                      'hidden'
                    );
                  }}
                />
              ) : null}

              <div
                className={`h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700 shrink-0 ${
                  imageUrl ? 'hidden' : ''
                }`}
              >
                {row?.fullName?.charAt(0)?.toUpperCase() || 'E'}
              </div>

              <div className="min-w-0">
                <p className="font-medium text-navy-800 truncate">
                  {row?.fullName || 'Unknown Employee'}
                </p>

                <p className="text-xs text-navy-400 truncate">
                  {row?.employeeCode || 'No employee code'}
                </p>
              </div>
            </div>
          );
        },
      },

      {
        key: 'email',
        label: 'Email',
        render: (row) => (
          <div className="flex items-center gap-2 min-w-[220px]">
            <FiMail className="h-4 w-4 text-navy-400 shrink-0" />

            <span
              className="text-sm text-navy-600 truncate"
              title={row?.email || ''}
            >
              {row?.email || '-'}
            </span>
          </div>
        ),
      },

      {
        key: 'phone',
        label: 'Phone',
        render: (row) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <FiPhone className="h-4 w-4 text-navy-400 shrink-0" />

            <span className="text-sm text-navy-600">
              {row?.phone || '-'}
            </span>
          </div>
        ),
      },

      {
        key: 'designation',
        label: 'Designation',
        render: (row) => (
          <div className="flex items-center gap-2 min-w-[150px]">
            <FiBriefcase className="h-4 w-4 text-navy-400 shrink-0" />

            <span className="text-sm text-navy-600">
              {row?.designation || 'Employee'}
            </span>
          </div>
        ),
      },

      {
        key: 'department',
        label: 'Department',
        render: (row) => (
          <span className="text-sm text-navy-600">
            {row?.department?.name ||
              row?.department?.code ||
              '-'}
          </span>
        ),
      },

      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <StatusBadge
            status={row?.status || 'active'}
          />
        ),
      },

      {
        key: 'actions',
        label: 'Action',
        render: (row) => (
          <button
            type="button"
            className="
              inline-flex
              items-center
              gap-1.5
              text-sm
              font-medium
              text-navy-600
              hover:text-navy-900
              border
              border-navy-200
              hover:border-navy-400
              rounded-lg
              px-3
              py-1.5
              transition
            "
            onClick={(event) => {
              event.stopPropagation();
              handleViewEmployee(row);
            }}
          >
            <FiEye className="h-4 w-4" />
            View
          </button>
        ),
      },
    ],
    [handleViewEmployee]
  );

  /* =======================================================
     COUNTS
  ======================================================= */

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    (employee) => employee?.status === 'active'
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) => employee?.status !== 'active'
  ).length;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <LoadingSpinner
        full
        label="Loading employees..."
      />
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">

        <div>
          <h1 className="text-2xl font-semibold text-navy-800">
            My Employees
          </h1>

          <p className="text-sm text-navy-400 mt-1">
            Employees assigned to your team
          </p>
        </div>

        <div className="card p-6">
          <ErrorState
            message={error}
            onRetry={() => loadEmployees()}
          />
        </div>

      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="h-11 w-11 rounded-xl bg-navy-100 flex items-center justify-center">
            <FiUsers className="h-5 w-5 text-navy-700" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-navy-800">
              My Employees
            </h1>

            <p className="text-sm text-navy-400 mt-1">
              Employees assigned to your team
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() => loadEmployees(true)}
          disabled={refreshing}
          className="
            btn-secondary
            inline-flex
            items-center
            justify-center
            gap-2
            disabled:opacity-60
            disabled:cursor-not-allowed
          "
        >
          <FiRefreshCw
            className={`h-4 w-4 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />

          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>

      </div>

      {/* ==================================================
          SUMMARY CARDS
      ================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Total */}

        <div className="card p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-navy-400">
                Total Employees
              </p>

              <p className="text-3xl font-semibold text-navy-800 mt-1">
                {totalEmployees}
              </p>
            </div>

            <div className="h-11 w-11 rounded-xl bg-navy-100 flex items-center justify-center">
              <FiUsers className="h-5 w-5 text-navy-700" />
            </div>

          </div>

        </div>

        {/* Active */}

        <div className="card p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-navy-400">
                Active Employees
              </p>

              <p className="text-3xl font-semibold text-navy-800 mt-1">
                {activeEmployees}
              </p>
            </div>

            <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center">
              <FiCheckCircle className="h-5 w-5 text-green-600" />
            </div>

          </div>

        </div>

        {/* Inactive */}

        <div className="card p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-navy-400">
                Inactive Employees
              </p>

              <p className="text-3xl font-semibold text-navy-800 mt-1">
                {inactiveEmployees}
              </p>
            </div>

            <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center">
              <FiUser className="h-5 w-5 text-gray-500" />
            </div>

          </div>

        </div>

      </div>

      {/* ==================================================
          SEARCH
      ================================================== */}

      <div className="card p-4">

        <div className="relative">

          <FiSearch
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              h-4
              w-4
              text-navy-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search employee by name, ID, email, phone or designation..."
            className="input-field pl-10"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                text-xs
                text-navy-400
                hover:text-navy-700
              "
            >
              Clear
            </button>
          )}

        </div>

      </div>

      {/* ==================================================
          EMPLOYEE TABLE
      ================================================== */}

      <div className="card p-5">

        <div className="flex items-center justify-between mb-4">

          <div>
            <h2 className="font-semibold text-navy-800">
              Team Employees
            </h2>

            <p className="text-xs text-navy-400 mt-1">
              {search
                ? `${filteredEmployees.length} employee(s) found`
                : `${employees.length} employee(s)`}
            </p>
          </div>

        </div>

        <DataTable
          columns={columns}
          rows={filteredEmployees}
          loading={false}
          error={null}
          onRetry={() => loadEmployees()}
          onRowClick={handleViewEmployee}
          emptyTitle={
            search
              ? 'No employees found'
              : 'No employees assigned'
          }
          emptyDescription={
            search
              ? 'Try a different name, employee ID, email or designation.'
              : 'Employees assigned to your team will appear here.'
          }
        />

      </div>

    </div>
  );
}