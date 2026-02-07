const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Result = require('../models/Result');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getStats = async (req, res, next) => {
    try {
        const studentCount = await User.countDocuments({ user_type: { $regex: /^student$/i } });
        const teacherCount = await User.countDocuments({ user_type: { $regex: /^teacher$/i } });
        const classCount = await Class.countDocuments();
        const quizCount = await Quiz.countDocuments();
        const activeUsers = await User.countDocuments({ status: { $regex: /^active$/i } });

        res.status(200).json({
            success: true,
            data: {
                students: studentCount,
                teachers: teacherCount,
                classes: classCount,
                quizzes: quizCount,
                activeUsers
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get detailed reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.getReports = async (req, res, next) => {
    try {
        const subjects = await Subject.find().lean();
        const classes = await Class.find().lean();

        // 1. Subjects Overview
        const subjects_overview = await Promise.all(subjects.map(async (s) => {
            const quizCount = await Quiz.countDocuments({ subject: s._id });

            // Calculate average score for this subject
            let avgScore = 0;
            if (quizCount > 0) {
                const quizzes = await Quiz.find({ subject: s._id }).select('_id');
                const quizIds = quizzes.map(q => q._id);

                const results = await Result.find({ quiz: { $in: quizIds } });
                if (results.length > 0) {
                    const totalScore = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
                    avgScore = Math.round(totalScore / results.length);
                }
            }

            return {
                id: s._id,
                name: s.name,
                code: s.code,
                classes_assigned: s.classes ? s.classes.length : 0,
                quiz_count: quizCount,
                avg_score: avgScore
            };
        }));

        // 2. Usage (Class activity)
        const usage = await Promise.all(classes.map(async (c) => {
            const quizCount = await Quiz.countDocuments({ class: c._id });
            return {
                id: c._id,
                name: c.name,
                section: c.section,
                student_count: c.students ? c.students.length : 0,
                quiz_count: quizCount
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                subjects_overview,
                usage
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all users (with optional type filtering)
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const { type } = req.query;
        let query = {};
        if (type) query.user_type = type;

        const users = await User.find(query).select('+password');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
    try {
        let { name, first_name, last_name, user_id, email, password, user_type, gender, phone } = req.body;

        // Auto-split name if first/last missing
        if (name && !first_name) {
            const parts = name.trim().split(' ');
            first_name = parts[0];
            last_name = parts.slice(1).join(' ');
        }

        // Auto-generate user ID if missing
        if (!user_id) {
            let prefix = 'STU';
            const typeLower = (user_type || 'Student').toLowerCase();

            if (typeLower === 'teacher') prefix = 'TCH';
            else if (typeLower === 'admin') prefix = 'ADM';

            let isUnique = false;
            let increment = 0;

            while (!isUnique) {
                // We base it on total count + increment to find the first free slot starting from 100
                const count = await User.countDocuments({ user_type: user_type || 'Student' });
                const potentialId = `${prefix}-${100 + count + increment}`;
                const exists = await User.findOne({ user_id: potentialId });

                if (!exists) {
                    user_id = potentialId;
                    isUnique = true;
                } else {
                    increment++;
                }
            }
        }

        // Temporary password if missing
        const temp_password = password || Math.random().toString(36).slice(-8);

        const user = await User.create({
            first_name: first_name || 'New',
            last_name: last_name || 'User',
            user_id,
            email,
            password: temp_password,
            user_type: user_type || 'Student',
            gender,
            phone,
            first_login: true // Force password change
        });

        // Return the user AND the temp password so the admin can see it
        const userJson = user.toJSON();
        userJson.temp_password = temp_password;

        res.status(201).json({ success: true, data: userJson });
    } catch (err) {
        next(err);
    }
};

// @desc    Update a user
// @route   POST /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // We use manual assignment and save() to trigger the pre-save hook for password hashing
        const fieldsToUpdate = ['first_name', 'last_name', 'email', 'phone', 'gender', 'user_type', 'username', 'user_id', 'status', 'password'];

        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                // If password is empty string (from frontend sometimes), ignore it? 
                // Frontend usually deletes it if empty, but let's be safe.
                if (field === 'password' && !req.body[field]) return;
                user[field] = req.body[field];
            }
        });

        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
