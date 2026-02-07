import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';
import AlertModal from '../../components/AlertModal';

const CreateQuiz = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [quizData, setQuizData] = useState({
        title: '',
        description: '',
        duration_minutes: 30,
        timer_type: 'exam', // 'exam' or 'question'
        subject_id: null,
        show_detailed_results: true,
    });
    const [questions, setQuestions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'error'
    });

    const showAlert = (title, message, type = 'error') => {
        setModal({
            isOpen: true,
            title,
            message,
            type
        });
    };

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await teacherAPI.getClasses();
                setClasses(res.data.data || []);
            } catch (err) {
                console.error('Error fetching classes:', err);
            }
        };
        fetchClasses();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsClassDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSubjects = async () => {
            if (selectedClasses.length === 0) {
                setSubjects([]);
                return;
            }
            try {
                // For now, we fetch subjects for the first selected class to keep it simple.
                // In a more complex setup, we'd fetch common subjects for all selected classes.
                const res = await teacherAPI.getClassSubjects(selectedClasses[0]);
                setSubjects(res.data.data || []);
            } catch (err) {
                console.error('Error fetching subjects:', err);
            }
        };
        fetchSubjects();
    }, [selectedClasses]);

    const addQuestion = (type) => {
        const newQuestion = {
            id: Date.now(),
            question_text: '',
            question_type: type,
            points: 1,
            // Init options
            options: (type === 'multiple_choice' || type === 'multiple_selection') ? [
                { id: 1, option_text: '', is_correct: false },
                { id: 2, option_text: '', is_correct: false },
                { id: 3, option_text: '', is_correct: false },
                { id: 4, option_text: '', is_correct: false }
            ] : type === 'true_false' ? [
                { id: 1, option_text: 'True', is_correct: true },
                { id: 2, option_text: 'False', is_correct: false }
            ] : []
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const updateOption = (qId, oId, field, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOptions = q.options.map(o =>
                    o.id === oId ? { ...o, [field]: value } : o
                );

                if (field === 'is_correct' && value === true && q.question_type !== 'multiple_selection') {
                    return {
                        ...q,
                        options: newOptions.map(o =>
                            o.id === oId ? o : { ...o, is_correct: false }
                        )
                    };
                }

                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const removeQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const addOption = (qId) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newId = q.options.length > 0 ? Math.max(...q.options.map(o => o.id)) + 1 : 1;
                return {
                    ...q,
                    options: [...q.options, { id: newId, option_text: '', is_correct: false }]
                };
            }
            return q;
        }));
    };

    const removeOption = (qId, oId) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                // Prevent removing if only 2 options left (MCQ/MSQ usually need at least 2)
                if (q.options.length <= 2) return q;
                return {
                    ...q,
                    options: q.options.filter(o => o.id !== oId)
                };
            }
            return q;
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- FRONTEND VALIDATION ---

        // 1. Basic Quiz Info
        if (!quizData.title.trim()) {
            return showAlert('Validation Error', 'Please enter a quiz title.', 'error');
        }
        if (selectedClasses.length === 0) {
            return showAlert('Validation Error', 'Please assign this quiz to at least one class.', 'error');
        }
        if (questions.length === 0) {
            return showAlert('Validation Error', 'Please add at least one question to the quiz.', 'error');
        }

        // 2. Question-Specific Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const qNum = i + 1;

            if (!q.question_text.trim()) {
                return showAlert('Validation Error', `Question #${qNum} is empty. Please enter the question text.`, 'error');
            }

            if (q.question_type !== 'short_answer') {
                const hasCorrect = q.options.some(o => o.is_correct);
                if (!hasCorrect) {
                    return showAlert('Validation Error', `Question #${qNum} ("${q.question_text.substring(0, 30)}...") missing a correct answer. Please select at least one correct option.`, 'error');
                }
            }

            // For MCQ/TF/MSQ, ensure all option texts are filled
            if (q.question_type === 'multiple_choice' || q.question_type === 'true_false' || q.question_type === 'multiple_selection') {
                const hasEmptyOption = q.options.some(o => !o.option_text.trim());
                if (hasEmptyOption) {
                    return showAlert('Validation Error', `Question #${qNum} has one or more empty options. Please fill in all option fields.`, 'error');
                }
            }
        }

        setLoading(true);

        try {
            // 1. Create Quiz
            const quizRes = await teacherAPI.createQuiz({
                ...quizData,
                class_ids: selectedClasses
            });
            const quizId = quizRes.data.data.id;

            // 2. Associate Classes
            if (selectedClasses.length > 0) {
                await teacherAPI.setQuizClasses(quizId, selectedClasses);
            }

            // 3. Add Questions
            for (const q of questions) {
                // Determine correct answer string for DB
                let correctAnswer = '';
                if (q.question_type === 'short_answer') {
                    // Start answer logic if needed? 
                    // For now, maybe short answer doesn't have auto-grading correct answer required in UI?
                    // DB `correct_answer` is NOT NULL. So we need it.
                    // For short answer, maybe we add a field for it?
                    // The UI above didn't show "Correct Answer" input for Short Answer.
                    // Let's assume manual grading, so we can put "MANUAL" or ask user.
                    // Let's add a "Model Answer" logic if we want, or just empty string?
                    correctAnswer = 'MANUAL_GRADING';
                } else if (q.question_type === 'multiple_selection') {
                    const correctOpts = q.options.filter(o => o.is_correct);
                    correctAnswer = correctOpts.map(o => o.id).sort().join(',');
                } else {
                    const correctOpt = q.options.find(o => o.is_correct);
                    correctAnswer = correctOpt ? correctOpt.id : '';
                }

                await teacherAPI.addQuestion(quizId, {
                    question_text: q.question_text,
                    question_type: q.question_type,
                    points: q.points,
                    options: q.options,
                    correct_answer: correctAnswer
                });
            }

            navigate(`/teacher/quiz/${quizId}`);
        } catch (error) {
            console.error('Error creating quiz:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            showAlert('Creation Error', 'Failed to create quiz: ' + errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <DocumentPlusIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Create New Quiz</h1>
                    </div>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        DESIGN AND PUBLISH YOUR ASSESSMENT
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Quiz Details */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quiz Details</h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                            <input
                                type="text"
                                required
                                className="input mt-1"
                                value={quizData.title}
                                onChange={e => setQuizData({ ...quizData, title: e.target.value })}
                                placeholder="e.g. Final Exam"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                className="mt-1 block w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border dark:text-white dark:placeholder-gray-400"
                                rows={3}
                                value={quizData.description}
                                onChange={e => setQuizData({ ...quizData, description: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (Minutes)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="input mt-1"
                                value={quizData.duration_minutes}
                                onChange={e => setQuizData({ ...quizData, duration_minutes: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to Classes</label>
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm min-h-[40px]"
                                >
                                    <span className="block truncate text-gray-700 dark:text-gray-200 font-medium">
                                        {selectedClasses.length === 0
                                            ? 'Select Classes...'
                                            : `${selectedClasses.length} Class${selectedClasses.length > 1 ? 'es' : ''} Selected`}
                                    </span>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                        <svg className={`h-5 w-5 text-gray-400 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </button>

                                {isClassDropdownOpen && (
                                    <div className="absolute z-[100] mt-1 w-full bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-600 max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                        {!classes || classes.length === 0 ? (
                                            <div className="text-gray-500 dark:text-gray-400 text-center py-4 px-4 italic">No classes found</div>
                                        ) : (
                                            classes.map((cls) => (
                                                <div
                                                    key={cls.id}
                                                    onClick={() => {
                                                        if (selectedClasses.includes(cls.id)) {
                                                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                                                        } else {
                                                            setSelectedClasses([...selectedClasses, cls.id]);
                                                        }
                                                    }}
                                                    className={`cursor-pointer select-none relative py-2.5 pl-3 pr-9 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${selectedClasses.includes(cls.id) ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
                                                >
                                                    <div className="flex items-center">
                                                        <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectedClasses.includes(cls.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                                                            {selectedClasses.includes(cls.id) && (
                                                                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className={`ml-3 block truncate ${selectedClasses.includes(cls.id) ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'font-normal text-gray-900 dark:text-gray-200'}`}>
                                                            {cls.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Overlay to close dropdown when clicking outside */}
                            {/* Removed fixed inset-0 z-0 overlay */}
                            {/* Sub-hint for classes removed */}
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject / Course</label>
                            <select
                                className="input mt-1"
                                value={quizData.subject_id || ''}
                                onChange={e => setQuizData({ ...quizData, subject_id: e.target.value })}
                            >
                                <option value="">Select a Subject</option>
                                {subjects.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                                ))}
                            </select>
                            {selectedClasses.length === 0 && (
                                <p className="text-[10px] text-gray-400 mt-1">Select a class first to see subjects.</p>
                            )}
                        </div>

                        <div className="col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Show Detailed Results</h3>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">Display correct/wrong answers to students after submission</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={quizData.show_detailed_results}
                                        onChange={e => setQuizData({ ...quizData, show_detailed_results: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Questions ({questions.length})</h2>
                        <div className="flex space-x-2">
                            <button type="button" onClick={() => addQuestion('multiple_choice')} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50">
                                + MCQ
                            </button>
                            <button type="button" onClick={() => addQuestion('true_false')} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50">
                                + True/False
                            </button>
                            <button type="button" onClick={() => addQuestion('multiple_selection')} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50">
                                + MSQ (Multiple Selection)
                            </button>
                            <button type="button" onClick={() => addQuestion('short_answer')} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50">
                                + Short Answer
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {questions.map((q, index) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative"
                            >
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(q.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>

                                <div className="space-y-4 pr-8">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                                            Question {index + 1} • {q.question_type.replace('_', ' ')}
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm text-gray-500 dark:text-gray-400">Points:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="input w-24 px-3 py-1"
                                                value={q.points}
                                                onChange={e => updateQuestion(q.id, 'points', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <textarea
                                        required
                                        className="mt-1 block w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border dark:text-white dark:placeholder-gray-400"
                                        rows={2}
                                        placeholder="Enter question text..."
                                        value={q.question_text}
                                        onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                                    />

                                    {/* Options for MCQ */}
                                    {(q.question_type === 'multiple_choice' || q.question_type === 'multiple_selection') && (
                                        <div className="space-y-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                                            {q.question_type === 'multiple_selection' && (
                                                <p className="text-xs text-indigo-600 font-bold mb-2">Check all correct answers</p>
                                            )}
                                            {q.options.map((opt, i) => (
                                                <div key={opt.id} className="flex items-center space-x-3 group">
                                                    <input
                                                        type={q.question_type === 'multiple_selection' ? 'checkbox' : 'radio'}
                                                        name={`correct_${q.id}`}
                                                        checked={opt.is_correct}
                                                        onChange={(e) => {
                                                            const val = q.question_type === 'multiple_selection' ? e.target.checked : true;
                                                            updateOption(q.id, opt.id, 'is_correct', val);
                                                        }}
                                                        className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 ${q.question_type === 'multiple_selection' ? 'rounded' : ''}`}
                                                    />
                                                    <input
                                                        type="text"
                                                        required
                                                        className="flex-1 px-3 py-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded text-sm dark:text-white dark:placeholder-gray-400"
                                                        placeholder={`Option ${i + 1}`}
                                                        value={opt.option_text}
                                                        onChange={e => updateOption(q.id, opt.id, 'option_text', e.target.value)}
                                                    />
                                                    {q.options.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(q.id, opt.id)}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addOption(q.id)}
                                                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
                                            >
                                                <span className="mr-1">+</span> Add Option
                                            </button>
                                        </div>
                                    )}

                                    {/* Options for True/False */}
                                    {q.question_type === 'true_false' && (
                                        <div className="flex space-x-6 pl-4">
                                            {q.options.map(opt => (
                                                <label key={opt.id} className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`correct_${q.id}`}
                                                        checked={opt.is_correct}
                                                        onChange={() => updateOption(q.id, opt.id, 'is_correct', true)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">{opt.option_text}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full sm:w-auto flex justify-center py-2 px-8 border border-transparent rounded-xl shadow-lg text-sm font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        {loading ? 'Creating Quiz...' : 'Save & Publish Quiz'}
                    </button>
                </div>
            </form>

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

export default CreateQuiz;
