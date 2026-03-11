import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { Icon } from '../common/Icon';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: ChatMessage[];
    isSending: boolean;
    onSendMessage: (message: string) => void;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1 p-3 rounded-lg bg-slate-200 dark:bg-slate-700 self-start">
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
    </div>
);

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, history, isSending, onSendMessage }) => {
    const [userInput, setUserInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isSending]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput.trim() && !isSending) {
            onSendMessage(userInput.trim());
            setUserInput('');
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (!isSending) {
            onSendMessage(suggestion);
        }
    };

    const suggestions = [
        "Tổng doanh thu quy đổi là bao nhiêu?",
        "Nhân viên nào có hiệu suất tốt nhất?",
        "Ngành hàng nào đang chiếm tỷ trọng cao nhất?",
        "Tóm tắt tình hình kinh doanh."
    ];

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="modal-content bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col border border-slate-200 dark:border-slate-700"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Icon name="sparkles" size={6} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Trợ lý AI</h3>
                           <p className="text-sm text-slate-500 dark:text-slate-400">Hỏi tôi về dữ liệu trên dashboard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full">
                        <Icon name="x" size={6} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                            }`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                            </div>
                        </div>
                    ))}
                    {isSending && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {history.length <= 2 && (
                    <div className="px-4 pb-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                        {suggestions.map((q, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSuggestionClick(q)}
                                disabled={isSending}
                                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}


                {/* Input Form */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800 rounded-b-2xl">
                    <form onSubmit={handleSubmit} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Hỏi trợ lý AI về dữ liệu của bạn..."
                            className="w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 dark:text-slate-200"
                            aria-label="Nhập câu hỏi của bạn"
                            disabled={isSending}
                        />
                        <button 
                            type="submit" 
                            className="p-3 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            aria-label="Gửi tin nhắn"
                            disabled={isSending || !userInput.trim()}
                        >
                            <Icon name="send-horizontal" size={5} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
