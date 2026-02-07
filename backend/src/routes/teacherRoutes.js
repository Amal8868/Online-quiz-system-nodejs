const express = require('express');
const { getDashboard, exportGradebook, changePassword } = require('../controllers/teacherController');
const { getClassQuizResults, getStudentResult, updateManualGrade } = require('../controllers/resultController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Teacher', 'teacher'));

router.get('/dashboard', getDashboard);
router.get('/classes/:classId/export', exportGradebook);
router.post('/change-password', changePassword);

// Results & Grading
router.get('/results/:classId/:quizId', getClassQuizResults);
router.get('/results/:id', getStudentResult);
router.post('/results/:id/grade', updateManualGrade);

module.exports = router;
