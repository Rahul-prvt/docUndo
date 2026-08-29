import React, { useState, useRef, useEffect } from "react";
import { triageApi } from "../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatWidgetProps {
  onSpecialtySelected?: (specialty: string) => void;
}

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({ onSpecialtySelected }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your DoctorUndo medical assistant. Tell me your symptoms or health concern and I'll help guide you to the right specialist. 🩺",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedSpecialty, setSuggestedSpecialty] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await triageApi.chat(nextMessages);
      const data = res.data;
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.suggested_specialty) {
        setSuggestedSpecialty(data.suggested_specialty);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const applySpecialty = () => {
    if (suggestedSpecialty) {
      onSpecialtySelected?.(suggestedSpecialty);
      setSuggestedSpecialty(null);
      setOpen(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your DoctorUndo medical assistant. Tell me your symptoms or health concern and I'll help guide you to the right specialist. 🩺",
      },
    ]);
    setSuggestedSpecialty(null);
  };

  return (
    <>
      {/* ── Floating bubble ────────────────────────────────────────────────── */}
      <button
        id="ai-chat-bubble"
        aria-label="Open AI medical assistant"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #12201e 0%, #214b41 60%, #5eaa98 100%)",
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r=".5" fill="white" />
            <circle cx="12" cy="10" r=".5" fill="white" />
            <circle cx="15" cy="10" r=".5" fill="white" />
          </svg>
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#5eaa98]" />
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <div
        id="ai-chat-panel"
        style={{
          position: "fixed",
          bottom: "5.5rem",
          right: "1.25rem",
          zIndex: 9998,
          width: "min(380px, calc(100vw - 2rem))",
          maxHeight: "520px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "1.25rem",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(18,32,30,0.28)",
          transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.22s cubic-bezier(.32,1.12,.42,1), opacity 0.18s ease",
          background: "#12201e",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #12201e 0%, #1e3d35 100%)",
            padding: "1rem 1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#d5ff78,#5eaa98)",
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🩺
            </span>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}>
                AI Medical Assistant
              </p>
              <p style={{ color: "#7abad0", fontSize: "0.7rem" }}>Powered by Groq · Not a doctor</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            title="Clear conversation"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "none",
              borderRadius: "0.5rem",
              color: "#a8c4bc",
              fontSize: "0.7rem",
              padding: "0.25rem 0.6rem",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
            background: "#12201e",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "0.6rem 0.85rem",
                  borderRadius:
                    msg.role === "user"
                      ? "1rem 1rem 0.2rem 1rem"
                      : "1rem 1rem 1rem 0.2rem",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg,#d5ff78,#b8ef50)"
                      : "rgba(255,255,255,0.07)",
                  color: msg.role === "user" ? "#12201e" : "#e2eeea",
                  fontSize: "0.83rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  backdropFilter: msg.role === "assistant" ? "blur(8px)" : undefined,
                  border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", gap: "0.35rem", padding: "0.4rem 0.2rem" }}>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#5eaa98",
                    animation: `bounce 1.2s ${dot * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Specialty suggestion banner */}
          {suggestedSpecialty && (
            <div
              style={{
                background: "rgba(213,255,120,0.12)",
                border: "1px solid rgba(213,255,120,0.3)",
                borderRadius: "0.85rem",
                padding: "0.7rem 0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <p style={{ color: "#d5ff78", fontSize: "0.8rem", lineHeight: 1.4 }}>
                <strong>Suggested:</strong> {suggestedSpecialty}
              </p>
              <button
                onClick={applySpecialty}
                style={{
                  background: "#d5ff78",
                  color: "#12201e",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Apply filter →
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            background: "#1a2e28",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "0.75rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="Describe your symptoms…"
            rows={1}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "0.75rem",
              color: "#e2eeea",
              fontSize: "0.83rem",
              lineHeight: 1.5,
              padding: "0.55rem 0.8rem",
              resize: "none",
              outline: "none",
              minHeight: 38,
              maxHeight: 100,
              overflowY: "auto",
              fontFamily: "inherit",
            }}
          />
          <button
            id="ai-chat-send"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{
              width: 38,
              height: 38,
              borderRadius: "0.75rem",
              border: "none",
              background:
                loading || !input.trim()
                  ? "rgba(255,255,255,0.1)"
                  : "linear-gradient(135deg,#d5ff78,#b8ef50)",
              color: loading || !input.trim() ? "#5e7a72" : "#12201e",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bounce keyframe */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
};
