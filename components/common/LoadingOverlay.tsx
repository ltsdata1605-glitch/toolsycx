
import React from 'react';
import { Icon } from './Icon';

const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center z-50 rounded-xl">
        <div className="animate-spin text-indigo-500">
            <Icon name="loader-2" size={16} />
        </div>
    </div>
);

export default LoadingOverlay;
