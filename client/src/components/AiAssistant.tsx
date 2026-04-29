import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bot, Sparkles } from "lucide-react";

export function AiAssistant() {
  const [prompt, setPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");

  const utils = trpc.useUtils();
  const modelsQuery = trpc.ficha.listModels.useQuery(undefined, {
    enabled: isOpen,
  });

  const processCommand = trpc.ficha.processAiCommand.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.message} (Modelo: ${data.modelUsed})`);
        setPrompt("");
        setIsOpen(false);
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
    if (!prompt.trim()) return;
    processCommand.mutate({ prompt, model: selectedModel || undefined });
  };

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
