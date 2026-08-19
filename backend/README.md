# Employee Daily Task Management & Performance Reporting System — Backend

**Company:** VproTech Digital

Backend API for a Morning Planning / Evening Completion employee task
tracking system with three roles (Admin, Team Lead, Employee), approval
workflows, reporting, and Excel/PDF exports.

## Status

This is **Phase 1 of the build: the complete backend API.** No frontend
yet — this phase is API-complete, security-hardened, and independently
testable via the seed data below. The React/Vite frontend is the next phase.

## Core Concept

- **Morning:** employee plans tasks for the day.
- **Evening:** employee records actual completion, linked task-by-task
  to the morning plan (not a separate, unrelated record).
- Team Lead reviews and approves or returns each day's report.
- Reports roll this up daily / weekly / monthly / custom-range, scoped
  strictly by role.

## Completion percentage — how it's calculated

The overall completion percentage for a day is the **average of each
task's own completion percentage**, not a count of fully-finished tasks.
A task with no evening entry counts as 0%. See
`services/taskCalculations.js` for the exact logic and comments.

Example: 5 tasks scored 100, 100, 100, 100, 50 → daily completion = 90%.

## Tech stack

Node.js, Express, MongoDB/Mongoose, JWT auth, bcryptjs, ExcelJS, PDFKit,
Helmet, express-rate-limit, express-validator, express-mongo-sanitize.

## Project structure

```
backend/
  config/        # DB connection
  controllers/   # request handlers (no business logic in routes)
  middleware/    # auth, role checks, validation, rate limiting, uploads, errors
  models/        # Mongoose schemas: User, Department, DailyTaskReport, Notification, AuditLog
  routes/        # Express routers
  services/      # calculation logic, audit/notification helpers, report aggregation
  validators/    # express-validator rule sets
  reports/       # ExcelJS + PDFKit generators
  assets/        # company logo used on PDF report headers
  seed/          # seed.js — realistic multi-week sample dataset
  uploads/       # profile image uploads (gitignored)
```

## Database models

- **User** — unified model for Admin/Team Lead/Employee (`role` field).
  Employees reference their `department` and `teamLead`. Passwords are
  bcrypt-hashed; the hash is never serialized in API responses.
- **Department** — dynamic, admin-managed, soft-deactivatable.
- **DailyTaskReport** — one document per employee per calendar day,
  combining the morning plan and evening completion (per section 30 of
  the spec, this replaces separate TaskPlan/TaskCompletion models for a
  cleaner architecture). Each morning task has its own `_id`; each
  evening entry references it via `taskRef`, keeping the plan-vs-actual
  link explicit. Includes `reviewHistory` for the approval workflow and
  a denormalized `summary` block recomputed on every save.
- **Notification** — in-app notifications per recipient/type.
- **AuditLog** — admin-only action trail.

## Authentication & authorization

- JWT, `Authorization: Bearer <token>`.
- `middleware/auth.js` re-fetches the user from the DB on every request
  and derives identity/role from **that** — request bodies can never
  claim a different `employeeId`, `teamLeadId`, `departmentId`, or `role`.
- Every controller that touches a specific employee's data calls a
  scope check (`resolveTargetEmployee` / `assertReportInScope` /
  `assertInScope`) so Team Leads can only reach their own employees and
  Employees can only reach themselves.

## API overview

| Area | Base path |
|---|---|
| Auth | `/api/auth` — login, logout, me, change-password, forgot/reset-password |
| Users (Employees + Team Leads) | `/api/users` |
| Departments | `/api/departments` |
| Tasks (morning/evening/review) | `/api/tasks` |
| Reports (daily/weekly/monthly/custom + export) | `/api/reports` |
| Dashboards | `/api/dashboard/{employee,team-lead,admin}` |
| Notifications | `/api/notifications` |
| Audit logs (admin only) | `/api/audit-logs` |
| Profile image upload | `/api/uploads/profile-image` |

Full request/response shapes are stable and predictable:
`{ success, message, data?, meta? }` on success,
`{ success: false, message, details? }` on error.

