import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../contexts/AuthContext';
import api from '../api/axios';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, ChevronDown, ChevronUp, Zap, Bot, User } from 'lucide-react';
import { cn } from '../lib/utils';
import StructuredResponse from './AI/StructuredResponse';



const ChatBot = ({ forecastData, currentCash, metrics, situation }) => {
    const { selectedBusiness } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Hello! I am **Cashly Intelligence**. I can analyze your ledgers, forecast cash flows, and detect strategic risks.\n\nHow can I help you today?',
            timestamp: new Date().toISOString(),
            id: 'welcome-msg'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [showThinking, setShowThinking] = useState(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        const userMsgObj = {
            type: 'user',
            text: userMessage,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        setMessages(prev => [...prev, userMsgObj]);
        setIsLoading(true);

        try {
            const { data } = await api.post('/ai/ask', {
                query: userMessage,
                businessId: selectedBusiness?._id || selectedBusiness?.id,
                forecastData,
                currentCash,
                metrics,
                situation
            });

            const botMsgObj = {
                type: 'bot',
                text: data.response,
                classification: data.classification,
                steps: data.steps || [],
                timestamp: new Date().toISOString(),
                id: Date.now() + 1,
                isFastPath: data.isFastPath,
                chartData: data.chartData
            };

            setMessages(prev => [...prev, botMsgObj]);
            if (data.steps && data.steps.length > 0) {
                setShowThinking(botMsgObj.id);
            }

        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                type: 'bot',
                text: '⚠️ **System Interruption**: Neural link failed. Please retry.',
                timestamp: new Date().toISOString(),
                id: Date.now() + 2
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {!isOpen && (
                <Motion.button
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[24px] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] border border-white/20 transition-all hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.6)] group"
                >
                    <div className="absolute inset-0 rounded-[24px] animate-ping bg-indigo-500 opacity-20 duration-1000 group-hover:opacity-40"></div>
                    <Sparkles className="w-7 h-7" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
                </Motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <Motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-24 right-6 z-50 w-[calc(100%-48px)] sm:w-[450px] h-[calc(100vh-160px)] max-h-[700px] bg-black/40 backdrop-blur-3xl rounded-[40px] border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-1 ring-white/10"
                    >
                        {/* Header */}
                        <div className="p-6 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white tracking-tight">Financial Intelligence</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-[3px] font-black">Neural Engine v2.0</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2.5 hover:bg-white/10 rounded-2xl transition-all text-white/30 hover:text-white hover:rotate-90 group"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || `msg-${idx}`} className={cn(
                                    "flex flex-col gap-2 w-full",
                                    msg.type === 'user' ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "max-w-[90%] rounded-[32px] px-6 py-5 text-sm flex gap-4 transition-all duration-300",
                                        msg.type === 'user'
                                            ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-none shadow-xl shadow-indigo-600/10"
                                            : "bg-white/[0.03] border border-white/10 text-white rounded-tl-none shadow-sm hover:border-white/20"
                                    )}>
                                        <div className="flex-1 overflow-hidden">
                                            {msg.type === 'bot' ? (
                                                <StructuredResponse content={msg.text} animate={idx === messages.length - 1 && isLoading === false} />
                                            ) : (
                                                <p className="font-medium leading-relaxed">{msg.text}</p>
                                            )}

                                            {/* Classification & Metadata */}
                                            {msg.classification && (
                                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                                                    <span className="text-[9px] px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 font-black uppercase tracking-widest">{msg.classification.category}</span>
                                                    <span className="text-[9px] px-2.5 py-1 bg-white/5 text-white/40 rounded-full border border-white/10 font-black uppercase tracking-widest leading-none flex items-center">{msg.classification.tone}</span>
                                                </div>
                                            )}

                                            {/* Steps Accordion */}
                                            {msg.steps && msg.steps.length > 0 && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setShowThinking(showThinking === msg.id ? null : msg.id)}
                                                        className="flex items-center gap-2 text-[9px] text-white/20 hover:text-white/40 transition-colors uppercase font-black tracking-[2px]"
                                                    >
                                                        {showThinking === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        {showThinking === msg.id ? 'Conceal Reasoning' : 'Reveal Synthesis Logic'}
                                                    </button>
                                                    <AnimatePresence>
                                                        {showThinking === msg.id && (
                                                            <Motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="mt-3 space-y-2 overflow-hidden border-l border-indigo-500/30 pl-4"
                                                            >
                                                                {msg.steps.map((step, i) => (
                                                                    <div key={i} className="flex items-center gap-3 text-[10px] text-white/40 font-medium py-0.5">
                                                                        <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                                                                        <span>{step.message}</span>
                                                                    </div>
                                                                ))}
                                                            </Motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[8px] text-white/10 uppercase tracking-widest font-black px-2">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4 items-start animate-fade-in">
                                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 animate-pulse">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 rounded-tl-none flex flex-col gap-3 min-w-[200px]">
                                        <div className="flex gap-2 items-center">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                        </div>
                                        <p className="text-[10px] text-indigo-400 uppercase tracking-[3px] font-black animate-pulse">Deep synthesis in progress...</p>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white/[0.02] border-t border-white/10">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[28px] opacity-0 group-hover:opacity-10 transition-opacity blur-lg duration-1000"></div>
                                <div className="relative flex items-center gap-3 bg-black/40 border border-white/10 rounded-[24px] p-2.5 pl-5 ring-1 ring-white/5">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask about runway, risks, or trends..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/20 h-10 font-medium"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-30 disabled:shadow-none hover:scale-105 active:scale-95 group/btn"
                                    >
                                        <Send className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-5 px-1 opacity-40">
                                <p className="text-[8px] text-white/50 uppercase tracking-[4px] font-black">Encrypted Neural Link Active</p>
                                <div className="flex gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                        <span className="text-[8px] text-white/60 font-black uppercase tracking-widest">SENTRY ACTIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatBot;
