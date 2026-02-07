import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    UserGroupIcon,
    AcademicCapIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

const ClassList = () => {
    const navigate = useNavigate();
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

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Classes...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <UserGroupIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Your Classes</h1>
                    </div>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[11px] mt-2">
                        MANAGE YOUR CLASS ROSTERS AND STUDENT GROUPS
                    </p>
                </div>
            </div>

            {/* Search and Actions Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div className="relative group max-w-md w-full">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search classes or sections..."
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

            </div>

            {/* Class Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.length > 0 ? (
                    filteredClasses.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#111827] rounded-xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-100/50 dark:shadow-none overflow-hidden group transition-all duration-300"
                        >
                            <Link to={`/teacher/classes/${item.id}`} className="block h-full p-8">
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
                                    {item.section || 'General Section'}
                                </p>

                                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex justify-end">
                                    <div className="flex items-center text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                        <UserGroupIcon className="h-4 w-4 mr-2 opacity-70" />
                                        {item.student_count || 0} Students
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border-4 border-dashed border-gray-100 dark:border-gray-700">
                        <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No classes found</h3>
                        <p className="text-gray-500 mt-1">Contact your administrator to be assigned to a class.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ClassList;
