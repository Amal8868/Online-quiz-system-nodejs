const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a quiz title'],
        trim: true,
    },
    quiz_id: {
        type: Number,
        unique: true,
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
    },
    room_code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
    },
    teacher: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    subject: {
        type: mongoose.Schema.ObjectId,
        ref: 'Subject',
        required: [true, 'Please add a subject'],
    },
    class: {
        type: mongoose.Schema.ObjectId,
        ref: 'Class',
        required: [true, 'Please add a class'],
    },
    duration: {
        type: Number, // in minutes
        required: [true, 'Please add quiz duration'],
    },
    total_points: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'started', 'finished'],
        default: 'draft',
    },
    start_time: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    show_detailed_results: {
        type: Boolean,
        default: true,
    },
});

// Transform _id to id in JSON and Object
QuizSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret, options) {
        ret.id = ret.quiz_id || ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

QuizSchema.set('toObject', {
    virtuals: true,
    transform: function (doc, ret, options) {
        ret.id = ret.quiz_id || ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

// Cascade delete questions when a quiz is deleted
QuizSchema.pre('deleteOne', { document: true, query: false }, async function () {
    console.log(`Questions being removed from quiz ${this._id}`);
    await this.model('Question').deleteMany({ quiz: this._id });
});

module.exports = mongoose.model('Quiz', QuizSchema);
