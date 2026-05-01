import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ContactRound, MapPin, UserRound, ArrowLeft, Pencil, Bed, Navigation, Plus, Printer, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

declare global {
  interface Window {
    htmlToImage: any;
  }
}

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

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareJPEG = async () => {
    const element = document.querySelector(".print-only") as HTMLElement;
    if (!element || !window.htmlToImage) {
      // Fallback to text WhatsApp if image generation fails
      const text = encodeURIComponent(`Olá! Aqui está a Ficha Técnica do evento: ${ficha.eventName}\n\nAtração: ${ficha.attraction || 'DOM'}\nData: ${formatDate(ficha.eventDate)}\nLocal: ${ficha.location}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      return;
    }

    try {
      // Hide buttons temporarily if they were visible, but print-only is usually hidden
      const originalDisplay = element.style.display;
      element.style.display = 'block';
      const dataUrl = await window.htmlToImage.toJpeg(element, { quality: 0.95, backgroundColor: 'white' });
      element.style.display = originalDisplay;

      if (navigator.share) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `Checklist_${ficha.attraction?.replace(/\s+/g, '_') || 'DOM'}.jpg`, { type: 'image/jpeg' });
        
        try {
          await navigator.share({
            files: [file],
            title: `Checklist ${ficha.attraction}`,
            text: `Checklist oficial DOM - ${ficha.eventName}`
          });
        } catch (e) {
          // If sharing fails or user cancels, download as fallback
          const link = document.createElement('a');
          link.download = `Checklist_${ficha.attraction || 'DOM'}.jpg`;
          link.href = dataUrl;
          link.click();
        }
      } else {
        const link = document.createElement('a');
        link.download = `Checklist_${ficha.attraction || 'DOM'}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error("Error generating JPEG:", error);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header className="no-print" style={{ background: "var(--ink)", padding: "0 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ background: "transparent", border: "none", fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleShareJPEG}
              style={{ padding: "0.5rem 1rem", background: "transparent", color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <MessageCircle size={12} />
              WhatsApp
            </button>
            <button
              onClick={handleExportPDF}
              style={{ padding: "0.5rem 1rem", background: "transparent", color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Printer size={12} />
              Exportar PDF
            </button>
            {isAdmin && (
              <button
                className="no-print"
                onClick={() => navigate(`/ficha/${fichaId}/editar`)}
                style={{ padding: "0.5rem 1rem", background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <Pencil size={12} />
                Editar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Document View (Web UI / PDF Base) */}
      {/* High-Fidelity PDF Pattern (Print Only) */}
      <div className="print-only">
        <div style={{ 
          background: "white", 
          color: "black", 
          minHeight: "297mm", 
          padding: "10mm", 
          fontFamily: "'Helvetica Condensed', 'Arial Narrow', sans-serif", 
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Watermark Background */}
          <div style={{ 
            position: "absolute", 
            top: 0, left: 0, right: 0, bottom: 0, 
            opacity: 0.05, 
            zIndex: 0,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "50px",
            padding: "50px",
            pointerEvents: "none"
          }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ fontSize: "40px", fontWeight: 900, transform: "rotate(-30deg)" }}>DOM</div>
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ background: "#1a365d", padding: "20px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "4px solid #1a365d" }}>
              <h1 style={{ color: "white", margin: 0, fontSize: "42px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-2px", fontFamily: "Impact, sans-serif" }}>
                CHECKLIST {ficha.attraction ? ficha.attraction.toUpperCase() : "DOM"}
              </h1>
              <div style={{ background: "#2d3748", color: "white", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "28px", borderRadius: "8px" }}>AB</div>
            </div>
            <div style={{ padding: "0 10px" }}>
              <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "25px", borderBottom: "1px solid #ddd", paddingBottom: "5px", textTransform: "uppercase" }}>
                {ficha.attraction ? ficha.attraction.toUpperCase() : "DOM"} – {ficha.stateCity || "LOCAL"} – {formatDate(ficha.eventDate)}
              </p>
              <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                <p><strong>NOME DO EVENTO:</strong> {ficha.eventName.toUpperCase()}</p>
                <p><strong>LOCAL DO EVENTO:</strong> ({ficha.location.toUpperCase()})<br/> {ficha.address.toUpperCase()}</p>
                <div style={{ marginTop: "20px" }}>
                  <p><strong>PRODUTOR LOCAL:</strong> {ficha.localProducerName?.toUpperCase() || "—"} (DOM) TEL: {ficha.localProducerContact || "—"}</p>
                  <p><strong>PRODUTOR RESPONSÁVEL:</strong> GUSTAVO BAYOUT (DOM) TEL: 22 99263-0265</p>
                  <p><strong>PRODUTOR AUXILIAR:</strong> LUCAS SANTIAGO (DOM) TEL: 21 97320-4056</p>
                </div>
                <div style={{ marginTop: "20px" }}>
                  {ficha.professionals.map((prof, i) => (
                    <p key={i}><strong>{prof.role.toUpperCase()}:</strong> {prof.name.toUpperCase()} {prof.contact ? `TEL: ${prof.contact}` : ""}</p>
                  ))}
                  {ficha.logistics.map((log, i) => (
                    <p key={i}><strong>{log.role.toUpperCase()}:</strong> {log.name.toUpperCase()} {log.contact ? `TEL: ${log.contact}` : ""}</p>
                  ))}
                </div>
                <div style={{ marginTop: "30px" }}>
                  {ficha.scheduleItems.map((item, i) => (
                    <p key={i}><strong>HORÁRIO {item.activity.toUpperCase()}:</strong> {formatTime(item.time)}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Dashboard View (Web UI) */}
      <div className="no-print">
        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "4rem 1.25rem 8rem" }}>
          
          {/* Cover / Masthead */}
          <div style={{ marginBottom: "5rem" }}>
            <div style={{ height: "2px", background: "var(--ink)", marginBottom: "1.5rem", borderRadius: "2px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600 }}>Ficha Técnica Operacional</p>
              <StatusBadge published={ficha.status === "published"} />
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.5rem, 10vw, 5rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: 0.9, marginBottom: "0.25rem" }}>{ficha.eventName}</h1>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.5rem, 6vw, 3rem)", fontWeight: 400, fontStyle: "italic", color: "var(--gold)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "2.5rem" }}>{ficha.attraction || "Evento DOM"}</h2>
            <div style={{ height: "1px", background: "var(--rule)" }} />
          </div>

          <ViewSection number="01" title="Identificação" icon={MapPin}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem 2rem" }}>
              <ViewField label="Atração Principal" value={ficha.attraction || "—"} wide />
              <ViewField label="Data do Evento" value={formatDate(ficha.eventDate)} />
              <ViewField label="Localização" value={ficha.stateCity || "—"} />
              <ViewField label="Nome do Local" value={ficha.location || "—"} />
              <ViewField label="Endereço Completo" value={ficha.address || "—"} wide />
              <ViewField label="Produção Local" value={ficha.localProducerName || "—"} />
              <ViewField label="Contato Produção" value={ficha.localProducerContact || "—"} />
            </div>
          </ViewSection>

          <ViewSection number="02" title="Cronograma" icon={CalendarDays}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {ficha.scheduleItems.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: "1.25rem", padding: "1rem 0", borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ minWidth: "70px", color: "var(--gold)", fontWeight: 700 }}>{formatTime(item.time)}</div>
                  <div>{item.activity}</div>
                </div>
              ))}
            </div>
          </ViewSection>

          <ViewSection number="03" title="Profissionais" icon={UserRound}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.25rem" }}>
              {ficha.professionals.map((prof) => (
                <div key={prof.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
                  <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.35rem" }}>{prof.name || "—"}</p>
                  <div style={{ fontSize: "0.65rem", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase" }}>{prof.role || "—"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-mid)" }}>{prof.contact || "—"}</div>
                </div>
              ))}
            </div>
          </ViewSection>

          <ViewSection number="04" title="Hospedagem" icon={Bed}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {ficha.hotels.map((hotel) => (
                <div key={hotel.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "var(--gold)" }} />
                  <h3 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{hotel.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-mid)" }}>{hotel.address}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
                    <ViewField label="Contato" value={hotel.contact || "—"} />
                    <ViewField label="Pessoa" value={hotel.contactPerson || "—"} />
                  </div>
                </div>
              ))}
            </div>
          </ViewSection>

          <div style={{ borderTop: "2px solid var(--ink)", marginTop: "4rem", paddingTop: "2rem", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "1.25rem" }}>DOM <span style={{ color: "var(--gold)", fontStyle: "italic" }}>PRODUÇÕES</span></div>
            <p style={{ fontSize: "0.55rem", color: "var(--ink-faint)", marginTop: "0.5rem" }}>ID #{ficha.id} — {new Date().getFullYear()}</p>
          </div>
        </main>
      </div>
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
