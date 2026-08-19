 /**
  * Seed script - creates ONLY the default admin account.
  *
  * Team Leads and Employees are created by the Admin
  * through the application.
  *
  * Usage:
  *   npm run seed
  *
  * WARNING:
  * This wipes existing data in the target database.
  * Never run against a production database with real data.
  */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Department = require('../models/Department');
const DailyTaskReport = require('../models/DailyTaskReport');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

async function run() {
  try {
    await connectDB();

    console.log('\n========================================');
    console.log('        RESETTING DATABASE');
    console.log('========================================\n');

    /*
     * Clear existing application data.
     *
     * This ensures that previously seeded Team Leads,
     * Employees, Departments, Tasks, etc. are removed.
     */
    console.log('Clearing existing data...');

    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      DailyTaskReport.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('Existing data cleared.');

    // --------------------------------------------------
    // CREATE ADMIN ONLY
    // --------------------------------------------------

    console.log('\nCreating default admin...');

    const admin = await User.create({
      employeeCode: 'ADM001',
      fullName: 'System Administrator',
      email: 'vprotechd@gmail.com',
      phone: '088941 10026',
      password: 'AdminVprotech@116',
      role: 'admin',
      designation: 'Administrator',
      joiningDate: new Date('2023-01-01'),
      status: 'active',
    });

    console.log('Admin created successfully.');

    // --------------------------------------------------
    // NOTHING ELSE IS SEEDED
    // --------------------------------------------------

    console.log('\n========================================');
    console.log('          SEED COMPLETED');
    console.log('========================================');

    console.log('\nLogin Details:');
    console.log('----------------------------------------');
    console.log('Email:    vprotechd@gmail.com');
    console.log('Password: AdminVprotech@116');
    console.log('Role:     admin');

    console.log('\nDatabase Contents:');
    console.log('----------------------------------------');
    console.log('Admin:              1');
    console.log('Team Leads:         0');
    console.log('Employees:          0');
    console.log('Departments:        0');
    console.log('Daily Task Reports: 0');
    console.log('Notifications:      0');
    console.log('Audit Logs:         0');

    console.log('\nAdmin will create the following through');
    console.log('the application:');
    console.log('- Departments');
    console.log('- Team Leads');
    console.log('- Employees');

    console.log('\n========================================\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('\nSeed failed:', err);

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Database disconnect error:', disconnectError);
    }

    process.exit(1);
  }
}

run();