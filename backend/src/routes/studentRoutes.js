const express = require('express');
const {
    enterExam,
    getShuffledQuestions,
    getQuizStatus,
    startExam,
    submitAnswer,
    finishExam,
    updateResultStatus,
    getAttemptStatus,
    getResult,
} = require('../controllers/studentDashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/enter-exam', enterExam);
router.get('/quizzes/:quizId/questions', protect, authorize('student'), getShuffledQuestions);
router.get('/quiz/:quizId/status', protect, authorize('student'), getQuizStatus);
router.post('/start', protect, authorize('student'), startExam);
router.post('/answer', protect, authorize('student'), submitAnswer);
router.post('/finish', protect, authorize('student'), finishExam);

router.get('/results/:resultId', protect, authorize('student'), getResult);
router.post('/results/:resultId/status', protect, authorize('student'), updateResultStatus);
router.get('/results/:resultId/status_check', protect, authorize('student'), getAttemptStatus);

module.exports = router;
