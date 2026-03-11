
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

interface MultiSelectDropdownProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
    placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ 
    options, 
    selected, 
    onChange, 
    label,
    placeholder = "Tìm kiếm..." 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked ? options : []);
    };
    
    let displayLabel = `Tất cả ${label.toLowerCase()}`;
    if (selected.length > 0 && selected.length < options.length) {
        displayLabel = `${selected.length} ${label.toLowerCase()}`;
    }

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef} style={{ zIndex: 11 }}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-colors">
                <span className={`truncate ${selected.length > 0 ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-500'}`}>
                    {displayLabel}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <Icon name="chevrons-up-down" size={4} className="text-slate-400" />
                </span>
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-2 flex flex-col animate-fade-in-up">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md shadow-sm focus:border-indigo-500 focus:border-indigo-500 mb-2 px-2 py-1.5"
                    />
                     <div className="flex items-center border-b border-slate-200 dark:border-slate-600 pb-2 mb-2 px-1">
                        <input id={`select-all-${label}`} type="checkbox" checked={selected.length === options.length && options.length > 0} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        <label htmlFor={`select-all-${label}`} className="ml-2 text-sm font-bold text-gray-900 dark:text-gray-100 cursor-pointer">Chọn tất cả</label>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <div key={option} className="flex items-center p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                                <input id={`opt-${label}-${option}`} type="checkbox" checked={selected.includes(option)} onChange={() => handleToggleOption(option)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                <label htmlFor={`opt-${label}-${option}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate cursor-pointer select-none flex-grow">{option}</label>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-500 text-center py-2">Không tìm thấy kết quả</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
