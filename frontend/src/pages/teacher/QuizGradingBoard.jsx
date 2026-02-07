import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import {
    ChevronLeftIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    PresentationChartBarIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

const QuizGradingBoard = () => {
    const { classId, quizId } = useParams();
    const [results, setResults] = useState([]);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, needs_grading, submitted

    useEffect(() => {
        const loadData = async () => {
            try {
                const [resData, quizData] = await Promise.all([
                    teacherAPI.getClassQuizResults(classId, quizId),
                    teacherAPI.getQuiz(quizId)
                ]);
                setResults(resData.data.data || []);
                setQuiz(quizData.data.data);
                setLoading(false);
            } catch (error) {
                console.error("Error loading results", error);
                setLoading(false);
            }
        };
        loadData();
    }, [classId, quizId]);

    const handleExportCSV = () => {
        if (!results.length) return;

        const headers = ['Student Name', 'ID', 'Status', 'Score', 'Total Points', 'Submission Time'];
        const csvContent = [
            headers.join(','),
            ...results.map(r => {
                const status = r.needs_grading > 0 ? 'Needs Grading' : r.status;
                const score = r.score !== null ? r.score : '';
                const time = r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '';
                // Escape commas in names
                const name = `"${r.student_name}"`;
                return [name, r.student_display_id, status, score, quiz?.total_points, time].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${quiz?.title || 'Quiz'}_Results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getFilteredResults = () => {
        let filtered = results;

        // Tab Filter
        if (activeTab === 'needs_grading') {
            filtered = filtered.filter(r => r.needs_grading > 0);
        } else if (activeTab === 'submitted') {
            filtered = filtered.filter(r => r.status === 'submitted');
        }

        // Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.student_name.toLowerCase().includes(lowerTerm) ||
                r.student_display_id?.toLowerCase().includes(lowerTerm)
            );
        }

        return filtered;
    };

    const filteredResults = getFilteredResults();

    if (loading) return (
        <div className="flex justify-center items-start pt-20 h-screen bg-white dark:bg-slate-900">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
    );


    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-gray-100 font-sans transition-colors duration-200">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link
                            to={`/teacher/results/class/${classId}`}
                            className="group inline-flex items-center justify-center h-10 w-10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all duration-300 mb-6 shadow-sm hover:shadow-md active:scale-95"
                            title="Back to Class Results"
                        >
                            <ChevronLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                        </Link>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <PresentationChartBarIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Grading Board</h1>
                        </div>
                        <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                            QUIZ PERFORMANCE ANALYSIS: <span className="text-indigo-600 underline">{quiz?.title}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 hover:text-indigo-600 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 space-y-8">

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative group flex-1 max-w-md w-full">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search student name or ID..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-slate-800/50 p-1 rounded-lg border border-gray-100 dark:border-slate-700 w-fit">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-gray-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab('needs_grading')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'needs_grading' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm border border-gray-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                Needs Grading
                            </button>
                            <button
                                onClick={() => setActiveTab('submitted')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm border border-gray-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                Submitted
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                <th className="pl-10 pr-6 py-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-left">Student</th>
                                <th className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-left">ID</th>
                                <th className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Score</th>
                                <th className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                            {filteredResults.map((result) => (
                                <tr key={result.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="pl-10 pr-6 py-6">
                                        <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{result.student_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-mono text-slate-500 dark:text-white">{result.student_display_id}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {result.is_blocked ? (
                                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                Blocked
                                            </span>
                                        ) : result.needs_grading > 0 ? (
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                Needs Grading
                                            </span>
                                        ) : result.status === 'submitted' ? (
                                            <div className="flex flex-col items-center">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl mb-1">
                                                    <AcademicCapIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                    Submitted
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {new Date(result.submitted_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                In Progress
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-bold dark:text-gray-200">
                                            {result.score !== null ? result.score : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                            <span className="text-slate-400 dark:text-slate-600 text-xs ml-1 font-medium">/ {quiz?.total_points}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link
                                            to={`/teacher/results/grading/${result.id}`}
                                            className={`inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all border ${result.needs_grading > 0
                                                ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {result.needs_grading > 0 ? 'Grade' : 'View'}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredResults.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                                        No students found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </motion.div>
            </div>
        </div >
    );
};

export default QuizGradingBoard;
