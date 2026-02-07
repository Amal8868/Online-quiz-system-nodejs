const User = require('../models/User');

const seedAdmin = async () => {
    try {
        const admin = await User.findOne({ email: 'admin@test.com' });

        if (!admin) {
            await User.create({
                first_name: 'System',
                last_name: 'Admin',
                user_id: 'ADM-101',
                email: 'admin@test.com',
                password: '1234',
                user_type: 'Admin',
                status: 'Active'
            });
            console.log('Default Admin Created: admin@test.com / 1234');
        } else {
            admin.password = '1234';
            await admin.save();
            console.log('Admin Password Synced: 1234');
        }
    } catch (err) {
        console.error('Error seeding admin:', err.message);
    }
};

module.exports = seedAdmin;
