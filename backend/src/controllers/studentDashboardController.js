const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const User = require('../models/User');
const Class = require('../models/Class');
const Counter = require('../models/Counter');

// @desc    Enter exam using room code
// @route   POST /api/student/enter-exam
// @access  Private (Student)
exports.enterExam = async (req, res) => {
    try {
        const { room_code, student_id } = req.body;

        if (!student_id || !room_code) {
            return res.status(400).json({ success: false, error: 'Please provide both Room Code and Student ID' });
        }

        // Find the student in the database
        const student = await User.findOne({ user_id: student_id, user_type: 'Student' });
        if (!student) {
            return res.status(404).json({ success: false, error: `Student ID "${student_id}" not found. Please contact your instructor.` });
        }

        const quiz = await Quiz.findOne({ room_code: room_code.toUpperCase() });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Invalid room code' });
        }

        if (!['active', 'started'].includes(quiz.status)) {
            return res.status(403).json({ success: false, error: 'Exam is not yet active or has finished' });
        }

        // Roster Check: Is student enrolled in the class for this quiz?
        const studentClass = await Class.findOne({
            _id: quiz.class,
            students: student._id
        });

        if (!studentClass) {
            return res.status(403).json({ success: false, error: 'Access Denied: You are not enrolled in the class assigned to this quiz' });
        }

        // Create Result record if it doesn't exist (to show in Live Monitoring as "Waiting")
        let result = await Result.findOne({ student: student._id, quiz: quiz._id });

        if (result && result.isBlocked) {
            return res.status(403).json({ success: false, error: 'Access Denied: You have been blocked from this exam.' });
        }

        if (!result) {
            // Get total points from questions
            const questions = await Question.find({ quiz: quiz._id });
            const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

            result = await Result.create({
                student: student._id,
                quiz: quiz._id,
                score: 0,
                total_points: totalPoints,
                answers: [],
                status: 'waiting'
            });
        }

        // Generate token for this student session
        const token = student.getSignedJwtToken();

        res.status(200).json({
            success: true,
            token,
            data: {
                quiz_id: quiz._id,
                quiz_title: quiz.title,
                quiz_status: quiz.status,
                time_limit: quiz.duration,
                room_code: quiz.room_code,
                start_time: quiz.start_time,
                server_time: new Date(),
                student_db_id: student._id,
                student_id: student.user_id,
                student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
                student_profile: student,
                result_id: result._id,
                result_numeric_id: result.result_id, // Return readable numeric ID
                result_status: result.status // Return the status (waiting, in-progress, submitted)
            }
        });
    } catch (err) {
        console.error("CRITICAL ERROR IN ENTER EXAM:", err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server Error during Join Exam'
        });
    }
};

// @desc    Get questions for student (shuffled)
// @route   GET /api/student/quizzes/:quizId/questions
// @access  Private (Student)
exports.getShuffledQuestions = async (req, res, next) => {
    try {
        const questions = await Question.find({ quiz: req.params.quizId }).lean();

        // Shuffle logic
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        // Strip correct answers for security and Map questions to match frontend field names
        const mappedQuestions = questions.map(q => {
            const { correctAnswer, ...rest } = q;
            return {
                ...rest,
                id: q._id,
                question_text: q.questionText,
                question_type: q.type ? q.type.replace(/-/g, '_') : 'multiple_choice',
                points: q.points || 1,
                options: (q.options || []).map(opt => ({
                    ...opt,
                    id: opt._id,
                    option_text: opt.text
                    // We don't send isCorrect to the student!
                }))
            };
        });

        res.status(200).json({ success: true, count: mappedQuestions.length, data: mappedQuestions });
    } catch (err) {
        next(err);
    }
};

