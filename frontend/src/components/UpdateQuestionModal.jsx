import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PencilSquareIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const UpdateQuestionModal = ({
    isOpen,
    onClose,
    onSave,
    questionData,
    setQuestionData,
    loading
}) => {
    if (!questionData) return null;

    const updateOption = (id, field, value) => {
        const newOptions = questionData.options.map(o =>
            o.id === id ? { ...o, [field]: value } : o
        );

        if (field === 'is_correct' && value === true && (questionData.question_type === 'multiple_choice' || questionData.question_type === 'true_false')) {
            setQuestionData({
                ...questionData,
                options: newOptions.map(o =>
                    o.id === id ? o : { ...o, is_correct: false }
                )
            });
        } else {
            setQuestionData({ ...questionData, options: newOptions });
        }
    };

    const addOption = () => {
        const newId = questionData.options.length > 0 ? Math.max(...questionData.options.map(o => o.id)) + 1 : 1;
        setQuestionData({
            ...questionData,
            options: [...questionData.options, { id: newId, option_text: '', is_correct: false }]
        });
    };

    const removeOption = (id) => {
        if (questionData.options.length <= 2) return;
        setQuestionData({
            ...questionData,
            options: questionData.options.filter(o => o.id !== id)
        });
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                                <form onSubmit={(e) => { e.preventDefault(); onSave(e); }}>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                                                    <PencilSquareIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <Dialog.Title as="h3" className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    Update Question
                                                </Dialog.Title>
                                            </div>
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-gray-500"
                                                onClick={onClose}
                                            >
                                                <XMarkIcon className="h-6 w-6" />
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Question Text */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Text</label>
                                                <textarea
                                                    required
                                                    className="w-full p-4 text-sm border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-900/50 dark:text-white transition-all"
                                                    rows="3"
                                                    placeholder="Enter your question here..."
                                                    value={questionData.question_text}
                                                    onChange={e => setQuestionData({ ...questionData, question_text: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Points</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        className="w-full p-3 text-sm border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-900/50 dark:text-white"
                                                        value={questionData.points}
                                                        onChange={e => setQuestionData({ ...questionData, points: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                                    <div className="w-full p-3 text-sm border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
                                                        {questionData.question_type.replace('_', ' ').toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Options Section */}
                                            {questionData.question_type !== 'short_answer' && (
                                                <div className="space-y-3">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        Options {questionData.question_type === 'multiple_selection' ? '(Check all that apply)' : '(Select one correct)'}
                                                    </label>
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {questionData.options.map((opt, i) => (
                                                            <div key={opt.id} className="flex items-center space-x-3 p-1">
                                                                <input
                                                                    type={questionData.question_type === 'multiple_selection' ? 'checkbox' : 'radio'}
                                                                    name="correct_opt"
                                                                    checked={opt.is_correct}
                                                                    onChange={() => updateOption(opt.id, 'is_correct', questionData.question_type === 'multiple_selection' ? !opt.is_correct : true)}
                                                                    className={`h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 ${questionData.question_type === 'multiple_selection' ? 'rounded' : 'rounded-full'}`}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    className="flex-1 p-2.5 text-sm border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 dark:text-white"
                                                                    placeholder={`Option ${i + 1}`}
                                                                    value={opt.option_text}
                                                                    onChange={e => updateOption(opt.id, 'option_text', e.target.value)}
                                                                />
                                                                {questionData.options.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOption(opt.id)}
                                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <TrashIcon className="h-5 w-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {(questionData.question_type === 'multiple_choice' || questionData.question_type === 'multiple_selection') && (
                                                        <button
                                                            type="button"
                                                            onClick={addOption}
                                                            className="mt-2 w-full flex justify-center items-center py-2 px-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                                                        >
                                                            <PlusIcon className="h-4 w-4 mr-2" /> Add Another Option
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 sm:w-auto"
                                        >
                                            {loading ? 'Saving...' : 'Update Question'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-xl bg-white dark:bg-gray-800 px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto transition-all"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default UpdateQuestionModal;
