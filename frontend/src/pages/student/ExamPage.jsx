import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClockIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';
import { studentAPI } from '../../services/api';

/**
 * THE EXAM HUB (ExamPage)
 * 
 * This is the most important part for students!
 * It's like a digital exam booklet with a live timer and an "Auto-Save" feature.
 */
const ExamPage = () => {
    const navigate = useNavigate();

    // EXAM STATE: Keeping track of questions, answers, and the clock.
    const [quiz, setQuiz] = useState(null);
    const [student, setStudent] = useState(null);
    const [resultId, setResultId] = useState(null);
    const [resultNumericId, setResultNumericId] = useState(null); // Stores readable ID (e.g. 10001)
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // Stores answers locally: { questionId: { selectedOptionId, answerText } }
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [timeNotify, setTimeNotify] = useState(null); // Used to show "+5m" when teacher adds time.
    const [isPaused, setIsPaused] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    // REFS: These are like "sticky notes" the component remembers without re-rendering.
    const prevDurationRef = useRef(null);
    const syncLockRef = useRef(false);
    const targetEndTimeRef = useRef(null);

    // FINISH LINE: Submitting the exam to the server.
    const handleSubmit = useCallback(async () => {
        if (submitting || !resultId || isBlocked) return;
        setSubmitting(true);
        try {
            const response = await studentAPI.finishExam({
                result_id: resultId
            });

            if (response.data.success) {
                // Once finished, we send them to their personal Result Page.
                // Prioritize the readable numeric ID if available, otherwise fallback to ObjectId
                // The API might return it now in response.data.data.result_numeric_id
                const navId = response.data.data?.result_numeric_id || resultNumericId || resultId;

                // Uses replace: true so the user can't click "Back" to return to the exam!
                navigate(`/student/results/${navId}`, { replace: true });
            }
        } catch (error) {
            console.error('Error submitting exam:', error);
            alert('Failed to submit exam. Please try again.');
            setSubmitting(false);
        }
    }, [resultId, resultNumericId, submitting, navigate, isBlocked]);

    // MULTIPLE CHOICE SELECTOR: Handles picking one or more answers.
    const handleMSQToggle = (questionId, optionId) => {
        const currentAnswer = (answers[questionId]?.selected_option_id || "").toString();
        let selectedOptions = currentAnswer ? currentAnswer.split(',') : [];
        const optIdStr = optionId.toString();

        if (selectedOptions.includes(optIdStr)) {
            selectedOptions = selectedOptions.filter(id => id !== optIdStr);
        } else {
            selectedOptions.push(optIdStr);
        }

        const newValue = selectedOptions.sort().join(',');
        handleAnswer(questionId, newValue, 'multiple_selection');
    };

    /**
     * THE AUTO-SAVER (handleAnswer):
     * Every time a student clicks an answer, we save it to the database immediately!
     * This way, if their computer crashes or they lose internet, their progress is safe.
     */
    const handleAnswer = async (questionId, value, type) => {
        if (isPaused || isBlocked) return;
        const now = Date.now();
        const timeTaken = Math.round((now - questionStartTime) / 1000); // Track how long they spent on this question.

        const answerPayload = type === 'short_answer'
            ? { answer_text: value, question_id: questionId }
            : { selected_option_id: value, question_id: questionId };

        // 1. Update the UI immediately so it feels fast.
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerPayload
        }));

        // 2. Secretly send the answer to the server in the background.
        if (resultId) {
            try {
                let answerStr = (type === 'short_answer') ? value : value;

                await studentAPI.submitAnswer({
                    result_id: resultId,
                    question_id: questionId,
                    answer: answerStr,
                    time_taken: timeTaken
                });
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        }
    };

    // TIME FORMATTER: Converts seconds (e.g., 3600) to pretty text (e.g., 60:00).
    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // INITIALIZATION: When the student first enters the exam room.
    useEffect(() => {
        const sessionData = localStorage.getItem('student_session');
        if (!sessionData) {
            navigate('/join'); // No ID, no entry!
            return;
        }
        const parsed = JSON.parse(sessionData);
        setStudent(parsed.student);
        setQuiz(parsed.quiz);
    }, [navigate]);

    // FETCH QUESTIONS: Getting the exam paper from the server.
    useEffect(() => {
        if (!quiz || !student) return;

        const initExam = async () => {
            try {
                // 1. Tell the server: "I'm starting my exam now!"
                const startRes = await studentAPI.startExam({
                    quiz_id: quiz.id,
                    student_db_id: student.id
                });

                if (startRes.data.success) {
                    const resData = startRes.data.data;
                    setResultId(resData.result_id);
                    if (resData.result_numeric_id) {
                        setResultNumericId(resData.result_numeric_id);
                    }

                    // CHECK IF ALREADY SUBMITTED
                    if (resData.status === 'submitted' || resData.result_status === 'submitted') {
                        localStorage.removeItem('student_session');
                        navigate('/join', { replace: true });
                        return;
                    }
                }

                // 2. Download the questions.
                const qRes = await studentAPI.getExamQuestions(quiz.id);
                if (qRes.data.success) {
                    setQuestions(qRes.data.data);
                    prevDurationRef.current = quiz.time_limit;

                    /**
                     * THE PRECISION TIMER SYNC:
                     * We don't just use the computer's clock because it might be wrong.
                     * We calculate the DIFFERENCE between the server's time and our time 
                     * to find the exact moment the exam should end.
                     */
                    const totalDurationSeconds = quiz.time_limit * 60;

                    if (quiz.start_time && quiz.server_time) {
                        // Fix: Don't replace - with / for ISO strings
                        const startTime = new Date(quiz.start_time).getTime();
                        const serverTime = new Date(quiz.server_time).getTime();

                        // Offset = Server Time - My Computer Time.
                        const offset = serverTime - Date.now();
                        // End Time = Start + Duration - Offset.
                        targetEndTimeRef.current = startTime + (totalDurationSeconds * 1000) - offset;

                        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
                        setTimeLeft(remaining);

                        if (remaining <= 0) {
                            setLoading(false);
                            handleSubmit(); // If they joined too late, the exam auto-finishes!
                            return;
                        }
                    } else {
                        setTimeLeft(totalDurationSeconds);
                    }
                }

                setLoading(false);

                // Mark their status as 'in_progress' so the teacher can see they are working.
                try {
                    const resId = startRes.data.data.result_id;
                    if (resId) {
                        await studentAPI.updateResultStatus(resId, 'in-progress');
                    }
                } catch (e) { }
            } catch (error) {
                console.error('Error initializing exam:', error);
                alert('Failed to load exam. ' + (error.response?.data?.message || ''));
            }
        };

        if (loading) {
            initExam();
        }
    }, [quiz, student, loading, handleSubmit, navigate]);

    // THE TICKER: Decreases the timer every 1 second.
    useEffect(() => {
        if (loading || isPaused || isBlocked) return;

        const tick = () => {
            if (targetEndTimeRef.current) {
                const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    handleSubmit(); // Time is up! Pen down!
                }
            }
        };

        const timer = setInterval(tick, 1000);
        tick();

        return () => clearInterval(timer);
    }, [loading, isPaused, isBlocked, handleSubmit]);

    /**
     * HEARTBEAT SYNC:
     * Every 5 seconds, we "check-in" with the server to see:
     * 1. Did the teacher pause the exam?
     * 2. Did I get blocked?
     * 3. Did the teacher add more time for everyone?
     */
    useEffect(() => {
        if (loading || !quiz || !resultId) return;

        const syncTimer = async () => {
            try {
                // Check if the teacher clicked "Pause" or "Kick Student".
                const statusRes = await studentAPI.getAttemptStatus(resultId);
                if (statusRes.data.success) {
                    const statusData = statusRes.data.data;
                    setIsPaused(statusData.is_paused);
                    if (statusData.is_blocked) {
                        setIsBlocked(true);
                        localStorage.removeItem('student_session');
                        return;
                    }
                }

                // Check if the Global Quiz Settings changed (like adding time).
                const res = await studentAPI.getQuizStatus(quiz.id);
                if (res.data.success) {
                    const serverQuiz = res.data.data;

                    if (serverQuiz.status === 'finished') {
                        handleSubmit();
                        return;
                    }

                    if (serverQuiz.start_time) {
                        const totalDurationSeconds = serverQuiz.duration_minutes * 60;
                        // Fix: Don't replace - with / for ISO strings
                        const startTime = new Date(serverQuiz.start_time).getTime();
                        const serverTime = new Date(serverQuiz.server_time).getTime();

                        const offset = serverTime - Date.now();
                        targetEndTimeRef.current = startTime + (totalDurationSeconds * 1000) - offset;

                        const calculatedTimeLeft = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));

                        if (syncLockRef.current) return;

                        // DURATION BOOST: If the teacher adds 5 mins, we show a cool popup!
                        if (prevDurationRef.current !== null && serverQuiz.duration_minutes !== prevDurationRef.current) {
                            const diff = serverQuiz.duration_minutes - prevDurationRef.current;
                            setTimeNotify({
                                amount: diff > 0 ? `+${diff}` : `${diff}`,
                                type: diff > 0 ? 'increase' : 'decrease'
                            });
                            prevDurationRef.current = serverQuiz.duration_minutes;
                            syncLockRef.current = true;

                            // We wait 2 seconds before updating the numbers so the student can see the "+5m" badge.
                            setTimeout(() => {
                                const nowSync = async () => {
                                    try {
                                        const resRel = await studentAPI.getQuizStatus(quiz.id);
                                        if (resRel.data.success) {
                                            const sQ = resRel.data.data;
                                            const tDur = sQ.duration_minutes * 60;
                                            // Fix: Don't replace - with / for ISO strings
                                            const sT = new Date(sQ.start_time).getTime();
                                            const sTC = new Date(sQ.server_time).getTime();
                                            const off = sTC - Date.now();
                                            targetEndTimeRef.current = sT + (tDur * 1000) - off;
                                            setTimeLeft(Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000)));
                                        }
                                    } catch (e) { }
                                    syncLockRef.current = false;
                                    setTimeout(() => setTimeNotify(null), 2000);
                                };
                                nowSync();
                            }, 2000);

                        } else if (prevDurationRef.current === null) {
                            prevDurationRef.current = serverQuiz.duration_minutes;
                            setTimeLeft(calculatedTimeLeft);
                        } else {
                            // Subtle correction if the local clock drifts more than 5 seconds.
                            setTimeLeft(current => {
                                if (Math.abs(calculatedTimeLeft - current) > 5) {
                                    return calculatedTimeLeft;
                                }
                                return current;
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error syncing timer:', error);
            }
        };

        const syncInterval = setInterval(syncTimer, 5000);
        return () => clearInterval(syncInterval);
    }, [loading, quiz, resultId, handleSubmit]);


    if (loading) return <div className="flex justify-center items-center h-screen">Loading Exam...</div>;

    // BLOCKED SCREEN: If the teacher kicks the student from the room.
    if (isBlocked) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto bg-red-50 dark:bg-red-900/20 rounded-full mb-6">
                        <NoSymbolIcon className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Access revoked</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
                        An administrator has blocked your access to this exam due to detected irregularities.
                    </p>
                    <button
                        onClick={() => navigate('/join')}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-100 dark:shadow-none"
                    >
                        Return to lobby
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">

            {/* PAUSE OVERLAY: When the teacher stops the clock for everyone. */}
            <AnimatePresence>
                {isPaused && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm w-full border-t-4 border-red-500"
                        >
                            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-50 dark:bg-red-900/10 rounded-full mb-6">
                                <NoSymbolIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase">Exam paused</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                                Your exam has been temporarily suspended by the instructor. Please wait.
                            </p>
                            {/* Animated dot loaders */}
                            <div className="flex items-center justify-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-bounce"></span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER: Title and the ticking Clock. */}
            <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{quiz.title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    </div>

                    {/* THE CLOCK UI: Changes color to Red when time is running out! */}
                    <div className={`relative px-4 py-2 flex items-center space-x-2 text-xl font-mono font-bold transition-all duration-500 ${timeNotify?.type === 'increase'
                        ? 'text-green-600 scale-110 font-black'
                        : timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-primary-600'
                        }`}>
                        <ClockIcon className={`h-6 w-6 ${timeNotify?.type === 'increase' ? 'animate-bounce' : ''}`} />
                        <span>{formatTime(timeLeft)}</span>

                        {/* Floating Time Badge (e.g. +5m) */}
                        <AnimatePresence>
                            {timeNotify && (
                                <motion.div
                                    initial={{ opacity: 0, y: 0, x: -10, scale: 0.5 }}
                                    animate={{ opacity: 1, y: -35, x: -5, scale: 1.2 }}
                                    exit={{ opacity: 0, y: -50, scale: 1.5, filter: 'blur(5px)' }}
                                    className={`absolute left-0 font-black text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${timeNotify.type === 'increase' ? 'text-green-600' : 'text-red-600'
                                        }`}
                                >
                                    {timeNotify.amount}m
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>


            {/* THE EXAM PAPER (Question Area) */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {currentQuestion && (
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="card min-h-[400px] flex flex-col bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent dark:border-gray-700"
                    >
                        <div className="flex-1">
                            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                                {currentQuestion.question_text}
                            </h2>

                            <div className="space-y-4">
                                {/* RENDERING OPTIONS: We change the layout based on the question type (MCQ vs Short Answer). */}
                                {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false' || currentQuestion.question_type === 'mcq') && (
                                    <div className="space-y-3">
                                        {currentQuestion.options && currentQuestion.options.map((option) => (
                                            <label
                                                key={option.id || option.text}
                                                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${answers[currentQuestion.id]?.selected_option_id?.toString() === (option.id || option.text).toString()
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                    : 'border-gray-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question_${currentQuestion.id}`}
                                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    checked={answers[currentQuestion.id]?.selected_option_id?.toString() === (option.id || option.text).toString()}
                                                    onChange={() => handleAnswer(currentQuestion.id, (option.id || option.text), currentQuestion.question_type)}
                                                />
                                                <span className={`ml-3 font-medium ${answers[currentQuestion.id]?.selected_option_id?.toString() === (option.id || option.text).toString()
                                                    ? 'text-indigo-900'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                    {option.option_text || option.text}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.question_type === 'multiple_selection' && (
                                    <div className="space-y-3">
                                        <div className="text-sm text-indigo-600 font-bold mb-4 px-1 flex items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2"></div>
                                            Check all that apply
                                        </div>
                                        {currentQuestion.options && currentQuestion.options.map((option) => {
                                            const isSelected = (answers[currentQuestion.id]?.selected_option_id || "").toString().split(',').includes((option.id || option.text).toString());
                                            return (
                                                <label
                                                    key={option.id || option.text}
                                                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                        ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                        : 'border-gray-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        checked={isSelected}
                                                        onChange={() => handleMSQToggle(currentQuestion.id, (option.id || option.text))}
                                                    />
                                                    <span className={`ml-3 font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900 dark:text-white'}`}>
                                                        {option.option_text || option.text}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {currentQuestion.question_type === 'short_answer' && (
                                    <textarea
                                        rows={6}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg dark:bg-gray-700 dark:text-white placeholder:text-gray-400"
                                        placeholder="Type your answer here..."
                                        value={answers[currentQuestion.id]?.answer_text || ''}
                                        onChange={(e) => handleAnswer(currentQuestion.id, e.target.value, 'short_answer')}
                                    />
                                )}
                            </div>
                        </div>

                        {/* NAVIGATION BUTTONS */}
                        <div className="mt-8 flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                                    setQuestionStartTime(Date.now());
                                }}
                                disabled={currentQuestionIndex === 0}
                                className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeftIcon className="h-5 w-5 inline mr-1" /> Previous
                            </button>

                            {currentQuestionIndex === questions.length - 1 ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    {submitting ? 'Submitting...' : 'Submit exam'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
                                        setQuestionStartTime(Date.now());
                                    }}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Next <ChevronRightIcon className="h-5 w-5 inline ml-1" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* THE QUESTION MAP (Small numbered buttons at the bottom) */}
                <div className="mt-8 grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {questions.map((q, idx) => (
                        <button
                            key={q.id}
                            onClick={() => {
                                setCurrentQuestionIndex(idx);
                                setQuestionStartTime(Date.now());
                            }}
                            className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentQuestionIndex === idx
                                ? 'bg-indigo-600 text-white'
                                : answers[q.id]
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/50'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
                                } shadow-sm`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExamPage;
