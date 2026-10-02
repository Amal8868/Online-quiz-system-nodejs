import React, { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import {
    DocumentTextIcon,
    PlusIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    PlayIcon,
    PauseIcon,
    NoSymbolIcon,
    MinusIcon,
    PencilSquareIcon,
    TrashIcon,
    UsersIcon,
    BoltIcon,
    CheckBadgeIcon,
    ClipboardDocumentListIcon,
    ChartBarIcon,
    QuestionMarkCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';
import UpdateQuestionModal from '../../components/UpdateQuestionModal';
import AddQuestionModal from '../../components/AddQuestionModal';
import AlertModal from '../../components/AlertModal';

/**
 * THE QUIZ CONTROL TOWER (QuizManage)
 * 
 * This is where the magic happens for the Teacher! 
 * It's a "3-in-1" screen:
 * 1. OVERVIEW: Setup and status.
 * 2. QUESTIONS: The exam builder.
 * 3. LIVE: Real-time spying... I mean, monitoring of students!
 */
/**
 * DEFAULT / EMPTY QUIZ STRUCTURE
 * Moved outside component to avoid recreation on every render
 */
const EMPTY_QUIZ = {
    id: null,
    title: 'Quiz Unavailable',
    description: 'This quiz may have been deleted or is not loading.',
    status: 'archived',
    duration_minutes: 0,
    total_points: 0,
    room_code: '---',
    questions: [],
    questions_count: 0
};

const QuizManage = () => {
    const { quizId } = useParams();

    // STATE: These variables "remember" everything about this quiz while the page is open.
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // Which part of the tower are we in?
    // Error state removed as we use Empty State pattern

    // LIVE MONITORING: Keeping track of students currently taking the quiz.
    const [liveStats, setLiveStats] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [processingAction, setProcessingAction] = useState(null);

    // THE TICKING CLOCK: State for the global exam timer.
    const [remainingTime, setRemainingTime] = useState(0);
    const [isTimeAdjusting, setIsTimeAdjusting] = useState(false);

    // BUILDING QUESTIONS: Blank states for when we add a new question.
    const [showAddForm, setShowAddForm] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        options: [
            { id: 1, option_text: '', is_correct: false },
            { id: 2, option_text: '', is_correct: false },
            { id: 3, option_text: '', is_correct: false },
            { id: 4, option_text: '', is_correct: false }
        ]
    });
    const [addingQuestion, setAddingQuestion] = useState(false);
    const [expandedQuestions, setExpandedQuestions] = useState(new Set()); // Which questions have their answers "visible" in the list?

    // TOGGLE: Open/Close the answer view for a specific question.
    const toggleQuestion = (questionId) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    };

    // MODAL HANDLERS: Pop-ups for confirmation and editing.
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [timeAdjustModalOpen, setTimeAdjustModalOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState(5);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // STUDENT CONTROL: State for the "Block Student" pop-up.
    const [studentControlModal, setStudentControlModal] = useState({
        isOpen: false,
        resultId: null,
        action: null
    });

    // ALERT SYSTEM: A pretty way to show success/error messages.
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'success',
        buttonText: 'Okay'
    });

    const showAlert = useCallback((title, message, type = 'success', buttonText = 'Okay') => {
        setAlertConfig({
            isOpen: true,
            title,
            message,
            type,
            buttonText
        });
    }, []);

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };


    const handleDeleteClick = (e, question) => {
        e.stopPropagation();
        setSelectedQuestion(question);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedQuestion) return;
        setActionLoading(true);
        try {
            await teacherAPI.deleteQuestion(selectedQuestion.id);
            setDeleteModalOpen(false);
            // setSelectedQuestion(null); // Keep for animation
            fetchQuiz();
            showAlert('Success', 'Question deleted successfully', 'success');
        } catch (error) {
            showAlert('Error', 'Failed to delete question: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateClick = (e, question) => {
        e.stopPropagation();
        // Deep copy to avoid mutating state directly and to serve as form data
        setSelectedQuestion(JSON.parse(JSON.stringify(question)));
        setUpdateModalOpen(true);
    };

    const saveUpdate = async () => {
        if (!selectedQuestion) return;
        setActionLoading(true);
        try {
            await teacherAPI.updateQuestion(selectedQuestion.id, selectedQuestion);
            setUpdateModalOpen(false);
            // setSelectedQuestion(null); // Keep for animation
            fetchQuiz();
            showAlert('Success', 'Question updated successfully', 'success');
        } catch (error) {
            showAlert('Error', 'Failed to update question: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * FETCH DATA (fetchQuiz, fetchMonitoring):
     * These functions "call the server" to get the latest info.
     * fetchQuiz: Gets the questions and settings.
     * fetchMonitoring: Gets the live scores of students.
     */
    const fetchQuiz = useCallback(async () => {
        if (!quizId) return;
        try {
            console.log(`[QuizManage] Fetching quiz: ${quizId}`);
            const response = await teacherAPI.getQuiz(quizId);
            const data = response.data.data;
            console.log(`[QuizManage] Data received:`, data);

            if (!data || (!data.id && !data._id)) {
                console.error("[QuizManage] Invalid data: missing ID", data);
                throw new Error("Invalid quiz data format");
            }

            setQuiz(data);
            // Update persisted quiz info so Sidebar stays synced
            localStorage.setItem('lastQuizId', data.id || data._id);
            localStorage.setItem('lastQuizTitle', data.title);
            window.dispatchEvent(new Event('quizInfoUpdated'));
        } catch (error) {
            console.error("[QuizManage] Fetch failed:", error);
            // Fallback: Set a "Mock" empty quiz so the UI doesn't crash or block.
            setQuiz(EMPTY_QUIZ);
        } finally {
            setLoading(false);
        }
    }, [quizId]); // Removed 'loading' dependency to prevent loops

    const fetchMonitoring = useCallback(async () => {
        if (!quizId) return;
        try {
            const res = await teacherAPI.getLiveMonitoring(quizId);
            setLiveStats(res.data.data || []);
        } catch (error) {
            console.error('Error fetching live stats:', error);
        }
    }, [quizId]);

    // UPDATE STATUS: e.g. "Activate" or "Finish" the quiz.
    const updateStatus = useCallback(async (newStatus) => {
        try {
            await teacherAPI.updateQuizStatus(quizId, newStatus);
            fetchQuiz();
        } catch (error) {
            console.error("Update Status Failed:", error);
            // Show the EXACT error from the backend so we know if it's a role issue
            const errorMsg = error.response?.data?.error || error.message;
            showAlert('Update Failed', errorMsg, 'error');
        }
    }, [quizId, fetchQuiz, showAlert]);

    /**
     * THE TIME BENDER (handleTimeAdjustment):
     * This is a cool feature! Teachers can add or remove minutes 
     * from the exam while it's still running.
     */
    const handleTimeAdjustment = async (minutes) => {
        if (isTimeAdjusting) return;
        setIsTimeAdjusting(true);
        try {
            await teacherAPI.adjustTime(quizId, minutes);
            await fetchQuiz(); // Refresh to get the updated duration!
        } catch (error) {
            showAlert('Adjustment Failed', error.response?.data?.message || error.message, 'error');
        } finally {
            setIsTimeAdjusting(false);
        }
    };

    const toggleFeedbackVisibility = async () => {
        try {
            const newValue = quiz.show_detailed_results === false ? true : false;
            await teacherAPI.updateQuiz(quizId, { show_detailed_results: newValue });
            setQuiz(prev => ({ ...prev, show_detailed_results: newValue }));
            showAlert('Success', `Student feedback is now ${newValue ? 'visible' : 'hidden'}.`, 'success');
        } catch (error) {
            console.error('Error updating feedback visibility:', error);
            showAlert('Error', 'Failed to update feedback settings.', 'error');
        }
    };

    /**
     * STUDENT CONTROLS:
     * Blocking a student kicks them out of the exam immediately.
     */
    const handleStudentControl = async (resultId, action) => {
        if (action === 'block') {
            setStudentControlModal({ isOpen: true, resultId, action });
            return;
        }
        executeStudentControl(resultId, action);
    };

    const executeStudentControl = async (resultId, action) => {
        setProcessingAction(resultId);
        try {
            await teacherAPI.controlStudent(resultId, action);
            await fetchMonitoring(); // Refresh list to show they are blocked.
            if (action === 'block') {
                showAlert('Student Blocked', 'The student has been blocked from the exam.', 'success');
            }
        } catch (error) {
            showAlert('Action Failed', `Failed to ${action} student: ` + (error.response?.data?.message || error.message), 'error');
        } finally {
            setProcessingAction(null);
            setStudentControlModal({ isOpen: false, resultId: null, action: null });
        }
    };

    /**
     * THE HEARTBEAT (useEffect):
     * This runs once when the page opens. It sets up a "Polling" system 
     * that checks the server every 5 seconds so the stats stay fresh!
     */
    useEffect(() => {
        fetchQuiz();
        fetchMonitoring();
        const pollInterval = setInterval(() => {
            fetchMonitoring();
            fetchQuiz();
        }, 5000);
        return () => clearInterval(pollInterval); // Clean up when we leave the page.
    }, [fetchQuiz, fetchMonitoring]);

    // Timer Logic
    /**
     * PRECISION TIMER (useEffect):
     * This calculates exactly how many seconds are left in the exam.
     * Math: (Start Time + Duration) - Current Time = Seconds Left.
     */
    useEffect(() => {
        if (!quiz || quiz.status !== 'started' || !quiz.start_time) {
            setRemainingTime(0);
            return;
        }

        const calculateTime = () => {
            const start = new Date(quiz.start_time).getTime();
            const end = start + (quiz.duration_minutes * 60 * 1000);
            const now = new Date().getTime();
            const left = Math.max(0, Math.floor((end - now) / 1000));
            setRemainingTime(left);

            // AUTO-FINISH: If time runs out, stop the exam!
            if (left <= 0 && quiz.status === 'started') {
                updateStatus('finished');
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [quiz, updateStatus]);

    // Watch for Status Changes to Finished
    const prevStatusRef = useRef(null);
    useEffect(() => {
        if (quiz?.status === 'finished' && prevStatusRef.current === 'started') {
            showAlert('Exam Finished', 'The exam has been successfully finished.', 'success');
        }
        if (quiz) {
            prevStatusRef.current = quiz.status;
        }
    }, [quiz, showAlert]);



    // Computed Stats for Live View
    const filteredStats = useMemo(() => {
        return liveStats.filter(stat => {
            const matchesSearch = stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                stat.student_display_id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || stat.status_label?.toLowerCase().replace(' ', '_') === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [liveStats, searchTerm, statusFilter]);

    const statsOverview = useMemo(() => ({
        total: liveStats.length,
        inProgress: liveStats.filter(s => s.status_label === 'In Progress' || s.status_label === 'Started').length,
        finished: liveStats.filter(s => s.status_label === 'Finished').length,
        avgAccuracy: liveStats.length > 0
            ? (liveStats.reduce((acc, s) => acc + (s.percentage || 0), 0) / liveStats.length).toFixed(1)
            : 0
    }), [liveStats]);


    /**
     * BUILDING A QUESTION (handleAddQuestion):
     * When the teacher clicks "Save Question", we need to figure out 
     * which answer is the correct one based on the question type.
     */
    const handleAddQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestion.question_text) return;
        setAddingQuestion(true);

        try {
            let correctAnswer = '';
            // LOGIC CHECK: Depending on the type, the answer is stored differently.
            if (newQuestion.question_type === 'short_answer') {
                // Short answers aren't graded by the computer (yet).
                correctAnswer = 'MANUAL_GRADING';
            } else if (newQuestion.question_type === 'multiple_selection') {
                // For MSQ, we join all correct option IDs with commas (e.g. "1,3,4").
                correctAnswer = newQuestion.options
                    .filter(o => o.is_correct)
                    .map(o => o.id)
                    .join(',');
            } else {
                // For MCQ or True/False, there's only one winner!
                const correctOpt = newQuestion.options.find(o => o.is_correct);
                correctAnswer = correctOpt ? correctOpt.id : '';
            }

            await teacherAPI.addQuestion(quizId, {
                ...newQuestion,
                correct_answer: correctAnswer
            });

            // RESET: Clear the form so the teacher can add the next one.
            setShowAddForm(false);
            setNewQuestion({
                question_text: '',
                question_type: 'multiple_choice',
                points: 1,
                options: [
                    { id: 1, option_text: '', is_correct: false },
                    { id: 2, option_text: '', is_correct: false },
                    { id: 3, option_text: '', is_correct: false },
                    { id: 4, option_text: '', is_correct: false }
                ]
            });
            fetchQuiz();
        } catch (error) {
            showAlert('Error', 'Failed to add question: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setAddingQuestion(false);
        }
    };

    const updateNewQuestionOption = (id, field, value) => {
        const newOptions = newQuestion.options.map(o =>
            o.id === id ? { ...o, [field]: value } : o
        );

        if (field === 'is_correct' && value === true && (newQuestion.question_type === 'multiple_choice' || newQuestion.question_type === 'true_false')) {
            setNewQuestion({
                ...newQuestion,
                options: newOptions.map(o =>
                    o.id === id ? o : { ...o, is_correct: false }
                )
            });
        } else {
            setNewQuestion({ ...newQuestion, options: newOptions });
        }
    };

    const addOptionToNew = () => {
        const newId = newQuestion.options.length > 0 ? Math.max(...newQuestion.options.map(o => o.id)) + 1 : 1;
        setNewQuestion({
            ...newQuestion,
            options: [...newQuestion.options, { id: newId, option_text: '', is_correct: false }]
        });
    };

    const removeOptionFromNew = (id) => {
        if (newQuestion.options.length <= 2) return;
        setNewQuestion({
            ...newQuestion,
            options: newQuestion.options.filter(o => o.id !== id)
        });
    };

    /**
     * CHANGING TYPES (handleTypeChange):
     * If a teacher switches from "MCQ" to "True/False", 
     * we automatically set up the "True" and "False" options for them.
     */
    const handleTypeChange = (type) => {
        let options = [];
        if (type === 'multiple_choice' || type === 'multiple_selection') {
            options = [
                { id: 1, option_text: '', is_correct: false },
                { id: 2, option_text: '', is_correct: false },
                { id: 3, option_text: '', is_correct: false },
                { id: 4, option_text: '', is_correct: false }
            ];
        } else if (type === 'true_false') {
            options = [
                { id: 1, option_text: 'True', is_correct: true },
                { id: 2, option_text: 'False', is_correct: false }
            ];
        }
        setNewQuestion({ ...newQuestion, question_type: type, options });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse font-medium">Loading quiz details...</p>
        </div>
    );


    // SAFETY NET: If loading is done but quiz is still null (shouldn't happen with above fix, but safe is safe), use emptyQuiz.
    if (!quiz) {
        return <p>Loading quiz details...</p>;
    }


    return (
        <div className="space-y-8 pb-12">
            {/* Time Adjustment Modal */}
            {/* Time Adjustment Modal */}
            <Transition show={timeAdjustModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setTimeAdjustModalOpen(false)}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
                    </TransitionChild>

                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-2xl transition-all sm:my-8 w-full max-w-sm border border-gray-100 dark:border-gray-700">
                                    <div className="absolute right-0 top-0 pr-3 pt-3 block z-10">
                                        <button
                                            type="button"
                                            className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none"
                                            onClick={() => setTimeAdjustModalOpen(false)}
                                        >
                                            <span className="sr-only">Close</span>
                                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 p-5">
                                        <div className="flex flex-col items-center">
                                            {/* Hero Icon */}
                                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 mb-4 shadow-inner">
                                                <ClockIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                                            </div>

                                            <div className="text-center w-full">
                                                <DialogTitle as="h3" className="text-lg font-black leading-6 text-gray-900 dark:text-white tracking-tight mb-1">
                                                    Adjust Duration
                                                </DialogTitle>
                                                <div className="mb-6 text-gray-500 dark:text-gray-400">
                                                    <p className="text-xs">Modify time for all students.</p>
                                                </div>

                                                <div className="w-full relative mb-6 group">
                                                    <div className="relative flex items-center justify-center">
                                                        <button
                                                            onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <MinusIcon className="w-5 h-5" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="60"
                                                            value={adjustAmount}
                                                            onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 0))}
                                                            className="w-24 text-center text-3xl font-black border-none bg-transparent focus:ring-0 outline-none dark:text-white mx-2"
                                                            placeholder="5"
                                                        />
                                                        <button
                                                            onClick={() => setAdjustAmount(adjustAmount + 1)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <PlusIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                                        Minutes
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 w-full">
                                                    <button
                                                        onClick={() => {
                                                            handleTimeAdjustment(adjustAmount);
                                                            setTimeAdjustModalOpen(false);
                                                        }}
                                                        disabled={isTimeAdjusting || adjustAmount <= 0}
                                                        className="group flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all active:scale-95"
                                                    >
                                                        <span className="font-bold text-green-700 dark:text-green-400 text-sm">Add Time</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            handleTimeAdjustment(-adjustAmount);
                                                            setTimeAdjustModalOpen(false);
                                                        }}
                                                        disabled={isTimeAdjusting || adjustAmount <= 0}
                                                        className="group flex flex-col items-center justify-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
                                                    >
                                                        <span className="font-bold text-red-700 dark:text-red-400 text-sm">Remove Time</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-5">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-lg bg-white dark:bg-gray-800 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:w-auto"
                                            onClick={() => setTimeAdjustModalOpen(false)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttonText={alertConfig.buttonText}
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <ClipboardDocumentListIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Manage Quiz: <span className="text-indigo-600">{quiz.title}</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        CONFIGURE AND MONITOR YOUR EXAM IN REAL-TIME
                    </p>
                </div>

            </div>

            {/* 
            * TAB SWITCHER:
            * This changes what the teacher sees on their screen.
            * 'overview' = General info * 'questions' = The exam editor
            * 'live' = The real-time dashboard 
            */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                {['overview', 'questions', 'live'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === tab
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* 1. OVERVIEW: The basic facts about the quiz (Room code, time, points). */}
                {activeTab === 'overview' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 w-full">
                        <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            Quiz Information
                        </h2>
                        {/* ... Stats Grid ... */}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Room Code</span>
                                <span className="font-mono text-2xl font-black text-indigo-600 tracking-wider block">{quiz.room_code}</span>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${quiz.status === 'started' ? 'bg-indigo-100 text-indigo-800' :
                                    quiz.status === 'active' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {quiz.status}
                                </span>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Duration</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white block">{quiz.duration_minutes} mins</span>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Total Points</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white block">{quiz.total_points}</span>
                            </div>
                        </div>

                        {quiz.status === 'draft' && (
                            <div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl text-orange-700 dark:text-orange-300 text-sm font-medium">
                                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                                <p>Quiz is currently a draft. Click <b>Activate</b> to allow students to join the Waiting Room.</p>
                            </div>
                        )}

                        {quiz.status === 'active' && (
                            <div className="mt-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm font-medium">
                                <CheckBadgeIcon className="h-5 w-5 flex-shrink-0" />
                                <p>Quiz is <b>Active</b>. Students can now enter their ID and wait for you to start the exam.</p>
                            </div>
                        )}

                        {/* NEW: Settings Section */}
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quiz Settings</h3>
                            <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Show Detailed Results to Students</h3>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">If disabled, students will only see their total score.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={quiz.show_detailed_results !== false}
                                        onChange={toggleFeedbackVisibility}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. QUESTIONS: The list of questions the teacher has created. */}

                {activeTab === 'questions' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-4xl mx-auto w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium flex items-center">
                                <DocumentTextIcon className="h-5 w-5 mr-2" />
                                Questions ({quiz.questions?.length || 0})
                            </h2>
                            {/* ... Add button and list ... */}
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                <PlusIcon className="h-4 w-4 mr-2" />
                                Add Question
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {quiz.questions && quiz.questions.length > 0 ? (
                                quiz.questions.map((q, index) => (
                                    <div
                                        key={q.id}
                                        onClick={() => toggleQuestion(q.id)}
                                        className={`border rounded-xl p-3 transition-all cursor-pointer ${expandedQuestions.has(q.id)
                                            ? 'border-indigo-200 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-800 hover:bg-gray-50/50 dark:hover:bg-gray-700/30'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">Q{index + 1}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{q.question_type.replace('_', ' ')}</span>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">{q.points} PTS</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => handleUpdateClick(e, q)}
                                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-indigo-600 transition-all active:scale-95"
                                                    title="Edit Question"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, q)}
                                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500 transition-all active:scale-95"
                                                    title="Delete Question"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-900 dark:text-gray-100 font-bold leading-tight line-clamp-2">{q.question_text}</p>

                                        {/* Expanded Answers View */}
                                        {expandedQuestions.has(q.id) && (
                                            <div className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-3">
                                                {q.options && q.options.length > 0 ? (
                                                    q.options.map((opt) => (
                                                        <div
                                                            key={opt.id}
                                                            className={`p-2 rounded-lg text-xs border flex items-center justify-between ${opt.is_correct
                                                                ? 'bg-green-50/50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                                                                : 'bg-white dark:bg-gray-800 border-gray-50 dark:border-gray-700 text-gray-500'
                                                                }`}
                                                        >
                                                            <span className="font-medium">{opt.option_text}</span>
                                                            {opt.is_correct && (
                                                                <span className="text-[9px] font-black bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                    Correct
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-xs text-gray-400 italic py-1">
                                                        {q.question_type === 'short_answer'
                                                            ? 'Short Answer Question - Manual Grading required'
                                                            : 'No options defined'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-2 flex justify-end">
                                            <span className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                                {expandedQuestions.has(q.id) ? 'Collapse' : 'View Answers'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                    <DocumentTextIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No questions added yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. LIVE: The Monitoring Board (The Heart of the system!) */}
                {activeTab === 'live' && (
                    <div className="space-y-8">
                        {/* Live Header Controls */}

                        {/* Stats Widgets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    label: 'Total Joined',
                                    val: statsOverview.total,
                                    icon: UsersIcon,
                                    color: 'text-indigo-600',
                                    bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
                                    border: 'border-indigo-100 dark:border-indigo-800'
                                },
                                {
                                    label: 'Live Now',
                                    val: statsOverview.inProgress,
                                    icon: BoltIcon,
                                    color: 'text-orange-500',
                                    bg: 'bg-orange-50/50 dark:bg-orange-900/10',
                                    border: 'border-orange-100 dark:border-orange-800'
                                },
                                {
                                    label: 'Finished',
                                    val: statsOverview.finished,
                                    icon: CheckBadgeIcon,
                                    color: 'text-green-500',
                                    bg: 'bg-green-50/50 dark:bg-green-900/10',
                                    border: 'border-green-100 dark:border-green-800'
                                },
                                {
                                    label: 'Avg Accuracy',
                                    val: `${statsOverview.avgAccuracy}%`,
                                    icon: ChartBarIcon,
                                    color: 'text-blue-500',
                                    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
                                    border: 'border-blue-100 dark:border-blue-800'
                                },
                            ].map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md ${s.bg} ${s.border}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
                                            <h3 className={`text-3xl font-black ${s.color}`}>{s.val}</h3>
                                        </div>
                                        <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm ${s.color}`}>
                                            <s.icon className="h-6 w-6" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Search & Filter */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                            <div className="relative group w-full max-w-md">
                                <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search student name or ID..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center space-x-2 w-full md:w-auto">
                                <FunnelIcon className="h-5 w-5 text-gray-400" />
                                <select
                                    className="flex-1 md:w-48 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="waiting">Waiting</option>
                                    <option value="started">Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="finished">Finished</option>
                                </select>
                            </div>
                        </div>

                        {/* Live Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/20 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                                    <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                                        Live Performance Feed
                                    </h2>
                                </div>

                                {/* Redesigned Control Toolbar */}
                                <div className="flex items-center gap-4">
                                    {/* Timer Display */}
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm">
                                        <ClockIcon className={`h-5 w-5 ${quiz.status === 'started' ? 'text-indigo-600 animate-pulse' : 'text-gray-400'}`} />
                                        <div className="font-mono text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                                            {quiz.status === 'started' ? (
                                                <>
                                                    <span>{Math.floor(remainingTime / 60).toString().padStart(2, '0')}</span>
                                                    <span className="mx-1 opacity-50">:</span>
                                                    <span>{(remainingTime % 60).toString().padStart(2, '0')}</span>
                                                </>
                                            ) : (
                                                <span className={`text-sm font-sans uppercase tracking-widest font-bold ${quiz.status === 'finished' ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {quiz.status === 'finished' ? 'Period Finished' : quiz.status}
                                                </span>
                                            )}
                                        </div>

                                        {/* Time Controls */}
                                        {quiz.status === 'started' && (
                                            <div className="flex items-center gap-1 pl-3 border-l border-gray-200 dark:border-gray-700 ml-1">
                                                <button
                                                    onClick={() => setTimeAdjustModalOpen(true)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-bold px-2"
                                                    title="Adjust Time"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Adjust</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {quiz.status === 'draft' && (
                                            <button
                                                onClick={() => updateStatus('active')}
                                                disabled={!quiz.questions?.length}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-emerald-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                            >
                                                <CheckBadgeIcon className="h-5 w-5" />
                                                Activate Quiz
                                            </button>
                                        )}

                                        {quiz.status === 'active' && (
                                            <button
                                                onClick={() => updateStatus('started')}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 animate-bounce-subtle"
                                            >
                                                <PlayIcon className="h-5 w-5" />
                                                Start Exam
                                            </button>
                                        )}

                                        {quiz.status === 'started' && (
                                            <button
                                                onClick={() => updateStatus('finished')}
                                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                                            >
                                                <NoSymbolIcon className="h-5 w-5" />
                                                Finish Exam
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                            <th className="pl-10 pr-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">Student</th>
                                            <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">Status</th>
                                            <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Answers</th>
                                            <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Score %</th>
                                            <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">Progress Performance</th>
                                            <th className="px-10 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {filteredStats.map((stat) => (
                                            <tr key={stat.result_id} className={`group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${stat.status_label === 'Blocked' ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="pl-10 pr-6 py-5">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{stat.name}</div>
                                                            <div className="text-xs text-gray-400 font-medium">{stat.student_display_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className={`inline-flex items-center text-xs font-bold uppercase tracking-wider ${stat.status_label === 'Finished'
                                                        ? 'text-emerald-600'
                                                        : stat.status_label === 'In Progress'
                                                            ? 'text-blue-600'
                                                            : stat.status_label === 'Paused'
                                                                ? 'text-amber-600'
                                                                : 'text-gray-500'
                                                        }`}>
                                                        {stat.status_label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-4">
                                                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm" title="Correct">
                                                            <CheckBadgeIcon className="w-4 h-4" />
                                                            {stat.correct_count}
                                                        </span>
                                                        {stat.pending_count > 0 && (
                                                            <span className="flex items-center gap-1 text-amber-500 font-bold text-sm" title="Pending Grading">
                                                                <QuestionMarkCircleIcon className="w-4 h-4" />
                                                                {stat.pending_count}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-red-600 font-bold text-sm" title="Incorrect">
                                                            <span className="w-4 h-4 flex items-center justify-center font-black text-xs">×</span>
                                                            {stat.wrong_count}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`text-lg font-bold ${stat.percentage >= 80 ? 'text-emerald-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                                        {Math.round(stat.percentage)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="w-full max-w-[140px]">
                                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                                                            <span>Progress</span>
                                                            <span className={stat.answered_count === quiz.questions_count ? 'text-emerald-500' : ''}>
                                                                {stat.answered_count}/{quiz.questions_count}
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                style={{ width: `${(stat.answered_count / quiz.questions_count) * 100}%` }}
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${stat.answered_count === quiz.questions_count ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {(stat.status_label === 'In Progress' || stat.status_label === 'Started') && (
                                                            <button
                                                                onClick={() => handleStudentControl(stat.result_id, 'pause')}
                                                                disabled={processingAction === stat.result_id}
                                                                className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-all"
                                                                title="Pause Student"
                                                            >
                                                                <PauseIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {stat.status_label === 'Paused' && (
                                                            <button
                                                                onClick={() => handleStudentControl(stat.result_id, 'resume')}
                                                                disabled={processingAction === stat.result_id}
                                                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all"
                                                                title="Resume Student"
                                                            >
                                                                <PlayIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {stat.status_label !== 'Finished' && stat.status_label !== 'Blocked' && (
                                                            <button
                                                                onClick={() => handleStudentControl(stat.result_id, 'block')}
                                                                disabled={processingAction === stat.result_id}
                                                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                                                                title="Block Student"
                                                            >
                                                                <NoSymbolIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStats.length === 0 && (
                                            <tr>
                                                <td colSpan="10" className="px-10 py-20 text-center text-gray-400 font-black uppercase tracking-widest italic opacity-50">
                                                    No matching performance data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); }}
                onConfirm={confirmDelete}
                title="Delete Question?"
                message={`Are you sure you want to delete this question? This action cannot be undone.`}
                isDangerous={true}
            />

            {/* Update Question Modal */}
            <UpdateQuestionModal
                isOpen={updateModalOpen}
                onClose={() => { setUpdateModalOpen(false); }}
                onSave={saveUpdate}
                questionData={selectedQuestion}
                setQuestionData={setSelectedQuestion}
                loading={actionLoading}
            />

            {/* Student Control Confirmation Modal */}
            <ConfirmationModal
                isOpen={studentControlModal.isOpen}
                onClose={() => setStudentControlModal({ isOpen: false, resultId: null, action: null })}
                onConfirm={() => executeStudentControl(studentControlModal.resultId, studentControlModal.action)}
                title="Block Student?"
                message="Are you sure you want to block this student? They will not be able to continue this exam."
                confirmText="Block Student"
                isDangerous={true}
            />

            {/* Add Question Modal */}
            <AddQuestionModal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                onAdd={handleAddQuestion}
                newQuestion={newQuestion}
                setNewQuestion={setNewQuestion}
                addingQuestion={addingQuestion}
                handleTypeChange={handleTypeChange}
                updateNewQuestionOption={updateNewQuestionOption}
                addOption={addOptionToNew}
                removeOption={removeOptionFromNew}
            />
        </div>
    );
};


export default QuizManage;

