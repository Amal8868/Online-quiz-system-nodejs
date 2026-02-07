import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

/**
 * THE USER MANAGER (UserManagement)
 * 
 * This is the Admin's HQ for managing people! 
 * Whether it's adding a new teacher, fixing a student's name, 
 * or "locking the door" (Deactivating) on an account, it happens here.
 */
const UserManagement = ({ viewMode = 'list', userType = 'All' }) => {
    // STATE: These "remember" the list of users, what we are searching for, and if a pop-up is open.
    const [users, setUsers] = useState([]);
    const [filterType, setFilterType] = useState(userType === 'All' ? 'All' : userType);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');


    // Modal States: Controls for the "New User" and "Credentials" pop-ups.
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGeneratedModal, setShowGeneratedModal] = useState(false);
    const [generatedCreds, setGeneratedCreds] = useState(null);
    const [editingUserId, setEditingUserId] = useState(null);

    // FORM DATA: This is our blank "Digital Form" that we fill out.
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        user_type: userType !== 'All' ? userType : 'Student',
        username: '',
        password: '',
        email: '',
        phone: '',
        gender: 'Male',
        user_id: '',
        status: 'Active'
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [previewImage, setPreviewImage] = useState(null);

    const initialFormState = {
        first_name: '',
        last_name: '',
        user_type: userType !== 'All' ? userType : 'Student',
        username: '',
        password: '',
        email: '',
        phone: '',
        gender: 'Male',
        user_id: '',
        status: 'Active',
        profile_pic: null
    };


    // Cleanup: Hide messages after 5 seconds.
    useEffect(() => {
        if (formSuccess || formError) {
            const timer = setTimeout(() => {
                setFormSuccess('');
                setFormError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [formSuccess, formError]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const typeToFetch = userType !== 'All' ? userType : (filterType === 'All' ? null : filterType);

            const res = await adminAPI.getUsers(typeToFetch);
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }, [userType, filterType]);

    // ON LOAD: Fetch the list of users from the server.
    // ON LOAD: Fetch the list of users from the server.
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Reset filters when the main tab (User Type) changes
    useEffect(() => {
        setFilterType(userType === 'All' ? 'All' : userType);
        if (userType !== 'All') {
            setFormData(prev => ({ ...prev, user_type: userType }));
        }
        setFormError('');
        setFormSuccess('');
        setFieldErrors({});
    }, [userType, viewMode, showCreateModal]);

    /**
     * INPUT CHECKER (validateField):
     * We don't want weird data in our system. 
     * This checks if names have numbers or if emails look like real emails.
     */
    const validateField = (name, value) => {
        let error = '';
        if (name === 'first_name' || name === 'last_name') {
            if (/[0-9]/.test(value)) {
                error = 'Numbers are not allowed in names';
            }
        } else if (name === 'phone' && value) {
            const phone = value.replace(/\s+/g, '');
            if (!/^(0)?(61|62|68|77)\d{7}$/.test(phone)) {
                error = 'Invalid phone format';
            }
        } else if (name === 'email' && value) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                error = 'Please enter a valid email';
            }
        }

        setFieldErrors(prev => ({
            ...prev,
            [name]: error
        }));
        return !error;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);

        if (formError) setFormError('');
        if (formSuccess) setFormSuccess('');
    };

    // THE LIGHT SWITCH: Quickly changing a user from "Active" to "Not Active".
    const handleStatusChange = async (userId, newStatus) => {
        try {
            const res = await adminAPI.updateUser(userId, { status: newStatus });
            if (res.data.success) {
                // Update the local list so the UI changes instantly!
                setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            }
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update user status");
        }
    };

    const handleEdit = (user) => {
        setEditingUserId(user.id);
        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            username: user.username || '',
            password: '', // Don't populate password
            email: user.email || '',
            phone: user.phone || '',
            gender: user.gender || 'Male',
            user_id: user.user_id || '',
            status: user.status
        });
        setShowCreateModal(true);
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const handleDelete = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await adminAPI.deleteUser(userToDelete.id);
            fetchUsers();
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user: " + (error.response?.data?.error || "Unknown error"));
        }
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditingUserId(null);
        setFormData(initialFormState);
        setPreviewImage(null);
        setGeneratedCreds(null);
        setShowGeneratedModal(false);
        setFormError('');
        setFormSuccess('');
    };

    const handleReset = () => {
        setFormData(editingUserId ? {
            ...initialFormState,
            first_name: formData.first_name,
            last_name: formData.last_name,
            user_type: formData.user_type,
            user_id: formData.user_id,
            gender: formData.gender,
            status: formData.status
        } : initialFormState);
        setPreviewImage(null);
        setFormError('');
        setFormSuccess('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, profile_pic: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    /**
     * UPLOADING THE FORM (handleSubmit):
     * When the Admin clicks "Submit", we pack everything 
     * (including their photo) into a digital envelope (FormData) 
     * and ship it to the server.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        // Custom Validation: Check for empty required fields
        const errors = {};
        if (!formData.first_name) errors.first_name = 'First Name is required';
        if (!formData.last_name) errors.last_name = 'Last Name is required';
        if (!formData.email) errors.email = 'Email is required';
        if (!formData.phone) errors.phone = 'Phone number is required';
        if (userType === 'All' && !formData.user_type) errors.user_type = 'User Type is required';

        // Check username/password for Admin or new Teacher
        if ((formData.user_type === 'Admin') || (editingUserId && formData.user_type !== 'Teacher' && formData.user_type !== 'Student')) {
            if (!formData.username) errors.username = 'Username is required';
        }

        if (!editingUserId && formData.user_type === 'Admin') {
            if (!formData.password) errors.password = 'Password is required';
        }


        // Merge with existing format validations
        const isFirstNameValid = validateField('first_name', formData.first_name);
        const isLastNameValid = validateField('last_name', formData.last_name);
        const isPhoneValid = validateField('phone', formData.phone);
        const isEmailValid = validateField('email', formData.email);

        if (!isFirstNameValid || !isLastNameValid || !isPhoneValid || !isEmailValid) {
            // Field errors are already set by validateField, but we need to combine them if any refer to the same field (though 'required' usually takes precedence)
            // For now, just ensure we don't proceed.
        }

        // If we found empty required fields, update state and stop.
        if (Object.keys(errors).length > 0) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            return;
        }

        if (!isFirstNameValid || !isLastNameValid || !isPhoneValid || !isEmailValid) {
            setFormError('Please fix the errors in the form before submitting.');
            return;
        }

        try {
            const payload = { ...formData };
            // Ensure first/last name are trimmed
            payload.first_name = payload.first_name?.trim();
            payload.last_name = payload.last_name?.trim();

            if (editingUserId && !payload.password) delete payload.password;

            let res;
            if (editingUserId) {
                res = await adminAPI.updateUser(editingUserId, payload);
            } else {
                res = await adminAPI.createUser(payload);
            }

            if (res.data.success) {
                setFormSuccess(editingUserId ? 'User updated successfully!' : 'User created successfully!');
                const userData = res.data.data;

                // If it's a new teacher/student, show their generated creds
                if (!editingUserId && userData.user_type !== 'Admin') {
                    setGeneratedCreds({
                        username: userData.user_id,
                        password: userData.temp_password || 'user1234'
                    });
                    setShowGeneratedModal(true);
                    setShowCreateModal(false);
                    setFormData(initialFormState);
                    setPreviewImage(null);
                } else {
                    if (viewMode === 'list') fetchUsers();
                    setTimeout(closeModal, 1500);
                }
            }
        } catch (error) {
            console.error('DEBUG [UserManagement]: Submit error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            const backendError = error.response?.data?.error || error.response?.data?.message;
            setFormError(backendError || 'Failed to save user. Please check your inputs.');
        }
    };

    // Filter users based on search term
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const user_id = (user.user_id || `ID-${user.id}`).toLowerCase();
        const username = (user.username || '').toLowerCase();

        return user_id.includes(searchLower) ||
            fullName.includes(searchLower) ||
            username.includes(searchLower);
    }).sort((a, b) => {
        const typeOrder = { 'Admin': 1, 'Teacher': 2, 'Student': 3 };
        const typeA = typeOrder[a.user_type] || 4;
        const typeB = typeOrder[b.user_type] || 4;
        if (typeA !== typeB) return typeA - typeB;
        return a.id - b.id;
    });

    const renderForm = () => (
        <form onSubmit={handleSubmit} className="flex flex-col h-full" noValidate>
            <div className={`bg-white dark:bg-gray-800 flex-1 ${viewMode === 'register' ? 'p-6 rounded-lg shadow-md' : 'px-4 pt-5 pb-4 sm:p-6 sm:pb-4'}`}>
                {viewMode === 'register' && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingUserId ? 'Edit User' : `Register New ${userType !== 'All' ? userType : 'User'}`}</h2>}
                {viewMode !== 'register' && <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">{editingUserId ? 'Edit User' : `Register New ${userType !== 'All' ? userType : 'User'}`}</h3>}

                {formError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{formError}</div>}
                {formSuccess && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-sm">{formSuccess}</div>}

                <div className="grid grid-cols-2 gap-4">
                    {/* Profile Picture */}
                    <div className="col-span-2 flex flex-col items-center mb-4">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden mb-2 relative group">
                            {previewImage ? (
                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <PlusIcon className="w-8 h-8 text-gray-400" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title="Upload Profile Picture"
                            />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Profile Picture</span>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name *</label>
                        <input type="text" name="first_name" required value={formData.first_name} onChange={handleInputChange} className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.first_name ? 'border-red-500 bg-red-50' : 'border-gray-600'}`} />
                        {fieldErrors.first_name && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.first_name}</p>}
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name *</label>
                        <input type="text" name="last_name" required value={formData.last_name} onChange={handleInputChange} className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.last_name ? 'border-red-500 bg-red-50' : 'border-gray-600'}`} />
                        {fieldErrors.last_name && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.last_name}</p>}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {editingUserId ? 'User ID' : 'Auto ID'}
                        </label>
                        <input
                            type="text"
                            name="user_id"
                            disabled={!editingUserId}
                            value={editingUserId ? formData.user_id : "Auto-generated"}
                            onChange={handleInputChange}
                            placeholder="e.g. TCH-100"
                            className={`input p-2 border rounded w-full text-sm font-mono ${!editingUserId
                                ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                                }`}
                        />
                        {editingUserId && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manually update the ID if needed (e.g., TCH-100).</p>}
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sex</label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} className="input p-2 border rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Status</label>
                        <select name="status" value={formData.status} onChange={handleInputChange} className="input p-2 border rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    {userType === 'All' && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Type *</label>
                            <select name="user_type" value={formData.user_type} onChange={handleInputChange} disabled={viewMode === 'register' && userType !== 'All'} className="input p-2 border rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 disabled:opacity-50">
                                <option value="Student">Student</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    )}

                    {formData.user_type === 'Admin' ? (
                        <>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username *</label>
                                <input type="text" name="username" required value={formData.username} onChange={handleInputChange} className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.username ? 'border-red-500 bg-red-50' : 'border-gray-600'}`} />
                                {fieldErrors.username && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.username}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password {editingUserId ? '(Leave blank to keep current)' : ' *'}</label>
                                <input type="password" name="password" autoComplete="new-password" required={!editingUserId} value={formData.password} onChange={handleInputChange} className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-600'}`} />
                                {fieldErrors.password && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.password}</p>}
                            </div>
                        </>
                    ) : (formData.user_type === 'Teacher' && !editingUserId) ? (
                        <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800 mb-2">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                <strong>Auto-generation Active:</strong> Username and temporary password will be automatically generated for the teacher. You'll see them in the next step.
                            </p>
                        </div>
                    ) : null}

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-600'}`} />
                        {fieldErrors.email && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.email}</p>}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone *</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className={`input p-2 border rounded w-full dark:bg-gray-700 dark:text-white ${fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-600'}`}
                            placeholder="e.g. 61xxxxxxx"
                        />
                        {fieldErrors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{fieldErrors.phone}</p>}
                    </div>
                </div>
            </div>

            <div className={`bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3 ${viewMode === 'register' ? 'rounded-b-lg' : ''}`}>
                <button type="submit" className="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm">
                    {editingUserId ? 'Update User' : 'Submit'}
                </button>
                <button type="button" onClick={handleReset} className="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 text-base font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm">
                    Reset
                </button>
                {viewMode !== 'register' && (
                    <button type="button" onClick={closeModal} className="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 text-base font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );

    if (viewMode === 'register') {
        return <div className="max-w-3xl mx-auto">{renderForm()}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {userType === 'All' ? 'User Management' : `${userType} Management`}
                </h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Register {userType !== 'All' ? userType : 'New User'}
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input - Always visible */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3 border"
                    />
                </div>

                {/* Type Filters - Only for 'All' view */}
                {userType === 'All' && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">Type:</span>
                        {['All', 'Admin', 'Teacher', 'Student'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${filterType === type
                                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* User List */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {user.user_id || `ID-${user.id}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.first_name} {user.last_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.user_type === 'Admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    user.user_type === 'Teacher' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                                {user.user_type}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.email || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                            {user.user_type === 'Student' ? (
                                                <span className="text-gray-300">-</span>
                                            ) : user.password ? (
                                                <span className="break-all" title={user.password}>
                                                    {user.password}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleStatusChange(user.id, user.status === 'Active' ? 'Inactive' : 'Active')}
                                                className={`p-1 rounded-full transition-colors ${user.status === 'Active'
                                                    ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                                                    : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                    }`}
                                                title={`Click to ${user.status === 'Active' ? 'Deactivate' : 'Activate'}`}
                                            >
                                                {user.status === 'Active' ? (
                                                    <CheckCircleIcon className="h-6 w-6" />
                                                ) : (
                                                    <XCircleIcon className="h-6 w-6" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {loading ? 'Loading...' : 'No users found matching your search.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                {renderForm()}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeDeleteModal}></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Delete {userType !== 'All' ? userType : 'User'}</h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to delete {userToDelete?.first_name} {userToDelete?.last_name}? This action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeDeleteModal}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Generated Credentials Modal */}
            {
                showGeneratedModal && generatedCreds && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => { setShowGeneratedModal(false); fetchUsers(); }}></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <PlusIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white">User Created Successfully!</h3>
                                            {(generatedCreds?.username?.startsWith('tea_') || generatedCreds?.username?.startsWith('TCH-')) && (
                                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Please share these credentials with the user:</p>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-400 uppercase">Username</span>
                                                            <p className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">{generatedCreds.username}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-400 uppercase">Temporary Password</span>
                                                            <p className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">{generatedCreds.password}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {generatedCreds?.username?.startsWith('usr_') && (
                                                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                                    Student created. They can join exams using their Student ID.
                                                </p>
                                            )}
                                            {(generatedCreds?.username?.startsWith('tea_') || generatedCreds?.username?.startsWith('TCH-')) && (
                                                <p className="mt-4 text-xs text-red-500 font-medium">
                                                    Important: This password will not be shown again.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={() => { setShowGeneratedModal(false); fetchUsers(); }}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UserManagement;
