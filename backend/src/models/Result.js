const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    quiz: {
        type: mongoose.Schema.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    total_points: {
        type: Number,
        required: true,
    },
    percentage: {
        type: Number,
    },
    answers: [
        {
            question: { type: mongoose.Schema.ObjectId, ref: 'Question' },
            student_answer: String,
            is_correct: Boolean,
            points_awarded: Number,
        },
    ],
    isPaused: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    submittedAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['waiting', 'in-progress', 'submitted'],
        default: 'waiting',
    },
    result_id: {
        type: Number,
        unique: true,
    },
});

// Auto-increment result_id
ResultSchema.pre('save', async function () {
    if (!this.isNew) {
        return;
    }

    try {
        const Counter = mongoose.model('Counter');
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'result_id' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.result_id = counter.seq + 10000; // Results start from 10001
    } catch (error) {
        throw error;
    }
});

// Transform _id to id in JSON
ResultSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret, options) {
        ret.id = ret.result_id || ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Hook to calculate percentage before saving
ResultSchema.pre('save', function () {
    this.percentage = (this.score / this.total_points) * 100;
});

module.exports = mongoose.model('Result', ResultSchema);
