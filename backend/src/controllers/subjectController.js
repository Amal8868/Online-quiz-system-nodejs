const Subject = require('../models/Subject');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = async (req, res, next) => {
    try {
        const subjects = await Subject.find().populate('classes', 'name section');
        res.status(200).json({ success: true, count: subjects.length, data: subjects });
    } catch (err) {
        next(err);
    }
};

// @desc    Create a subject
// @route   POST /api/subjects
// @access  Private (Admin)
exports.createSubject = async (req, res, next) => {
    try {
        // Resolve class IDs if they are provided as names or numeric IDs
        if (req.body.classes && Array.isArray(req.body.classes)) {
            const resolvedClasses = [];
            for (const classIdentifier of req.body.classes) {
                // validation check: if it's already a valid ObjectId on its own, use it
                if (require('mongoose').Types.ObjectId.isValid(classIdentifier)) {
                    resolvedClasses.push(classIdentifier);
                    continue;
                }

                // If numeric, search by class_id
                const isNumeric = !isNaN(classIdentifier);
                let cls;
                if (isNumeric) {
                    cls = await require('../models/Class').findOne({ class_id: classIdentifier });
                } else {
                    // Search by name
                    cls = await require('../models/Class').findOne({ name: classIdentifier });
                }

                if (cls) {
                    resolvedClasses.push(cls._id);
                }
            }
            req.body.classes = resolvedClasses;
        }

        const subject = await Subject.create(req.body);
        res.status(201).json({ success: true, data: subject });
    } catch (err) {
        next(err);
    }
};

// @desc    Assign subject to classes
// @route   POST /api/subjects/:id/classes
// @access  Private (Admin)
exports.assignToClasses = async (req, res, next) => {
    try {
        const { classIds } = req.body; // Expecting array of identifiers
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }

        // Logic to properly resolve class identifiers
        const resolvedClasses = [];
        if (classIds && Array.isArray(classIds)) {
            for (const classIdentifier of classIds) {
                if (require('mongoose').Types.ObjectId.isValid(classIdentifier)) {
                    resolvedClasses.push(classIdentifier);
                    continue;
                }
                const isNumeric = !isNaN(classIdentifier);
                let cls;
                if (isNumeric) {
                    cls = await require('../models/Class').findOne({ class_id: classIdentifier });
                } else {
                    cls = await require('../models/Class').findOne({ name: classIdentifier });
                }
                if (cls) resolvedClasses.push(cls._id);
            }
        }

        subject.classes = resolvedClasses;
        await subject.save();

        res.status(200).json({ success: true, data: subject });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id).populate('classes', 'name section');

        if (!subject) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }

        res.status(200).json({ success: true, data: subject });
    } catch (err) {
        next(err);
    }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin)
exports.updateSubject = async (req, res, next) => {
    try {
        // Resolve class IDs if they are provided as names or numeric IDs
        if (req.body.classes && Array.isArray(req.body.classes)) {
            const resolvedClasses = [];
            for (const classIdentifier of req.body.classes) {
                if (require('mongoose').Types.ObjectId.isValid(classIdentifier)) {
                    resolvedClasses.push(classIdentifier);
                    continue;
                }
                const isNumeric = !isNaN(classIdentifier);
                let cls;
                if (isNumeric) {
                    cls = await require('../models/Class').findOne({ class_id: classIdentifier });
                } else {
                    cls = await require('../models/Class').findOne({ name: classIdentifier });
                }
                if (cls) {
                    resolvedClasses.push(cls._id);
                }
            }
            req.body.classes = resolvedClasses;
        }

        const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!subject) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }

        res.status(200).json({ success: true, data: subject });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin)
exports.deleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }

        await subject.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
