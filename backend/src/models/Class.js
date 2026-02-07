const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a class name'],
        trim: true,
    },
    section: {
        type: String,
        trim: true,
    },
    academicYear: {
        type: String,
        required: [true, 'Please add an academic year'],
    },
    teachers: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    ],
    students: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    ],
    class_id: {
        type: Number,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Auto-increment class_id
ClassSchema.pre('save', async function () {
    if (!this.isNew) {
        return;
    }

    try {
        const Counter = mongoose.model('Counter');
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'class_id' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.class_id = counter.seq + 100; // Classes start from 101
    } catch (error) {
        throw error;
    }
});

const Class = mongoose.model('Class', ClassSchema);

ClassSchema.virtual('student_count').get(function () {
    return this.students ? this.students.length : 0;
});

ClassSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret, options) {
        ret.id = ret.class_id || ret._id;
        ret.academic_year = ret.academicYear; // For frontend compatibility
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

ClassSchema.set('toObject', {
    virtuals: true,
    transform: function (doc, ret, options) {
        ret.id = ret.class_id || ret._id;
        return ret;
    }
});

module.exports = Class;
