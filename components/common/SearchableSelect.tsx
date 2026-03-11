
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

interface SearchableSelectProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setIsOpen(false);
        setSearchTerm('');
    };
    
    const displayValue = value || placeholder;

    return (
        <div ref={wrapperRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <span className={`truncate ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                        {displayValue}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <Icon name="chevrons-up-down" size={4} className="text-slate-400" />
                    </span>
                </button>
                {isOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 flex flex-col">
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-full h-9 block rounded-md border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                autoFocus
                            />
                        </div>
                        <ul className="overflow-y-auto flex-grow">
                             <li
                                onClick={() => handleSelect('')}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-slate-500 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-slate-700"
                            >
                                <span className="block truncate italic">{placeholder}</span>
                                {!value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                        <Icon name="check" size={4} />
                                    </span>
                                )}
                            </li>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(opt => (
                                    <li
                                        key={opt}
                                        onClick={() => handleSelect(opt)}
                                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-slate-800 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700"
                                    >
                                        <span className="block truncate">{opt}</span>
                                        {value === opt && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                                <Icon name="check" size={4} />
                                            </span>
                                        )}
                                    </li>
                                ))
                            ) : (
                                <li className="text-center text-slate-500 py-2 text-sm">Không có kết quả.</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchableSelect;
