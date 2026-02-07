import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowPathIcon,
    ClockIcon,
    ChevronLeftIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';

const QuizResults = () => {
    const { quizId } = useParams();
    const [liveStats, setLiveStats] = useState([]);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchMonitoring = useCallback(async () => {
        try {
            const [monRes, quizRes] = await Promise.all([
                teacherAPI.getLiveMonitoring(quizId),
                teacherAPI.getQuiz(quizId)
            ]);
            setLiveStats(monRes.data.data || []);
            setQuiz(quizRes.data.data);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Error fetching live stats:', error);
            setLoading(false);
        }
    }, [quizId]);

    useEffect(() => {
        fetchMonitoring();
        const interval = setInterval(fetchMonitoring, 5000);
        return () => clearInterval(interval);
    }, [fetchMonitoring]);

    const filteredStats = useMemo(() => {
        return liveStats.filter(stat => {
            const matchesSearch = stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                stat.student_display_id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || stat.status_label?.toLowerCase().replace(' ', '_') === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [liveStats, searchTerm, statusFilter]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse font-medium">Loading monitoring board...</p>
        </div>
    );

    if (!quiz) return <div className="text-center py-12 text-red-500 font-bold">Quiz Not Found</div>;

    const statsOverview = {
        total: liveStats.length,
        inProgress: liveStats.filter(s => s.status_label === 'In Progress' || s.status_label === 'Started').length,
        finished: liveStats.filter(s => s.status_label === 'Finished').length,
        avgAccuracy: liveStats.length > 0
            ? (liveStats.reduce((acc, s) => acc + (s.percentage || 0), 0) / liveStats.length).toFixed(1)
            : 0
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 50) return 'bg-yellow-400';
        return 'bg-red-500';
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Link to={`/teacher/quiz/${quizId}`} className="hover:underline flex items-center text-sm font-bold">
                            <ChevronLeftIcon className="h-4 w-4 mr-1" /> Back to Management
                        </Link>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Live Monitoring Board</h1>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        Quiz: <span className="text-indigo-600 underline">{quiz.title}</span> • Code: <span className="font-mono text-indigo-600 bg-indigo-50 px-2 rounded">{quiz.room_code}</span>
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
                        <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <button
                        onClick={fetchMonitoring}
                        className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <ArrowPathIcon className="h-6 w-6 text-gray-600" />
                    </button>
                </div>
            </div>


            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student name or ID..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                        className="flex-1 md:w-48 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="started">Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="finished">Finished</option>
                    </select>
                </div>
            </div>

            {/* Monitoring Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl shadow-indigo-100/20 border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-ping"></div>
                        Live Performance Feed
                        <span className="ml-4 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] font-black text-gray-500">{filteredStats.length} Students</span>
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                                <th className="pl-10 pr-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Correct/Wrong</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Score %</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress Performance</th>
                                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {filteredStats.map((stat) => (
                                <tr key={stat.result_id} className="hover:bg-gray-50/30 dark:hover:bg-gray-700/20 transition-all group">
                                    <td className="pl-10 pr-6 py-6">
                                        <div className="font-bold text-gray-900 dark:text-white mb-0.5">{stat.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono font-bold tracking-tighter uppercase">{stat.student_display_id}</div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${stat.status_label === 'Finished'
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : stat.status_label === 'In Progress'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse'
                                                : 'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                            {stat.status_label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 font-mono text-center">
                                        <span className="text-green-600 font-black">{stat.correct_count}</span>
                                        <span className="mx-2 text-gray-300">/</span>
                                        <span className="text-red-500 font-black">{stat.wrong_count}</span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`text-xl font-black ${stat.percentage >= 80 ? 'text-green-600' :
                                            stat.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>{stat.percentage}%</span>
                                    </td>
                                    <td className="px-6 py-6 min-w-[200px]">
                                        <div className="flex flex-col">
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden shadow-inner flex">
                                                <div
                                                    className={`${getProgressColor(stat.percentage)} h-full rounded-full transition-all duration-1000 ease-out shadow-lg`}
                                                    style={{ width: `${Math.min(100, (stat.answered_count / stat.total_questions) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                                                <span>{stat.answered_count} / {stat.total_questions} Questions</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right font-mono font-bold text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center justify-end">
                                            <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                                            {formatTime(stat.total_time_spent)}
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
    );
};

export default QuizResults;