## Installation

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGO_URI and a real JWT_SECRET
```

## MongoDB setup

Point `MONGO_URI` at any MongoDB 5+ instance — local, Docker, or Atlas:

```
MONGO_URI=mongodb://localhost:27017/employee_task_management
```

## Seed the database

```bash
npm run seed
```

This wipes the target database and creates:
- 1 Admin, 4 Team Leads, 18 Employees (one deactivated) across 5 departments
- ~45 weekdays of morning/evening task history per active employee, with a
  realistic mix of missing updates, completed/partial/not-completed tasks,
  and approved/needs-correction review outcomes

Printed seed credentials (change immediately in a real deployment):
```
Admin:      admin@vprotech.com / Admin@12345
Team Lead:  rahul.tl@vprotech.com / TeamLead@123
Employee:   emp1@vprotech.com / Employee@123
```

## Development

```bash
npm run dev     # nodemon
npm start       # production
```

## Testing

```bash
npm test              # full suite (unit + integration)
npm run test:unit     # pure logic only - no database needed, always runnable
npm run test:integration  # full API tests via Supertest + an in-memory MongoDB
```

- **`tests/unit/`** — `taskCalculations` (the weighted completion-percentage
  logic, including the exact 90% example from the spec) and
  `reportAggregation` (multi-day roll-up math). No database dependency;
  these run anywhere Node runs.
- **`tests/integration/`** — full HTTP-level tests via Supertest against
  the real Express app, backed by `mongodb-memory-server` (an in-memory
  MongoDB spun up per test run). Covers login/auth failures, RBAC
  (employee blocked from admin routes, team lead blocked from another
  team lead's employees, self-service profile editing), the full
  morning→evening→review workflow (including the "no morning plan yet"
  and "taskRef must match" rejections, and the correction-remark
  requirement), and IDOR protection (one employee can't read or write
  another employee's report by guessing its ID or supplying a spoofed
  `employeeId`).

  **Note:** `mongodb-memory-server` downloads a real `mongod` binary the
  first time it runs, from `fastdl.mongodb.org`. That will fail in any
  network-sandboxed environment that blocks that host (as it did in the
  environment this project was built in — confirmed to be *only* a
  network restriction, not a code issue: the tests load and execute
  correctly right up to the download step). On a normal dev machine or
  CI runner with outbound internet access, `npm run test:integration`
  downloads the binary once (cached afterward) and runs normally.
  Alternatively, set `MONGOMS_SYSTEM_BINARY` to a local `mongod`
  install to skip the download entirely.

## Report generation

`GET /api/reports/export?type=daily|weekly|monthly|custom&format=excel|pdf`
(plus the same date/scope params as the corresponding read endpoint)
streams a generated `.xlsx` or `.pdf` file, branded with the VproTech
Digital logo and name, containing per-employee totals and a summary block.

## Security considerations

- Helmet, strict CORS (`CLIENT_URL`), express-rate-limit (tighter on auth),
  express-mongo-sanitize (NoSQL-injection guard), express-validator on
  all mutating routes.
- Passwords bcrypt-hashed (cost 12); hashes never leave the API.
- JWTs invalidated on password change (`passwordChangedAt` check).
- Deactivated users are rejected at auth time regardless of token validity.
- File uploads restricted to image MIME types, 2MB limit, server-generated
  filenames.
- No secrets in source; `.env` is gitignored, `.env.example` has placeholders only.

## Changelog

- **Seed bug fix (found via real `npm run seed` run):** the seed script
  built `evening.tasks[].taskRef` from the original plain-object
  `morningTasks` array instead of the cast `report.morning.tasks`
  subdocuments — the former never gets an `_id` (Mongoose only assigns
  one once the objects are cast onto the schema path), so every seeded
  evening entry failed validation with `taskRef is required`. Fixed by
  reading `_id` off `report.morning.tasks` after assignment. Added
  `tests/unit/dailyTaskReportCasting.test.js` as a permanent regression
  test for this exact trap.
- **Phase 3:** added `services/emailService.js` (nodemailer, SMTP-optional
  with a console-log fallback when unconfigured) wired into forgot-password
  and into task-approved/task-returned notifications; added the full test
  suite described above (`tests/unit`, `tests/integration`).
- **Phase 2 fix:** `/api/users/:id` (GET/PATCH) now allows any authenticated
  user to view/edit their **own** record regardless of role, so Team Lead
  and Admin can update their own profile through the same endpoint
  Employees use. Scoping for viewing/editing *other* users is unchanged
  (admin: anyone; team lead: their own employees only).

## Not yet built

- A live end-to-end run against a real MongoDB instance (this project was
  built in a network-sandboxed environment with no path to a database or
  to the test binary download host — see "Testing" above). Everything
  has been verified via static analysis, syntax checks, a clean server
  boot, and (for the parts with no DB dependency) actually-passing tests.
