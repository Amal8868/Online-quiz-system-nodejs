const Result = require('../models/Result');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Class = require('../models/Class');
const mongoose = require('mongoose');

// @desc    Submit a quiz attempt
// @route   POST /api/quizzes/:quizId/submit
// @access  Private (Student)
exports.submitQuiz = async (req, res, next) => {
    try {
        const { answers } = req.body;
        let quizId = req.params.quizId;
        const studentId = req.user.id;

        let quiz;
        if (/^\d+$/.test(quizId)) {
            quiz = await Quiz.findOne({ quiz_id: parseInt(quizId) });
        } else {
            quiz = await Quiz.findById(quizId);
        }

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        // Use the resolved ObjectId for the rest of operation
        quizId = quiz._id;

        const questions = await Question.find({ quiz: quizId });

        let score = 0;
        let total_points = 0;
        const processAnswers = [];

        for (let question of questions) {
            total_points += question.points;

            const studentAnswerObj = answers.find(a => a.questionId.toString() === question._id.toString());
            const student_answer = studentAnswerObj ? studentAnswerObj.answer : '';

            let is_correct = false;
            if (question.type === 'multiple-choice' || question.type === 'true-false') {
                is_correct = question.correctAnswer === student_answer;
            } else if (question.type === 'short-answer') {
                is_correct = question.correctAnswer.toLowerCase() === student_answer.toLowerCase();
            }

            const points_awarded = is_correct ? question.points : 0;
            if (is_correct) score += points_awarded;

            processAnswers.push({
                question: question._id,
                student_answer,
                is_correct,
                points_awarded
            });
        }

        const result = await Result.create({
            student: studentId,
            quiz: quizId,
            score,
            total_points,
            answers: processAnswers
        });

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all results for a student
// @route   GET /api/results/me
// @access  Private (Student)
exports.getMyResults = async (req, res, next) => {
    try {
        const results = await Result.find({ student: req.user.id }).populate('quiz', 'title');
        res.status(200).json({ success: true, count: results.length, data: results });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all results for a quiz (Teacher/Admin)
// @route   GET /api/quizzes/:quizId/results
// @access  Private (Teacher, Admin)
exports.getQuizResults = async (req, res, next) => {
    try {
        let quizId = req.params.quizId;
        if (/^\d+$/.test(quizId)) {
            const quiz = await Quiz.findOne({ quiz_id: parseInt(quizId) });
            if (quiz) {
                quizId = quiz._id;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const results = await Result.find({ quiz: quizId }).populate('student', 'name email');
        res.status(200).json({ success: true, count: results.length, data: results });
    } catch (err) {
        next(err);
    }
};

// @desc    Get Live Stats for a quiz (Teacher Board)
// @route   GET /api/quizzes/:quizId/live-stats
// @access  Private (Teacher, Admin)
exports.getLiveStats = async (req, res, next) => {
    try {
        let quizId = req.params.quizId;
        if (/^\d+$/.test(quizId)) {
            const quiz = await Quiz.findOne({ quiz_id: parseInt(quizId) });
            if (quiz) {
                quizId = quiz._id;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const results = await Result.find({ quiz: quizId })
            .populate('student', 'first_name last_name user_id')
            .lean();

        const questions = await Question.find({ quiz: quizId });
        const totalQuestions = questions.length;

        // Create a map of Question ID -> Type
        const questionTypeMap = {};
        questions.forEach(q => {
            questionTypeMap[q._id.toString()] = q.type;
        });

        const stats = results.map((r) => {
            const correctCount = r.answers.filter((a) => a.is_correct).length;

            // Pending: Short Answer + Not Correct + Not manually graded yet (points === 0 usually, but checking type is safer)
            // Actually, if it's 'short-answer' and !is_correct, we treat it as pending by default in this view
            const pendingCount = r.answers.filter((a) => {
                const qType = questionTypeMap[a.question.toString()];
                return !a.is_correct && qType === 'short-answer';
            }).length;

            const wrongCount = r.answers.filter((a) => {
                const qType = questionTypeMap[a.question.toString()];
                return !a.is_correct && qType !== 'short-answer';
            }).length;

            const progress = totalQuestions > 0 ? (r.answers.length / totalQuestions) * 100 : 0;

            // Determine status label
            let status_label = 'Waiting';
            if (r.isBlocked) status_label = 'Blocked';
            else if (r.status === 'submitted' || r.status === 'graded') status_label = 'Finished';
            else if (r.isPaused) status_label = 'Paused';
            else if (r.status === 'in-progress') status_label = 'In Progress';

            console.log(`[DEBUG_LIVE_STATS] ResultID: ${r._id}, Status: '${r.status}', Label: ${status_label}, Answers: ${r.answers.length}`);

            return {
                result_id: r._id,
                name: `${r.student.first_name || ''} ${r.student.last_name || ''}`.trim(),
                student_display_id: r.student.user_id,
                status_label,
                answered_count: r.answers.length,
                correct_count: correctCount,
                wrong_count: wrongCount,
                pending_count: pendingCount,
                percentage: r.percentage || 0,
                isPaused: r.isPaused,
                isBlocked: r.isBlocked,
            };
        });

        res.status(200).json({ success: true, count: stats.length, data: stats });
    } catch (err) {
        next(err);
    }
};

// @desc    Get detailed result for a student (for Grading Page)
// @route   GET /api/results/:id/details
// @access  Private (Teacher, Admin)
exports.getDetailedResult = async (req, res, next) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate('student', 'firstName lastName user_id')
            .populate('quiz', 'title')
            .populate('answers.question');

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// @desc    Manually grade a question
// @route   POST /api/teachers/results/:id/grade
// @access  Private (Teacher, Admin)
exports.updateManualGrade = async (req, res, next) => {
    try {
        const { question_id, points } = req.body;
        const isNumeric = /^\d+$/.test(req.params.id);
        const query = isNumeric ? { result_id: parseInt(req.params.id) } : { _id: req.params.id };
        const result = await Result.findOne(query);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        const answerIndex = result.answers.findIndex((a) => a.question.toString() === question_id);
        if (answerIndex === -1) {
            return res.status(404).json({ success: false, error: 'Answer not found' });
        }

        result.answers[answerIndex].points_awarded = parseFloat(points);
        result.answers[answerIndex].is_correct = parseFloat(points) > 0;

        // Recalculate total score
        result.score = result.answers.reduce((acc, curr) => acc + (curr.points_awarded || 0), 0);

        await result.save();

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// @desc    Control a student attempt (Pause, Resume, Block)
// @route   POST /api/results/:id/control
// @access  Private (Teacher, Admin)
exports.controlStudent = async (req, res, next) => {
    try {
        const { action } = req.body;
        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        const quiz = await Quiz.findById(result.quiz);
        const isOwner = quiz.teacher.toString() === req.user._id.toString();
        const isAdmin = req.user.user_type?.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(401).json({ success: false, error: 'Not authorized for this action' });
        }

        if (action === 'pause') {
            result.isPaused = true;
        } else if (action === 'resume') {
            result.isPaused = false;
        } else if (action === 'block') {
            result.isBlocked = true;
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        await result.save();
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
// @desc    Get results for a specific quiz in a class (Teacher Dashboard)
// @route   GET /api/teachers/results/:classId/:quizId
// @access  Private (Teacher, Admin)
exports.getClassQuizResults = async (req, res, next) => {
    try {
        const { classId, quizId } = req.params;

        // Resolve class and quiz to get ObjectIds
        const isNumericClass = /^\d+$/.test(classId);
        const classQuery = isNumericClass ? { class_id: parseInt(classId) } : { _id: classId };
        const foundClass = await Class.findOne(classQuery);

        const isNumericQuiz = /^\d+$/.test(quizId);
        const quizQuery = isNumericQuiz ? { quiz_id: parseInt(quizId) } : { _id: quizId };
        const foundQuiz = await Quiz.findOne(quizQuery);

        if (!foundClass || !foundQuiz) {
            console.log(`DEBUG [getClassQuizResults]: Not found: class=${!!foundClass}, quiz=${!!foundQuiz}`);
            return res.status(404).json({ success: false, error: 'Class or Quiz not found' });
        }

        console.log(`DEBUG [getClassQuizResults]: Found class=${foundClass.name}, quiz=${foundQuiz.title}`);

        const results = await Result.find({ quiz: foundQuiz._id })
            .populate('student', 'first_name last_name user_id name')
            .lean();

        console.log(`DEBUG [getClassQuizResults]: Found ${results.length} results for quiz ${foundQuiz._id}`);

        const questions = await Question.find({ quiz: foundQuiz._id });
        const questionTypeMap = {};
        questions.forEach(q => {
            if (q && q._id) {
                questionTypeMap[q._id.toString()] = q.type;
            }
        });

        const formattedResults = results.map(r => {
            let pendingCount = 0;
            if (r.answers && Array.isArray(r.answers)) {
                pendingCount = r.answers.filter((a) => {
                    if (!a.question) return false;
                    const qType = questionTypeMap[a.question.toString()];
                    return !a.is_correct && qType === 'short-answer';
                }).length;
            }

            // Robust student name resolution
            let studentName = 'Unknown Student';
            if (r.student) {
                studentName = r.student.name || `${r.student.first_name || ''} ${r.student.last_name || ''}`.trim();
                if (!studentName) studentName = r.student.user_id || 'Unknown Student';
            } else if (r.student_name) {
                studentName = r.student_name;
            }

            return {
                id: r.result_id || r._id,
                student_name: studentName,
                student_display_id: r.student?.user_id || 'N/A',
                status: r.status,
                is_blocked: r.isBlocked || false,
                score: r.score,
                total_points: r.total_points,
                submitted_at: r.submittedAt || r.updatedAt,
                needs_grading: pendingCount
            };
        });

        console.log(`DEBUG [getClassQuizResults]: Returning ${formattedResults.length} results.`);
        console.log(`DEBUG [getClassQuizResults] Sample:`, formattedResults.length > 0 ? JSON.stringify(formattedResults[0]) : 'None');

        res.status(200).json({
            success: true,
            count: formattedResults.length,
            data: formattedResults
        });
    } catch (err) {
        console.error(`DEBUG [getClassQuizResults] Error:`, err);
        next(err);
    }
};

// @desc    Get single result details for teacher (Grading View)
// @route   GET /api/teachers/results/:resultId
// @access  Private (Teacher, Admin)
exports.getStudentResult = async (req, res, next) => {
    try {
        const isNumeric = /^\d+$/.test(req.params.id);
        const query = isNumeric ? { result_id: parseInt(req.params.id) } : { _id: req.params.id };

        console.log(`DEBUG [getStudentResult]: Querying for ${req.params.id} (numeric=${isNumeric})`);

        const result = await Result.findOne(query)
            .populate('student', 'first_name last_name user_id name email')
            .populate('quiz', 'title total_points')
            .populate('answers.question')
            .lean();

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        // Add display name
        const student_name = result.student.name || `${result.student.first_name || ''} ${result.student.last_name || ''}`.trim();

        // Map answers to the format expected by StudentGradingView.jsx
        const formattedAnswers = result.answers.map(ans => ({
            id: ans._id,
            question_id: ans.question ? ans.question._id : null,
            question_text: ans.question ? ans.question.questionText : 'Question deleted',
            question_type: ans.question ? ans.question.type : 'unknown',
            options: ans.question ? ans.question.options : [],
            student_answer: ans.student_answer,
            is_correct: ans.is_correct,
            points_awarded: ans.points_awarded,
            max_points: ans.question ? ans.question.points : 0,
            correct_answer_text: ans.question ? ans.question.correctAnswer : ''
        }));

        res.status(200).json({
            success: true,
            data: {
                result: {
                    ...result,
                    student_name: student_name,
                    id: result.result_id || result._id,
                    is_blocked: result.isBlocked, // Mapping camelCase to snake_case for frontend
                    submitted_at: result.submittedAt || result.updatedAt
                },
                student: {
                    ...result.student,
                    name: student_name
                },
                answers: formattedAnswers
            }
        });
    } catch (err) {
        next(err);
    }
};
