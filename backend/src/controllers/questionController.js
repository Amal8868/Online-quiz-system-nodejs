const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

// @desc    Get all questions for a quiz
// @route   GET /api/quizzes/:quizId/questions
// @access  Private (Teacher, Admin, Student)
exports.getQuestions = async (req, res, next) => {
    try {
        let quizId = req.params.quizId;
        // Resolve numeric quiz_id to _id if necessary
        if (/^\d+$/.test(quizId)) {
            const quiz = await Quiz.findOne({ quiz_id: parseInt(quizId) });
            if (quiz) {
                quizId = quiz._id;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const questions = await Question.find({ quiz: quizId });
        res.status(200).json({ success: true, count: questions.length, data: questions });
    } catch (err) {
        next(err);
    }
};

// @desc    Create question for a quiz
// @route   POST /api/quizzes/:quizId/questions
// @access  Private (Teacher, Admin)
exports.createQuestion = async (req, res, next) => {
    try {
        let quizId = req.params.quizId;
        let quiz;

        if (/^\d+$/.test(quizId)) {
            quiz = await Quiz.findOne({ quiz_id: parseInt(quizId) });
        } else {
            quiz = await Quiz.findById(quizId);
        }

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        req.body.quiz = quiz._id;

        // Make sure user is quiz owner
        if (quiz.teacher.toString() !== req.user.id && req.user.user_type !== 'Admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to add questions to this quiz' });
        }

        // Map frontend fields to backend model
        if (req.body.question_text) req.body.questionText = req.body.question_text;
        if (req.body.question_type) {
            // Map 'multiple_choice' -> 'multiple-choice', etc.
            req.body.type = req.body.question_type.replace(/_/g, '-');
        }
        if (req.body.correct_answer) req.body.correctAnswer = req.body.correct_answer;

        // Map options
        if (req.body.options && Array.isArray(req.body.options)) {
            req.body.options = req.body.options.map(opt => ({
                text: opt.option_text || opt.text,
                isCorrect: opt.is_correct || opt.isCorrect || false
            }));
        }

        const question = await Question.create(req.body);

        res.status(201).json({ success: true, data: question });
    } catch (err) {
        next(err);
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Teacher, Admin)
exports.updateQuestion = async (req, res, next) => {
    try {
        let question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        const quiz = await Quiz.findById(question.quiz);

        // Make sure user is quiz owner
        if (quiz.teacher.toString() !== req.user.id && req.user.user_type !== 'Admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to update this question' });
        }

        question = await Question.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: question });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Teacher, Admin)
exports.deleteQuestion = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        const quiz = await Quiz.findById(question.quiz);

        // Make sure user is quiz owner
        if (quiz.teacher.toString() !== req.user.id && req.user.user_type !== 'Admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this question' });
        }

        await question.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
