import React from 'react';
import { Icon } from '../common/Icon';

interface ChatFabProps {
  onClick: () => void;
}

const ChatFab: React.FC<ChatFabProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Hỏi Trợ Lý AI"
      aria-label="Mở cửa sổ chat với trợ lý AI"
      className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-300 ease-in-out transform hover:scale-110"
    >
      <div className="flex items-center justify-center">
        <Icon name="sparkles" className="w-8 h-8" />
      </div>
    </button>
  );
};

export default ChatFab;
