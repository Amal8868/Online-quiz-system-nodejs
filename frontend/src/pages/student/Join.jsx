import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';

/**
 * THE ENTRANCE (Join)
 * 
 * This is the first stop for students! 
 * Just like a physical exam, they need their "Seat Number" (Room Code) 
 * and their "ID Card" (Student ID) to get in.
 */
const Join = () => {
    const [roomCode, setRoomCode] = useState('');
    const [studentId, setStudentId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    /**
     * THE HANDSHAKE (handleJoin):
     * When the student clicks "Enter", we ask the server: 
     * "Is this student allowed in this room?"
     */
    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await studentAPI.enterExam({
                room_code: roomCode,
                student_id: studentId
            });

            if (response.data.success) {
                const { token, data } = response.data;

                // If the server returned a security token, save it!
                if (token) {
                    // Fix: Use 'student_token' to avoid overwriting Teacher's session in the same browser
                    localStorage.setItem('student_token', token);
                    localStorage.setItem('student_user', JSON.stringify(data.student_profile));
                }

                /**
                 * THE TICKET (student_session):
                 * We save their details in a "Digital Pocket" (localStorage) 
                 * so that when they move to the Exam page, the app still remembers 
                 * who they are and which quiz they are taking.
                 */
                const sessionData = {
                    student: {
                        id: data.student_db_id, // Internal Database ID
                        student_id: data.student_id, // Their actual School ID
                        name: data.student_name
                    },
                    quiz: {
                        id: data.quiz_id,
                        title: data.quiz_title,
                        time_limit: data.time_limit,
                        room_code: roomCode,
                        start_time: data.start_time,
                        server_time: data.server_time
                    }
                };

                localStorage.setItem('student_session', JSON.stringify(sessionData));

                /**
                 * WHERE TO NEXT?
                 * If the teacher hasn't started the timer yet, they go to the WAITING ROOM.
                 * If the exam has already begun, they jump straight into the ACTION!
                 */
                if (data.result_status === 'submitted') {
                    // "You already finished this! Go see your score."
                    const navId = data.result_numeric_id || data.result_id;
                    navigate(`/student/results/${navId}`, { replace: true });
                } else if (data.quiz_status === 'active') {
                    // "Wait for the teacher to press START"
                    navigate(`/student/waiting/${roomCode}`);
                } else {
                    // "The clock is ticking, let's go!"
                    navigate(`/exam/${roomCode}`);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to join exam. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
                <div>
                    <h1 className="mt-6 text-center text-3xl font-black text-gray-900 tracking-tight">
                        Join exam
                    </h1>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your room code and student ID
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleJoin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label htmlFor="room-code" className="sr-only">Room code</label>
                            <input
                                id="room-code"
                                name="room_code"
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Room code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="student-id" className="sr-only">Student ID</label>
                            <input
                                id="student-id"
                                name="student_id"
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Student ID"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            {loading ? 'Joining...' : 'Enter exam'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Join;
