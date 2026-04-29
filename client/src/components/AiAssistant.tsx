import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bot, Sparkles, Send, Loader2 } from "lucide-react";

export function AiAssistant({ inline = false }: { inline?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");

  const utils = trpc.useUtils();
  const modelsQuery = trpc.ficha.listModels.useQuery(undefined, {
    enabled: isOpen || inline,
  });

  const processCommand = trpc.ficha.processAiCommand.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.message} (Modelo: ${data.modelUsed})`);
        setPrompt("");
        if (!inline) setIsOpen(false);
        utils.ficha.list.invalidate(); // Refresh dashboard
      } else {
        toast.error(data.message);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro de conexão com a IA.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || processCommand.isPending) return;
    processCommand.mutate({ prompt, model: selectedModel || undefined });
  };

  if (inline) {
    return (
      <div style={{
        background: "rgba(0,0,0,0.03)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        width: "100%",
        maxWidth: "600px",
        transition: "all 0.2s",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.5rem" }}>
          <Sparkles size={16} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
            DOM AI
          </span>
        </div>
        
        <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flex: 1, alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pesquisar ou comandar via IA (ex: Publique a Expo...)"
            style={{
              background: "transparent",
              border: "none",
              padding: "0.5rem",
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.85rem",
              flex: 1,
              outline: "none"
            }}
          />

          {modelsQuery.data && modelsQuery.data.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-faint)",
                fontFamily: "var(--font-sans)",
                fontSize: "0.65rem",
                outline: "none",
                cursor: "pointer",
                maxWidth: "80px"
              }}
            >
              <option value="">Auto</option>
              {modelsQuery.data.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={processCommand.isPending || !prompt.trim()}
            style={{
              background: "var(--gold)",
              color: "var(--ink)",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: processCommand.isPending ? "not-allowed" : "pointer",
              transition: "transform 0.1s",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {processCommand.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          background: "var(--gold)",
          color: "var(--ink)",
          border: "none",
          borderRadius: "50%",
          width: "56px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        width: "320px",
        background: "var(--ink)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius)",
        padding: "1rem",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={16} /> DOM AI
        </h3>
        <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {modelsQuery.data && modelsQuery.data.length > 0 && (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem",
              color: "var(--cream)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.8rem",
              outline: "none"
            }}
          >
            <option value="">Auto (Recomendado)</option>
            {modelsQuery.data.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        )}
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Adicione o Carlos como Diretor na Expo Macaé..."
          rows={3}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-sm)",
            padding: "0.5rem",
            color: "var(--cream)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            resize: "none"
          }}
        />
        <button
          type="submit"
          disabled={processCommand.isPending || !prompt.trim()}
          style={{
            background: "var(--gold)",
            color: "var(--ink)",
            border: "none",
            padding: "0.5rem",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            cursor: processCommand.isPending ? "not-allowed" : "pointer",
            opacity: processCommand.isPending ? 0.7 : 1
          }}
        >
          {processCommand.isPending ? "Processando..." : "Enviar Comando"}
        </button>
      </form>
    </div>
  );
}
