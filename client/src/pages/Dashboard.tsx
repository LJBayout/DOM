import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Eye, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { AiAssistant } from "@/components/AiAssistant";

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const { data: fichas, isLoading, refetch } = trpc.ficha.list.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteMutation = trpc.ficha.delete.useMutation({
    onSuccess: () => {
      toast.success("Ficha excluída com sucesso.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const isAdmin = user?.role === "admin";

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Excluir a ficha "${name}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate({ id });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.12em" }}>
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>

      {/* Header */}
      <header style={{ background: "var(--ink)", padding: "0 1.25rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              DOM
            </span>
            <span style={{ width: "1px", height: "18px", background: "var(--gold)", opacity: 0.3, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 400, color: "rgba(255,255,255,0.55)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Produções e Eventos
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8 }}>
            {isAdmin ? "Admin" : "Usuário"}
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(1.5rem, 5vw, 3.5rem) 1.25rem" }}>

        {/* Page header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.4rem", fontWeight: 600 }}>
                Gestão de Eventos
              </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem", flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Eventos
              </h1>
              <div style={{ flex: 1, minWidth: "300px", marginBottom: "0.4rem" }}>
                <AiAssistant inline />
              </div>
            </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate("/ficha/nova")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "var(--gold)",
                  color: "var(--ink)",
                  border: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderRadius: "var(--radius)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={14} />
                Nova Ficha
              </button>
            )}
          </div>
          <div style={{ height: "2px", background: "linear-gradient(90deg, var(--gold) 0%, var(--gold-soft) 100%)", marginTop: "1.25rem", borderRadius: "2px" }} />
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ padding: "4rem 0", textAlign: "center", color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.75rem", letterSpacing: "0.15em" }}>
            Carregando fichas...
          </div>
        ) : !fichas || fichas.length === 0 ? (
          <div style={{ padding: "4rem 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", color: "var(--ink-light)", marginBottom: "0.75rem" }}>
              Nenhuma ficha técnica encontrada.
            </p>
            {isAdmin && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--ink-faint)" }}>
                Crie a primeira ficha para começar.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Responsive Cards (Mobile & Desktop) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {fichas.map((ficha) => (
                <div
                  key={ficha.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1.25rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", paddingRight: "0.5rem" }}>
                        {ficha.eventName}
                      </p>
                      <StatusBadge status={ficha.status} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--ink-mid)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <CalendarDays size={14} color="var(--gold)" />
                        {formatDate(ficha.eventDate)}
                      </span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--ink-mid)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <MapPin size={14} color="var(--gold)" />
                        {ficha.location || "—"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <ActionBtn onClick={() => navigate(`/ficha/${ficha.id}`)} icon={Eye} label="Ver" />
                    {isAdmin && (
                      <>
                        <ActionBtn onClick={() => navigate(`/ficha/${ficha.id}/editar`)} icon={Pencil} label="Editar" />
                        <ActionBtn onClick={() => handleDelete(ficha.id, ficha.eventName)} icon={Trash2} label="Excluir" danger disabled={deleteMutation.isPending} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--ink-faint)", textTransform: "uppercase" }}>
                {fichas.length} {fichas.length === 1 ? "ficha" : "fichas"}
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span style={{
      display: "inline-block",
      padding: "0.15rem 0.55rem",
      background: published ? "var(--gold)" : "var(--cream-deeper)",
      color: published ? "var(--ink)" : "var(--ink-light)",
      fontFamily: "var(--font-sans)",
      fontSize: "0.55rem",
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      borderRadius: "999px",
      whiteSpace: "nowrap",
    }}>
      {published ? "Publicada" : "Rascunho"}
    </span>
  );
}

function ActionBtn({ onClick, label, icon: Icon, danger = false, disabled = false }: {
  onClick: () => void;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.4rem 0.85rem",
        background: "transparent",
        color: danger ? "var(--destructive)" : "var(--ink)",
        border: `1px solid ${danger ? "var(--destructive)" : "var(--rule)"}`,
        fontFamily: "var(--font-sans)",
        fontSize: "0.6rem",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        transition: "all 0.15s",
      }}
    >
      {Icon && <Icon size={11} />}
      {label}
    </button>
  );
}
