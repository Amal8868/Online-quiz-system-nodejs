import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';
const NotFound = () => {
    
    return (

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h1 className="text-9xl font-extrabold text-primary-600 dark:text-primary-400">404</h1>
                <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h2>
                <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <div className="mt-6">

                    <Link
                        to="/"
                        className="btn btn-primary inline-flex items-center"
                    >
                        <HomeIcon className="h-5 w-5 mr-2" />
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
