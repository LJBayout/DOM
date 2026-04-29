import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ContactRound, MapPin, UserRound, ArrowLeft, Pencil, Bed, Navigation } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

type AttractionFile = { name: string; url: string; key: string };

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  if (!timeStr) return "—";
  return timeStr;
}

export default function FichaView() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const fichaId = parseInt(params.id, 10);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const { data: ficha, isLoading } = trpc.ficha.getById.useQuery(
    { id: fichaId },
    { enabled: !!user && !isNaN(fichaId) }
  );

  const isAdmin = user?.role === "admin";

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--gold)" }}>
          Carregando...
        </span>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--cream)", padding: "2rem" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--ink-light)", fontStyle: "italic", textAlign: "center" }}>
          Ficha não encontrada.
        </p>
        <button onClick={() => navigate("/dashboard")} style={{ marginTop: "1.5rem", background: "transparent", border: "none", fontFamily: "var(--font-sans)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }}>
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header style={{ background: "var(--ink)", padding: "0 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ background: "transparent", border: "none", fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate(`/ficha/${fichaId}/editar`)}
              style={{ padding: "0.5rem 1rem", background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Pencil size={12} />
              Editar
            </button>
          )}
        </div>
      </header>

      {/* Document */}
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(2rem, 8vw, 4rem) 1.25rem 8rem" }}>

        {/* ── Cover / Masthead ─────────────────────────────────────────── */}
        <div style={{ marginBottom: "clamp(3rem, 10vw, 5rem)" }}>
          <div style={{ height: "2px", background: "var(--ink)", marginBottom: "1.5rem", borderRadius: "2px" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600 }}>
              Ficha Técnica Operacional
            </p>
            <StatusBadge published={ficha.status === "published"} />
          </div>

          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.5rem, 10vw, 5rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: 0.9, marginBottom: "0.25rem" }}>
            {ficha.eventName} (V2)
          </h1>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.5rem, 6vw, 3rem)", fontWeight: 400, fontStyle: "italic", color: "var(--gold)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "2.5rem" }}>
            {ficha.attraction || "Evento DOM"}
          </h2>

          <div style={{ height: "1px", background: "var(--rule)" }} />
        </div>

        {/* ── SECTION 1: Identificação ─────────────────────────────────── */}
        <ViewSection number="01" title="Identificação" icon={MapPin}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem 2rem" }}>
            <ViewField label="Atração Principal" value={ficha.attraction || "—"} wide />
            
            {ficha.attractionPdfs && (
              <div style={{ gridColumn: "1 / -1", marginBottom: "1rem" }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.8rem", fontWeight: 600 }}>
                  Arquivos e Rider
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {(() => {
                    try {
                      const files = JSON.parse(ficha.attractionPdfs) as AttractionFile[];
                      return files.map((file) => (
                        <a
                          key={file.key}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.6rem 1.25rem",
                            background: "var(--ink)",
                            color: "var(--gold)",
                            fontFamily: "var(--font-sans)",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            textDecoration: "none",
                            letterSpacing: "0.1em",
                            borderRadius: "var(--radius-sm)",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          {file.name.toUpperCase()}
                        </a>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>
            )}

            <ViewField label="Data do Evento" value={formatDate(ficha.eventDate)} />
            <ViewField label="Localização" value={ficha.stateCity || "—"} />
            <ViewField label="Nome do Local" value={ficha.location || "—"} />
            <ViewField label="Endereço Completo" value={ficha.address || "—"} wide />
            <ViewField label="Produção Local" value={ficha.localProducerName || "—"} />
            <ViewField label="Contato Produção" value={ficha.localProducerContact || "—"} />
          </div>
        </ViewSection>

        {/* ── SECTION 2: Cronograma ─────────────────────────────────────── */}
        <ViewSection number="02" title="Cronograma" icon={CalendarDays}>
          {ficha.scheduleItems.length === 0 ? (
            <p style={{ fontFamily: "var(--font-sans)", color: "var(--ink-light)", fontSize: "0.9rem" }}>
              Nenhum horário cadastrado.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {ficha.scheduleItems.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "1.25rem",
                    padding: "1rem 0",
                    borderBottom: "1px solid var(--rule)",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: "70px", fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {formatTime(item.time)}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "var(--ink)", fontWeight: 400, lineHeight: 1.4 }}>
                    {item.activity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ViewSection>

        {/* ── SECTION 3: Profissionais ─────────────────────────────────── */}
        <ViewSection number="03" title="Profissionais" icon={UserRound}>
          {ficha.professionals.length === 0 ? (
            <p style={{ fontFamily: "var(--font-sans)", color: "var(--ink-light)", fontSize: "0.9rem" }}>
              Nenhum profissional cadastrado.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.25rem" }}>
              {ficha.professionals.map((prof) => (
                <div
                  key={prof.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1.25rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                >
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.35rem" }}>
                    {prof.name || "—"}
                  </p>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                    {prof.role || "—"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--ink-mid)" }}>
                    <ContactRound size={14} style={{ opacity: 0.6 }} />
                    {prof.contact || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ViewSection>

        {/* ── SECTION 4: Hospedagem ─────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <ViewSection number="04" title="Hospedagem" icon={Bed}>
            {isAdmin && (
              <button
                onClick={() => navigate(`/ficha/${fichaId}/editar`)}
                style={{
                  position: "absolute",
                  top: "2.5rem",
                  right: 0,
                  background: "transparent",
                  border: "none",
                  color: "var(--gold)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}
              >
                <Plus size={14} /> Adicionar Hotel
              </button>
            )}
            {(!ficha.hotels || ficha.hotels.length === 0) ? (
            <p style={{ fontFamily: "var(--font-sans)", color: "var(--ink-light)", fontSize: "0.9rem" }}>
              Nenhuma hospedagem cadastrada.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {ficha.hotels.map((hotel, i) => (
                <div
                  key={hotel.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1.5rem",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "var(--gold)" }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem" }}>
                        {hotel.name || `Hotel ${i + 1}`}
                      </h3>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--ink-mid)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <MapPin size={14} /> {hotel.address || "—"}
                      </p>
                    </div>
                    {hotel.gpsLink && (
                      <a
                        href={hotel.gpsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.5rem 1rem",
                          background: "var(--ink)",
                          color: "var(--gold)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          textDecoration: "none",
                          borderRadius: "var(--radius-sm)"
                        }}
                      >
                        <Navigation size={14} /> GPS
                      </a>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                    <ViewField label="Recepção / Geral" value={hotel.contact || "—"} />
                    <ViewField label="Pessoa de Contato" value={hotel.contactPerson || "—"} />
                    <ViewField label="Contato Local / WhatsApp" value={hotel.localContact || "—"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ViewSection>
      </div>

        {/* Footer rule */}
        <div style={{ borderTop: "2px solid var(--ink)", marginTop: "4rem", paddingTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "0.05em" }}>
            DOM <span style={{ fontWeight: 400, fontStyle: "italic", color: "var(--gold)" }}>PRODUÇÕES</span>
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            Documentação Técnica de Eventos
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.55rem", color: "var(--ink-faint)", marginTop: "0.5rem" }}>
            ID #{ficha.id} — {new Date().getFullYear()}
          </span>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.75rem",
      background: published ? "var(--gold)" : "var(--cream-deeper)",
      color: published ? "var(--ink)" : "var(--ink-light)",
      fontFamily: "var(--font-sans)",
      fontSize: "0.55rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      borderRadius: "999px"
    }}>
      {published ? "Publicada" : "Rascunho"}
    </span>
  );
}

function ViewSection({ number, title, children, icon: Icon }: { number: string; title: string; children: React.ReactNode; icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; }) {
  return (
    <div style={{ marginBottom: "clamp(3rem, 10vw, 4rem)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.25rem" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", fontWeight: 800, color: "var(--cream-deeper)", lineHeight: 1, letterSpacing: "-0.04em", userSelect: "none" }}>
          {number}
        </span>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {Icon ? <Icon size={18} style={{ color: "var(--gold)" }} /> : null}
          {title}
        </h2>
      </div>
      <div style={{ height: "1px", background: "var(--rule)", marginBottom: "1.5rem" }} />
      {children}
    </div>
  );
}

function ViewField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.55rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.3rem", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: wide ? "1.1rem" : "0.9rem", fontWeight: wide ? 600 : 400, color: "var(--ink)", lineHeight: 1.4 }}>
        {value}
      </p>
    </div>
  );
}
