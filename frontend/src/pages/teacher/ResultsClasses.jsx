import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AcademicCapIcon,
    UserGroupIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';
import { Link } from 'react-router-dom';

const ResultsClasses = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await teacherAPI.getClasses();
            setClasses(res.data.data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.section.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse font-medium">Loading classes...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <PresentationChartBarIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Results & Grading</h1>
                    </div>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        SELECT A CLASS TO VIEW QUIZ RESULTS AND PERFORMANCE
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative group max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search for a class or section..."
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Class Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredClasses.length > 0 ? (
                    filteredClasses.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative bg-white dark:bg-[#1a2233] rounded-xl border border-gray-100 dark:border-slate-800/50 shadow-xl shadow-gray-100/50 dark:shadow-none overflow-hidden transition-all duration-300"
                        >
                            <Link to={`/teacher/results/class/${item.id}`} className="block h-full p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                        <AcademicCapIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold rounded-lg border border-transparent dark:border-slate-700/50">
                                        {item.academic_year}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-gray-500 dark:text-slate-500 text-base font-medium">
                                    {item.section || item.Section || 'General Section'}
                                </p>

                                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex justify-end">
                                    <div className="flex items-center text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                        <UserGroupIcon className="h-4 w-4 mr-2 opacity-70" />
                                        {(item.student_count ?? item.students?.length ?? 0)} Students
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-gray-700">
                        <UserGroupIcon className="h-20 w-20 mx-auto text-gray-200 mb-6" />
                        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest">No classes found</h3>
                        <p className="text-gray-500 font-medium">Try a different search or create a class first</p>
                    </div>
                )}
            </div >
        </div >
    );
};

export default ResultsClasses;
