const express = require('express');
const {
    getMyResults,
    getDetailedResult,
    updateManualGrade,
    controlStudent,
} = require('../controllers/resultController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getMyResults);
router.get('/:id/details', protect, authorize('teacher'), getDetailedResult);
router.put('/:id/grade', protect, authorize('teacher'), updateManualGrade);
router.post('/:id/control', protect, authorize('teacher'), controlStudent);

module.exports = router;
