// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const morgan = require('morgan');
// const mongoSanitize = require('express-mongo-sanitize');
// const path = require('path');

// const { generalLimiter } = require('./middleware/rateLimiter');
// const { errorHandler, notFound } = require('./middleware/errorHandler');

// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const departmentRoutes = require('./routes/departmentRoutes');
// const taskRoutes = require('./routes/taskRoutes');
// const reportRoutes = require('./routes/reportRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const auditRoutes = require('./routes/auditRoutes');
// const dashboardRoutes = require('./routes/dashboardRoutes');
// const uploadRoutes = require('./routes/uploadRoutes');

// const app = express();

// app.use(helmet());
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:5173',
//     credentials: true,
//   })
// );
// app.use(express.json({ limit: '2mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(mongoSanitize()); // strips $/. operators from req.body/query/params to block NoSQL injection
// app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// app.use(generalLimiter);

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/api/health', (_req, res) => res.json({ success: true, message: 'API is healthy' }));

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/departments', departmentRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/audit-logs', auditRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/uploads', uploadRoutes);

// app.use(notFound);
// app.use(errorHandler);

// module.exports = app;



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

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize());

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
);

app.use(generalLimiter);

// crossOriginResourcePolicy is relaxed to 'cross-origin' so that files
// served from /uploads (profile images) can be loaded by the frontend
// when it's hosted on a different origin/domain than the API (e.g. a
// static host + Render). Without this, helmet's default same-origin
// policy silently blocks <img> tags from loading uploaded images.
app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(path.join(__dirname, 'uploads'))
);

app.get('/api/health', (_req, res) =>
  res.json({
    success: true,
    message: 'API is healthy',
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;