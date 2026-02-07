import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import AlertModal from '../../components/AlertModal';
import {
    ChevronLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';





const StudentGradingView = () => {
    const { resultId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [grading, setGrading] = useState({}); // { questionId: score }
    const [saving, setSaving] = useState({}); // { questionId: boolean }




    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'error'
    });

    const loadResult = React.useCallback(async () => {
        try {
            const response = await teacherAPI.getStudentResult(resultId);
            setData(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error loading result", error);
            setLoading(false);
        }
    }, [resultId]);

    useEffect(() => {
        loadResult();
    }, [loadResult]);

    const handleScoreChange = (questionId, val) => {
        setGrading({ ...grading, [questionId]: val });
    };

    const showAlert = (title, message, type = 'error') => {
        setModal({
            isOpen: true,
            title,
            message,
            type
        });
    };

    const saveGrade = async (questionId) => {
        if (grading[questionId] === undefined) return;

        // Find the question to check max_points
        const question = answers.find(a => a.question_id === questionId);
        const score = parseFloat(grading[questionId]);

        if (score > question.max_points) {
            showAlert("Invalid Score", `The score (${score}) cannot exceed the maximum points allowed for this question (${question.max_points}).`);
            return;
        }

        setSaving({ ...saving, [questionId]: true });
        try {
            await teacherAPI.gradeAnswer(resultId, {
                question_id: questionId,
                points: score
            });

            // Refresh local data for this question (or whole result to update total)
            await loadResult();
            setSaving({ ...saving, [questionId]: false });

            showAlert("Success", "Graded successfully", "success");


        } catch (error) {
            console.error("Error saving grade", error);
            const errorMsg = error.response?.data?.message || "Failed to save grade";
            setSaving({ ...saving, [questionId]: false });
            showAlert("Grading Error", errorMsg);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>Result not found</div>;

    const { result, student, answers } = data;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 min-h-screen pb-20">
            {/* Header */}
            {/* Header: Theme-Responsive Banner Style */}
            <div className="-mx-6 mb-6">
                <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm dark:shadow-lg mx-6 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-colors duration-200 border border-gray-100 dark:border-slate-800">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-600/10 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none transition-colors"></div>

                    <div className="relative space-y-4">
                        <button
                            onClick={() => window.history.back()}
                            className="group inline-flex items-center justify-center h-10 w-10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all duration-300 mb-6 shadow-sm hover:shadow-md active:scale-95"
                            title="Back"
                        >
                            <ChevronLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                        </button>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                        <UserCircleIcon className="h-10 w-10 text-indigo-500" />
                                    </div>
                                    {student.name}
                                </h1>
                                {Boolean(result.is_blocked) && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 text-[10px] font-bold uppercase tracking-wider rounded border border-red-200 dark:border-red-500/30">
                                        Blocked
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-300">
                                <span className="uppercase tracking-wide text-xs font-bold">{result.status}</span>
                                <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                                <span className="text-xs uppercase tracking-wide opacity-80">
                                    Submitted {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-4 min-w-[160px] text-center transition-colors">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-indigo-300 uppercase tracking-widest mb-1">Total Score</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-black text-indigo-600 dark:text-white tracking-tighter leading-none transition-colors">{result.score || 0}</span>
                                <span className="text-sm font-bold text-slate-400">/ {result.total_points}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {answers.map((ans, idx) => (
                    <div key={ans.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex-1 tracking-tight leading-snug">
                                <span className="text-slate-400 dark:text-slate-500 mr-3 text-sm">#{idx + 1}</span>
                                {ans.question_text}
                            </h3>
                            <div className="flex items-center ml-6">
                                <div className="flex items-baseline space-x-1 mr-4">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{ans.points_awarded}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">/ {ans.max_points} pts</span>
                                </div>
                                {ans.correct_answer_text === 'MANUAL_GRADING' ? (
                                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[10px] font-bold uppercase tracking-tight rounded border border-orange-200 dark:border-orange-500/20">Manual</span>
                                ) : ans.is_correct ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-tight rounded border border-emerald-200 dark:border-emerald-500/20">Correct</span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-tight rounded border border-red-200 dark:border-red-500/20">Incorrect</span>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Student answer</p>

                            {((ans.question_type === 'multiple-choice' || ans.question_type === 'multiple_choice' || ans.question_type === 'true-false' || ans.question_type === 'true_false' || ans.question_type === 'multiple_selection' || ans.question_type === 'multiple-selection')) && ans.options ? (
                                <div className="space-y-2">
                                    {(() => {
                                        let options = [];
                                        try {
                                            options = typeof ans.options === 'string' ? JSON.parse(ans.options) : ans.options;
                                        } catch (e) { options = []; }

                                        if (!Array.isArray(options)) options = [];

                                        return options.map((opt, i) => {
                                            // Robustly get text
                                            const optText = typeof opt === 'object' ? (opt.option_text || opt.text || opt.label || opt.value || JSON.stringify(opt)) : String(opt);

                                            // Normalize values for comparison (handle 1 vs True)
                                            const normalize = (val) => {
                                                if (String(val) === '1') return 'true';
                                                if (String(val) === '0') return 'false';
                                                return String(val).trim().toLowerCase();
                                            }

                                            const normOpt = normalize(optText);
                                            const normStudent = normalize(ans.student_answer);
                                            const normCorrect = normalize(ans.correct_answer_text);

                                            let isSelected = normOpt === normStudent;

                                            // 3. Fallback: Check if student_answer matches the Option ID
                                            if (!isSelected && typeof opt === 'object') {
                                                const optId = opt.id || opt._id;
                                                if (optId && String(optId) === String(ans.student_answer)) {
                                                    isSelected = true;
                                                }
                                            }

                                            // Check isCorrect from object (snake_case or camelCase) OR fallback to text match
                                            let isOptionCorrect = false;
                                            if (typeof opt === 'object') {
                                                isOptionCorrect = opt.is_correct || opt.isCorrect || false;
                                            } else {
                                                isOptionCorrect = normOpt === normCorrect;
                                            }

                                            // If the question type is basic true/false and options are just text, fallback to text match against correct_answer_text
                                            if (!isOptionCorrect && normOpt === normCorrect) {
                                                isOptionCorrect = true;
                                            }

                                            let borderClass = 'border-gray-200 dark:border-gray-600';
                                            let bgClass = 'bg-white dark:bg-gray-800';
                                            let textClass = 'text-gray-600 dark:text-gray-300';
                                            let statusLabel = null;

                                            if (isSelected) {
                                                if (ans.is_correct) {
                                                    bgClass = 'bg-emerald-50 dark:bg-emerald-900/20';
                                                    borderClass = 'border-emerald-200 dark:border-emerald-500';
                                                    textClass = 'text-emerald-800 dark:text-emerald-300 font-bold';
                                                    statusLabel = <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-tight">Selected</span>;
                                                } else {
                                                    bgClass = 'bg-red-50 dark:bg-red-900/20';
                                                    borderClass = 'border-red-200 dark:border-red-500';
                                                    textClass = 'text-red-800 dark:text-red-300 font-bold';
                                                    statusLabel = <span className="text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-tight">Selected</span>;
                                                }
                                            } else if (isOptionCorrect && !ans.is_correct) {
                                                // Functionally correct option, highlighted if user missed it
                                                bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10';
                                                borderClass = 'border-emerald-200 dark:border-emerald-700/50 border-dashed';
                                                statusLabel = <span className="text-emerald-500 dark:text-emerald-500/70 text-[10px] font-semibold uppercase tracking-tight">Correct Choice</span>;
                                            }

                                            return (
                                                <div key={i} className={`p-3 rounded-lg border-2 flex justify-between items-center transition-all ${bgClass} ${borderClass}`}>
                                                    <span className={textClass}>{optText}</span>
                                                    {statusLabel}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            ) : (
                                <p className="text-gray-900 dark:text-white font-medium whitespace-pre-wrap">
                                    {ans.student_answer || <span className="italic text-gray-400">No answer provided</span>}
                                </p>
                            )}
                        </div>


                        {/* Grading Controls */}
                        {ans.correct_answer_text === 'MANUAL_GRADING' && (
                            <div className="border-t border-slate-100 dark:border-slate-800/50 pt-6 mt-8 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center">
                                    {ans.points_awarded !== null && ans.points_awarded !== undefined ? (
                                        <div className="flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                            <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                                            Graded & Saved
                                        </div>
                                    ) : (ans.is_correct === null || ans.is_correct === undefined) ? (
                                        <div className="flex items-center px-3 py-1 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest border border-orange-100 dark:border-orange-500/20 animate-pulse">
                                            <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-1.5" />
                                            Needs Evaluation
                                        </div>
                                    ) : (
                                        <div className="flex items-center px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                                            Graded
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex items-center gap-2 pl-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Score:</span>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max={ans.max_points}
                                                className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-center text-sm font-black text-slate-900 dark:text-white transition-all"
                                                value={grading[ans.question_id] !== undefined ? grading[ans.question_id] : (ans.points_awarded || 0)}
                                                onChange={(e) => handleScoreChange(ans.question_id, e.target.value)}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ {ans.max_points}</span>
                                    </div>

                                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                                    <button
                                        onClick={() => saveGrade(ans.question_id)}
                                        disabled={saving[ans.question_id]}
                                        className="btn-primary group relative overflow-hidden px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {saving[ans.question_id] ? 'Saving...' : 'Update Grade'}
                                        </span>
                                        {!saving[ans.question_id] && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </motion.div>

            <AlertModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default StudentGradingView;
