const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        let { name, first_name, last_name, user_id, email, password, gender, phone } = req.body;

        // If 'name' is provided (from old frontend), split it
        if (name && !first_name) {
            const parts = name.trim().split(' ');
            first_name = parts[0];
            last_name = parts.slice(1).join(' ');
        }

        // Auto-generate user_id if missing (e.g., TCH-123)
        if (!user_id) {
            const count = await User.countDocuments({ user_type: 'Student' });
            const prefix = 'STU';
            user_id = `${prefix}-${100 + count + 1}`;
        }

        // Create user
        const user = await User.create({
            first_name: first_name || 'New',
            last_name: last_name || 'User',
            user_id,
            email,
            password,
            // Public registration must never allow users to grant themselves elevated roles.
            user_type: 'Student',
            gender,
            phone,
            first_login: false // Ensure self-registered users don't get prompted to change password
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }

        // Check for user
        const user = await User.findOne({
            $or: [{ email: email }, { user_id: email }, { username: email }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if account is active
        if (user.status !== 'Active') {
            return res.status(401).json({ success: false, error: 'User account is inactive. Please contact admin.' });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                user
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Log user out
// @route   GET /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {},
    });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    res.status(statusCode).json({
        success: true,
        data: {
            token,
            user,
        },
    });
};
