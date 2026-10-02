import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, ChartBarIcon, AcademicCapIcon, PencilSquareIcon, ArrowLeftOnRectangleIcon, UserGroupIcon, UserPlusIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { teacherAPI, authAPI } from '../services/api';

/**
 * THE WRAPPER (Layout)
 * 
 * Think of this component as the "Picture Frame". 
 * The frame (Sidebar and Header) stays the same, but the "Picture" 
 * inside (the Current Page) changes as you click links.
 */
const Layout = ({ type = 'default' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // We keep track of the last quiz the teacher was looking at.
  // This is a "Memory Trick" so if they leave and come back, we know where they were.
  const [persistedQuizId, setPersistedQuizId] = useState(localStorage.getItem('lastQuizId'));


  // Listen for updates from other components (Dashboard, QuizManage) to keep sidebar in sync
  useEffect(() => {
    const handleQuizUpdate = () => {
      setPersistedQuizId(localStorage.getItem('lastQuizId'));
    };

    window.addEventListener('quizInfoUpdated', handleQuizUpdate);
    return () => window.removeEventListener('quizInfoUpdated', handleQuizUpdate);
  }, []);

  // LOGOUT LOGIC: Clearing the browser's memory so someone else can't use our account.
  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // We wipe everything! LocalStorage and SessionStorage.
      localStorage.clear();
      sessionStorage.clear();
      console.log("DEBUG [Layout]: Storage cleared, navigating to /login");
      navigate('/login');
    }
  }, [navigate]);

  // Helper to highlight the link the user is currently on in the Sidebar.
  const isActive = (path) => {
    return location.pathname === path ? 'bg-gray-100 dark:bg-gray-700' : '';
  };

  /**
   * NAVIGATION INTELLIGENCE:
   * We need to know which Quiz is "Active" so the Sidebar links work correctly.
   */
  const isManageSection = location.pathname.startsWith('/teacher/quiz/');
  const quizIdMatch = isManageSection ? location.pathname.match(/\/quiz\/([^/?#]+)/) : null;
  const currentQuizId = quizIdMatch ? quizIdMatch[1] : null;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * THE BOUNCER (verifyAuth):
     * Before showing any page, we check: 
     * 1. Is the user logged in?
     * 2. Are they allowed to be here? (e.g. Can a teacher go into Admin settings?)
     */
    const verifyAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

      console.log("DEBUG [Layout]: Checking Auth...", { hasToken: !!token, hasUser: !!userStr, type });

      if (type === 'teacher' || type === 'admin') {
        const isStale = !token || token === 'null' || token === 'undefined' ||
          !userStr || userStr === 'null' || userStr === 'undefined';

        if (isStale) {
          console.log("DEBUG [Layout]: Missing session info, fetching from server...");
          try {
            const res = await authAPI.getCurrentUser();
            if (res.data.success && res.data.data.user) {
              const userData = res.data.data.user;
              localStorage.setItem('user', JSON.stringify(userData));
              console.log("DEBUG [Layout]: Session restored:", userData.role);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("DEBUG [Layout]: Auth fetch failed", e);
            navigate('/login');
            return;
          }
        } else {
          try {
            const user = JSON.parse(userStr);
            const userRole = user.role?.toLowerCase();
            const requiredType = type.toLowerCase();

            console.log("DEBUG [Layout]: Current user role:", userRole, "Required:", requiredType);

            if (!userRole) {
              console.error("DEBUG [Layout]: CRITICAL - User role is missing. Forcing logout.");
              handleLogout(); // This will clear storage and navigate to /login
              return;
            }

            if (userRole === 'student') {
              console.log("DEBUG [Layout]: Student attempting to access restricted area, redirecting to /join");
              navigate('/join');
              return;
            }

            if (requiredType === 'admin' && userRole !== 'admin') {
              console.log("DEBUG [Layout]: Role mismatch, sending to /teacher");
              navigate('/teacher');
              return;
            }
            if (requiredType === 'teacher' && userRole !== 'teacher') {
              // If not a teacher (and we already checked for student), and not admin (handled above or passed if userRole is admin? Wait admin can access teacher?)
              // Admin usually can access teacher routes?
              // The logic below says: if required is teacher, and user is NOT teacher...
              // If user is Admin, userRole is 'admin'. 'admin' !== 'teacher'. So Redirects to /admin.
              // This prevents Admin from accessing /teacher. 
              // If Admin SHOULD access teacher, we need to allow it.
              // Assuming Admin is strictly for /admin and Teacher for /teacher based on current logic.

              console.log("DEBUG [Layout]: Role mismatch, sending to /admin");
              navigate('/admin');
              return;
            }
          } catch (e) {
            console.error("DEBUG [Layout]: JSON Parse error", e);
            navigate('/login');
            return;
          }
        }
      }
      console.log("DEBUG [Layout]: Auth verified, stopping spinner.");
      setLoading(false); // All clear! Show the page.
    };

    verifyAuth().finally(() => {
      // Final safety check to stop the spinner no matter what happens
      setLoading(false);
    });

    // Remember the Quiz we are working on.
    if (currentQuizId) {
      localStorage.setItem('lastQuizId', currentQuizId);
      setPersistedQuizId(currentQuizId);
    }
  }, [currentQuizId, type, navigate, handleLogout]);

  // Separate effect for initial quiz fetch to avoid complex dependency triggers
  useEffect(() => {
    if (!persistedQuizId && type === 'teacher' && !loading) {
      teacherAPI.getQuizzes().then(res => {
        if (res.data.data && res.data.data.length > 0) {
          const firstQuizId = res.data.data[0].id;
          localStorage.setItem('lastQuizId', firstQuizId);
          setPersistedQuizId(firstQuizId);
        }
      }).catch(() => { });
    }
  }, [type, persistedQuizId, loading]);

  // Loading Screen: Shows a spinning circle while we check the user's status.
  if (loading && (type === 'teacher' || type === 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const quizId = currentQuizId || persistedQuizId;

  // LAYOUT FOR LOGGED-IN USERS (Admin or Teacher)
  if (type === 'teacher' || type === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* THE SIDEBAR: The vertical menu on the left. */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg print:hidden">
          <div className="flex flex-col h-full">
            {/* Logo area */}
            <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                QuizMaster
              </h1>
            </div>

            {/* NAV LINKS: Clicking these updates the URL. */}
            <nav className="flex-1 px-2 py-4 space-y-1">
              {type === 'teacher' ? (
                <>
                  <Link
                    to="/teacher"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/teacher') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <HomeIcon className="w-5 h-5 mr-3" />
                    Dashboard
                  </Link>
                  <Link
                    to="/teacher/create-quiz"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/teacher/create-quiz') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <PlusCircleIcon className="w-5 h-5 mr-3" />
                    Create quiz
                  </Link>
                  <Link
                    to="/teacher/classes"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/teacher/classes') || location.pathname.includes('/teacher/classes') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <AcademicCapIcon className="w-5 h-5 mr-3" />
                    Classes
                  </Link>
                  <Link
                    to={quizId ? `/teacher/quiz/${quizId}` : "/teacher/manage"}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${location.pathname.startsWith('/teacher/quiz/') || location.pathname === '/teacher/manage' ? 'text-primary-600 dark:text-primary-400 bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <PencilSquareIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                    Manage Quiz
                  </Link>
                  <Link
                    to="/teacher/results"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/teacher/results') || location.pathname.includes('/teacher/results') ? 'text-primary-600 dark:text-primary-400 bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <ChartBarIcon className="w-5 h-5 mr-3" />
                    Results
                  </Link>
                </>
              ) : (
                /* ADMIN NAVIGATION */
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/admin') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <HomeIcon className="w-5 h-5 mr-3" />
                    Dashboard
                  </Link>

                  <Link
                    to="/admin/users"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/users') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <UserGroupIcon className="w-5 h-5 mr-3" />
                    Users
                  </Link>

                  <Link
                    to="/admin/teachers"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/teachers') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <UserPlusIcon className="w-5 h-5 mr-3" />
                    Teacher
                  </Link>

                  <Link
                    to="/admin/students"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/students') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <UserPlusIcon className="w-5 h-5 mr-3" />
                    Student
                  </Link>

                  <Link
                    to="/admin/subjects"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/subjects') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <BookOpenIcon className="w-5 h-5 mr-3" />
                    Subjects
                  </Link>

                  <Link
                    to="/admin/classes"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/classes') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <AcademicCapIcon className="w-5 h-5 mr-3" />
                    Manage Classes
                  </Link>

                  <Link
                    to="/admin/reports"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2 ${isActive('/admin/reports') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <ChartBarIcon className="w-5 h-5 mr-3" />
                    Reports
                  </Link>
                </>
              )}
            </nav>

            {/* FOOTER OF SIDEBAR: Settings and Logout buttons. */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleLogout}
                    className="p-2 text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Logout"
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* THE STAGE: This is where each page's unique content is rendered. */}
        <div className="pl-64 flex flex-col min-h-screen print:pl-0">
          <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-8 print:hidden">
            <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {/* This is like the breadcrumbs of where we are. */}
            </div>
          </header>

          <main className="flex-1 px-8 py-8">
            <div className="max-w-7xl mx-auto">
              {/* THE OUTLET: This special tag is where the page content actually appears! */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // PUBLIC LAYOUT: This is what students or visitors see before they log in.
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
                QuizMaster
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Portal login
              </Link>
              <Link
                to="/join"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Join as student
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-gray-800 mt-12 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} QuizMaster. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
