import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bot, Sparkles, Send, Loader2, User, X, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function AiAssistant({ inline = false }: { inline?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Eu sou o DOM AI. Como posso ajudar com suas fichas técnicas hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const modelsQuery = trpc.ficha.listModels.useQuery(undefined, {
    enabled: isOpen || inline,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processCommand.isPending) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    processCommand.mutate({ 
      messages: newMessages, 
      model: selectedModel || undefined 
    });
  };

  if (inline) {
    return (
      <div className="w-full px-2 sm:px-0 my-2">
        <div style={{
          background: "rgba(10, 10, 10, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 215, 0, 0.4)",
          borderRadius: "20px",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.1)",
          transition: "all 0.3s ease",
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
        }}
        >
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
              <span className="hidden sm:inline">DOM AI</span>
              <span className="inline sm:hidden">AI</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flex: 1, alignItems: "center", gap: "8px", minWidth: 0 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="O que deseja fazer?"
              style={{
                background: "transparent",
                border: "none",
                padding: "8px 4px",
                color: "white",
                fontFamily: "var(--font-sans)",
                fontSize: "0.95rem",
                flex: 1,
                outline: "none",
                fontWeight: 500,
                minWidth: 0
              }}
            />

            <button
              type="submit"
              disabled={processCommand.isPending || !input.trim()}
              style={{
                background: "rgba(255,215,0,0.1)",
                color: "var(--gold)",
                border: "1px solid rgba(255,215,0,0.3)",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: processCommand.isPending ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                flexShrink: 0
              }}
            >
              {processCommand.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
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
              height: isMinimized ? "60px" : "500px",
              width: isMinimized ? "200px" : "380px"
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
                  DOM AI
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
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
                {/* Chat Messages */}
                <div 
                  ref={scrollRef}
                  style={{ 
                    flex: 1, 
                    overflowY: "auto", 
                    padding: "20px",
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
                          <><Bot size={10} /> DOM AI</>
                        )}
                      </div>
                      <div style={{
                        background: msg.role === "user" ? "var(--gold)" : "rgba(255,255,255,0.05)",
                        color: msg.role === "user" ? "black" : "white",
                        padding: "10px 14px",
                        borderRadius: msg.role === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        fontSize: "0.85rem",
                        lineHeight: "1.4",
                        border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)"
                      }}>
                        {msg.content}
                      </div>
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

                {/* Input Area */}
                <div style={{ padding: "20px", borderTop: "1px solid rgba(255,215,0,0.1)" }}>
                  <form 
                    onSubmit={handleSubmit}
                    style={{
                      display: "flex",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "16px",
                      padding: "4px",
                      border: "1px solid rgba(255,215,0,0.1)"
                    }}
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Fale comigo..."
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        padding: "10px 14px",
                        color: "white",
                        outline: "none",
                        fontSize: "0.9rem"
                      }}
                    />
                    <button
                      type="submit"
                      disabled={processCommand.isPending || !input.trim()}
                      style={{
                        background: "var(--gold)",
                        color: "black",
                        border: "none",
                        width: "38px",
                        height: "38px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "transform 0.1s"
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                  
                  {modelsQuery.data && modelsQuery.data.length > 0 && (
                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.65rem",
                          outline: "none",
                          cursor: "pointer"
                        }}
                      >
                        <option value="">Inteligência: Automática</option>
                        {modelsQuery.data.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
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
