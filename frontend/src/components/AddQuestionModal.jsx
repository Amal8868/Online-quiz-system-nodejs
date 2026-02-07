import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const AddQuestionModal = ({
    isOpen,
    onClose,
    onAdd,
    newQuestion,
    setNewQuestion,
    addingQuestion,
    handleTypeChange,
    updateNewQuestionOption,
    addOption,
    removeOption
}) => {
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
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <form onSubmit={onAdd}>
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                <PlusIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 dark:text-white">
                                                Add New Question
                                            </Dialog.Title>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Type</label>
                                                    <select
                                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                                        value={newQuestion.question_type}
                                                        onChange={(e) => handleTypeChange(e.target.value)}
                                                    >
                                                        <option value="multiple_choice">Multiple Choice</option>
                                                        <option value="multiple_selection">Multiple Selection (Select all that apply)</option>
                                                        <option value="true_false">True / False</option>
                                                        <option value="short_answer">Short Answer</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Points</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                                        min="1"
                                                        value={newQuestion.points}
                                                        onChange={(e) => setNewQuestion({ ...newQuestion, points: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Question Text</label>
                                                <textarea
                                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white resize-none"
                                                    rows="3"
                                                    placeholder="Enter question content..."
                                                    required
                                                    value={newQuestion.question_text}
                                                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                                />
                                            </div>

                                            {(newQuestion.question_type === 'multiple_choice' || newQuestion.question_type === 'multiple_selection') && (
                                                <div className="space-y-3">
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                                        Options {newQuestion.question_type === 'multiple_selection' ? '(Select all correct)' : '(Select one correct)'}
                                                    </label>
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {newQuestion.options.map((opt, i) => (
                                                            <div key={opt.id} className="flex items-center gap-3 group">
                                                                <input
                                                                    type={newQuestion.question_type === 'multiple_selection' ? 'checkbox' : 'radio'}
                                                                    name="new_correct_ans"
                                                                    className={`h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 pointer-cursor ${newQuestion.question_type === 'multiple_selection' ? 'rounded' : 'rounded-full'}`}
                                                                    checked={opt.is_correct}
                                                                    onChange={() => updateNewQuestionOption(opt.id, 'is_correct', newQuestion.question_type === 'multiple_selection' ? !opt.is_correct : true)}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    className="flex-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all dark:text-white"
                                                                    placeholder={`Option ${i + 1}`}
                                                                    required
                                                                    value={opt.option_text}
                                                                    onChange={(e) => updateNewQuestionOption(opt.id, 'option_text', e.target.value)}
                                                                />
                                                                {newQuestion.options.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOption(opt.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <TrashIcon className="h-5 w-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={addOption}
                                                        className="mt-2 w-full flex justify-center items-center py-2 px-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-bold"
                                                    >
                                                        <PlusIcon className="h-4 w-4 mr-2" /> Add Another Option
                                                    </button>
                                                </div>
                                            )}

                                            {newQuestion.question_type === 'true_false' && (
                                                <div className="flex gap-4 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                                    {newQuestion.options.map(opt => (
                                                        <label key={opt.id} className={`flex-1 flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all border-2 ${opt.is_correct ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30' : 'bg-transparent border-transparent text-gray-500 hover:bg-white dark:hover:bg-gray-800'}`}>
                                                            <input
                                                                type="radio"
                                                                name="new_tf_ans"
                                                                className="sr-only"
                                                                checked={opt.is_correct}
                                                                onChange={() => updateNewQuestionOption(opt.id, 'is_correct', true)}
                                                            />
                                                            <span className="text-sm font-bold">{opt.option_text}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 flex gap-3">
                                        <button
                                            type="button"
                                            className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={addingQuestion}
                                            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {addingQuestion ? 'Adding Question...' : 'Save Question'}
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

export default AddQuestionModal;
