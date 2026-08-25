import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import LoadingSpinner from './components/LoadingSpinner';
import useAuth from './hooks/useAuth';

// ============================================================
// SHARED
// ============================================================

const Notifications = lazy(() => import('./pages/shared/Notifications'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const ChangePassword = lazy(() => import('./pages/shared/ChangePassword'));

// ============================================================
// EMPLOYEE
// ============================================================

const EmployeeDashboard = lazy(() =>
  import('./pages/employee/EmployeeDashboard')
);

const MorningTaskUpdate = lazy(() =>
  import('./pages/employee/MorningTaskUpdate')
);

const EveningTaskUpdate = lazy(() =>
  import('./pages/employee/EveningTaskUpdate')
);

const MyTasks = lazy(() =>
  import('./pages/employee/MyTasks')
);

const TaskDetail = lazy(() =>
  import('./pages/employee/TaskDetail')
);

const Reports = lazy(() =>
  import('./pages/employee/Reports')
);

// ============================================================
// TEAM LEAD
// ============================================================

const TeamLeadDashboard = lazy(() =>
  import('./pages/teamLead/TeamLeadDashboard')
);

const MyEmployees = lazy(() =>
  import('./pages/teamLead/MyEmployees')
);

const EmployeeDetail = lazy(() =>
  import('./pages/teamLead/EmployeeDetail')
);

const MorningUpdates = lazy(() =>
  import('./pages/teamLead/MorningUpdates')
);

const EveningUpdates = lazy(() =>
  import('./pages/teamLead/EveningUpdates')
);

// Existing generic review component
const TaskReview = lazy(() =>
  import('./pages/teamLead/TaskReview')
);

const TeamLeadReports = lazy(() =>
  import('./pages/teamLead/TeamLeadReports')
);

const TeamLeadPerformance = lazy(() =>
  import('./pages/teamLead/TeamLeadPerformance')
);

const MyMorningTask = lazy(() =>
  import('./pages/teamLead/MyMorningTask')
);

const MyEveningTask = lazy(() =>
  import('./pages/teamLead/MyEveningTask')
);


const AssignTask = lazy(() =>
  import('./pages/teamLead/AssignTask')
);

// ============================================================
// ADMIN
// ============================================================

const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard')
);

const AdminEmployees = lazy(() =>
  import('./pages/admin/AdminEmployees')
);

const AdminUserDetail = lazy(() =>
  import('./pages/admin/AdminUserDetail')
);

const AdminDepartments = lazy(() =>
  import('./pages/admin/AdminDepartments')
);

const AdminMorningUpdates = lazy(() =>
  import('./pages/admin/AdminMorningUpdates')
);

const AdminEveningUpdates = lazy(() =>
  import('./pages/admin/AdminEveningUpdates')
);

// Existing generic admin review component
const AdminReview = lazy(() =>
  import('./pages/admin/AdminReview')
);

const AdminReports = lazy(() =>
  import('./pages/admin/AdminReports')
);

const AdminAuditLogs = lazy(() =>
  import('./pages/admin/AdminAuditLogs')
);

const AdminAnnouncements = lazy(() =>
  import('./pages/admin/AdminAnnouncements')
);

const AdminPerformance = lazy(() =>
  import('./pages/admin/AdminPerformance')
);

// ============================================================
// ROLE REDIRECT
// ============================================================

function roleDashboardPath(role) {
  const rolePaths = {
    admin: '/admin/dashboard',
    team_lead: '/team-lead/dashboard',
    employee: '/employee/dashboard',
  };

  return rolePaths[role] || '/login';
}

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleDashboardPath(role)} replace />;
}

function PageFallback() {
  return <LoadingSpinner full label="Loading page..." />;
}

// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>

        {/* ======================================================
            ROOT
        ====================================================== */}

        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<Login />} />

        {/* ======================================================
            EMPLOYEE ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['employee']} />
          }
        >
          <Route
            path="/employee"
            element={
              <DashboardLayout title="Employee Portal" />
            }
          >
            <Route
              path="dashboard"
              element={<EmployeeDashboard />}
            />

            <Route
              path="morning-update"
              element={<MorningTaskUpdate />}
            />

            <Route
              path="evening-update"
              element={<EveningTaskUpdate />}
            />

            <Route
              path="my-tasks"
              element={<MyTasks />}
            />

            <Route
              path="my-tasks/:id"
              element={<TaskDetail />}
            />

            <Route
              path="reports"
              element={<Reports />}
            />

            <Route
              path="notifications"
              element={<Notifications />}
            />

            <Route
              path="profile"
              element={<Profile />}
            />

            <Route
              path="change-password"
              element={<ChangePassword />}
            />
          </Route>
        </Route>

        {/* ======================================================
            TEAM LEAD ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['team_lead']} />
          }
        >
          <Route
            path="/team-lead"
            element={
              <DashboardLayout title="Team Lead Portal" />
            }
          >
            <Route
              path="dashboard"
              element={<TeamLeadDashboard />}
            />

            {/* Team Lead own tasks */}
            <Route
              path="my-morning-task"
              element={<MyMorningTask />}
            />

<Route
  path="assign-task"
  element={<AssignTask />}
/>

            <Route
              path="my-evening-task"
              element={<MyEveningTask />}
            />

            {/* Employees */}
            <Route
              path="employees"
              element={<MyEmployees />}
            />

            <Route
              path="employees/:id"
              element={<EmployeeDetail />}
            />

            {/* Submission queues */}
            <Route
              path="morning-updates"
              element={<MorningUpdates />}
            />

            <Route
              path="evening-updates"
              element={<EveningUpdates />}
            />


            

            {/* ==================================================
                SEPARATE MORNING REVIEW
            ================================================== */}

            <Route
              path="morning-review/:id"
              element={
                <TaskReview reviewType="morning" />
              }
            />

            {/* ==================================================
                SEPARATE EVENING REVIEW
            ================================================== */}

            <Route
              path="evening-review/:id"
              element={
                <TaskReview reviewType="evening" />
              }
            />

            {/* Optional old route for backward compatibility */}
            <Route
              path="review/:id"
              element={
                <TaskReview />
              }
            />

            <Route
              path="reports"
              element={<TeamLeadReports />}
            />

            <Route
              path="performance"
              element={<TeamLeadPerformance />}
            />

            <Route
              path="notifications"
              element={<Notifications />}
            />

            <Route
              path="profile"
              element={<Profile />}
            />

            <Route
              path="change-password"
              element={<ChangePassword />}
            />
          </Route>
        </Route>

        {/* ======================================================
            ADMIN ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']} />
          }
        >
          <Route
            path="/admin"
            element={
              <DashboardLayout title="Admin Portal" />
            }
          >
            <Route
              path="dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="employees"
              element={<AdminEmployees />}
            />

            <Route
              path="users/:id"
              element={<AdminUserDetail />}
            />

            <Route
              path="departments"
              element={<AdminDepartments />}
            />

            {/* Submission queues */}
            <Route
              path="morning-updates"
              element={<AdminMorningUpdates />}
            />

            <Route
              path="evening-updates"
              element={<AdminEveningUpdates />}
            />

            {/* ==================================================
                SEPARATE MORNING REVIEW
            ================================================== */}

            <Route
              path="morning-review/:id"
              element={
                <AdminReview reviewType="morning" />
              }
            />

            {/* ==================================================
                SEPARATE EVENING REVIEW
            ================================================== */}

            <Route
              path="evening-review/:id"
              element={
                <AdminReview reviewType="evening" />
              }
            />

            {/* Optional old route */}
            <Route
              path="review/:id"
              element={
                <AdminReview />
              }
            />

            <Route
              path="reports"
              element={<AdminReports />}
            />

            <Route
              path="performance"
              element={<AdminPerformance />}
            />

            <Route
              path="audit-logs"
              element={<AdminAuditLogs />}
            />

            <Route
              path="announcements"
              element={<AdminAnnouncements />}
            />

            <Route
              path="notifications"
              element={<Notifications />}
            />

            <Route
              path="profile"
              element={<Profile />}
            />

            <Route
              path="change-password"
              element={<ChangePassword />}
            />
          </Route>
        </Route>

        {/* ======================================================
            FALLBACK
        ====================================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Suspense>
  );
}
