import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ArrowUpTrayIcon,
    TableCellsIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { teacherAPI } from '../../services/api';

const GlobalImport = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n');
                const students = [];

                // Expecting headers: student_id, name, class, [section], [academic_year]
                const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

                rows.slice(1).forEach((row) => {
                    const cols = row.split(',').map(c => c.trim());
                    if (cols.length >= 3) {
                        const student = {};
                        headers.forEach((header, i) => {
                            if (header === 'student_id') student.student_id = cols[i];
                            if (header === 'name') student.name = cols[i];
                            if (header === 'class') student.class = cols[i];
                            if (header === 'section') student.section = cols[i];
                            if (header === 'academic_year') student.academic_year = cols[i];
                        });

                        if (student.student_id && student.name && student.class) {
                            students.push(student);
                        }
                    }
                });

                if (students.length === 0) {
                    throw new Error('No valid student data found. Required columns: student_id, name, class');
                }

                const res = await teacherAPI.globalImportStudents(students);
                setResult(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || err.message);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/teacher/classes')}
                className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Dashboard
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <TableCellsIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Master Student Import</h1>
                        <p className="text-gray-500 text-sm">Upload a single CSV to organize all students and classes at once.</p>
                    </div>
                </div>

                {!result ? (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                            <h3 className="text-blue-800 font-bold mb-2 flex items-center text-sm">
                                <DocumentChartBarIcon className="h-4 w-4 mr-2" />
                                Recommended CSV Format
                            </h3>
                            <code className="text-[11px] block bg-white/50 p-2 rounded font-mono text-blue-700">
                                student_id, name, class, section, academic_year<br />
                                101, John Doe, CS 101, A, 2023-24<br />
                                102, Jane Smith, Math 202, B, 2023-24
                            </code>
                            <p className="text-[10px] text-blue-600 mt-2 font-medium italic">* student_id, name, and class are required.</p>
                        </div>

                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-12 px-4 transition-colors hover:border-indigo-300">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="global-csv-upload"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="global-csv-upload"
                                className={`flex flex-col items-center cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="p-4 bg-indigo-50 rounded-full mb-4">
                                    <ArrowUpTrayIcon className="h-8 w-8 text-indigo-600" />
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    {uploading ? 'Processing Data...' : 'Choose Master CSV'}
                                </span>
                                <span className="text-sm text-gray-500">Drag and drop or click to browse</span>
                            </label>
                            {uploading && (
                                <div className="mt-6 w-full max-w-xs bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-indigo-600 h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                                <span className="text-sm text-red-700 font-medium">{error}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-6 bg-green-50 border border-green-100 rounded-2xl text-center">
                            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-green-800 mb-2">Import Successful!</h2>
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                                    <span className="block text-2xl font-bold text-green-600">{result.classes_created}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">New Classes</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                                    <span className="block text-2xl font-bold text-green-600">{result.students_added}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">New Students</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                                    <span className="block text-2xl font-bold text-green-600">{result.students_updated}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Updated</span>
                                </div>
                            </div>
                        </div>

                        {result.errors?.length > 0 && (
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                                <h3 className="text-orange-800 font-bold text-sm mb-3">Warnings ({result.errors.length})</h3>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="text-[11px] text-orange-700 bg-white/50 p-2 rounded">
                                            Row {err.row}: {err.error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/teacher/classes')}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200"
                        >
                            Go to Class Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalImport;
