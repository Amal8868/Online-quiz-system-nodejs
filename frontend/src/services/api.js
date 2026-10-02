import axios from 'axios';

/**
 * THE DIGITAL BRIDGE (api.js)
 * 
 * This file is like the phone line between our React frontend and our PHP backend.
 * Every time we want to save a quiz, login a user, or fetch results, we "call" the
 * server using the functions in this file.
 */

// Set REACT_APP_API_URL in the hosting provider for production.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// We use AXIOS because it's like a smart messenger service. 
// It handles headers, JSON, and errors way better than the browser's default 'fetch'.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // IMPORTANT: This tells the browser to include our Session ID (Cookies) in every request.
});

/**
 * THE SECURITY CHECKPOINT (Request Interceptor)
 * 
 * Before any message leaves our app, we stop it here to attach our "Security Badge" (JWT Token).
 * If we didn't do this, the server wouldn't know who we are!
 */
api.interceptors.request.use(
  (config) => {
    // We grab the token from the "Safe" (LocalStorage or SessionStorage).
    let token;

    // CONTEXT-AWARE TOKEN SELECTION:
    // If we are calling a Student API, prefer the 'student_token'.
    // This allows a Teacher to test the Student view in the same browser without losing their Admin session!
    if (config.url && config.url.includes('/student/')) {
      token = localStorage.getItem('student_token') || localStorage.getItem('token');
    } else {
      // For Teacher/Admin APIs, use the main token.
      token = localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`; // Hand the badge to the server.
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * THE EMERGENCY EXIT (Response Interceptor)
 * 
 * When the server sends a message back, we check if it's "401 Unauthorized".
 * This usually means our session expired. Instead of letting the app break, 
 * we automatically "Kick" the user out to the Login page for safety.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear out the stale data.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      // Send them home if they aren't already there.
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * ORGANIZING OUR REQUESTS
 * 
 * To keep things tidy, we grouped our "phone numbers" into sections.
 * It's like having a directory for the Principal (Admin), Staff (Teacher), and Students.
 */

// --- AUTH: Logging in and out ---
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfilePicture: (formData) => api.post('/auth/update-profile-pic', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// --- TEACHER: Managing Quizzes, Classes, and Grading ---
export const teacherAPI = {
  getDashboardStats: () => api.get('/teacher/dashboard'),
  getQuizzes: () => api.get('/quizzes'),
  getQuiz: (id) => api.get(`/quizzes/${id}`),
  createQuiz: (data) => api.post('/quizzes', data),
  updateQuiz: (id, data) => api.put(`/quizzes/${id}`, data),
  addQuestion: (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data),
  updateQuestion: (questionId, data) => api.put(`/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/questions/${questionId}`),
  deleteQuiz: (quizId) => api.delete(`/quizzes/${quizId}`),
  updateQuizStatus: (quizId, status) => api.post(`/quizzes/${quizId}/status`, { status }),
  adjustTime: (quizId, adjustment) => api.post(`/quizzes/${quizId}/adjust-time`, { adjustment }),
  getLiveMonitoring: (quizId) => api.get(`/quizzes/${quizId}/monitoring`),
  getQuizResults: (quizId) => api.get(`/quizzes/${quizId}/results`),

  // Classes
  getClasses: () => api.get('/classes'),
  createClass: (data) => api.post('/classes', data),
  getClassDetails: (id) => api.get(`/classes/${id}`),
  globalImportStudents: (students) => api.post('/classes/import', { students }),
  setQuizClasses: (quizId, classIds) => api.post(`/quizzes/${quizId}/classes`, { class_ids: classIds }),
  getQuizzesByClass: (classId) => api.get(`/classes/${classId}/quizzes`),

  // Students
  getClassStudents: (classId) => api.get(`/classes/${classId}/students`),
  getClassSubjects: (classId) => api.get(`/classes/${classId}/subjects`),

  // Results & Grading
  getClassQuizResults: (classId, quizId) => api.get(`/teachers/results/${classId}/${quizId}`),
  getStudentResult: (resultId) => api.get(`/teachers/results/${resultId}`),
  gradeAnswer: (resultId, data) => api.post(`/teachers/results/${resultId}/grade`, data),
  exportClassGradebook: (classId) => api.get(`/classes/${classId}/export`, { responseType: 'blob' }),
  controlStudent: (resultId, action) => api.post(`/results/${resultId}/control`, { action }),
  changePassword: (data) => api.post('/teacher/change-password', data),
};

// --- STUDENT: Entering rooms and taking exams ---
export const studentAPI = {
  enterExam: (data) => api.post('/student/enter-exam', data),
  getQuizStatus: (quizId) => api.get(`/student/quiz/${quizId}/status`),
  startExam: (data) => api.post('/student/start', data),
  getExamQuestions: (quizId) => api.get(`/student/quizzes/${quizId}/questions`),
  submitAnswer: (data) => api.post('/student/answer', data),
  finishExam: (data) => api.post('/student/finish', data),
  getResult: (resultId) => api.get(`/student/results/${resultId}`),
  updateResultStatus: (resultId, status) => api.post(`/student/results/${resultId}/status`, { status }),
  getAttemptStatus: (resultId) => api.get(`/student/results/${resultId}/status_check`),
};

// --- ADMIN: Master system settings and User Management ---
export const adminAPI = {
  createUser: (data) => api.post('/admin/users', data),
  getUsers: (type) => api.get('/admin/users', { params: { type } }),
  updateUser: (id, data) => api.post(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  createClass: (data) => api.post('/classes', data),
  assignTeacher: (classId, teacherId) => api.post(`/classes/${classId}/teachers`, { teacherId }),
  assignStudent: (classId, data) => api.post(`/classes/${classId}/students`, data),
  getAllClasses: () => api.get('/classes'),
  getClassDetails: (id) => api.get(`/classes/${id}`),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),
  getStats: () => api.get('/admin/stats'),
  getReports: () => api.get('/admin/reports'),

  // Subjects
  getSubjects: () => api.get('/subjects'),
  getSubject: (id) => api.get(`/subjects/${id}`),
  createSubject: (data) => api.post('/subjects', data),
  updateSubject: (id, data) => api.put(`/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/subjects/${id}`),
};

export default api;
