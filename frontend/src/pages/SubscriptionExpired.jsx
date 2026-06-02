import React from 'react';
import { useAuth } from '../context/AuthContext';

function SubscriptionExpired() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login'; // Force reload to clear all states
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
                <div className="text-red-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Subscription Expired</h2>
                <p className="text-gray-600 mb-6">
                    Your company subscription has expired. Access is on hold. Please contact the Super Admin to renew.
                </p>
                <button
                    onClick={handleLogout}
                    className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700 transition"
                >
                    Logout Securely
                </button>
            </div>
        </div>
    );
}

export default SubscriptionExpired;
