import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';

/**
 * WELCOME TO THE FRONTEND COMMAND CENTER!
 * 
 * This is the main file for our React app. Think of it as the "Map" or "GPS" 
 * of our website. It tells the browser which component to show based on the URL.
 * 
 * We use a library called 'react-router-dom' to handle all this navigation 
 * without making the page flicker or reload.
 */

// We import all our "Pages" here. Each one is like a different room in our app.
import LandingPage from './pages/LandingPage';
import TeacherLogin from './pages/auth/TeacherLogin';
import TeacherRegister from './pages/auth/TeacherRegister';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateQuiz from './pages/teacher/CreateQuiz';
import QuizManage from './pages/teacher/QuizManage';
import QuizResults from './pages/teacher/QuizResults';
import StudentJoin from './pages/student/Join';
import WaitingRoom from './pages/student/WaitingRoom';
import ExamPage from './pages/student/ExamPage';
import ResultPage from './pages/student/ResultPage';
import ClassList from './pages/teacher/ClassList';
import ClassDetails from './pages/teacher/ClassDetails';
import GlobalImport from './pages/teacher/GlobalImport';

import ResultsClasses from './pages/teacher/ResultsClasses';
import ResultsClassQuizzes from './pages/teacher/ResultsClassQuizzes';
import QuizGradingBoard from './pages/teacher/QuizGradingBoard';
import StudentGradingView from './pages/teacher/StudentGradingView';
import NotFound from './pages/NotFound';

// Special pages for the system administrators.
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import ClassManagement from './pages/admin/ClassManagement';
import Reports from './pages/admin/Reports';
import SubjectManagement from './pages/admin/SubjectManagement';

function App() {
  return (
    // STEP 1: The ThemeProvider.
    // This wraps our whole app so we can switch between "Light Mode" and "Dark Mode"
    // anywhere in our code with just one click!
    <ThemeProvider>

      {/* STEP 2: The Router.
          This starts the logic that listens to changes in the URL bar. */}
      <Router>
        <Routes>

          {/* --- PUBLIC ROUTES ---
              Anyone can visit these! It's like the front door of our app. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<TeacherLogin />} />
          <Route path="/register" element={<TeacherRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* --- TEACHER AREA (PROTECTED) ---
              Everything here is wrapped in a "Layout" component. 
              This keeps the sidebar and header the same while we switch pages. */}
          <Route path="/teacher" element={<Layout type="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="create-quiz" element={<CreateQuiz />} />
            <Route path="manage" element={<QuizManage />} />
            <Route path="quiz/:quizId" element={<QuizManage />} />
            <Route path="quiz/:quizId/questions" element={<QuizManage />} />
            <Route path="quiz/:quizId/results" element={<QuizResults />} />
            <Route path="classes" element={<ClassList />} />
            <Route path="classes/:id" element={<ClassDetails />} />
            <Route path="classes/import" element={<GlobalImport />} />

            {/* Grading tools for teachers after the students finish. */}
            <Route path="results" element={<ResultsClasses />} />
            <Route path="results/class/:classId" element={<ResultsClassQuizzes />} />
            <Route path="results/class/:classId/quiz/:quizId" element={<QuizGradingBoard />} />
            <Route path="results/grading/:resultId" element={<StudentGradingView />} />
          </Route>

          {/* --- ADMIN AREA (RESTRICTED) ---
              Only the big bosses (Admins) can see these pages. */}
          <Route path="/admin" element={<Layout type="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="teachers" element={<UserManagement viewMode="list" userType="Teacher" />} />
            <Route path="teachers/register" element={<UserManagement viewMode="register" userType="Teacher" />} />
            <Route path="students" element={<UserManagement viewMode="list" userType="Student" />} />
            <Route path="students/register" element={<UserManagement viewMode="register" userType="Student" />} />
            <Route path="classes" element={<ClassManagement />} />
          </Route>

          {/* --- STUDENT EXPERIENCE ---
              This is where students join quizzes using their Room Code. */}
          <Route path="/join" element={<StudentJoin />} />
          <Route path="/student/waiting/:roomCode" element={<WaitingRoom />} />
          <Route path="/exam/:roomCode" element={<ExamPage />} />
          <Route path="/student/results/:resultId" element={<ResultPage />} />

          {/* --- THE "LOST" PAGE ---
              If someone tries to go to /weird-link, we show them a friendly 404 page. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
