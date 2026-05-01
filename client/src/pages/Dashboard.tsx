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
    id: 0,
  });

  const getUploadUrlMutation = trpc.storage.getUploadUrl.useMutation();
  const updatePdfsMutation = trpc.ficha.updatePdfs.useMutation({
    onSuccess: () => {
      toast.success("Riders atualizados.");
      refetch();
    }
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

  const openRiders = (id: number, name: string, pdfsStr: string | null) => {
    try {
      const pdfs = pdfsStr ? JSON.parse(pdfsStr) : [];
      setRidersModal({ open: true, eventName: name, pdfs, id });
    } catch (e) {
      setRidersModal({ open: true, eventName: name, pdfs: [], id });
    }
  };

  const handleQuickPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ridersModal.id) return;

    const toastId = toast.loading("Enviando PDF...");
    try {
      const { url, publicUrl, proxyUploadUrl, key } = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      const resp = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!resp.ok) {
        await fetch(proxyUploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      }

      const updatedPdfs = [...ridersModal.pdfs, { name: file.name, url: publicUrl, key }];
      await updatePdfsMutation.mutateAsync({ id: ridersModal.id, pdfs: JSON.stringify(updatedPdfs) });
      
      setRidersModal(prev => ({ ...prev, pdfs: updatedPdfs }));
      toast.dismiss(toastId);
    } catch (err) {
      toast.error("Falha no upload");
      toast.dismiss(toastId);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.12em" }}>
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* Header */}
      <header style={{ background: "var(--ink)", padding: "0 1.25rem", borderBottom: "1px solid var(--border)" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isAdmin && (
              <button 
                onClick={() => navigate("/admin")}
                style={{ background: "rgba(212, 175, 55, 0.1)", border: "1px solid var(--gold)", color: "var(--gold)", padding: "0.3rem 0.6rem", borderRadius: "4px", fontSize: "0.55rem", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                Painel Admin
              </button>
            )}
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8 }}>
              {isAdmin ? "Admin" : "Usuário"}
            </span>
          </div>
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
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
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
                  <span className="hidden sm:inline">Criar Evento</span>
                  <span className="sm:hidden">Criar</span>
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
            Carregando eventos...
          </div>
        ) : !fichas || fichas.filter(f => !f.deletedAt).length === 0 ? (
          <div style={{ padding: "4rem 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", color: "var(--foreground)", opacity: 0.7, marginBottom: "0.75rem" }}>
              Nenhum evento ativo encontrado.
            </p>
            {isAdmin && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--ink-faint)" }}>
                Consulte o Painel Admin para ver eventos desativados.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Responsive Cards (Mobile & Desktop) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {fichas.filter(ficha => !ficha.deletedAt).map((ficha) => (
                <div
                  key={ficha.id}
                  onClick={() => navigate(`/ficha/${ficha.id}`)}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1.25rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    position: "relative",
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", paddingRight: "0.5rem" }}>
                        {ficha.eventName}
                      </p>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <StatusBadge status={ficha.status} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <CalendarDays size={14} color="var(--gold)" />
                        {formatDate(ficha.eventDate)}
                      </span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <MapPin size={14} color="var(--gold)" />
                        {ficha.location || "—"}
                      </span>
                      {ficha.localProducerName && (
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <UserRound size={14} color="var(--gold)" />
                          {ficha.localProducerName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      display: "flex", 
                      gap: "0.4rem", 
                      borderTop: "1px solid var(--border)", 
                      paddingTop: "1rem",
                      overflowX: "auto",
                      scrollbarWidth: "none", // Hide scrollbar on Firefox
                    }}
                    className="no-scrollbar" // Add class to hide scrollbar
                  >
                    <ActionBtn onClick={() => navigate(`/ficha/${ficha.id}`)} icon={Eye} label="Ver" />
                    <ActionBtn onClick={() => openRiders(ficha.id, ficha.eventName, ficha.attractionPdfs)} icon={FileText} label="Riders" />
                    {isAdmin && (
                      <>
                        <ActionBtn onClick={() => navigate(`/ficha/${ficha.id}/editar`)} icon={Pencil} label="Editar" />
                        {!ficha.deletedAt && (
                          <ActionBtn onClick={() => handleDelete(ficha.id, ficha.eventName)} icon={Trash2} label="Excluir" danger disabled={deleteMutation.isPending} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--ink-faint)", textTransform: "uppercase" }}>
                {fichas.length} {fichas.length === 1 ? "evento" : "eventos"}
              </span>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: "4rem 1.25rem 2rem", borderTop: "1px solid var(--border)", background: "var(--background)", textAlign: "center" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "0.9rem", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.05em" }}>DOM PRODUÇÕES</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)", opacity: 0.8 }}>CIS LLC</span>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Macaé • MIT LICENSE
          </p>
          <p style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", marginTop: "1.5rem" }}>
            © {new Date().getFullYear()} — All rights reserved
          </p>
        </div>
      </footer>

      {/* Riders Modal */}
      {ridersModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1.25rem" }}>
          <div style={{ background: "var(--card)", width: "100%", maxWidth: "500px", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--gold)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", animation: "fadeInUp 0.3s ease" }}>
            <div style={{ background: "var(--ink)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--gold)", margin: 0, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Riders & Mapas
              </h3>
              <button onClick={() => setRidersModal({ ...ridersModal, open: false })} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}><X size={20} /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                  {ridersModal.eventName}
                </p>
                {isAdmin && (
                  <label style={{ cursor: "pointer", color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Plus size={14} /> Adicionar +PDF
                    <input type="file" accept="application/pdf" onChange={handleQuickPdfUpload} style={{ display: "none" }} />
                  </label>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto", padding: "0.25rem" }}>
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
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      color: "var(--foreground)",
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
                    Nenhum rider ou mapa anexado.
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", textAlign: "right" }}>
              <button onClick={() => setRidersModal({ ...ridersModal, open: false })} style={{ background: "var(--ink)", color: "var(--gold)", padding: "0.5rem 1rem", border: "1px solid var(--gold)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
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
  const deleted = status === "deleted";
  
  let bg = published ? "var(--gold)" : "rgba(255, 255, 255, 0.05)";
  let fg = published ? "var(--ink)" : "rgba(255, 255, 255, 0.6)";
  let border = published ? "1px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.1)";
  let text = published ? "Publicada" : "Rascunho";

  if (deleted) {
    bg = "rgba(153, 27, 27, 0.2)";
    fg = "#ff4444";
    border = "1px solid #991b1b";
    text = "Desativado";
  }

  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.6rem",
      background: bg,
      color: fg,
      border: border,
      fontFamily: "var(--font-sans)",
      fontSize: "0.55rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      borderRadius: "var(--radius-sm)",
      whiteSpace: "nowrap",
    }}>
      {text}
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
  const isPrimary = label === "Ver";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.4rem 0.6rem",
        background: isPrimary ? "var(--gold)" : danger ? "rgba(153, 27, 27, 0.1)" : "rgba(255, 255, 255, 0.05)",
        color: isPrimary ? "var(--ink)" : danger ? "#ff4444" : "var(--foreground)",
        border: `1px solid ${isPrimary ? "var(--gold)" : danger ? "#991b1b" : "var(--border)"}`,
        fontFamily: "var(--font-sans)",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3rem",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isPrimary ? "0 4px 12px rgba(212, 175, 55, 0.2)" : "none",
        whiteSpace: "nowrap",
        flex: 1, // Allow buttons to grow and fill the row equally
        minWidth: "fit-content",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        if (!isPrimary && !danger) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.color = "var(--gold)";
        } else if (danger) {
          e.currentTarget.style.background = "var(--destructive)";
          e.currentTarget.style.color = "white";
        } else if (isPrimary) {
          e.currentTarget.style.filter = "brightness(1.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.filter = "none";
        e.currentTarget.style.background = isPrimary ? "var(--gold)" : danger ? "rgba(153, 27, 27, 0.1)" : "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.color = isPrimary ? "var(--ink)" : danger ? "#ff4444" : "var(--foreground)";
        e.currentTarget.style.borderColor = isPrimary ? "var(--gold)" : danger ? "#991b1b" : "var(--border)";
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}
