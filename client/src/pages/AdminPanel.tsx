import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, Pencil, Trash2, Search, Filter, Calendar, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number; name: string }>({
    open: false,
    id: 0,
    name: "",
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      toast.error("Acesso restrito.");
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const { data: fichas, isLoading, refetch } = trpc.ficha.list.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const deleteMutation = trpc.ficha.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento desativado.");
      setDeleteDialog({ open: false, id: 0, name: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const openDeleteDialog = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const confirmDelete = () => {
    if (!deleteDialog.id) return;
    deleteMutation.mutate({ id: deleteDialog.id });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>CARREGANDO PAINEL...</span>
      </div>
    );
  }

  const filteredFichas = (fichas || []).filter(f => {
    const matchesSearch = f.eventName.toLowerCase().includes(search.toLowerCase()) || 
                         f.attraction?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "deleted" && f.deletedAt) || 
                         (statusFilter === f.status && !f.deletedAt);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header style={{ background: "var(--ink)", borderBottom: "1px solid var(--border)", padding: "0 1rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", height: "70px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button 
              onClick={() => navigate("/dashboard")}
              style={{ background: "transparent", border: "none", color: "var(--gold)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}
            >
              <ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: isMobile ? "0.9rem" : "1.25rem", fontWeight: 800, fontFamily: "var(--font-serif)", letterSpacing: "0.02em", margin: 0 }}>
              PAINEL <span style={{ color: "var(--gold)" }}>ADMIN</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--gold)", fontWeight: 800, textTransform: "uppercase", background: "rgba(212, 175, 55, 0.1)", padding: "0.3rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--gold)" }}>
              {isMobile ? "Admin" : "Controle Total"}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: isMobile ? "1rem" : "2rem 1.5rem" }}>
        
        {/* Filters Bar */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1rem", marginBottom: "2rem", background: "var(--card)", padding: "1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--gold)" }} />
            <input 
              type="text" 
              placeholder="Buscar evento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 3rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white", outline: "none", fontFamily: "var(--font-sans)", fontSize: "0.9rem" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Filter size={16} style={{ color: "var(--gold)" }} />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ flex: isMobile ? 1 : "initial", padding: "0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white", outline: "none", fontSize: "0.9rem" }}
            >
              <option value="all">Todos Status</option>
              <option value="published">Publicados</option>
              <option value="draft">Rascunhos</option>
              <option value="deleted">Desativados</option>
            </select>
          </div>
        </div>

        {/* Desktop Data Table */}
        {!isMobile && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                    <th style={thStyle}>Evento</th>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Local</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFichas.map(ficha => (
                    <tr 
                      key={ficha.id} 
                      style={{ 
                        borderBottom: "1px solid var(--border)", 
                        transition: "background 0.2s",
                        opacity: ficha.deletedAt ? 0.5 : 1,
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: "white", textDecoration: ficha.deletedAt ? "line-through" : "none" }}>{ficha.eventName}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--gold)", textTransform: "uppercase" }}>{ficha.attraction || "Sem atração"}</div>
                      </td>
                      <td style={tdStyle}>{new Date(ficha.eventDate).toLocaleDateString("pt-BR")}</td>
                      <td style={tdStyle}>{ficha.location}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={ficha.deletedAt ? "deleted" : ficha.status} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <IconButton icon={Eye} onClick={() => navigate(`/ficha/${ficha.id}`)} color="var(--gold)" />
                          <IconButton icon={Pencil} onClick={() => navigate(`/ficha/${ficha.id}/editar`)} color="white" />
                          {!ficha.deletedAt && (
                          <IconButton 
                            icon={Trash2} 
                            onClick={() => openDeleteDialog(ficha.id, ficha.eventName)} 
                            color="#ff4444" 
                          />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filteredFichas.map(ficha => (
              <div 
                key={ficha.id} 
                style={{ 
                  background: "var(--card)", 
                  border: "1px solid var(--border)", 
                  borderRadius: "var(--radius)", 
                  padding: "1rem",
                  opacity: ficha.deletedAt ? 0.5 : 1,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "white", textDecoration: ficha.deletedAt ? "line-through" : "none" }}>{ficha.eventName}</h3>
                    <div style={{ fontSize: "0.65rem", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700 }}>{ficha.attraction || "—"}</div>
                  </div>
                  <StatusBadge status={ficha.deletedAt ? "deleted" : ficha.status} />
                </div>
                
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                    <Calendar size={12} color="var(--gold)" /> {new Date(ficha.eventDate).toLocaleDateString("pt-BR")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                    <MapPin size={12} color="var(--gold)" /> {ficha.location?.substring(0, 15)}...
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <button onClick={() => navigate(`/ficha/${ficha.id}`)} style={mobileActionStyle}><Eye size={16} /> Ver</button>
                  <button onClick={() => navigate(`/ficha/${ficha.id}/editar`)} style={mobileActionStyle}><Pencil size={16} /> Editar</button>
                  {!ficha.deletedAt && (
                  <button 
                    onClick={() => openDeleteDialog(ficha.id, ficha.eventName)} 
                    style={{ ...mobileActionStyle, color: "#ff4444" }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFichas.length === 0 && (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted-foreground)" }}>
            Nenhum evento encontrado.
          </div>
        )}
      </main>

      {deleteDialog.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "1rem" }}>
          <div style={{ width: "100%", maxWidth: "420px", background: "var(--card)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.1rem", background: "var(--ink)", borderBottom: "1px solid var(--border)" }}>
              <p style={{ margin: 0, color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Confirmar exclusão
              </p>
            </div>
            <div style={{ padding: "1.1rem" }}>
              <p style={{ margin: 0, color: "var(--foreground)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Desativar o evento "{deleteDialog.name}"?
              </p>
              <p style={{ margin: "0.5rem 0 0", color: "rgba(255,255,255,0.68)", fontFamily: "var(--font-sans)", fontSize: "0.75rem" }}>
                O evento continuará no painel como desativado.
              </p>
            </div>
            <div style={{ padding: "0.9rem 1.1rem 1.1rem", display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setDeleteDialog({ open: false, id: 0, name: "" })}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: "8px", padding: "0.55rem 0.9rem", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                style={{ background: "var(--gold)", border: "1px solid var(--gold)", color: "var(--ink)", borderRadius: "8px", padding: "0.55rem 0.9rem", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", cursor: deleteMutation.isPending ? "not-allowed" : "pointer", opacity: deleteMutation.isPending ? 0.7 : 1 }}
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ padding: "4rem 1.25rem 2rem", borderTop: "1px solid var(--border)", background: "var(--background)", textAlign: "center" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "0.9rem", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.05em" }}>DOM PRODUÇÕES</span>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Macaé • MIT LICENSE
          </p>
        </div>
      </footer>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  fontSize: "0.65rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--gold)"
};

const tdStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.7)"
};

const mobileActionStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.5rem",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "white",
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  cursor: "pointer"
};

function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  const deleted = status === "deleted";
  let bg = published ? "rgba(212, 175, 55, 0.2)" : "rgba(255, 255, 255, 0.05)";
  let fg = published ? "var(--gold)" : "rgba(255, 255, 255, 0.6)";
  if (deleted) { bg = "rgba(153, 27, 27, 0.2)"; fg = "#ff4444"; }
  
  return (
    <span style={{ padding: "0.2rem 0.6rem", background: bg, color: fg, fontSize: "0.55rem", fontWeight: 800, borderRadius: "4px", textTransform: "uppercase" }}>
      {deleted ? "Desativado" : published ? "Publicado" : "Rascunho"}
    </span>
  );
}

function IconButton({ icon: Icon, onClick, color }: { icon: any, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: color, padding: "0.5rem", borderRadius: "4px", cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <Icon size={16} />
    </button>
  );
}
