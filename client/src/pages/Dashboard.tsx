import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Eye, MapPin, Pencil, Plus, Trash2, FileText, X, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [ridersModal, setRidersModal] = useState<{ open: boolean; eventName: string; pdfs: any[] }>({
    open: false,
    eventName: "",
    pdfs: [],
  });

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

  const openRiders = (name: string, pdfsStr: string | null) => {
    try {
      const pdfs = pdfsStr ? JSON.parse(pdfsStr) : [];
      setRidersModal({ open: true, eventName: name, pdfs });
    } catch (e) {
      setRidersModal({ open: true, eventName: name, pdfs: [] });
    }
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
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.4rem", fontWeight: 600 }}>
                  Gestão de Eventos
                </p>
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  Eventos
                </h1>
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
                  <span className="hidden sm:inline">Nova Ficha</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              )}
            </div>
            
            <div style={{ width: "100%", maxWidth: "800px" }}>
              <AiAssistant inline />
            </div>
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
                      {ficha.localProducerName && (
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--ink-mid)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <UserRound size={14} color="var(--gold)" />
                          {ficha.localProducerName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <ActionBtn onClick={() => navigate(`/ficha/${ficha.id}`)} icon={Eye} label="Ver" />
                    <ActionBtn onClick={() => openRiders(ficha.eventName, ficha.attractionPdfs)} icon={FileText} label="Riders" />
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

      {/* Riders Modal */}
      {ridersModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", itemsCenter: "center", justifyContent: "center", zIndex: 100, padding: "1.25rem" }}>
          <div style={{ background: "var(--cream)", width: "100%", maxWidth: "500px", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--gold)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", animation: "fadeInUp 0.3s ease" }}>
            <div style={{ background: "var(--ink)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--gold)", margin: 0, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Riders & Mapas
              </h3>
              <button onClick={() => setRidersModal({ ...ridersModal, open: false })} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}><X size={20} /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem", fontWeight: 700 }}>
                {ridersModal.eventName}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {ridersModal.pdfs.length > 0 ? ridersModal.pdfs.map((pdf, idx) => (
                  <a
                    key={idx}
                    href={pdf.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "1rem",
                      background: "white",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      color: "var(--ink)",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ background: "var(--gold)", color: "var(--ink)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                      <FileText size={18} />
                    </div>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 600, flex: 1 }}>
                      {pdf.name.toUpperCase()}
                    </span>
                  </a>
                )) : (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--ink-faint)", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontStyle: "italic" }}>
                    Nenhum rider ou mapa anexado a esta ficha.
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.02)", textAlign: "right" }}>
              <button onClick={() => setRidersModal({ ...ridersModal, open: false })} style={{ background: "var(--ink)", color: "var(--gold)", padding: "0.5rem 1rem", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <AiAssistant />
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
