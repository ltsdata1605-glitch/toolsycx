import React from 'react';
import { Icon } from '../common/Icon';
import type { Status } from '../../types';

interface StatusDisplayProps {
    status: Status;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
    if (!status || !status.message) {
        return null;
    }

    const typeClasses = {
        info: {
            bg: 'bg-blue-100 dark:bg-blue-900/50',
            border: 'border-blue-500',
            text: 'text-blue-800 dark:text-blue-200',
            icon: 'file-scan',
            iconColor: 'text-blue-500',
        },
        success: {
            bg: 'bg-green-100 dark:bg-green-900/50',
            border: 'border-green-500',
            text: 'text-green-800 dark:text-green-200',
            icon: 'check-circle',
            iconColor: 'text-green-500',
        },
        error: {
            bg: 'bg-red-100 dark:bg-red-900/50',
            border: 'border-red-500',
            text: 'text-red-800 dark:text-red-200',
            icon: 'alert-triangle',
            iconColor: 'text-red-500',
        },
    };

    const classes = typeClasses[status.type];
    const isProcessing = status.type === 'info' && status.progress < 100;

    return (
        <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-md ${classes.bg} ${classes.border} ${classes.text}`} role="alert">
            <div className="flex items-center">
                <Icon 
                    name={classes.icon} 
                    className={`w-6 h-6 mr-3 ${classes.iconColor} ${isProcessing ? 'animate-pulse' : ''}`} 
                />
                <p className="font-semibold text-lg">{status.message}</p>
            </div>
            {status.progress > 0 && status.progress < 100 && (
                <div className={`mt-3 w-full rounded-full h-2.5 progress-bar-container ${isProcessing ? 'scanner' : ''}`}>
                    <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${status.progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default StatusDisplay;