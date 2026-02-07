const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a subject name'],
        trim: true,
    },
    code: {
        type: String,
        required: [true, 'Please add a subject code'],
        unique: true,
    },
    description: {
        type: String,
    },
    classes: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Class',
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Subject = mongoose.model('Subject', SubjectSchema);

SubjectSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = Subject;
