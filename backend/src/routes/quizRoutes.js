const express = require('express');
const {
    getQuizzes,
    getQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    setQuizClasses,
    updateQuizStatus,
    adjustTime,
} = require('../controllers/quizController');
const {
    getQuestions,
    createQuestion,
} = require('../controllers/questionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Route to get questions for a specific quiz
router.route('/:quizId/questions')
    .get(protect, authorize('teacher'), getQuestions)
    .post(protect, authorize('teacher'), createQuestion);

router.route('/:id/status')
    .post(protect, authorize('teacher'), updateQuizStatus);

router.route('/:id/adjust-time')
    .post(protect, authorize('teacher'), adjustTime);

router.route('/:quizId/monitoring')
    .get(protect, authorize('teacher'), require('../controllers/resultController').getLiveStats);

router.route('/:id/classes')
    .post(protect, authorize('teacher'), setQuizClasses);

router.route('/')
    .get(protect, authorize('teacher'), getQuizzes)
    .post(protect, authorize('teacher'), createQuiz);

router.route('/:id')
    .get(protect, authorize('teacher'), getQuiz)
    .put(protect, authorize('teacher'), updateQuiz)
    .delete(protect, authorize('teacher'), deleteQuiz);

module.exports = router;
