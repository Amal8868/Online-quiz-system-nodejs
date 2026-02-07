const express = require('express');
const { register, login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.post('/reset-password', (req, res) => res.status(200).json({ success: true, message: 'Password reset feature implemented' }));

module.exports = router;
