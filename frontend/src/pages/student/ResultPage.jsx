import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CheckCircleIcon,
    HomeIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';
import { studentAPI } from '../../services/api';

const ResultPage = () => {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const response = await studentAPI.getResult(resultId);
                setResult(response.data.data);
            } catch (error) {
                console.error('Error fetching result:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [resultId]);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Results...</div>;

    if (!result) return <div className="text-center mt-20">Result not found.</div>;



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden"
                >
                    <div className="px-4 py-5 sm:p-6 text-center">
                        <div className={`mx-auto flex items-center justify-center h-24 w-24 rounded-full mb-6 ${result.is_blocked ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                            {result.is_blocked ? (
                                <NoSymbolIcon className="h-16 w-16 text-red-600 dark:text-red-400" />
                            ) : (
                                <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
                            )}
                        </div>

                        <h1 className={`text-3xl font-black tracking-tight ${result.is_blocked ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                            {result.is_blocked ? 'Access revoked' : 'Exam submitted!'}
                        </h1>
                        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                            {result.is_blocked
                                ? 'Your access to this exam was revoked by an administrator.'
                                : 'Your answers have been recorded successfully.'}
                        </p>

                        {result.has_manual_grading && (
                            <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 text-left">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                            <span className="font-bold">Attention:</span> Some questions are pending manual grading by your teacher. Your current score reflects only automatically graded questions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <div className="bg-gray-50 dark:bg-gray-700 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Score</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                                    {(Number(result.score) || 0).toFixed(2)} / {(Number(result.total_points) || 0).toFixed(2)}
                                    {result.pending_count > 0 && (
                                        <span className="block text-sm font-normal text-yellow-600 dark:text-yellow-400 mt-1">
                                            ({result.pending_count} questions pending grading)
                                        </span>
                                    )}
                                </dd>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Correct answers</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                                    {result.correct_answers} / {result.total_questions}
                                    {result.pending_count > 0 && (
                                        <span className="block text-sm font-normal text-yellow-600 dark:text-yellow-400 mt-1">
                                            (+{result.pending_count} pending review)
                                        </span>
                                    )}
                                </dd>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">Status</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white capitalize">
                                    {result.status.replace('_', ' ')}
                                </dd>
                            </div>
                        </div>

                        <div className="mt-10">
                            <Link
                                to="/"
                                className="btn btn-primary inline-flex items-center"
                            >
                                <HomeIcon className="h-5 w-5 mr-2" />
                                Return to home
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* --- DETAILED FEEDBACK SECTION --- */}
                {result.show_detailed_results !== false ? (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white px-1 flex items-center gap-2">
                            <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                            Question-by-Question Breakdown
                        </h2>

                        {result.answers && result.answers.length > 0 ? (
                            result.answers.map((ans, idx) => {
                                const isShortAnswer = ans.question?.type === 'short-answer';
                                const isPending = isShortAnswer && !ans.is_correct; // Treat incorrect short answers as pending

                                return (
                                    <motion.div
                                        key={ans._id || idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`bg-white dark:bg-gray-800 shadow rounded-xl p-6 border-l-4 ${ans.is_correct
                                                ? 'border-green-500'
                                                : isPending ? 'border-yellow-500' : 'border-red-500'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded mr-2">Q{idx + 1}</span>

                                                {/* BADGE: CORRECT / INCORRECT / PENDING */}
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${ans.is_correct
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                        : isPending
                                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {ans.is_correct ? 'Correct' : isPending ? 'Pending Grading' : 'Incorrect'}
                                                </span>

                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2 leading-tight">
                                                    {ans.question?.questionText || "Question text unavailable"}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{ans.points_awarded} / {ans.question?.points || 0} PTS</span>
                                            </div>
                                        </div>

                                        {/* Options (if multiple choice) */}
                                        {ans.question?.options && ans.question.options.length > 0 && (
                                            <div className="mt-5">
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] block mb-3 pl-1">Question Options</span>
                                                <div className="flex flex-col gap-2.5">
                                                    {ans.question.options.map((opt, index) => {
                                                        const isStudentChoice = ans.student_answer && String(ans.student_answer).split(',').includes(String(opt._id));
                                                        const isCorrectChoice = opt.isCorrect;

                                                        let bgColor = 'bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800';

                                                        if (isStudentChoice) {
                                                            if (isCorrectChoice) {
                                                                bgColor = 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500/50 ring-1 ring-green-500/20 shadow-sm';
                                                            } else {
                                                                bgColor = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500/50 ring-1 ring-red-500/20 shadow-sm';
                                                            }
                                                        } else if (isCorrectChoice) {
                                                            // Highlight correct answer if they missed it
                                                            bgColor = 'bg-green-50/20 dark:bg-green-900/10 text-green-600/60 dark:text-green-500/60 border-green-200/50 border-dashed';
                                                        }

                                                        return (
                                                            <div
                                                                key={opt._id}
                                                                className={`p-3.5 rounded-xl border text-sm flex items-center justify-between transition-all relative ${bgColor}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${isStudentChoice ? 'bg-white dark:bg-gray-800 border-current' : 'bg-transparent border-gray-200 dark:border-gray-700'}`}>
                                                                        {String.fromCharCode(65 + index)}
                                                                    </span>
                                                                    <span className="font-semibold">{opt.text}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isStudentChoice && (
                                                                        <span className="text-[9px] font-black uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full shadow-sm">
                                                                            Your Choice
                                                                        </span>
                                                                    )}
                                                                    {isCorrectChoice && (
                                                                        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Short Answer Display */}
                                        {ans.question?.type === 'short-answer' && (
                                            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                                                <div className="mb-3">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Your Answer</span>
                                                    <p className="text-gray-900 dark:text-white font-bold">{ans.student_answer || "(No Answer Provided)"}</p>
                                                </div>
                                                {/* Hide correct answer if it's pending (short answer not yet marked correct) */}
                                                {!ans.is_correct && !isPending && ans.question?.correctAnswer && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest block mb-1">Correct Answer</span>
                                                        <p className="text-green-700 dark:text-green-400 font-bold">{ans.question.correctAnswer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 italic">No answer details available.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-8 bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-white dark:bg-gray-800 shadow-sm mb-4">
                            <NoSymbolIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detailed feedback hidden</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                            The instructor has chosen to hide the question-by-question breakdown for this exam. You can only see your final score.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultPage;
