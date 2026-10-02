const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/error');

// Load models to ensure registration
require('./models/Counter');
require('./models/User');
require('./models/Class');

// Route files
const auth = require('./routes/authRoutes');
const quizzes = require('./routes/quizRoutes');
const results = require('./routes/resultRoutes');
const classes = require('./routes/classRoutes');
const subjects = require('./routes/subjectRoutes');
const admin = require('./routes/adminRoutes');
const teacher = require('./routes/teacherRoutes');
const student = require('./routes/studentRoutes');

// Load env vars
dotenv.config();

// Connect to the database and create the initial admin only when explicitly configured.
connectDB()
    .then(() => require('./utils/seedAdmin')())
    .catch((err) => {
        console.error(`Startup initialization failed: ${err.message}`);
        process.exit(1);
    });

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
const allowedOrigins = [process.env.CLIENT_URL];
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server and command-line requests that do not send Origin.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', auth);
app.use('/api/quizzes', quizzes);
app.use('/api/results', results);
app.use('/api/classes', classes);
app.use('/api/subjects', subjects);
app.use('/api/admin', admin);
app.use('/api/teacher', teacher);
app.use('/api/student', student);

app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'Welcome to Online Quiz System API' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
