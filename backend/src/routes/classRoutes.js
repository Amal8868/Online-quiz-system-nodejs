const express = require('express');
const { getClasses, createClass, assignStudent, assignTeacher, getClassStats, updateClass, deleteClass, getClassSubjects } = require('../controllers/classController');
const { getQuizzesByClass } = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('teacher', 'admin'), getClasses)
    .post(authorize('admin'), createClass);

router.route('/:id')
    .get(authorize('teacher', 'admin'), getClassStats)
    .put(authorize('admin'), updateClass)
    .delete(authorize('admin'), deleteClass);

router.route('/:id/students')
    .post(authorize('admin'), assignStudent);

router.route('/:id/teachers')
    .post(authorize('admin'), assignTeacher);

router.route('/:id/subjects')
    .get(authorize('teacher', 'admin'), getClassSubjects);

router.route('/:id/quizzes')
    .get(authorize('teacher'), getQuizzesByClass);

module.exports = router;
