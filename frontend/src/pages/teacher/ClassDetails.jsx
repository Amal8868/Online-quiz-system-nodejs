import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    UserIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';

const ClassDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDetails = useCallback(async () => {
        try {
            const res = await teacherAPI.getClassDetails(id);
            setClassInfo(res.data.data);
            setStudents(res.data.data.students || []);
        } catch (error) {
            console.error('Error fetching class details:', error);
            alert('Failed to load class details');
            navigate('/teacher/classes');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);


    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.user_id && s.user_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Class Details...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
                onClick={() => navigate('/teacher/classes')}
                className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Classes
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold dark:text-white">{classInfo?.name}</h1>
                        <div className="flex items-center mt-2 space-x-4">
                            <span className="text-indigo-600 font-bold uppercase text-[10px] tracking-wider px-2 py-1 bg-indigo-50 rounded">
                                {classInfo?.academic_year}
                            </span>
                            <span className="text-gray-400 font-medium text-sm">
                                {classInfo?.section || 'No Section'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="font-bold">Student List ({students.length})</h2>
                    <div className="relative w-64">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-[10px] uppercase font-bold text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4">Student ID</th>
                                <th className="px-6 py-4 text-right">Quizzes Taken</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredStudents.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-3">
                                                <UserIcon className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <span className="font-medium">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                        {s.user_id}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                            {s.quiz_count || 0} Attempts
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400 italic">
                                        No students found in this class.
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

export default ClassDetails;
