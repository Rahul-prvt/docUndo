import React, { useState, useRef, useEffect } from 'react';
import { triageApi } from '../lib/api';

interface Message { role: 'user' | 'assistant'; content: string }
interface AiChatWidgetProps { onSpecialtySelected?: (specialty: string) => void }
const greeting: Message = { role: 'assistant', content: "Hi! Tell me your symptoms or health concern and I'll help you find the right type of specialist." };

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({ onSpecialtySelected }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedSpecialty, setSuggestedSpecialty] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const close = () => { setOpen(false); launcherRef.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); launcherRef.current?.focus(); } };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [open, messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setSuggestedSpecialty(null);
    try {
      const { data } = await triageApi.chat(nextMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.suggested_specialty) setSuggestedSpecialty(data.suggested_specialty);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect. Please try sending your message again." }]);
      setInput(text);
    } finally { setLoading(false); }
  };
  const applySpecialty = () => { if (suggestedSpecialty) { onSpecialtySelected?.(suggestedSpecialty); setSuggestedSpecialty(null); close(); } };
  const clearChat = () => { if (!loading) { setMessages([greeting]); setSuggestedSpecialty(null); } };

  return <>
    <button ref={launcherRef} id="ai-chat-bubble" aria-label={open ? 'Close care assistant' : 'Open care assistant'} aria-expanded={open} aria-controls="ai-chat-panel" onClick={() => setOpen(v => !v)} className="chat-launcher btn-primary">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      {open ? 'Close assistant' : 'Help finding care'}
    </button>
    {open && <div id="ai-chat-panel" role="dialog" aria-label="Care assistant" className="chat-panel">
      <div className="flex items-center justify-between gap-2 border-b border-[#dce3df] p-4">
        <div><h2 className="font-bold">Care assistant</h2><p className="mt-1 text-xs text-[#53665e]">AI guidance · Not a diagnosis</p></div>
        <div className="flex"><button onClick={clearChat} disabled={loading} className="btn-ghost px-2 text-xs">Clear</button><button onClick={close} aria-label="Close assistant" className="btn-ghost px-3">✕</button></div>
      </div>
      <div role="log" aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f9f8] p-4">
        {messages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}><div className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-6 ${msg.role === 'user' ? 'bg-[#23634e] text-white' : 'border border-[#e2e8e4] bg-white text-[#344b40]'}`}><span className="sr-only">{msg.role === 'user' ? 'You: ' : 'Assistant: '}</span>{msg.content}</div></div>)}
        {loading && <p role="status" className="text-sm text-[#53665e]">Thinking…</p>}
        {suggestedSpecialty && <div className="rounded-lg border border-[#c9dfd1] bg-[#edf5ef] p-3"><p className="text-sm font-semibold">Suggested: {suggestedSpecialty}</p><button onClick={applySpecialty} className="btn-primary mt-3 w-full">Find these doctors →</button></div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); void sendMessage(); }} className="border-t border-[#dce3df] p-3">
        <label className="sr-only" htmlFor="ai-chat-input">Describe your symptoms</label>
        <div className="flex items-end gap-2"><textarea ref={inputRef} id="ai-chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(); } }} disabled={loading} placeholder="Describe your symptoms…" rows={2} className="field min-w-0 flex-1 resize-none" /><button id="ai-chat-send" disabled={loading || !input.trim()} className="btn-primary px-3" aria-label="Send message">↑</button></div>
      </form>
    </div>}
  </>;
};
