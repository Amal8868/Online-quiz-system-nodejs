const Quiz = require('../models/Quiz');
const Class = require('../models/Class');
const Result = require('../models/Result');

// @desc    Get Teacher Dashboard Stats
// @route   GET /api/teacher/dashboard
// @access  Private (Teacher)
exports.getDashboard = async (req, res, next) => {
    try {
        const teacherId = req.user._id || req.user.id;

        const quizzes = await Quiz.find({ teacher: teacherId }).sort('-createdAt');
        const classes = await Class.find({ teachers: teacherId });

        // Calculate unique student count across all classes
        const studentIds = new Set();
        classes.forEach(cls => {
            if (cls.students && Array.isArray(cls.students)) {
                cls.students.forEach(id => studentIds.add(id.toString()));
            }
        });

        const stats = {
            total_quizzes: quizzes.length,
            active_quizzes: quizzes.filter(q => ['active', 'started'].includes(q.status)).length,
            total_students: studentIds.size,
            total_classes: classes.length,
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                recentQuizzes: quizzes.slice(0, 5)
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Export Gradebook as CSV
// @route   GET /api/teacher/classes/:classId/export
// @access  Private (Teacher)
exports.exportGradebook = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const classObj = await Class.findById(classId).populate('students', 'first_name last_name user_id');

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        // Logic for generating CSV string
        let csvContent = "Student Name,Student ID,Total Score\n";

        for (const student of classObj.students) {
            const results = await Result.find({ student: student._id });
            const totalScore = results.reduce((acc, r) => acc + r.score, 0);
            csvContent += `${student.first_name} ${student.last_name},${student.user_id},${totalScore}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${classObj.name}_Gradebook.csv`);
        res.status(200).send(csvContent);
    } catch (err) {
        next(err);
    }
};

// @desc    Change teacher password
// @route   POST /api/teacher/change-password
// @access  Private (Teacher)
exports.changePassword = async (req, res, next) => {
    try {
        const { new_password } = req.body;

        if (!new_password || new_password.length < 4) {
            return res.status(400).json({ success: false, error: 'Please provide a valid new password' });
        }

        const User = require('../models/User'); // Local require to avoid circularity if any
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.password = new_password;
        user.first_login = false;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        next(err);
    }
};
