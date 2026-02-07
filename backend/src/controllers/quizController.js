const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Class = require('../models/Class');
const mongoose = require('mongoose');

const Counter = require('../models/Counter');

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public
exports.getQuizzes = async (req, res, next) => {
    try {
        const query = req.user.user_type?.toLowerCase() === 'admin' ? {} : { teacher: req.user.id };
        const quizzes = await Quiz.find(query).populate('teacher', 'first_name last_name email');

        // Enrich quizzes with question data and mapped fields
        const enrichedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
            const questions = await Question.find({ quiz: quiz._id });
            const quizObj = quiz.toObject();

            quizObj.questions_count = questions.length;
            quizObj.total_points = questions.reduce((sum, q) => sum + (q.points || 0), 0);
            quizObj.duration_minutes = quizObj.duration;
            // Ensure id is numeric quiz_id if available, fallback to _id
            if (quiz.quiz_id) {
                quizObj.id = quiz.quiz_id;
            }

            return quizObj;
        }));

        res.status(200).json({ success: true, count: enrichedQuizzes.length, data: enrichedQuizzes });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private (Teacher, Admin)
exports.getQuiz = async (req, res, next) => {
    try {
        let query;
        // Check if id is numeric (custom quiz_id) or ObjectId
        const isNumeric = /^\d+$/.test(req.params.id);

        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }

        const quiz = await Quiz.findOne(query).populate('teacher', 'first_name last_name email');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Get questions for this quiz
        const questions = await Question.find({ quiz: quiz._id });

        // Convert to plain object to add virtuals/custom fields
        const quizObj = quiz.toObject({ virtuals: true });

        // Map questions to match frontend field names
        quizObj.questions = questions.map(q => {
            const qObj = q.toObject({ virtuals: true });
            return {
                ...qObj,
                id: qObj._id || qObj.id,
                question_text: qObj.questionText,
                question_type: qObj.type ? qObj.type.replace(/-/g, '_') : 'multiple_choice',
                points: qObj.points || 1,
                options: (qObj.options || []).map(opt => ({
                    ...opt,
                    id: opt._id || opt.id,
                    option_text: opt.text,
                    is_correct: opt.isCorrect
                }))
            };
        });

        // Map stats fields for frontend
        quizObj.duration_minutes = quizObj.duration;
        quizObj.total_points = quizObj.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        quizObj.questions_count = questions.length;

        // Ensure id is top-level and uses quiz_id if available
        if (quiz.quiz_id) {
            quizObj.id = quiz.quiz_id;
        } else if (!quizObj.id) {
            quizObj.id = quizObj._id;
        }

        res.status(200).json({ success: true, data: quizObj });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher, Admin)
exports.createQuiz = async (req, res, next) => {
    try {
        req.body.teacher = req.user.id;

        // Auto-generate a unique room code if missing
        if (!req.body.room_code) {
            const timestampPart = Date.now().toString(36).slice(-2).toUpperCase();
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            req.body.room_code = (timestampPart + randomPart);
        }

        // Map frontend fields to backend model
        if (req.body.subject_id) req.body.subject = req.body.subject_id;
        if (req.body.duration_minutes) req.body.duration = req.body.duration_minutes;

        // Handle class assignment (resolve numeric ID if needed)
        if (req.body.class_ids && Array.isArray(req.body.class_ids) && req.body.class_ids.length > 0) {
            let classId = req.body.class_ids[0];

            // Checks if it is a number or numeric string (e.g. "101")
            const isNumericId = /^\d+$/.test(classId);

            if (isNumericId) {
                const foundClass = await Class.findOne({ class_id: parseInt(classId) });
                if (foundClass) {
                    req.body.class = foundClass._id;
                } else {
                    return res.status(404).json({ success: false, error: `Class with ID ${classId} not found` });
                }
            } else {
                req.body.class = classId;
            }
        }

        // Generate auto-increment quiz_id
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'quizId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        req.body.quiz_id = counter.seq;

        const quiz = await Quiz.create(req.body);

        // Return object with new ID
        const quizObj = quiz.toObject();
        quizObj.id = quiz.quiz_id; // Send numeric ID to frontend

        res.status(201).json({ success: true, data: quizObj });
    } catch (err) {
        next(err);
    }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Teacher, Admin)
exports.updateQuiz = async (req, res, next) => {
    try {
        let query;
        const isNumeric = /^\d+$/.test(req.params.id);
        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }
        let quiz = await Quiz.findOne(query);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Make sure user is quiz owner or admin
        const isOwner = quiz.teacher.toString() === req.user._id.toString();
        const isAdmin = req.user.user_type?.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Not authorized to update this quiz' });
        }

        quiz = await Quiz.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Teacher, Admin)
exports.deleteQuiz = async (req, res, next) => {
    try {
        let query;
        const isNumeric = /^\d+$/.test(req.params.id);
        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }
        const quiz = await Quiz.findOne(query);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Make sure user is quiz owner or admin
        const isOwner = quiz.teacher.toString() === req.user._id.toString();
        const isAdmin = req.user.user_type?.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this quiz' });
        }

        await quiz.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
