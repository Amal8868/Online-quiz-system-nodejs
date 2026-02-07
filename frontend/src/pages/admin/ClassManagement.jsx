import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { PlusIcon, PencilSquareIcon, TrashIcon, UserPlusIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all max-w-lg w-full z-50">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignStudentModal, setShowAssignStudentModal] = useState(false);
    const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedClassId, setSelectedClassId] = useState(null);
    const [editingClass, setEditingClass] = useState(null);
    const [classToDelete, setClassToDelete] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        academic_year: new Date().getFullYear().toString(),
        section: '',
        teacher_id: ''
    });

    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [studentAssignIds, setStudentAssignIds] = useState([]);
    const [teacherAssignId, setTeacherAssignId] = useState('');

    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
        fetchStudents();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getAllClasses();
            if (res.data.success) setClasses(res.data.data);
        } catch (error) { console.error("Failed to fetch classes", error); }
        finally { setLoading(false); }
    };

    const fetchTeachers = async () => {
        try {
            const res = await adminAPI.getUsers('Teacher');
            if (res.data.success) setTeachers(res.data.data);
        } catch (error) { console.error("Failed to fetch teachers", error); }
    };

    const fetchStudents = async () => {
        try {
            const res = await adminAPI.getUsers('Student');
            if (res.data.success) setStudents(res.data.data);
        } catch (error) { console.error("Failed to fetch students", error); }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        try {
            const payload = {
                name: formData.name,
                academicYear: formData.academic_year,
                section: formData.section,
                teachers: formData.teacher_id ? [formData.teacher_id] : []
            };
            const res = await adminAPI.createClass(payload);
            if (res.data.success) {
                setFormSuccess('Class created successfully!');
                fetchClasses();
                setTimeout(() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', academic_year: new Date().getFullYear().toString(), section: '', teacher_id: '' });
                }, 1500);
            }
        } catch (error) {
            setFormError(error.response?.data?.message || error.response?.data?.error || 'Failed to create class');
        }
    };

    const handleEditClass = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        try {
            const payload = {
                name: formData.name,
                academicYear: formData.academic_year,
                section: formData.section
            };
            const res = await adminAPI.updateClass(editingClass.id, payload);
            if (res.data.success) {
                setFormSuccess('Class updated successfully!');
                fetchClasses();
                setTimeout(() => setShowEditModal(false), 1500);
            }
        } catch (error) {
            setFormError(error.response?.data?.message || error.response?.data?.error || 'Failed to update class');
        }
    };

    const handleDeleteClass = async () => {
        if (!classToDelete) return;
        try {
            const res = await adminAPI.deleteClass(classToDelete.id);
            if (res.data.success) {
                fetchClasses();
                setShowDeleteModal(false);
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete class");
        }
    };

    const handleAssignTeacher = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        if (!selectedClassId || !teacherAssignId) return;
        try {
            const res = await adminAPI.assignTeacher(selectedClassId, teacherAssignId);
            if (res.data.success) {
                setFormSuccess('Teacher assigned successfully!');
                fetchClasses();
                if (viewMode === 'details' && selectedClassId === selectedClass.id) {
                    handleViewStudents(selectedClass);
                }
                setTimeout(() => setShowAssignTeacherModal(false), 1500);
            }
        } catch (error) {
            setFormError(error.response?.data?.error || error.response?.data?.message || 'Failed to assign');
        }
    };

    const handleAssignStudent = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        if (!selectedClassId || studentAssignIds.length === 0) {
            setFormError('Please select at least one student.');
            return;
        }
        try {
            // Updated API call to send object with key 'studentIds'
            const res = await adminAPI.assignStudent(selectedClassId, { studentIds: studentAssignIds });
            if (res.data.success) {
                // Show summary from backend if available, or generic message
                const msg = res.data.message || 'Students assigned successfully!';
                setFormSuccess(msg);
                fetchClasses();
                if (viewMode === 'details' && selectedClassId === selectedClass.id) {
                    handleViewStudents(selectedClass);
                }
                setTimeout(() => {
                    setShowAssignStudentModal(false);
                    setStudentAssignIds([]); // Reset selection
                }, 1500);
            }
        } catch (error) {
            setFormError(error.response?.data?.error || error.response?.data?.message || 'Failed to assign');
        }
    };

    const openEditModal = (cls) => {
        setEditingClass(cls);
        setFormData({ name: cls.name, academic_year: cls.academic_year, section: cls.section || '', teacher_id: '' });
        setShowEditModal(true);
    };



    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'details'
    const [selectedClass, setSelectedClass] = useState(null);
    const [classStudents, setClassStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    const handleViewStudents = async (cls) => {
        setSelectedClass(cls);
        setViewMode('details');
        setStudentsLoading(true);
        try {
            const res = await adminAPI.getClassDetails(cls.id);
            if (res.data.success) {
                setSelectedClass(res.data.data);
                setClassStudents(res.data.data.students);
            }
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setStudentsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {viewMode === 'grid' ? (
                <>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Management</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your academic classes and student assignments.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all active:scale-95 shadow-lg shadow-primary-500/20"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create Class
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : classes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map(cls => (
                                <div
                                    key={cls.id}
                                    onClick={() => handleViewStudents(cls)}
                                    className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-1 hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 transition-all group cursor-pointer"
                                >
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                                <AcademicCapIcon className="w-6 h-6 text-primary-600 dark:text-primary-400 group-hover:text-white" />
                                            </div>
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-bold">
                                                {cls.academic_year}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">
                                            {cls.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{cls.section || 'General Section'}</p>

                                        <div className="space-y-3">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <UserGroupIcon className="w-4 h-4 mr-2" />
                                                <span className="font-medium">
                                                    {Array.isArray(cls.teachers) && cls.teachers.length > 0
                                                        ? cls.teachers.map(t => `${t.first_name} ${t.last_name}`).join(', ')
                                                        : 'No Teacher'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-between items-center mt-2 group-hover:bg-primary-500/5 transition-colors">
                                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Click to View Students</span>
                                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => { setSelectedClassId(cls.id); setShowAssignTeacherModal(true); }} className="p-1.5 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 rounded-lg text-gray-400"><UserPlusIcon className="w-4 h-4" /></button>
                                            <button onClick={() => { setSelectedClassId(cls.id); setShowAssignStudentModal(true); }} className="p-1.5 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 rounded-lg text-gray-400"><UserGroupIcon className="w-4 h-4" /></button>
                                            <button onClick={() => openEditModal(cls)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400"><PencilSquareIcon className="w-4 h-4" /></button>
                                            <button onClick={() => { setClassToDelete(cls); setShowDeleteModal(true); }} className="p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 rounded-lg text-gray-400"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Classes Found</h3>
                            <p className="text-gray-500 dark:text-gray-400">Create your first class to get started.</p>
                        </div>
                    )}
                </>
            ) : (
                /* Detail View / Class Dashboard */
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setViewMode('grid')}
                                className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 text-gray-500 hover:text-primary-600 transition-all shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedClass?.name}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedClass?.academic_year} • {selectedClass?.section || 'General'}</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => { setSelectedClassId(selectedClass.id); setShowAssignTeacherModal(true); }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"><UserPlusIcon className="w-5 h-5 mr-2" /> Assign Teacher</button>
                            <button onClick={() => { setSelectedClassId(selectedClass.id); setShowAssignStudentModal(true); }} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all active:scale-95"><UserGroupIcon className="w-5 h-5 mr-2" /> Assign Student</button>
                        </div>
                    </div>

                    {/* Stats Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Students</p>
                            <p className="text-3xl font-black text-primary-600">{classStudents.length}</p>
                        </div>
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm lg:col-span-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Assigned Teacher(s)</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                {Array.isArray(selectedClass?.teachers) && selectedClass.teachers.length > 0
                                    ? selectedClass.teachers.map(t => `${t.first_name} ${t.last_name}`).join(', ')
                                    : <span className="text-amber-500 italic">No Teacher Assigned</span>}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Year</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedClass?.academic_year}</p>
                        </div>
                    </div>

                    {/* Student List Table */}
                    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enrolled Students</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {studentsLoading ? (
                                        <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-500">
                                            <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
                                        </td></tr>
                                    ) : classStudents.length > 0 ? (
                                        classStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm font-mono">{student.user_id}</td>
                                                <td className="px-6 py-4 dark:text-white text-sm font-bold">{student.name}</td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{student.email}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-500">No students found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Class">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    {formSuccess && <p className="text-green-500 text-sm">{formSuccess}</p>}
                    <div><label className="block text-sm">Name</label><input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <div><label className="block text-sm">Academic Year</label><input type="text" name="academic_year" required value={formData.academic_year} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <div><label className="block text-sm">Section</label><input type="text" name="section" value={formData.section} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <button type="submit" className="w-full bg-primary-600 text-white rounded p-2">Create</button>
                </form>
            </Modal>

            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Class">
                <form onSubmit={handleEditClass} className="space-y-4">
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    {formSuccess && <p className="text-green-500 text-sm">{formSuccess}</p>}
                    <div><label className="block text-sm">Name</label><input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <div><label className="block text-sm">Academic Year</label><input type="text" name="academic_year" required value={formData.academic_year} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <div><label className="block text-sm">Section</label><input type="text" name="section" value={formData.section} onChange={handleInputChange} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" /></div>
                    <button type="submit" className="w-full bg-primary-600 text-white rounded p-2">Update</button>
                </form>
            </Modal>

            <Modal show={showAssignTeacherModal} onClose={() => setShowAssignTeacherModal(false)} title="Assign Teacher">
                <form onSubmit={handleAssignTeacher} className="space-y-4">
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    {formSuccess && <p className="text-green-500 text-sm">{formSuccess}</p>}
                    <select value={teacherAssignId} onChange={(e) => setTeacherAssignId(e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white">
                        <option value="">Select Teacher</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                    <button type="submit" className="w-full bg-blue-600 text-white rounded p-2">Assign</button>
                </form>
            </Modal>

            <Modal show={showAssignStudentModal} onClose={() => setShowAssignStudentModal(false)} title="Assign Student">
                <form onSubmit={handleAssignStudent} className="space-y-4">
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    {formSuccess && <p className="text-green-500 text-sm">{formSuccess}</p>}
                    <div className="max-h-60 overflow-y-auto border rounded p-2 dark:bg-gray-700 dark:text-white space-y-1">
                        {students.length > 0 ? (
                            students.map(s => (
                                <label key={s.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={studentAssignIds.includes(s.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setStudentAssignIds(prev => [...prev, s.id]);
                                            } else {
                                                setStudentAssignIds(prev => prev.filter(id => id !== s.id));
                                            }
                                        }}
                                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                    />
                                    <span className="text-sm select-none">{s.email} - {s.first_name} {s.last_name}</span>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No students available.</p>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {studentAssignIds.length} Selected
                        </span>
                        <div className="space-x-3">
                            <button
                                type="button"
                                onClick={() => setStudentAssignIds(students.map(s => s.id))}
                                className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={() => setStudentAssignIds([])}
                                className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={studentAssignIds.length === 0}
                        className={`w-full rounded p-2 text-white font-medium transition-colors ${studentAssignIds.length === 0
                                ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-600'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        Assign Selected Students
                    </button>
                </form>
            </Modal>

            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Class">
                <div className="space-y-4">
                    <p className="dark:text-white">Are you sure you want to delete this class?</p>
                    <div className="flex space-x-4">
                        <button onClick={handleDeleteClass} className="flex-1 bg-red-600 text-white rounded p-2">Delete</button>
                        <button onClick={() => setShowDeleteModal(false)} className="flex-1 border rounded p-2 dark:text-white">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ClassManagement;
