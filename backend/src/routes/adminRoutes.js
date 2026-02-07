const express = require('express');
const { getStats, getReports, getUsers, createUser, updateUser, deleteUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin')); // Can now use 'Admin' or 'admin'

router.get('/stats', getStats);
router.get('/reports', getReports);

// User Management
router.get('/users', getUsers);
router.post('/users', createUser);
router.post('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
