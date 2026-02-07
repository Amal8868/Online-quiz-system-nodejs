const express = require('express');
const { getSubjects, createSubject, assignToClasses, getSubject, updateSubject, deleteSubject } = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('teacher', 'admin'), getSubjects)
    .post(authorize('admin'), createSubject);

router.route('/:id/classes')
    .post(authorize('admin'), assignToClasses);

router.route('/:id')
    .get(getSubject)
    .put(authorize('admin'), updateSubject)
    .delete(authorize('admin'), deleteSubject);

module.exports = router;
