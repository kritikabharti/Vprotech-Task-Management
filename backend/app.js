const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

/* ============================================================
   SECURITY HEADERS
============================================================ */

app.use(helmet());


/* ============================================================
   CORS CONFIGURATION
============================================================ */

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://vprotech-task-management.onrender.com',
  process.env.CLIENT_URL,
].filter(Boolean);


// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests that do not contain an Origin header.
      // Useful for Postman, server-to-server requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      // Allow known frontend origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject unknown origins
      console.warn(
        `CORS blocked request from origin: ${origin}`
      );

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    credentials: true,
  })
);


/* ============================================================
   BODY PARSING
============================================================ */

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);


/* ============================================================
   MONGO SANITIZATION
============================================================ */

app.use(mongoSanitize());


/* ============================================================
   LOGGING
============================================================ */

app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : 'dev'
  )
);


/* ============================================================
   RATE LIMITER
============================================================ */

app.use(generalLimiter);


/* ============================================================
   UPLOADS / STATIC FILES
============================================================ */

// crossOriginResourcePolicy is relaxed to 'cross-origin'
// so profile images can be loaded by the frontend even
// when frontend and backend are hosted on different domains.

app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({
    policy: 'cross-origin',
  }),
  express.static(
    path.join(__dirname, 'uploads')
  )
);


/* ============================================================
   API HEALTH CHECK
============================================================ */

app.get(
  '/api/health',
  (_req, res) => {
    res.json({
      success: true,
      message: 'API is healthy',
    });
  }
);


/* ============================================================
   AUTH ROUTES
============================================================ */

app.use(
  '/api/auth',
  authRoutes
);


/* ============================================================
   USER ROUTES
============================================================ */

app.use(
  '/api/users',
  userRoutes
);


/* ============================================================
   DEPARTMENT ROUTES
============================================================ */

app.use(
  '/api/departments',
  departmentRoutes
);


/* ============================================================
   TASK ROUTES
============================================================ */

app.use(
  '/api/tasks',
  taskRoutes
);


/* ============================================================
   REPORT ROUTES
============================================================ */

app.use(
  '/api/reports',
  reportRoutes
);


/* ============================================================
   NOTIFICATION ROUTES
============================================================ */

app.use(
  '/api/notifications',
  notificationRoutes
);


/* ============================================================
   AUDIT LOG ROUTES
============================================================ */

app.use(
  '/api/audit-logs',
  auditRoutes
);


/* ============================================================
   DASHBOARD ROUTES
============================================================ */

app.use(
  '/api/dashboard',
  dashboardRoutes
);


/* ============================================================
   UPLOAD ROUTES
============================================================ */

app.use(
  '/api/uploads',
  uploadRoutes
);


/* ============================================================
   404 HANDLER
============================================================ */

app.use(notFound);


/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(errorHandler);


/* ============================================================
   EXPORT APP
============================================================ */

module.exports = app;