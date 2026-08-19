const ROLES = {
  ADMIN: 'admin',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
};

const TASK_STATUS = {
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partially Completed',
  NOT_COMPLETED: 'Not Completed',
};

const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const REPORT_STATUS = {
  DRAFT: 'draft',
  MORNING_SUBMITTED: 'morning_submitted',
  EVENING_SUBMITTED: 'evening_submitted',
  APPROVED: 'approved',
  NEEDS_CORRECTION: 'needs_correction',
};

const NOTIFICATION_TYPES = {
  MORNING_REMINDER: 'morning_reminder',
  EVENING_REMINDER: 'evening_reminder',
  TASK_APPROVED: 'task_approved',
  TASK_RETURNED: 'task_returned',
  MORNING_SUBMITTED: 'morning_submitted',
  EVENING_SUBMITTED: 'evening_submitted',
  MISSING_UPDATE: 'missing_update',
  REPORT_INFO: 'report_info',
};

module.exports = { ROLES, TASK_STATUS, PRIORITY, REPORT_STATUS, NOTIFICATION_TYPES };
