import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserIcon } from '@heroicons/react/24/outline';
import { studentAPI } from '../../services/api';

/**
 * THE WAITING ROOM (WaitingRoom)
 * 
 * Think of this as the "Digital Hallway". 
 * The students are standing outside the exam room, waiting for the 
 * teacher to unlock the door and say: "You may begin!"
 */
const WaitingRoom = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    /**
     * THE PATIENT WATCHER (useEffect):
     * This code checks the server every 3 seconds to see if the 
     * teacher has pressed the "START" button.
     */
    useEffect(() => {
        // First, check if the student even belongs here!
        const sessionData = JSON.parse(localStorage.getItem('student_session'));
        if (!sessionData || sessionData.quiz.room_code !== roomCode) {
            navigate('/join');
            return;
        }

        // REDIRECT TO JOIN IF ALREADY SUBMITTED
        if (sessionData.result_status === 'submitted') {
            localStorage.removeItem('student_session'); // Clear session so they can't just go forward again
            navigate('/join', { replace: true });
            return;
        }

        setSession(sessionData);
        setLoading(false);

        // POLLING: Every 3000ms (3 seconds), we ask: "Is it time yet?"
        const pollInterval = setInterval(async () => {
            try {
                const response = await studentAPI.getQuizStatus(sessionData.quiz.id);
                const currentStatus = response.data.data.status;

                /**
                 * THE MOMENT OF TRUTH:
                 * If the server says "started", we grab the official Start Time 
                 * and rush into the Exam room!
                 */
                if (currentStatus === 'started') {
                    // Check if self-status is submitted?
                    // Ideally the API returns `student_status` too.
                    // But if we simply navigate to /exam, ExamPage checks the status on load.

                    clearInterval(pollInterval); // Stop asking, the door is open!

                    // We update our "Ticket" with the official start time from the server.
                    const updatedSession = {
                        ...sessionData,
                        quiz: {
                            ...sessionData.quiz,
                            start_time: response.data.data.start_time,
                            server_time: response.data.data.server_time
                        }
                    };
                    localStorage.setItem('student_session', JSON.stringify(updatedSession));

                    // GO GO GO!
                    // If the student already submitted (found via some other check), ExamPage will redirect.
                    // But let's assume they are fresh for now.
                    navigate(`/exam/${roomCode}`);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [roomCode, navigate]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
            >
                <div className="mb-6">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {/* A pulsing icon to show the student that the app is still "alive" and waiting. */}
                        <UserIcon className="h-10 w-10 text-indigo-600 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {session.student.name}!</h1>
                    <p className="text-gray-600">You have successfully joined</p>
                    <p className="text-lg font-semibold text-indigo-600">"{session.quiz.title}"</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                        <div className="flex items-center justify-center space-x-2 text-indigo-700 font-medium">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                            </span>
                            <span>Waiting for teacher to start...</span>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2">The exam will begin automatically. Please do not close this window.</p>
                    </div>

                    <div className="text-sm text-gray-500 italic">
                        "Your preparation today determines your result tomorrow."
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default WaitingRoom;