// @desc    Set classes for a quiz
// @route   POST /api/quizzes/:id/classes
// @access  Private (Teacher, Admin)
exports.setQuizClasses = async (req, res, next) => {
    try {
        const { class_ids } = req.body;
        let query;
        const isNumeric = /^\d+$/.test(req.params.id);
        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }
        const quiz = await Quiz.findOne(query);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // In this implementation, we just update the 'class' field to the first one for now,
        // or we could expand the model. Since the model has a single 'class' field,
        // we will update that.
        if (class_ids && class_ids.length > 0) {
            let classId = class_ids[0];
            const isNumericId = /^\d+$/.test(classId);

            if (isNumericId) {
                const foundClass = await Class.findOne({ class_id: parseInt(classId) });
                if (foundClass) {
                    quiz.class = foundClass._id;
                } else {
                    return res.status(404).json({ success: false, error: `Class with ID ${classId} not found` });
                }
            } else {
                quiz.class = classId;
            }
            await quiz.save();
        }

        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};
// @desc    Update quiz status
// @route   POST /api/quizzes/:id/status
// @access  Private (Teacher, Admin)
exports.updateQuizStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        let query;
        const isNumeric = /^\d+$/.test(req.params.id);
        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }
        const quiz = await Quiz.findOne(query);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Make sure user is quiz owner or admin
        const isOwner = quiz.teacher.toString() === req.user._id.toString();
        const isAdmin = req.user.user_type?.toLowerCase() === 'admin';

        console.log(`[updateQuizStatus] Quiz: ${req.params.id}, New Status: ${status}`);
        console.log(`[updateQuizStatus] User: ${req.user._id}, Type: ${req.user.user_type}, IsOwner: ${isOwner}, IsAdmin: ${isAdmin}`);
        console.log(`[updateQuizStatus] Quiz Teacher: ${quiz.teacher.toString()}, Req User: ${req.user._id.toString()}`);

        if (!isOwner && !isAdmin) {
            console.log('[updateQuizStatus] Authorization failed');
            return res.status(401).json({ success: false, error: 'Not authorized to update this quiz status' });
        }

        const allowedStates = ['draft', 'active', 'started', 'finished'];
        if (!allowedStates.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        if (status === 'active' || status === 'started') {
            const questionCount = await Question.countDocuments({ quiz: quiz._id });
            if (questionCount === 0) {
                return res.status(400).json({ success: false, error: 'Cannot activate a quiz with no questions. Please add questions first.' });
            }
        }

        quiz.status = status;
        if (status === 'started') {
            quiz.start_time = Date.now();
        }

        await quiz.save();
        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};

// @desc    Adjust quiz time (Add/Remove minutes)
// @route   POST /api/quizzes/:id/adjust-time
// @access  Private (Teacher, Admin)
exports.adjustTime = async (req, res, next) => {
    try {
        const { adjustment } = req.body; // adjustment in minutes (e.g. +5 or -5)
        let query;
        const isNumeric = /^\d+$/.test(req.params.id);
        if (isNumeric) {
            query = { quiz_id: parseInt(req.params.id) };
        } else {
            query = { _id: req.params.id };
        }
        const quiz = await Quiz.findOne(query);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Make sure user is quiz owner or admin
        const isOwner = quiz.teacher.toString() === req.user._id.toString();
        const isAdmin = req.user.user_type?.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Not authorized to update this quiz' });
        }

        quiz.duration = (quiz.duration || 0) + parseInt(adjustment);

        // Prevent negative duration
        if (quiz.duration < 1) quiz.duration = 1;

        await quiz.save();

        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};
// @desc    Get quizzes by class
// @route   GET /api/classes/:id/quizzes
// @access  Private (Teacher, Admin)
exports.getQuizzesByClass = async (req, res, next) => {
    try {
        const isNumericClass = /^\d+$/.test(req.params.id);
        const classQuery = isNumericClass ? { class_id: parseInt(req.params.id) } : { _id: req.params.id };
        const foundClass = await Class.findOne(classQuery);

        if (!foundClass) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        const quizzes = await Quiz.find({ class: foundClass._id })
            .select('title duration status createdAt quiz_id teacher subject')
            .lean();

        // For each quiz, add submission count and question count
        const enhancedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
            try {
                const [question_count, submission_count] = await Promise.all([
                    Question.countDocuments({ quiz: quiz._id }),
                    Result.countDocuments({ quiz: quiz._id })
                ]);

                return {
                    ...quiz,
                    id: quiz.quiz_id || quiz._id,
                    time_limit: quiz.duration || 0,
                    question_count: question_count || 0,
                    submission_count: submission_count || 0
                };
            } catch (innerErr) {
                return {
                    ...quiz,
                    id: quiz.quiz_id || quiz._id,
                    time_limit: quiz.duration || 0,
                    question_count: 0,
                    submission_count: 0
                };
            }
        }));

        res.status(200).json({
            success: true,
            count: enhancedQuizzes.length,
            data: enhancedQuizzes
        });
    } catch (err) {
        next(err);
    }
};
