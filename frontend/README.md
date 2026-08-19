# Employee Daily Task Management — Frontend

**Company:** VproTech Digital

React (Vite) frontend for the full task management system: Employee,
Team Lead, and Admin portals — login, dashboards, the morning/evening
task workflow, review/approval, employee & department management,
company-wide reporting with Excel/PDF export, notifications, audit
logs, and profile management.

## Status

**All three roles are built.** Employee, Team Lead, and Admin each get
their own route tree, sidebar, and dashboard, sharing one component
library and the Notifications/Profile/Change-Password pages.

## Tech stack

React 18, Vite, Tailwind CSS, React Router DOM, Redux Toolkit, Axios,
React Hook Form, Recharts, React Icons, React Toastify.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` and
`/uploads` to the backend on `http://localhost:5000` (see
`vite.config.js`) — so both must be running for the app to work. Start
the backend first (`cd ../backend && npm run dev`, after seeding).

Log in with any seeded account:
- Admin: `admin@vprotech.com` / `Admin@12345`
- Team Lead: `rahul.tl@vprotech.com` / `TeamLead@123`
- Employee: `emp1@vprotech.com` / `Employee@123`

## Structure

```
src/
  api/axiosClient.js     # axios instance; attaches JWT, handles 401 -> logout
  store/                 # Redux Toolkit: authSlice (token/user, persisted to
                          # localStorage), uiSlice (mobile sidebar state)
  routes/ProtectedRoute.jsx  # redirects unauthenticated users / wrong-role access
  layouts/                # Sidebar (role-aware link sets), Topbar, DashboardLayout
  components/              # DataTable, Modal, ConfirmDialog, StatusBadge,
                            # Pagination, SearchBar, LoadingSpinner, EmptyState
  pages/auth/Login.jsx
  pages/shared/            # Notifications, Profile, Change Password — reused
                            # as-is across all three roles
  pages/employee/          # Dashboard, Morning/Evening Task Update, My Tasks,
                            # Task Detail, Reports
  pages/teamLead/          # Dashboard, My Employees, Employee Detail,
                            # Morning/Evening Updates, Task Review, Reports
  pages/admin/              # Dashboard (with charts), Employees & Team Leads
                            # (unified user management + reassignment),
                            # User Detail, Departments, Morning/Evening
                            # Updates, Task Review, Reports, Audit Logs
  utils/format.js          # date/time/label formatting helpers
```

## Notable behavior

- **Morning Task Update**: dynamic task list (add/remove rows), total
  task count computed automatically, Save Draft vs Submit, and the
  form locks once the day's report has moved past an editable status.
- **Evening Task Update**: always loads that day's morning tasks first
  (via `GET /tasks/day`) and blocks with a clear empty state + link to
  the Morning page if none exist yet — evening entries are never typed
  from scratch, only linked to a morning task.
- **Task Review** (Team Lead + Admin): a pending-review queue merging
  morning- and evening-submitted reports, and a detail view with the
  full plan-vs-actual comparison; returning a report for correction
  requires a remark, matching the backend's validation.
- **Reports**: tabbed Daily/Weekly/Monthly/Custom at every role, scoped
  progressively wider (self → team → company, with department/team
  lead/employee filters for Admin), all with Excel/PDF download via
  `GET /reports/export` (streamed as a blob).
- **Admin Employees & Team Leads**: one page with a role tab, search,
  department/status filters, add-user modal (role-aware fields), and a
  reassignment modal for department/team lead — reactivation is
  correctly Admin-only in the UI, matching the backend's business
  rules (Team Leads can deactivate but not reactivate).
- **Admin Dashboard**: department performance bar chart and a
  completed/partial/not-completed pie chart, built from the monthly
  report endpoint, alongside the standard stat cards.
- Every list view has loading, empty, and error (toast) states per the
  spec's error-handling requirement.

## Performance

Every page component is code-split (`React.lazy` + `Suspense` in
`App.jsx`), and vendor libraries are split into their own chunks
(`vite.config.js` → `manualChunks`: `vendor-react`, `vendor-charts`,
`vendor-forms`). A user only downloads their own role's pages plus the
shared chunks — an Employee never pulls in Admin's bundle. This
replaced the earlier single ~800KB bundle with per-page chunks in the
1–9KB range.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```
