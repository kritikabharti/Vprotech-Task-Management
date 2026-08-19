const mongoose = require('mongoose');
const { Schema } = mongoose;

// A single planned (morning) task. Gets its own _id so the matching
// evening entry can reference it directly (evening.taskRef).
const morningTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    expectedCompletion: { type: String, trim: true, default: '' }, // free-text target (e.g. "By 4 PM", "EOD")
    estimatedTimeMinutes: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true, default: '' },
  },
  { _id: true, timestamps: false }
);

// The evening entry for one morning task. taskRef MUST point at an
// existing morningTasks._id in the same document - enforced in the
// controller, not just here, since Mongoose can't cross-validate array refs.
const eveningTaskSchema = new Schema(
  {
    taskRef: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['Completed', 'Partially Completed', 'Not Completed'],
      required: true,
    },
    completionPercentage: { type: Number, required: true, min: 0, max: 100 },
    actualTimeSpentMinutes: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true, default: '' },
  },
  { _id: false, timestamps: false }
);

const reviewHistorySchema = new Schema(
  {
    stage: { type: String, enum: ['morning', 'evening'], required: true },
    action: { type: String, enum: ['approved', 'needs_correction'], required: true },
    remark: { type: String, trim: true, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const dailyTaskReportSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    teamLead: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Stored as a normalized UTC midnight Date representing the calendar day.
    taskDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['draft', 'morning_submitted', 'evening_submitted', 'approved', 'needs_correction'],
      default: 'draft',
    },

    morning: {
      tasks: { type: [morningTaskSchema], default: [] },
      remarks: { type: String, trim: true, default: '' },
      submittedAt: { type: Date, default: null },
    },

    evening: {
      tasks: { type: [eveningTaskSchema], default: [] },
      remarks: { type: String, trim: true, default: '' },
      submittedAt: { type: Date, default: null },
    },

    // Denormalized summary fields, recomputed by services/taskCalculations.js
    // on every morning/evening save so reports never need to re-aggregate.
    summary: {
      totalPlanned: { type: Number, default: 0 },
      totalCompleted: { type: Number, default: 0 },
      totalPartial: { type: Number, default: 0 },
      totalNotCompleted: { type: Number, default: 0 },
      totalEstimatedMinutes: { type: Number, default: 0 },
      totalActualMinutes: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 }, // weighted average, see calculation doc
    },

    reviewHistory: { type: [reviewHistorySchema], default: [] },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One report per employee per calendar day.
dailyTaskReportSchema.index({ employee: 1, taskDate: 1 }, { unique: true });
dailyTaskReportSchema.index({ department: 1, taskDate: 1 });
dailyTaskReportSchema.index({ teamLead: 1, taskDate: 1 });
dailyTaskReportSchema.index({ status: 1 });
dailyTaskReportSchema.index({ createdAt: 1 });

module.exports = mongoose.model('DailyTaskReport', dailyTaskReportSchema);
