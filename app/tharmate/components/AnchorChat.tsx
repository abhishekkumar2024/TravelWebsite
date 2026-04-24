'use client';

/**
 * AnchorChat — Live Chat for a Single Anchor Room
 * 
 * Reuses the same chat patterns from ChatRoom.tsx:
 *   - 3s polling for messages
 *   - Auto-scroll
 *   - Rich media via ChatMediaBar
 *   - Presence heartbeat
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { sanitize } from '@/lib/sanitize';
import ChatMediaBar, { type ChatAttachment } from './ChatMediaBar';

interface AnchorMessage {
    id: string;
    anchorId: string;
    senderId: string;
    senderName: string;
    senderImage: string | null;
    message: string;
    messageType: string;
    createdAt: string;
}

interface AnchorInfo {
    id: string;
    label: string;
    emoji: string;
    city: string;
    type: string;
}

// ─── Helpers (reused from ChatRoom) ─────────────────────────────

function getInitials(name: string | null | undefined): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
    const colors = ['#B5451B', '#5B8DB8', '#7A9E7E', '#F0A500', '#C4975A', '#E85D1B'];
    if (!name) return colors[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

function formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isMediaMessage(type: string): boolean {
    return ['image', 'gif', 'photo'].includes(type);
}

function isSingleEmoji(msg: string): boolean {
    const trimmed = msg.trim();
    if (trimmed.length === 0 || trimmed.length > 14) return false;
    const withoutEmoji = trimmed.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}]/gu, '');
    return withoutEmoji.length === 0;
}

function parseMediaMessage(msg: string): { url: string; caption: string | null } {
    const separatorIndex = msg.indexOf('\n\n');
    if (separatorIndex === -1) return { url: msg, caption: null };
    return {
        url: msg.substring(0, separatorIndex),
        caption: msg.substring(separatorIndex + 2).trim() || null,
    };
}

interface AnchorChatProps {
    anchorId: string;
    session: any;
    onBack: () => void;
}

export default function AnchorChat({ anchorId, session, onBack }: AnchorChatProps) {
    const [messages, setMessages] = useState<AnchorMessage[]>([]);
    const [anchorInfo, setAnchorInfo] = useState<AnchorInfo | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [activeMembers, setActiveMembers] = useState(0);
    const [attachment, setAttachment] = useState<ChatAttachment | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const lastMsgIdRef = useRef<string | undefined>();
    const shouldAutoScroll = useRef(true);
    const currentUserId = session?.user?.id;

    // ─── Scroll Logic ───────────────────────────────────────────
    const scrollToBottom = useCallback(() => {
        if (scrollRef.current && shouldAutoScroll.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    // ─── Fetch Messages (Poll) ──────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const params = new URLSearchParams({ anchorId });
            if (lastMsgIdRef.current) params.set('after', lastMsgIdRef.current);

            const res = await fetch(`/api/tharmate/anchor-rooms?${params}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.anchor) setAnchorInfo(data.anchor);
            if (data.activeMembers !== undefined) setActiveMembers(data.activeMembers);

            if (data.messages && data.messages.length > 0) {
                if (lastMsgIdRef.current) {
                    // Append new messages
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newMsgs = data.messages.filter((m: AnchorMessage) => !existingIds.has(m.id));
                        return [...prev, ...newMsgs];
                    });
                } else {
                    // First load
                    setMessages(data.messages);
                }
                const lastMsg = data.messages[data.messages.length - 1];
                lastMsgIdRef.current = lastMsg.id;
                setTimeout(scrollToBottom, 50);
            }
        } catch (err) {
            console.error('Error fetching anchor messages:', err);
        }
    }, [anchorId, scrollToBottom]);

    // ─── Polling ────────────────────────────────────────────────
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // ─── Send Message ───────────────────────────────────────────
    const handleSend = async () => {
        const textContent = inputValue.trim();
        const hasContent = textContent.length > 0 || attachment;
        if (!hasContent || sending || !currentUserId) return;

        setSending(true);
        try {
            let finalMessage = textContent;
            let msgType = 'text';

            if (attachment) {
                finalMessage = attachment.url;
                msgType = attachment.type === 'gif' ? 'gif' : 'image';
                if (textContent) {
                    finalMessage = `${attachment.url}\n\n${textContent}`;
                }
            }

            const res = await fetch('/api/tharmate/anchor-rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anchorId, message: finalMessage, messageType: msgType }),
            });

            if (res.ok) {
                setInputValue('');
                setAttachment(null);
                fetchMessages();
            }
        } catch {
            console.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInsertEmoji = (emoji: string) => {
        setInputValue(prev => prev + emoji);
        inputRef.current?.focus();
    };

    const handleAttach = (attr: ChatAttachment) => {
        setAttachment(attr);
    };

    // ─── Render ─────────────────────────────────────────────────
    const renderMessage = (msg: AnchorMessage) => {
        const isSystem = msg.messageType === 'system';
        const isOwn = msg.senderId === currentUserId;
        const isMedia = isMediaMessage(msg.messageType);
        const isEmoji = msg.messageType === 'emoji' || (msg.messageType === 'text' && isSingleEmoji(msg.message));

        if (isSystem) {
            return (
                <div key={msg.id} className="text-center py-1">
                    <span className="text-[10px] text-gray-400 bg-[#C4975A]/5 px-2 py-0.5 rounded-full">
                        {msg.senderName || 'Someone'} {sanitize(msg.message)}
                    </span>
                </div>
            );
        }

        return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${getAvatarColor(msg.senderName)}, ${getAvatarColor(msg.senderName)}88)` }}
                    >
                        {msg.senderImage ? (
                            <img src={msg.senderImage} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            getInitials(msg.senderName)
                        )}
                    </div>
                )}

                <div className={`max-w-[75%] ${isOwn ? 'ml-auto' : ''}`}>
                    {!isOwn && (
                        <div className="text-[10px] font-semibold text-gray-500 mb-0.5 truncate">
                            {msg.senderName || 'Traveler'}
                        </div>
                    )}

                    {isEmoji ? (
                        <div className="tm-chat-emoji-msg">{msg.message}</div>
                    ) : isMedia ? (
                        (() => {
                            const { url, caption } = parseMediaMessage(msg.message);
                            return (
                                <div className={`rounded-2xl overflow-hidden border border-gray-100 ${isOwn ? 'rounded-tr-md' : 'rounded-tl-md'}`}>
                                    <img src={url} alt="" className="max-w-[220px] max-h-[200px] object-cover cursor-pointer" loading="lazy" />
                                    {caption && (
                                        <div className="tm-chat-caption">{sanitize(caption)}</div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                            isOwn
                                ? 'bg-gradient-to-br from-[#C84B1E] to-[#E85D1B] text-white rounded-tr-md'
                                : 'bg-[#F5EDE0] text-[#3A2010] rounded-tl-md'
                        }`}>
                            {sanitize(msg.message)}
                        </div>
                    )}

                    <div className={`text-[9px] mt-0.5 ${isOwn ? 'text-right' : ''} text-gray-400`}>
                        {formatTime(msg.createdAt)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col bg-[#FDF6EC] rounded-2xl border border-[#EDD8BA] shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-[#EDD8BA]">
                <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#F5EDE0] flex items-center justify-center hover:bg-[#EDD8BA] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">
                        {anchorInfo ? `${anchorInfo.emoji} ${anchorInfo.label}` : 'Loading...'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-500">
                            {anchorInfo?.city} · 48hr live chat
                        </p>
                        {activeMembers > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded-md border border-green-100">
                                <span className="flex w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-green-700">{activeMembers} ONLINE</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">
                    🌍 PUBLIC
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-2 p-3 scrollbar-hide">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-2">{anchorInfo?.emoji || '🌍'}</div>
                        <p className="text-sm text-gray-500">
                            {anchorInfo ? `Start chatting about ${anchorInfo.label}!` : 'Loading...'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">Messages auto-expire after 48 hours</p>
                    </div>
                )}
                {messages.map(renderMessage)}
            </div>

            {/* Attachment Preview */}
            {attachment && (
                <div className="tm-attachment-preview mx-3">
                    <div className="tm-attachment-thumb">
                        <img src={attachment.previewUrl || attachment.url} alt="Preview" />
                        <div className="tm-attachment-badge">{attachment.type.toUpperCase()}</div>
                    </div>
                    <div className="tm-attachment-info">
                        <div className="tm-attachment-label">{attachment.type === 'gif' ? 'GIF' : 'Photo'} attached</div>
                        <div className="tm-attachment-hint">Will be sent with your message</div>
                    </div>
                    <button className="tm-attachment-remove" onClick={() => setAttachment(null)}>×</button>
                </div>
            )}

            {/* Input Area */}
            {session?.user ? (
                <div className="border-t border-[#EDD8BA] bg-white/80 p-2">
                    <div className="flex items-end gap-2">
                        <ChatMediaBar
                            onInsertEmoji={handleInsertEmoji}
                            onAttach={handleAttach}
                            disabled={sending}
                        />
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Say something..."
                            className="flex-1 resize-none bg-[#F5EDE0] border border-[#EDD8BA] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#C84B1E] transition-colors min-h-[38px] max-h-[80px]"
                            rows={1}
                            disabled={sending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={sending || (!inputValue.trim() && !attachment)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                            style={{
                                background: (!inputValue.trim() && !attachment) ? '#EDD8BA' : 'linear-gradient(135deg, #C84B1E, #E85D1B)',
                                color: (!inputValue.trim() && !attachment) ? '#8A7055' : '#fff',
                                opacity: sending ? 0.6 : 1,
                            }}
                        >
                            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-[#EDD8BA] bg-white/80 p-4 text-center">
                    <p className="text-xs text-gray-500 italic">Sign in to join the conversation 🏜️</p>
                </div>
            )}
        </div>
    );
}
