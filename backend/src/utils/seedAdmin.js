const User = require('../models/User');

// Optional, one-time bootstrap. Existing accounts and passwords are never changed.
const seedAdmin = async () => {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !password) {
        console.log('Initial admin not configured; skipping admin bootstrap.');
        return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        if (existingUser.user_type !== 'Admin') {
            throw new Error(`INITIAL_ADMIN_EMAIL ${email} belongs to a non-admin account; choose an unused email.`);
        }
        console.log(`Initial admin account already exists for ${email}; password was not changed.`);
        return;
    }

    await User.create({
        first_name: process.env.INITIAL_ADMIN_FIRST_NAME || 'System',
        last_name: process.env.INITIAL_ADMIN_LAST_NAME || 'Admin',
        user_id: `ADM-${Date.now()}`,
        email,
        password,
        user_type: 'Admin',
        status: 'Active'
    });
    console.log(`Initial admin created: ${email}`);
};

module.exports = seedAdmin;
