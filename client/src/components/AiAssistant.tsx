import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bot, Sparkles, User, X, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type QuickAction = {
  id: string;
  label: string;
  prompt: string;
};

const quickActions: QuickAction[] = [
  {
    id: "draft-event",
    label: "Criar rascunho",
    prompt: "criar rascunho de evento completo"
  },
  {
    id: "open-guide",
    label: "Como usar o aplicativo (GUIA)",
    prompt: ""
  },
];

export function AiAssistant({
  inline = false,
  onOpenGuide,
}: {
  inline?: boolean;
  onOpenGuide?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Eu sou o DOM BOT. Clique em \"Criar rascunho\"."
    }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const processCommand = trpc.ficha.processAiCommand.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
        if (data.actionTaken !== "chat") {
          toast.success("Ação executada com sucesso!");
          utils.ficha.list.invalidate();
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `Ops, tive um problema: ${data.message}` }]);
        toast.error(data.message);
      }
    },
    onError: (err) => {
      const errorMsg = err.message || "Erro de conexão com a IA.";
      setMessages(prev => [...prev, { role: "assistant", content: `Erro: ${errorMsg}` }]);
      toast.error(errorMsg);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const closeBot = () => setIsOpen(false);
    window.addEventListener("dom-bot-close", closeBot);
    return () => window.removeEventListener("dom-bot-close", closeBot);
  }, []);

  const runQuickAction = (action: QuickAction) => {
    if (action.id === "open-guide") {
      setMessages(prev => [...prev, { role: "user", content: action.label }]);
      onOpenGuide?.();
      setMessages(prev => [...prev, { role: "assistant", content: "Abrindo o guia do aplicativo agora." }]);
      return;
    }

    const visibleMessages = [...messages, { role: "user" as const, content: action.label }];
    const apiMessages = [...messages, { role: "user" as const, content: action.prompt }];
    setMessages(visibleMessages);
    if (action.id === "draft-event") {
      setIsOpen(false);
      resetConversation();
    }
    processCommand.mutate({ messages: apiMessages });
  };

  const resetConversation = () => {
    setMessages([
      {
        role: "assistant",
        content: "Olá! Eu sou o DOM BOT. Clique em \"Criar rascunho\"."
      }
    ]);
  };

  const TextOptions = () => (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      marginTop: "4px"
    }}>
      {quickActions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => runQuickAction(action)}
          disabled={processCommand.isPending}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(212,175,55,0.55)",
            color: "var(--gold)",
            cursor: processCommand.isPending ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            fontWeight: 700,
            padding: "2px 0",
            opacity: processCommand.isPending ? 0.55 : 1,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );

  if (inline) {
    return (
      <div className="w-full px-2 sm:px-0 my-2">
        <div style={{
          background: "rgba(10, 10, 10, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 215, 0, 0.4)",
          borderRadius: "20px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.1)",
          transition: "all 0.3s ease",
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              background: "linear-gradient(135deg, #FFD700 0%, #B8860B 100%)",
              borderRadius: "14px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 10px rgba(184, 134, 11, 0.4)",
              flexShrink: 0,
            }}>
              <Sparkles size={16} color="black" className="animate-pulse" />
              <span style={{
                fontFamily: "var(--font-serif)",
                fontSize: "0.7rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "black",
                display: "var(--show-dom-ai, inline-block)"
              }}>
                <span className="hidden sm:inline">DOM BOT</span>
                <span className="inline sm:hidden">BOT</span>
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.66)" }}>
              Clique em "Criar rascunho" para gerar um evento completo.
            </div>
          </div>

          <TextOptions />
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              background: "linear-gradient(135deg, #FFD700 0%, #B8860B 100%)",
              color: "black",
              border: "none",
              borderRadius: "50%",
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255,215,0,0.2)",
              cursor: "pointer",
              zIndex: 100,
            }}
            whileHover={{ scale: 1.1, boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.4)" }}
            whileTap={{ scale: 0.9 }}
          >
            <Bot size={32} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              scale: 1,
              height: isMinimized ? "56px" : "420px",
              width: isMinimized ? "190px" : "330px"
            }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              background: "rgba(10, 10, 10, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 215, 0, 0.2)",
              borderRadius: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: "16px 20px", 
              borderBottom: "1px solid rgba(255,215,0,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(to right, rgba(255,215,0,0.05), transparent)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={18} style={{ color: "var(--gold)" }} />
                <span style={{ 
                  fontFamily: "var(--font-serif)", 
                  fontWeight: 700, 
                  color: "var(--gold)",
                  fontSize: "1.1rem"
                }}>
                  DOM BOT
                </span>
              </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={resetConversation}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                  aria-label="Reiniciar conversa"
                  title="Reiniciar conversa"
                >
                  <Sparkles size={16} />
                </button>
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  style={{ 
                    flex: 1, 
                    overflowY: "auto", 
                    padding: "18px 20px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                  }}
                >
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: msg.role === "user" ? 20 : -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        alignItems: msg.role === "user" ? "flex-end" : "flex-start"
                      }}
                    >
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "6px",
                        fontSize: "0.65rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>
                        {msg.role === "user" ? (
                          <>Você <User size={10} /></>
                        ) : (
                          <><Bot size={10} /> DOM BOT</>
                        )}
                      </div>
                      <div style={{
                        background: msg.role === "user" ? "var(--gold)" : "rgba(255,255,255,0.05)",
                        color: msg.role === "user" ? "black" : "white",
                        padding: "10px 14px",
                        borderRadius: msg.role === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        fontSize: "0.85rem",
                        lineHeight: "1.4",
                        border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
                        textAlign: "left",
                      }}>
                        {msg.content}
                      </div>
                      {msg.role === "assistant" && i === messages.length - 1 && (
                        <div style={{ width: "100%", marginTop: "6px" }}>
                          <TextOptions />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {processCommand.isPending && (
                    <div style={{ alignSelf: "flex-start", display: "flex", gap: "8px", padding: "8px" }}>
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
