import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

const ChatAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Commander, tactical assistant online. Current sector status: High Priority conflict zones identified. How may I assist with your strategic reconnaissance?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [queriesRemaining, setQueriesRemaining] = useState(10);
    const [sessionId] = useState(Math.random().toString(36).substring(7));
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (queriesRemaining <= 0) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "⚠️ TACTICAL LIMIT REACHED: Your 10-query neural link has been exhausted. Please reload the dashboard to re-establish sector reconnaissance."
            }]);
            return;
        }

        // Tactical Check: Physical Link/Internet Status
        if (!window.navigator.onLine) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "CRITICAL ERROR: Tactical link offline. Please verify your satellite/mobile data connection to reconnect to Command."
            }]);
            return;
        }

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsTyping(true);
        setIsLoading(true);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            if (!API_BASE_URL) throw new Error("VITE_API_URL not defined");
            // Stateless: We no longer send 'history' to the backend to ensure no session trace
            const res = await axios.post(`${API_BASE_URL}/api/chat`, {
                message: currentInput,
                sessionId: sessionId
            });

            if (res.data.queriesRemaining !== undefined) {
                setQueriesRemaining(res.data.queriesRemaining);
            }

            setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);

            if (res.data.limitReached) {
                setQueriesRemaining(0);
            }
        } catch (err) {
            console.error('Chat Error:', err);
            const errorMsg = err.response?.data?.reply || "My satellite link is currently jammed (v2.0 Update). Please verify API quota or try again shortly.";
            setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
        } finally {
            setIsTyping(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all duration-300 active:scale-90 ${isOpen ? 'bg-rose-600 rotate-90' : 'bg-gray-900'
                    } group`}
            >
                {isOpen ? <X className="text-white" size={24} /> : (
                    <div className="relative">
                        <MessageSquare className="text-white" size={24} />
                        {!isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>}
                        {!isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full"></span>}
                    </div>
                )}
            </button>

            {/* Chat Window */}
            <div className={`absolute bottom-20 right-0 w-[calc(100vw-48px)] sm:w-[350px] md:w-[400px] max-h-screen bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                }`}>
                {/* Header */}
                <div className="bg-gray-900 p-5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/30">
                        <Bot className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-tight">War Intelligence Bot</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                            <span className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Secure Tactical Link</span>
                        </div>
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 max-h-[calc(100vh-200px)]">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-rose-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-rose-200 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Inquiries */}
                {!isLoading && messages.length === 1 && (
                    <div className="px-6 pb-2 flex flex-wrap gap-2">
                        {['Latest Hotspots?', 'Kharkiv Update?', 'Strategic Summary?'].map(txt => (
                            <button
                                key={txt}
                                onClick={() => {
                                    setInput(txt);
                                    // Small delay to allow state update before trigger
                                    setTimeout(() => handleSendMessage({ preventDefault: () => { } }), 50);
                                }}
                                className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full border border-rose-100 font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all"
                            >
                                {txt}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Inquire about frontline data..."
                            className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className={`p-2 bg-gray-900 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatAssistant;