// @desc    Get quiz status for polling
// @route   GET /api/student/quiz/:quizId/status
// @access  Private (Student)
exports.getQuizStatus = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                status: quiz.status,
                status: quiz.status,
                start_time: quiz.start_time,
                duration_minutes: quiz.duration,
                server_time: new Date()
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Start the exam (transition from waiting to in-progress)
// @route   POST /api/student/start
// @access  Private (Student)
exports.startExam = async (req, res, next) => {
    try {
        const { quiz_id, student_db_id } = req.body;

        const result = await Result.findOne({ quiz: quiz_id, student: student_db_id });
        if (!result) {
            return res.status(404).json({ success: false, error: 'Registration record not found' });
        }

        // MIGRATION ON THE FLY: If result_id is missing, generate it.
        if (!result.result_id) {
            try {
                const counter = await Counter.findByIdAndUpdate(
                    { _id: 'result_id' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                result.result_id = counter.seq + 10000;
            } catch (err) {
                console.error('Error generating result_id:', err);
            }
        }

        // Check if already submitted - DON'T reset status if finished!
        if (result.status !== 'submitted') {
            result.status = 'in-progress';
            await result.save();
        }

        res.status(200).json({
            success: true,
            data: {
                result_id: result._id,
                result_numeric_id: result.result_id, // Send readable numeric ID
                status: result.status // Return current status
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Submit an answer (Auto-save)
// @route   POST /api/student/answer
// @access  Private (Student)
exports.submitAnswer = async (req, res, next) => {
    try {
        const { result_id, question_id, answer, time_taken } = req.body;

        const result = await Result.findById(result_id);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Result record not found' });
        }

        const question = await Question.findById(question_id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        // Graded automatically?
        let is_correct = false;
        if (question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'mcq') {
            // Fix: Check the 'isCorrect' flag on the specific option chosen
            // The student sends the option's _id
            const selectedOption = question.options.find(opt => String(opt._id) === String(answer));
            if (selectedOption) {
                is_correct = selectedOption.isCorrect;
            } else {
                // Fallback for legacy questions
                is_correct = String(question.correctAnswer) === String(answer);
            }
        } else if (question.type === 'multiple-selection') {
            // For multiple selection, answer is comma-separated IDs "id1,id2"
            const studentIds = String(answer).split(',');
            const correctIds = question.options.filter(o => o.isCorrect).map(o => String(o._id));

            // Check if every student ID is in correct list, and lengths match
            const allCorrect = studentIds.every(id => correctIds.includes(id));
            is_correct = allCorrect && (studentIds.length === correctIds.length);
        } else if (question.type === 'short-answer') {
            is_correct = String(question.correctAnswer).toLowerCase() === String(answer).toLowerCase();
        }

        const points_awarded = is_correct ? (question.points || 0) : 0;

        // Check if already answered
        const answerIndex = result.answers.findIndex(a => a.question.toString() === question_id);
        if (answerIndex > -1) {
            result.answers[answerIndex] = {
                question: question_id,
                student_answer: answer,
                is_correct,
                points_awarded,
                time_taken
            };
        } else {
            result.answers.push({
                question: question_id,
                student_answer: answer,
                is_correct,
                points_awarded,
                time_taken
            });
        }

        // Recalculate score
        result.score = result.answers.reduce((acc, a) => acc + (a.points_awarded || 0), 0);

        // Only set to in-progress if not already submitted
        if (result.status !== 'submitted') {
            result.status = 'in-progress';
        }

        await result.save();

        res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

// @desc    Finish exam
// @route   POST /api/student/finish
// @access  Private (Student)
exports.finishExam = async (req, res, next) => {
    try {
        const { result_id } = req.body;
        const result = await Result.findById(result_id);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        // Double check numeric ID presence
        if (!result.result_id) {
            try {
                const counter = await Counter.findByIdAndUpdate(
                    { _id: 'result_id' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                result.result_id = counter.seq + 10000;
            } catch (err) {
                console.error('Error generating result_id in finish:', err);
            }
        }

        result.status = 'submitted';
        result.submittedAt = new Date();
        await result.save();

        res.status(200).json({
            success: true,
            data: {
                result_numeric_id: result.result_id // Send readable ID for navigation
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update result status
// @route   POST /api/student/results/:resultId/status
// @access  Private (Student)
exports.updateResultStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        let query;
        // Check if param is numeric Result ID or ObjectId
        const isNumeric = /^\d+$/.test(req.params.resultId);
        if (isNumeric) {
            query = { result_id: parseInt(req.params.resultId) };
        } else {
            query = { _id: req.params.resultId };
        }

        const result = await Result.findOne(query);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        result.status = status;
        await result.save();

        res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

// @desc    Get attempt status (checking for blocks/pauses)
// @route   GET /api/student/results/:resultId/status_check
// @access  Private (Student)
exports.getAttemptStatus = async (req, res, next) => {
    try {
        // Just use findById for this one since it's typically polled by internal ObjectId during exam
        // But for safety, let's support both
        let query;
        const isNumeric = /^\d+$/.test(req.params.resultId);
        if (isNumeric) {
            query = { result_id: parseInt(req.params.resultId) };
        } else {
            query = { _id: req.params.resultId };
        }

        const result = await Result.findOne(query);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                is_paused: result.isPaused,
                is_blocked: result.isBlocked,
                status: result.status
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single result for student
// @route   GET /api/student/results/:resultId
// @access  Private (Student)
exports.getResult = async (req, res, next) => {
    try {
        let query;
        const isNumeric = /^\d+$/.test(req.params.resultId);

        if (isNumeric) {
            query = { result_id: parseInt(req.params.resultId) };
        } else {
            query = { _id: req.params.resultId };
        }

        const result = await Result.findOne(query)
            .populate('quiz', 'title total_points duration show_detailed_results')
            .populate('answers.question');

        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }

        // Count total questions for this quiz
        const totalQuestions = await Question.countDocuments({ quiz: result.quiz._id });

        // Calculate stats for student display
        let correctCount = 0;
        let wrongCount = 0;
        let pendingCount = 0;

        const resultObj = result.toObject();
        // Ensure the ID sent back is readable IF we want frontend to use it, 
        // but frontend probably uses URL param.
        // We'll expose result_id just in case.
        resultObj.id = result.result_id || result._id;

        resultObj.answers.forEach(ans => {
            const question = ans.question; // Populated question object

            if (ans.is_correct) {
                correctCount++;
            } else {
                // If incorrect, check if it's a short answer (potentially pending manual review)
                if (question && question.type === 'short-answer') {
                    pendingCount++;
                } else {
                    wrongCount++;
                }
            }
        });

        // Add calculated stats to response
        resultObj.correct_answers = correctCount;
        resultObj.wrong_answers = wrongCount;
        resultObj.pending_count = pendingCount;
        resultObj.total_questions = totalQuestions;

        // Check if there are any manual grading items
        resultObj.has_manual_grading = pendingCount > 0;

        // NEW: Hide detailed answers if the teacher has disabled it
        if (result.quiz && result.quiz.show_detailed_results === false) {
            resultObj.answers = [];
            resultObj.show_detailed_results = false;
        } else {
            resultObj.show_detailed_results = true;
        }

        res.status(200).json({ success: true, data: resultObj });
    } catch (err) {
        next(err);
    }
};
