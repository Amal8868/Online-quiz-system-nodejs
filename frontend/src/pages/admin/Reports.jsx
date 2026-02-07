import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
    PrinterIcon,
    XCircleIcon,
    BookOpenIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await adminAPI.getReports();
                if (res.data.success) {
                    setStats(res.data.data);
                } else {
                    setError(res.data.message || "Unknown API error");
                }
            } catch (error) {
                console.error("Failed to fetch reports", error);
                setError(error.response?.data?.message || error.message || "Network error");
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-red-600 dark:text-red-400">
                    <h3 className="font-bold flex items-center gap-2 mb-1">
                        <XCircleIcon className="h-5 w-5" />
                        Something went wrong
                    </h3>
                    <p className="text-sm opacity-90">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 text-xs font-bold uppercase tracking-wider underline"
                    >
                        Try Refreshing
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6 text-center text-gray-500">
                No report data received from server.
            </div>
        );
    }

    const { subjects_overview, usage } = stats;

    // Calculate metrics for summary cards
    const totalSubjects = subjects_overview?.length || 0;
    const activeClasses = usage?.filter(c => c.quiz_count > 0).length || 0;
    const avgGlobalScore = subjects_overview?.length > 0
        ? Math.round(subjects_overview.reduce((acc, s) => acc + (s.avg_score || 0), 0) / subjects_overview.length)
        : 0;
    const highIntensityClasses = usage?.filter(c => c.quiz_count >= 5).length || 0;

    const sortedSubjects = [...(subjects_overview || [])].sort((a, b) => {
        if (a.quiz_count === 0 && b.quiz_count > 0) return -1;
        if (a.quiz_count > 0 && b.quiz_count === 0) return 1;
        return a.name.localeCompare(b.name);
    });

    const getEngagementScore = (quizCount) => {
        if (quizCount === 0) return 0;
        if (quizCount < 2) return 1;
        if (quizCount < 5) return 2;
        if (quizCount < 10) return 3;
        return 4;
    };

    const sortedClasses = [...(usage || [])].sort((a, b) => {
        const scoreA = getEngagementScore(a.quiz_count);
        const scoreB = getEngagementScore(b.quiz_count);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="space-y-10 p-4 sm:p-8 print:p-0 max-w-7xl mx-auto dark:text-gray-200">
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">System Insights</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-2xl">
                        Monitor academic progress and system engagement across your organization.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                    >
                        <PrinterIcon className="mr-2 h-5 w-5 text-indigo-500" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* --- SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Subjects</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{totalSubjects}</span>
                        <span className="text-xs font-bold text-gray-400">Courses</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Active Classes</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{activeClasses}</span>
                        <span className="text-xs font-bold text-gray-400">Classes Engaged</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">High Intensity</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{highIntensityClasses}</span>
                        <span className="text-xs font-bold text-gray-400">Classes Weekly</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Global Performance</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-500">{avgGlobalScore}%</span>
                        <span className="text-xs font-bold text-gray-400">Average</span>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center border-b pb-8 mb-10">
                <h1 className="text-3xl font-black text-gray-900">QuizMaster Academic Report</h1>
                <p className="text-gray-500 font-medium">Generated: {new Date().toLocaleDateString()}</p>
            </div>

            {/* --- SECTION: SUBJECTS / COURSES OVERVIEW --- */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="p-2 bg-indigo-500 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-none">
                        <BookOpenIcon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Academic Performance</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                                    <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Subject</th>
                                    <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Code</th>
                                    <th scope="col" className="px-8 py-5 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Usage</th>
                                    <th scope="col" className="px-8 py-5 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Performance</th>
                                    <th scope="col" className="px-8 py-5 text-right text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Insight</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {sortedSubjects.map((subject) => (
                                    <tr key={subject.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group">
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-base">
                                                {subject.name}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-gray-500 dark:text-gray-400 font-mono">
                                            {subject.code}
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-gray-900 dark:text-white">{subject.quiz_count}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Quizzes</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            {subject.quiz_count > 0 ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className={`text-lg font-black ${subject.avg_score < 50 ? 'text-rose-500' :
                                                        subject.avg_score < 75 ? 'text-amber-500' :
                                                            'text-emerald-500'
                                                        }`}>
                                                        {subject.avg_score}%
                                                    </span>
                                                    <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden border border-gray-200/50 dark:border-gray-600">
                                                        <div
                                                            className={`h-full opacity-80 ${subject.avg_score < 50 ? 'bg-rose-500' :
                                                                subject.avg_score < 75 ? 'bg-amber-500' :
                                                                    'bg-emerald-500'
                                                                }`}
                                                            style={{ width: `${subject.avg_score}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center opacity-40">
                                                    <span className="text-gray-400 text-xs font-bold italic">No data recorded</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-right">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${subject.quiz_count > 0
                                                ? (subject.avg_score < 50 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400')
                                                : 'bg-gray-50 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500'
                                                }`}>
                                                {subject.quiz_count > 0
                                                    ? (subject.avg_score < 50 ? 'Needs Support' : 'Progressing')
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* --- SECTION: TOP ACTIVE CLASSES --- */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="p-2 bg-emerald-500 rounded-lg shadow-sm shadow-emerald-200 dark:shadow-none">
                        <AcademicCapIcon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Active Learning Groups</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                                    <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Class Identity</th>
                                    <th scope="col" className="px-8 py-5 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Size</th>
                                    <th scope="col" className="px-8 py-5 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Activity</th>
                                    <th scope="col" className="px-8 py-5 text-right text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Pulse Check</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {sortedClasses.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-colors group">
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">{cls.name}</span>
                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{cls.section || 'General'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-gray-900 dark:text-white">{cls.student_count}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Students</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-gray-900 dark:text-white">{cls.quiz_count}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Quizzes</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 w-6 rounded-full ${i < getEngagementScore(cls.quiz_count)
                                                                ? (cls.quiz_count >= 10 ? 'bg-emerald-500' : cls.quiz_count >= 5 ? 'bg-indigo-500' : 'bg-amber-500')
                                                                : 'bg-gray-100 dark:bg-gray-700'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${cls.quiz_count >= 10
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : cls.quiz_count >= 5
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : cls.quiz_count >= 2
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : cls.quiz_count >= 1
                                                            ? 'text-orange-600 dark:text-orange-400'
                                                            : 'text-gray-400 dark:text-gray-500'
                                                }`}>
                                                {cls.quiz_count >= 10 ? 'High Pulse' :
                                                    cls.quiz_count >= 5 ? 'Steady Growth' :
                                                        cls.quiz_count >= 2 ? 'Occasional' :
                                                            cls.quiz_count >= 1 ? 'Forming' :
                                                                'Quiet'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Reports;
