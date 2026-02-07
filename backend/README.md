# Online Quiz System - Node.js Backend

A robust Node.js + Express backend for an Online Quiz System, migrated from PHP.

## Tech Stack
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB + Mongoose**: Database and ODM
- **JWT**: Authentication
- **bcryptjs**: Password hashing

## Prerequisites
- Node.js (v14+)
- MongoDB (running locally or a Cloud Atlas URI)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory (one is provided, but update `MONGODB_URI` if necessary).

4. Start the server (Development):
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication
- `POST /api/auth/register`: Register a new user (student, teacher, admin)
- `POST /api/auth/login`: Login and receive JWT
- `POST /api/auth/logout`: Logout user
- `GET /api/auth/me`: Get current user details (Private)
- `POST /api/auth/reset-password`: Reset password feature stub

### Quizzes
- `GET /api/quizzes`: Get all quizzes (Teacher, Private)
- `POST /api/quizzes`: Create a quiz (Teacher, Private)
- `GET /api/quizzes/:id`: Get single quiz details (Teacher, Private)
- `PUT /api/quizzes/:id`: Update quiz (Teacher, Private)
- `DELETE /api/quizzes/:id`: Delete quiz (Teacher, Private)
- `POST /api/quizzes/:id/status`: Update quiz status (Draft/Live/Finished)
- `POST /api/quizzes/:id/adjust-time`: Extend or reduce quiz time
- `POST /api/quizzes/:id/classes`: Assign quiz to classes
- `GET /api/quizzes/:quizId/monitoring`: Real-time monitoring stats (Teacher, Private)
- `GET /api/quizzes/:quizId/questions`: Get all questions for a quiz (Teacher, Private)
- `POST /api/quizzes/:quizId/questions`: Add a question (Teacher, Private)

### Classes
- `GET /api/classes`: Get all classes (Teacher/Admin, Private)
- `POST /api/classes`: Create a class (Admin, Private)
- `GET /api/classes/:id`: Get class statistics/details
- `PUT /api/classes/:id`: Update class details (Admin, Private)
- `DELETE /api/classes/:id`: Delete class (Admin, Private)
- `POST /api/classes/:id/students`: Assign student to class (Admin, Private)
- `POST /api/classes/:id/teachers`: Assign teacher to class (Admin, Private)
- `GET /api/classes/:id/subjects`: Get subjects assigned to class
- `GET /api/classes/:id/quizzes`: Get quizzes for a specific class

### Subjects
- `GET /api/subjects`: Get all subjects (Teacher/Admin, Private)
- `POST /api/subjects`: Create a subject (Admin, Private)
- `GET /api/subjects/:id`: Get subject details
- `PUT /api/subjects/:id`: Update subject details (Admin, Private)
- `DELETE /api/subjects/:id`: Delete subject (Admin, Private)
- `POST /api/subjects/:id/classes`: Assign subject to classes (Admin, Private)

### Admin & User Management
- `GET /api/admin/stats`: System-wide statistics (Admin, Private)
- `GET /api/admin/reports`: System usage reports (Admin, Private)
- `GET /api/admin/users`: List all users (Admin, Private)
- `POST /api/admin/users`: Create user (Admin, Private)
- `POST /api/admin/users/:id`: Update user (Admin, Private)
- `DELETE /api/admin/users/:id`: Delete user (Admin, Private)

### Teacher Dashboard
- `GET /api/teacher/dashboard`: Teacher-specific metrics (Teacher, Private)
- `GET /api/teacher/classes/:classId/export`: Download Gradebook CSV (Teacher, Private)
- `POST /api/teacher/change-password`: Change teacher password
- `GET /api/teacher/results/:classId/:quizId`: Results for a class/quiz
- `GET /api/teacher/results/:id`: Get specific student result
- `POST /api/teacher/results/:id/grade`: Manual grading for results

### Student Portal
- `POST /api/student/enter-exam`: Join a quiz using a room code
- `GET /api/student/quiz/:quizId/status`: Check quiz availability
- `POST /api/student/start`: Start the exam session
- `POST /api/student/answer`: Submit a single answer
- `POST /api/student/finish`: Finalize and submit the exam
- `GET /api/student/quizzes/:quizId/questions`: Get secured/shuffled questions
- `GET /api/student/results/:resultId`: View student's own result
- `POST /api/student/results/:resultId/status`: Update attempt status

### Results & Grading
- `GET /api/results/me`: Get current student's results (Student, Private)
- `GET /api/results/:id/details`: Full question/answer breakdown (Teacher, Private)
- `PUT /api/results/:id/grade`: Award points for short answers (Teacher, Private)
- `POST /api/results/:id/control`: Real-time student session control (Teacher, Private)

## Folder Structure
```
src/
├── config/       # Database connection
├── controllers/  # Business logic
├── middleware/   # Auth, RBAC, Error handling
├── models/       # Mongoose schemas
├── routes/       # API endpoints
└── server.js     # Entry point
```
