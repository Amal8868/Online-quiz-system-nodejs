const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true,
    },
    first_name: {
        type: String,
        required: [true, 'Please add a first name'],
    },
    last_name: {
        type: String,
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    phone: {
        type: String,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    user_type: {
        type: String,
        enum: ['Student', 'Teacher', 'Admin'],
        default: 'Student',
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 4,
        select: false,
    },
    profile_pic: {
        type: String,
        default: 'no-photo.jpg',
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Active',
    },
    first_login: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Full name virtual
UserSchema.virtual('name').get(function () {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim() || 'User';
});

// Alias user_type to role for frontend compatibility
UserSchema.virtual('role').get(function () {
    return this.user_type;
});

// Alias user_id to systemId for backward compatibility with any remaining code
UserSchema.virtual('systemId').get(function () { return this.user_id; });
UserSchema.virtual('user_id_alias').get(function () { return this.user_id; });

// Unify JSON Transform
UserSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        // Guarantee role exists for frontend logic
        ret.role = ret.user_type || 'Student';
        return ret;
    }
});
UserSchema.set('toObject', { virtuals: true });

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
