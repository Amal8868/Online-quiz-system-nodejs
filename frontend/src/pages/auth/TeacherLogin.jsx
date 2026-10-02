import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

/**
 * THE FRONT GATE (TeacherLogin)
 * 
 * This is where Teachers and Admins start their day.
 * It's like a security desk where we check their ID (Email/Username) 
 * and Badge (Password) before letting them inside.
 */
const TeacherLogin = () => {
    const navigate = useNavigate();

    // STATE: "Remembering" what the user typed and if we are waiting for the server.
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    /**
     * AUTO-LOGIN (useEffect):
     * When the page first loads, we check if the user was already logged in.
     * It's like checking if they still have their visitor pass in their pocket!
     */
    useEffect(() => {
        const checkExistingSession = async () => {
            // Check both "Sticky" (LocalStorage) and "Temporary" (SessionStorage) pockets.
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

            const isTokenValid = token && token !== 'undefined' && token !== 'null';
            const isUserValid = userStr && userStr !== 'undefined' && userStr !== 'null';

            if (isTokenValid && isUserValid) {
                try {
                    const user = JSON.parse(userStr);
                    const role = user.role?.toLowerCase();

                    if (!role) {
                        console.log("DEBUG [Login]: Persistent role missing, clearing storage...");
                        localStorage.clear();
                        sessionStorage.clear();
                        return;
                    }

                    if (role === 'student') {
                        // If a student tries to visit the Portal Login, we shouldn't redirect them to /join automatically
                        // because they might be trying to log in as a teacher/admin now.
                        // So we clear the student session and let them see the login form.
                        console.log("DEBUG [Login]: Student session detected on Portal Login. Clearing session to allow Teacher/Admin login.");
                        localStorage.clear();
                        sessionStorage.clear();
                        return;
                    }

                    console.log("DEBUG [Login]: Auto-redirecting for role:", role);
                    navigate(role === 'admin' ? '/admin' : '/teacher');
                    return;
                } catch (e) { }
            }

            // If their pockets are empty, we ask the server: "Do you remember me?" (via Cookies).
            try {
                const res = await authAPI.getCurrentUser();
                if (res.data.success && res.data.data.user) {
                    const userData = res.data.data.user;
                    // We found a session! Let's save it temporarily so we don't have to ask again.
                    sessionStorage.setItem('user', JSON.stringify(userData));
                    // Make sure we DON'T set "undefined" as a string if token is missing
                    if (res.data.data.token) {
                        sessionStorage.setItem('token', res.data.data.token);
                    }
                    navigate(userData.role === 'Admin' ? '/admin' : '/teacher');
                }
            } catch (e) {
                // No session found, stay at the gate.
            }
        };

        checkExistingSession();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * THE LOGIN BUTTON (handleSubmit):
     * This is the moment of truth! We send the credentials to the backend.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Basic sanity checks before we call the server.
        if (!formData.email) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        if (!formData.password) {
            setError('Please enter your password');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.login(formData);
            const data = response.data?.data;
            if (data?.token && data?.user) {

                /**
                 * LOCAL vs SESSION STORAGE:
                 * If "Remember Me" is checked, we put the data in LocalStorage (it stays even after closing the browser).
                 * If NOT checked, we use SessionStorage (it disappears once the tab is closed).
                 */
                const storage = rememberMe ? localStorage : sessionStorage;
                const otherStorage = rememberMe ? sessionStorage : localStorage;

                // Clean up the "other" storage to avoid messy data conflicts.
                otherStorage.removeItem('token');
                otherStorage.removeItem('user');

                storage.setItem('token', data.token);

                // Final safety check for role
                if (!data.user.role) {
                    data.user.role = data.user.user_type || 'Teacher';
                }

                storage.setItem('user', JSON.stringify(data.user));

                // Send them to the right room based on their job (Admin or Teacher).
                const role = data.user.role.toLowerCase();
                if (role === 'admin') {
                    navigate('/admin');
                } else if (role === 'student') {
                    navigate('/join');
                } else {
                    navigate('/teacher');
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <motion.h2
                    className="mt-6 text-center text-3xl font-black text-gray-900 dark:text-white tracking-tight"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Sign in to your account
                </motion.h2>
                <motion.p
                    className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Administrative Portal
                </motion.p>
            </div>

            <motion.div
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
            >
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                        {/* THE RED BOX (Error display) */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            {/* We label this "Email" but the backend is smart enough to check for a Username too! */}
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username or Email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your identifier"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pr-10"
                                />
                                {/* Toggling the "Eye" icon to show/hide the password text. */}
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link
                                    to="/forgot-password"
                                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherLogin;
