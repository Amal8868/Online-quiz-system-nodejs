const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    questionText: {
        type: String,
        required: [true, 'Please add question text'],
    },
    type: {
        type: String,
        enum: ['multiple-choice', 'true-false', 'short-answer', 'multiple-selection'],
        required: true,
    },
    options: [
        {
            text: { type: String, required: true },
            isCorrect: { type: Boolean, default: false },
        },
    ],
    correctAnswer: {
        type: String, // For short answer or storing correct option index/text
        required: true,
    },
    points: {
        type: Number,
        default: 1,
    },
});

module.exports = mongoose.model('Question', QuestionSchema);
