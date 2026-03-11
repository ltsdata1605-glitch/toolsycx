
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ProcessedData } from '../types';
import type { Chat } from '@google/genai';
import { createChatSession } from '../services/aiService';

export const useAiChatLogic = (processedData: ProcessedData | null) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isAiResponding, setIsAiResponding] = useState(false);
    const chatSession = useRef<Chat | null>(null);

    // Reset Chat Session when data changes
    useEffect(() => {
        chatSession.current = null;
        setChatHistory([]);
    }, [processedData]);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!processedData) return;
        
        setIsAiResponding(true);
        setChatHistory(prev => [...prev, { role: 'user', content: message }]);

        if (!chatSession.current) {
            chatSession.current = createChatSession(processedData);
        }

        try {
            const result = await chatSession.current.sendMessage({ message });
            setChatHistory(prev => [...prev, { role: 'model', content: result.text }]);
        } catch (error) {
            console.error("AI chat error:", error);
            setChatHistory(prev => [...prev, { role: 'model', content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." }]);
        } finally {
            setIsAiResponding(false);
        }
    }, [processedData]);

    return {
        isChatOpen,
        setIsChatOpen,
        chatHistory,
        isAiResponding,
        handleSendMessage
    };
};
