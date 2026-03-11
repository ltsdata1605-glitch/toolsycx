
import React, { useEffect, useRef } from 'react';
import { Icon } from '../common/Icon';

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subTitle: string;
    titleColorClass: string;
    controls?: React.ReactNode;
    maxWidthClass?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
    isOpen,
    onClose,
    children,
    title,
    subTitle,
    titleColorClass,
    controls,
    maxWidthClass = 'max-w-6xl'
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);
    
    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300 opacity-100"
            onClick={onClose}
        >
            <div
                ref={modalContentRef}
                onClick={(e) => e.stopPropagation()}
                className={`modal-content opacity-100 scale-100 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 transition-transform duration-300`}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl flex-shrink-0">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{subTitle}</p>
                        <h3 className={`text-2xl font-bold ${titleColorClass}`}>{title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {controls}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                           <Icon name="x" size={6} />
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
};

export default ModalWrapper;
