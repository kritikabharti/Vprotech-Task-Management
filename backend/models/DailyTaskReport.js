const mongoose = require('mongoose');
const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Morning Task
|--------------------------------------------------------------------------
*/

const morningTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },

    expectedCompletion: {
      type: String,
      trim: true,
      default: '',
    },

    estimatedTimeMinutes: {
      type: Number,
      required: true,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: '',
    },

    /*
    |--------------------------------------------------------------------------
    | Assignment Information
    |--------------------------------------------------------------------------
    */

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    assignmentType: {
      type: String,
      enum: ['self', 'assigned', 'reassigned'],
      default: 'self',
    },

    originalEmployee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reassignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);


/*
|--------------------------------------------------------------------------
| Evening Task
|--------------------------------------------------------------------------
*/

const eveningTaskSchema = new Schema(
  {
    taskRef: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'Completed',
        'Partially Completed',
        'Not Completed',
      ],
      required: true,
    },

    completionPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    actualTimeSpentMinutes: {
      type: Number,
      required: true,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);


/*
|--------------------------------------------------------------------------
| Review History
|--------------------------------------------------------------------------
*/

const reviewHistorySchema = new Schema(
  {
    stage: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },

    action: {
      type: String,
      enum: ['approved', 'needs_correction'],
      required: true,
    },

    remark: {
      type: String,
      trim: true,
      default: '',
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);


/*
|--------------------------------------------------------------------------
| Daily Task Report
|--------------------------------------------------------------------------
*/

const dailyTaskReportSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },

    teamLead: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Calendar Date
    |--------------------------------------------------------------------------
    */

    taskDate: {
      type: Date,
      required: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Report Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        'draft',
        'morning_submitted',
        'evening_submitted',
        'approved',
        'needs_correction',
      ],
      default: 'draft',
    },

    /*
    |--------------------------------------------------------------------------
    | LATE MORNING SUBMISSION
    |--------------------------------------------------------------------------
    | These fields are required when employee submits after the deadline.
    */

    isLateSubmission: {
      type: Boolean,
      default: false,
    },

    lateSubmissionReason: {
      type: String,
      trim: true,
      default: '',
    },

    lateSubmittedAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Morning
    |--------------------------------------------------------------------------
    */

    morning: {
      tasks: {
        type: [morningTaskSchema],
        default: [],
      },

      remarks: {
        type: String,
        trim: true,
        default: '',
      },

      submittedAt: {
        type: Date,
        default: null,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Evening
    |--------------------------------------------------------------------------
    */

    evening: {
      tasks: {
        type: [eveningTaskSchema],
        default: [],
      },

      remarks: {
        type: String,
        trim: true,
        default: '',
      },

      submittedAt: {
        type: Date,
        default: null,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    summary: {
      totalPlanned: {
        type: Number,
        default: 0,
      },

      totalCompleted: {
        type: Number,
        default: 0,
      },

      totalPartial: {
        type: Number,
        default: 0,
      },

      totalNotCompleted: {
        type: Number,
        default: 0,
      },

      totalEstimatedMinutes: {
        type: Number,
        default: 0,
      },

      totalActualMinutes: {
        type: Number,
        default: 0,
      },

      completionPercentage: {
        type: Number,
        default: 0,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Review
    |--------------------------------------------------------------------------
    */

    reviewHistory: {
      type: [reviewHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    */

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

dailyTaskReportSchema.index(
  { employee: 1, taskDate: 1 },
  { unique: true }
);

dailyTaskReportSchema.index({
  department: 1,
  taskDate: 1,
});

dailyTaskReportSchema.index({
  teamLead: 1,
  taskDate: 1,
});

dailyTaskReportSchema.index({
  status: 1,
});

dailyTaskReportSchema.index({
  isLateSubmission: 1,
});

dailyTaskReportSchema.index({
  createdAt: 1,
});


module.exports = mongoose.model(
  'DailyTaskReport',
  dailyTaskReportSchema
);