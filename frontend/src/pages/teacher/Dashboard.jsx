import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
    ClipboardDocumentCheckIcon,
    UserGroupIcon,
    TrashIcon,
    EyeIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    LockClosedIcon,
    ShieldCheckIcon,
    CameraIcon
} from '@heroicons/react/24/outline';
import { teacherAPI, authAPI } from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';
import AlertModal from '../../components/AlertModal';

/**
 * THE TEACHER'S CONTROL ROOM (Dashboard)
 * 
 * This is where teachers land after logging in. 
 * It gives them a bird's-eye view of their quizzes, students, 
 * and even show the current time to help them stay on schedule!
 */
const Dashboard = () => {
    // We use "States" to remember data while the page is open.
    const [stats, setStats] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Modal States: These control the pop-up boxes for deleting or resetting passwords.
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, quizId: null, quizTitle: '' });
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ new_password: '', confirm_password: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    const fileInputRef = React.useRef(null);

    // We grab the user's info from the browser's "Safe" (LocalStorage).
    const [user, setUser] = useState(JSON.parse(
        (localStorage.getItem('token') ? localStorage.getItem('user') : sessionStorage.getItem('user')) ||
        localStorage.getItem('user') ||
        sessionStorage.getItem('user') ||
        '{}'
    ));

    // PHOTO UPLOAD: When the teacher clicks their avatar.
    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    const handleImageChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData(); // FormData is like a digital envelope for files.
            formData.append('profile_pic', file);

            try {
                const response = await authAPI.updateProfilePicture(formData);
                if (response.data.success) {
                    const newProfilePic = response.data.data.profile_pic;
                    const updatedUser = { ...user, profile_pic: newProfilePic };

                    setUser(updatedUser);

                    // Update the "Safe" (Storage) with the new photo URL.
                    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                    storage.setItem('user', JSON.stringify(updatedUser));

                    setAlertConfig({
                        isOpen: true,
                        title: 'Success',
                        message: 'Profile picture updated successfully!',
                        type: 'success'
                    });
                }
            } catch (error) {
                console.error('Failed to upload profile picture', error);
                setAlertConfig({
                    isOpen: true,
                    title: 'Upload Failed',
                    message: error.response?.data?.message || 'Failed to update profile picture.',
                    type: 'error'
                });
            }
        }
    };

    // DATA FETCHING: Asking the API for stats (how many students) and the quiz list.
    const fetchDashboardData = useCallback(async () => {
        try {
            const [statsRes, quizzesRes] = await Promise.all([
                teacherAPI.getDashboardStats(),
                teacherAPI.getQuizzes()
            ]);

            setStats(statsRes.data.data?.stats || { students: 0, teachers: 0, active_quizzes: 0, total_quizzes: 0 });
            setQuizzes(quizzesRes.data.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false); // Stop the spinning circle once the data arrives!
        }
    }, []);

    useEffect(() => {
        // We sync the user's profile with the server on every load.
        authAPI.getCurrentUser().then(res => {
            if (res.data.success && res.data.data.user) {
                const refreshedUser = res.data.data.user;
                setUser(refreshedUser);
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem('user', JSON.stringify(refreshedUser));
            }
        }).catch(err => console.error("Failed to refresh user profile", err));

        fetchDashboardData();

        // A live clock for the teacher.
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // SECURITY FEATURE: If it's their very first time logging in, we FORCE a password change.
        if (user.first_login === true || user.first_login === 1 || user.first_login === '1') {
            setShowPasswordModal(true);
        }

        return () => clearInterval(timer);
    }, [fetchDashboardData, user.first_login]);

    // FORMATTING HELPERS: Making dates and times look pretty.
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // DELETE LOGIC: Asking for confirmation before wiping a quiz.
    const handleDeleteQuiz = (quiz) => {
        setDeleteModal({
            isOpen: true,
            quizId: quiz.id,
            quizTitle: quiz.title
        });
    };

    const confirmDelete = async () => {
        const id = deleteModal.quizId;
        setDeleteModal({ ...deleteModal, isOpen: false });

        try {
            await teacherAPI.deleteQuiz(id);
            setAlertConfig({
                isOpen: true,
                title: 'Quiz Deleted',
                message: 'The quiz has been permanently removed.',
                type: 'success'
            });
            fetchDashboardData(); // Refresh the list without reloading the whole page.
        } catch (error) {
            console.error('Error deleting quiz:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Deletion Failed',
                message: error.response?.data?.message || 'Failed to delete the quiz. Please try again.',
                type: 'error'
            });
        }
    };

    // PASSWORD UPDATE: When a new teacher sets their real password.
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (passwordData.new_password.length < 6) {
            setPasswordError('Password must be at least 6 characters long');
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError('Passwords do not match');
            return;
        }

        setPasswordSubmitting(true);
        try {
            const res = await teacherAPI.changePassword({ new_password: passwordData.new_password });

            if (res.data.success) {
                const updatedUser = { ...user, first_login: 0 };
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem('user', JSON.stringify(updatedUser));

                setShowPasswordModal(false);
                setAlertConfig({
                    isOpen: true,
                    title: 'Success',
                    message: 'Password changed successfully. You can now use your dashboard.',
                    type: 'success'
                });
            }
        } catch (error) {
            const backendError = error.response?.data?.error || error.response?.data?.message;
            setPasswordError(backendError || 'Failed to change password');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    // If we are still waiting for the server, show a nice loading message.
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 animate-pulse font-medium">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* --- PROFILE SECTION --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        {/* THE AVATAR: Clicking the photo opens the file picker. */}
                        <div className="relative cursor-pointer" onClick={handleImageClick}>
                            <img
                                src={user.profile_pic && user.profile_pic !== 'no-photo.jpg' ? user.profile_pic : (user.gender && user.gender.toLowerCase() === 'female'
                                    ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.username || user.name)}&top=hijab&clothing=blazerAndShirt&eyes=happy&mouth=smile`
                                    : `https://avatar.iran.liara.run/public/boy?username=${user.username || user.name}`)}
                                alt="Profile"
                                className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-700 shadow-md object-cover hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 bg-black/20 rounded-full">
                                <CameraIcon className="h-8 w-8 text-white" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                            />
                            {/* Online/Active light */}
                            <div className="absolute bottom-1 right-1 h-6 w-6 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full"></div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                                    {user.gender && user.gender.toLowerCase() === 'male' ? 'Mr. ' : user.gender && user.gender.toLowerCase() === 'female' ? 'Ms. ' : ''}{user.name || 'Teacher'}
                                </h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600 dark:text-indigo-200 font-medium">
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Teacher Account
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 text-gray-500 dark:text-slate-400 text-sm font-medium">
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <UserCircleIcon className="h-4 w-4" />
                                    <span>{user.email || 'teacher@quizmaster.com'}</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <CalendarDaysIcon className="h-4 w-4" />
                                    <span>Joined {user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LIVE CLOCK */}
                    <div className="w-full md:w-auto text-center md:text-right p-4">
                        <div className="inline-flex flex-col items-center md:items-end">
                            <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none font-sans drop-shadow-sm">
                                {formatTime(currentTime)}
                            </h2>
                            <p className="mt-2 text-indigo-600 dark:text-indigo-200 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                <CalendarDaysIcon className="h-4 w-4" />
                                {formatDate(currentTime)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- STATS GRID --- 
                I used 'framer-motion' to make these cards pop up with a cool animation. */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[
                    { name: 'Total Quizzes', value: stats?.total_quizzes || 0, icon: ClipboardDocumentCheckIcon, color: 'text-purple-600', bg: 'bg-purple-50', link: '/teacher/results' },
                    { name: 'Active Now', value: stats?.active_quizzes || 0, icon: ClipboardDocumentCheckIcon, color: 'text-green-600', bg: 'bg-green-50', link: '/teacher/results' },
                    { name: 'Total Students', value: stats?.total_students || 0, icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-50', link: '/teacher/classes' },
                ].map((item, i) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Link
                            to={item.link}
                            className="block bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:border-indigo-500 hover:shadow-md group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 ${item.bg} dark:bg-gray-700 rounded-lg group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.name}</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{item.value}</p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* --- RECENT QUIZZES LIST --- */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        Your Quizzes
                        <span className="ml-4 px-3 py-1 bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700">{quizzes.length} Total</span>
                    </h2>
                </div>

                <div className="p-4">
                    {quizzes.length === 0 ? (
                        <div className="py-12 text-center opacity-50">
                            <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium tracking-wide">No quizzes created yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {quizzes.map((quiz, index) => (
                                <motion.div
                                    key={quiz.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all gap-4"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                            <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-indigo-600 transition-colors">
                                                {quiz.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="flex items-center text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                                                    Code: {quiz.room_code}
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide border-l border-gray-200 dark:border-gray-600 pl-3">
                                                    {quiz.question_count} Questions
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Link
                                            to={`/teacher/quiz/${quiz.id}`}
                                            onClick={() => {
                                                localStorage.setItem('lastQuizId', quiz.id);
                                                localStorage.setItem('lastQuizTitle', quiz.title);
                                                window.dispatchEvent(new Event('quizInfoUpdated'));
                                            }}
                                            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-indigo-500 rounded-lg text-sm font-bold text-slate-700 dark:text-gray-300 transition-all"
                                        >
                                            <EyeIcon className="h-4 w-4 mr-2 text-indigo-500" />
                                            Manage
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteQuiz(quiz)}
                                            className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- 
                ConfirmationModal: "Are you sure?"
                AlertModal: "Success!" or "Error!"
            */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Delete Quiz"
                message={`Are you sure you want to delete "${deleteModal.quizTitle}"? This action cannot be undone.`}
                confirmText="Delete Now"
                isDangerous={true}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

            {/* Forced Password Change Modal: Only show if it's the 1st login */}
            {showPasswordModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '450px',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '4px solid #6366f1',
                        margin: '20px'
                    }}>
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4 shadow-lg shadow-indigo-500/30">
                                <LockClosedIcon className="h-8 w-8 text-indigo-700" />
                            </div>
                            <h3
                                className="text-3xl font-black text-slate-900 tracking-tight"
                                style={{ color: '#000000', fontSize: '24px', fontWeight: '900', marginBottom: '10px' }}
                            >
                                Security Update
                            </h3>
                            <p
                                className="mt-3 text-slate-600 font-bold text-base leading-relaxed"
                                style={{ color: '#334155', fontSize: '14px', fontWeight: '600' }}
                            >
                                Welcome! Please create a new password to secure your account.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            {passwordError && (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    color: '#991b1b',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #f87171',
                                    marginBottom: '15px',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}>
                                    ⚠️ {passwordError}
                                </div>
                            )}

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#1e293b',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    marginBottom: '8px'
                                }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#f8fafc',
                                        border: '2px solid #cbd5e1',
                                        borderRadius: '12px',
                                        color: '#0f172a',
                                        fontSize: '16px',
                                        outline: 'none',
                                        fontWeight: '600'
                                    }}
                                    placeholder="Enter strong password"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#1e293b',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    marginBottom: '8px'
                                }}>
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#f8fafc',
                                        border: '2px solid #cbd5e1',
                                        borderRadius: '12px',
                                        color: '#0f172a',
                                        fontSize: '16px',
                                        outline: 'none',
                                        fontWeight: '600'
                                    }}
                                    placeholder="Repeat password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={passwordSubmitting}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: '#4f46e5',
                                    color: '#ffffff',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontWeight: '900',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)'
                                }}
                            >
                                {passwordSubmitting ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <ShieldCheckIcon className="h-6 w-6" />
                                        <span>UPDATE PASSWORD</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
