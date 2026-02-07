const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private (Teacher, Admin)
exports.getClasses = async (req, res, next) => {
    try {
        let query;
        // Normalize role check (case-insensitive) - support both user_type and role
        const userType = (req.user.user_type || req.user.role || 'Student').toLowerCase();

        console.log(`DEBUG [getClasses]: UserID=${req.user._id}, DecodedType=${userType}`);

        if (userType === 'admin') {
            query = Class.find().populate('teachers', 'first_name last_name');
        } else {
            // For teachers, find classes where they are in the teachers array
            // Check both req.user._id and req.user.id
            const searchId = req.user._id || req.user.id;
            query = Class.find({ teachers: searchId }).populate('teachers', 'first_name last_name');
        }

        const classes = await query;
        console.log(`DEBUG [getClasses]: Found ${classes.length} database docs`);

        const formattedClasses = classes.map(cls => {
            const obj = cls.toObject();
            // Critical: Ensure 'id' exists. Use class_id if available, otherwise fallback to _id.
            // Values returned here are what ResultsClasses.jsx uses in the loop key and Link.
            obj.id = obj.class_id || obj._id;
            return obj;
        });
        res.status(200).json({ success: true, count: classes.length, data: formattedClasses });
    } catch (err) {
        next(err);
    }
};

// @desc    Create a class
// @route   POST /api/classes
// @access  Private (Admin)
exports.createClass = async (req, res, next) => {
    try {
        const classObj = await Class.create(req.body);
        res.status(201).json({ success: true, data: classObj });
    } catch (err) {
        next(err);
    }
};

// @desc    Assign student to class
// @route   POST /api/classes/:id/students
// @access  Private (Teacher, Admin)
// @desc    Assign student or multiple students to class
// @route   POST /api/classes/:id/students
// @access  Private (Teacher, Admin)
exports.assignStudent = async (req, res, next) => {
    try {
        const { studentId, studentIds } = req.body;
        const isNumeric = /^\d+$/.test(req.params.id);
        const query = isNumeric ? { class_id: parseInt(req.params.id) } : { _id: req.params.id };
        const classObj = await Class.findOne(query);

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        // Normalize input to an array
        let studentsToAssign = [];
        if (studentIds && Array.isArray(studentIds)) {
            studentsToAssign = studentIds;
        } else if (studentId) {
            studentsToAssign = [studentId];
        } else {
            return res.status(400).json({ success: false, error: 'Please provide studentId or studentIds' });
        }

        const stats = {
            added: 0,
            alreadyInClass: 0,
            alreadyInOtherClass: 0,
            notFoundOrNotStudent: 0
        };

        const errors = [];

        for (const sId of studentsToAssign) {
            // Check if student exists
            const student = await User.findById(sId);
            if (!student || student.user_type !== 'Student') {
                stats.notFoundOrNotStudent++;
                errors.push(`ID ${sId}: Not found or not a student`);
                continue;
            }

            // Check if student is already enrolled in ANY other class
            // Note: This check might be slow for huge bulk, but safe for typical school sizes
            const existingClass = await Class.findOne({ students: sId });
            if (existingClass) {
                if (existingClass._id.toString() !== classObj._id.toString()) {
                    stats.alreadyInOtherClass++;
                    errors.push(`Student ${student.email} is already in class ${existingClass.name}`);
                    continue;
                } else {
                    stats.alreadyInClass++;
                    continue; // Already in THIS class, skip
                }
            }

            if (!classObj.students.includes(sId)) {
                classObj.students.push(sId);
                stats.added++;
            }
        }

        await classObj.save();

        res.status(200).json({
            success: true,
            message: `Processed ${studentsToAssign.length} students. Added: ${stats.added}.`,
            stats,
            errors: errors.length > 0 ? errors : undefined,
            data: classObj
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get class performance (aggregated results)
// @route   GET /api/classes/:id/stats
// @access  Private (Teacher, Admin)
exports.getClassStats = async (req, res, next) => {
    try {
        const isNumeric = /^\d+$/.test(req.params.id);
        let classObjectId = req.params.id;

        if (isNumeric) {
            const cls = await Class.findOne({ class_id: parseInt(req.params.id) });
            if (!cls) return res.status(404).json({ success: false, error: 'Class not found' });
            classObjectId = cls._id;
        }

        const classObj = await Class.findById(classObjectId)
            .populate('students', 'first_name last_name email user_id')
            .populate('teachers', 'first_name last_name email');

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        const obj = classObj.toObject();
        obj.id = obj.class_id || obj._id;

        // Calculate quiz attempts for each student
        // We need to require Result model inside the function or at top level if not already
        const Result = require('../models/Result');

        if (obj.students && Array.isArray(obj.students)) {
            const studentsWithStats = await Promise.all(obj.students.map(async (student) => {
                const count = await Result.countDocuments({ student: student._id });
                return { ...student, quiz_count: count };
            }));
            obj.students = studentsWithStats;
        }

        res.status(200).json({ success: true, data: obj });
    } catch (err) {
        next(err);
    }
};

// @desc    Get subjects for a class
// @route   GET /api/classes/:id/subjects
// @access  Private (Teacher, Admin)
exports.getClassSubjects = async (req, res, next) => {
    try {
        const isNumeric = /^\d+$/.test(req.params.id);
        let classObjectId = req.params.id;

        if (isNumeric) {
            const cls = await Class.findOne({ class_id: parseInt(req.params.id) });
            if (!cls) return res.status(404).json({ success: false, error: 'Class not found' });
            classObjectId = cls._id;
        }

        const subjects = await Subject.find({ classes: classObjectId });
        res.status(200).json({ success: true, count: subjects.length, data: subjects });
    } catch (err) {
        next(err);
    }
};

// @desc    Assign teacher to class
// @route   POST /api/classes/:id/teachers
// @access  Private (Admin)
exports.assignTeacher = async (req, res, next) => {
    try {
        const { teacherId } = req.body;
        const isNumeric = /^\d+$/.test(req.params.id);
        const query = isNumeric ? { class_id: parseInt(req.params.id) } : { _id: req.params.id };
        const classObj = await Class.findOne(query);

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        // Check if teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.user_type !== 'Teacher') {
            return res.status(400).json({ success: false, error: 'User is not a teacher' });
        }

        if (!classObj.teachers.includes(teacherId)) {
            classObj.teachers.push(teacherId);
            await classObj.save();
        }

        res.status(200).json({ success: true, data: classObj });
    } catch (err) {
        next(err);
    }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private (Admin)
exports.updateClass = async (req, res, next) => {
    try {
        const isNumeric = /^\d+$/.test(req.params.id);
        const query = isNumeric ? { class_id: parseInt(req.params.id) } : { _id: req.params.id };

        const classObj = await Class.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        res.status(200).json({ success: true, data: classObj });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private (Admin)
exports.deleteClass = async (req, res, next) => {
    try {
        const classObj = await Class.findById(req.params.id);

        if (!classObj) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        await classObj.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
