import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeftIcon,
    ClipboardDocumentCheckIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    ClockIcon,
    ChevronRightIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';

const ResultsClassQuizzes = () => {
    const { classId } = useParams();
    const [quizzes, setQuizzes] = useState([]);
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [classRes, quizzesRes] = await Promise.all([
                    teacherAPI.getClassDetails(classId),
                    teacherAPI.getQuizzesByClass(classId)
                ]);
                setClassData(classRes.data.data);
                setQuizzes(quizzesRes.data.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [classId]);

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse font-medium">Loading class quizzes...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        to="/teacher/results"
                        className="group inline-flex items-center justify-center h-10 w-10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all duration-300 mb-6 shadow-sm hover:shadow-md active:scale-95"
                        title="Back to All Classes"
                    >
                        <ChevronLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    </Link>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <PresentationChartBarIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {classData?.name} <span className="text-indigo-600">Results</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        {[classData?.section, classData?.academic_year, 'PERFORMANCE ANALYSIS'].filter(Boolean).join(' • ')}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative group max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search quizzes in this class..."
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Quizzes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz, index) => (
                        <motion.div
                            key={quiz.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-[#111827] rounded-xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-100/50 dark:shadow-none overflow-hidden group transition-all"
                        >
                            <Link to={`/teacher/results/class/${classId}/quiz/${quiz.id}`} className="block h-full p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <ClipboardDocumentCheckIcon className="h-7 w-7" />
                                    </div>
                                    <span className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 text-[11px] font-bold rounded-full border border-gray-100 dark:border-slate-700 uppercase tracking-wider">
                                        {quiz.time_limit} MINS
                                    </span>
                                </div>

                                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors line-clamp-2 mb-8">
                                    {quiz.title}
                                </h3>

                                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex flex-wrap justify-end items-center gap-x-4 gap-y-2">
                                    <div className="flex items-center text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                        <ClockIcon className="h-4 w-4 mr-1.5 opacity-70" />
                                        {quiz.question_count || 0} Questions
                                    </div>
                                    <div className="flex items-center text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                        <UserGroupIcon className="h-4 w-4 mr-1.5 opacity-70" />
                                        {quiz.submission_count || 0} Submissions
                                    </div>
                                    <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-full shadow-sm ml-1">
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border-4 border-dashed border-gray-100 dark:border-gray-700">
                        <ClipboardDocumentCheckIcon className="h-20 w-20 mx-auto text-gray-200 mb-6" />
                        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest">No quizzes found</h3>
                        <p className="text-gray-500 font-medium italic">This class hasn't taken any quizzes yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsClassQuizzes;
