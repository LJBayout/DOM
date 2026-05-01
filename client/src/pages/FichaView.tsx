import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ContactRound, MapPin, UserRound, ArrowLeft, Pencil, Bed, Navigation, Plus, Printer, MessageCircle, Download, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import html2pdf from "html2pdf.js";
import * as htmlToImage from "html-to-image";

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

  const [shareModal, setShareModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const getUploadUrlMutation = trpc.storage.getUploadUrl.useMutation();

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

  const handleWhatsAppShare = async (type: "pdf" | "jpg") => {
    if (!phoneNumber) {
      alert("Por favor, digite o número do WhatsApp.");
      return;
    }

    setIsSharing(true);
    try {
      const cleanNumber = phoneNumber.replace(/\D/g, "");
      const finalNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

      const filename = `Ficha_${ficha.eventName.replace(/\s+/g, '_')}_${type}.${type}`;
      const contentType = type === "pdf" ? "application/pdf" : "image/jpeg";

      const { publicUrl, proxyUploadUrl } = await getUploadUrlMutation.mutateAsync({
        filename,
        contentType
      });

      const element = document.querySelector(".print-only") as HTMLElement;
      if (!element) throw new Error("Conteúdo não encontrado");

      const originalDisplay = element.style.display;
      element.style.display = 'block';

      let blob: Blob;
      if (type === "pdf") {
        blob = await (html2pdf() as any).from(element).set({
          margin: 10,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).output('blob');
      } else {
        const dataUrl = await htmlToImage.toJpeg(element, { quality: 0.95, backgroundColor: 'white' });
        const response = await fetch(dataUrl);
        blob = await response.blob();
      }

      element.style.display = originalDisplay;

      const uploadResp = await fetch(proxyUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob
      });

      if (!uploadResp.ok) throw new Error("Falha ao hospedar arquivo.");

      const fullUrl = window.location.origin + publicUrl;
      const message = encodeURIComponent(`Olá! Segue a Ficha Técnica: ${ficha.eventName}\n\n📄 Visualizar ${type.toUpperCase()}:\n${fullUrl}`);

      window.open(`https://wa.me/${finalNumber}?text=${message}`, "_blank");
      setShareModal(false);
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Erro ao compartilhar. Tente novamente.");
    } finally {
      setIsSharing(false);
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
              onClick={() => setShareModal(true)}
              style={{ padding: "0.5rem 1rem", background: "transparent", color: "#25D366", border: "1px solid #25D366", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
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

      {/* High-Fidelity PDF Pattern (Print Only) */}
      <div className="print-only">
        <div id="ficha-print-content" style={{
          background: "white",
          color: "#111",
          minHeight: "297mm",
          padding: "15mm 15mm",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Watermark Background */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            opacity: 0.03,
            zIndex: 0,
            fontSize: "150px",
            fontWeight: 900,
            pointerEvents: "none",
            whiteSpace: "nowrap"
          }}>
            DOM PRODUÇÕES
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "4px solid #1a365d", paddingBottom: "15px", marginBottom: "20px" }}>
              <div>
                <h1 style={{ color: "#1a365d", margin: 0, fontSize: "38px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-1px" }}>
                  FICHA TÉCNICA
                </h1>
                <h2 style={{ margin: "5px 0 0 0", fontSize: "20px", color: "#666", fontWeight: 600, textTransform: "uppercase" }}>
                  {ficha.attraction ? ficha.attraction : "EVENTO DOM"}
                </h2>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{formatDate(ficha.eventDate)}</p>
                <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}>ID: #{ficha.id}</p>
              </div>
            </div>

            {/* Event Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #eee" }}>
                <p style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", fontWeight: 700, margin: "0 0 5px 0" }}>Evento</p>
                <p style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 15px 0" }}>{ficha.eventName.toUpperCase()}</p>

                <p style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", fontWeight: 700, margin: "0 0 5px 0" }}>Local / Venue</p>
                <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 5px 0" }}>{ficha.location.toUpperCase()}</p>
                <p style={{ fontSize: "12px", margin: 0 }}>{ficha.address}</p>
                <p style={{ fontSize: "12px", margin: "5px 0 0 0", color: "#666" }}>{ficha.stateCity}</p>
              </div>

              <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #eee" }}>
                <p style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px 0" }}>Contatos da Produção</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px 0" }}>PRODUTOR RESPONSÁVEL</p>
                    <p style={{ fontSize: "12px", margin: 0 }}>GUSTAVO BAYOUT (DOM) — 22 99263-0265</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px 0" }}>PRODUTOR AUXILIAR</p>
                    <p style={{ fontSize: "12px", margin: 0 }}>LUCAS SANTIAGO (DOM) — 21 97320-4056</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px 0" }}>PRODUTOR LOCAL</p>
                    <p style={{ fontSize: "12px", margin: 0 }}>{ficha.localProducerName?.toUpperCase() || "—"} — {ficha.localProducerContact || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Team Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
              {/* Cronograma */}
              <div>
                <h3 style={{ fontSize: "16px", color: "#1a365d", borderBottom: "2px solid #1a365d", paddingBottom: "5px", marginBottom: "15px", textTransform: "uppercase" }}>Cronograma</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <tbody>
                    {ficha.scheduleItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px 0", fontWeight: 800, color: "#1a365d", width: "80px" }}>{formatTime(item.time)}</td>
                        <td style={{ padding: "8px 0", textTransform: "uppercase" }}>{item.activity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Equipe / Logística */}
              <div>
                <h3 style={{ fontSize: "16px", color: "#1a365d", borderBottom: "2px solid #1a365d", paddingBottom: "5px", marginBottom: "15px", textTransform: "uppercase" }}>Equipe Técnica</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  {ficha.professionals.map((prof, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: "4px" }}>
                      <span><strong>{prof.role.toUpperCase()}:</strong> {prof.name.toUpperCase()}</span>
                      <span style={{ color: "#666" }}>{prof.contact}</span>
                    </div>
                  ))}
                  {ficha.logistics.map((log, i) => (
                    <div key={`log-${i}`} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: "4px" }}>
                      <span><strong>{log.role.toUpperCase()}:</strong> {log.name.toUpperCase()}</span>
                      <span style={{ color: "#666" }}>{log.contact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hospedagem */}
            {ficha.hotels && ficha.hotels.length > 0 && (
              <div style={{ pageBreakInside: "avoid" }}>
                <h3 style={{ fontSize: "16px", color: "#1a365d", borderBottom: "2px solid #1a365d", paddingBottom: "5px", marginBottom: "15px", textTransform: "uppercase" }}>Hospedagem</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  {ficha.hotels.map((hotel, i) => (
                    <div key={i} style={{
                      background: "#f8f9fa",
                      border: "1px solid #ddd",
                      borderLeft: "4px solid #d4af37",
                      borderRadius: "6px",
                      padding: "15px",
                      fontSize: "12px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <p style={{ margin: "0 0 2px 0", fontWeight: 800, fontSize: "15px", color: "#1a365d" }}>{hotel.name.toUpperCase()}</p>
                          <p style={{ margin: 0, color: "#555", fontSize: "11px" }}>{hotel.address}</p>
                        </div>
                        <div style={{ background: "#1a365d", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 800 }}>
                          HOTEL {i + 1}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>
                          <span style={{ color: "#666" }}>RECEPÇÃO / TEL:</span>
                          <span style={{ fontWeight: 600 }}>{hotel.contact || "—"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>
                          <span style={{ color: "#666" }}>CONTATO DIRETO:</span>
                          <span style={{ fontWeight: 600 }}>{hotel.contactPerson ? `${hotel.contactPerson.toUpperCase()} ` : "—"}{hotel.localContact ? `(${hotel.localContact})` : ""}</span>
                        </div>
                        {hotel.gpsLink && (
                          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px", marginTop: "2px" }}>
                            <span style={{ color: "#666" }}>LOCALIZAÇÃO (GPS):</span>
                            <a href={hotel.gpsLink} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#1a365d", textDecoration: "none" }}>LINK DO MAPA 📍</a>
                          </div>
                        )}
                        {hotel.roomListPdfs && (
                          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px" }}>
                            <span style={{ color: "#666", fontWeight: 700 }}>ROOM LIST:</span>
                            <span style={{ color: "#d4af37", fontWeight: 800 }}>ANEXADO (PDF)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", textAlign: "center", borderTop: "1px solid #eee", paddingTop: "10px", color: "#999", fontSize: "10px" }}>
              DOM PRODUÇÕES E EVENTOS — DOCUMENTO CONFIDENCIAL — GERADO EM {new Date().toLocaleDateString("pt-BR")}
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
              <ViewField label="Cidade / UF" value={ficha.stateCity || "—"} />
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Nome do Local / Venue</FieldLabel>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>
                    {ficha.location || "—"}
                  </p>
                  {ficha.gpsLink && (
                    <a href={ficha.gpsLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.6rem", background: "var(--gold)", color: "var(--ink)", borderRadius: "var(--radius-sm)", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", textDecoration: "none" }}>
                      <Navigation size={12} /> Ver no Mapa
                    </a>
                  )}
                </div>
              </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>{hotel.name}</h3>
                    {hotel.gpsLink && (
                      <a href={hotel.gpsLink} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", textDecoration: "none" }}>
                        <Navigation size={12} /> Mapa
                      </a>
                    )}
                  </div>
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

      {/* WhatsApp Share Modal */}
      {shareModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--ink)", width: "100%", maxWidth: "450px", padding: "2.5rem", borderRadius: "var(--radius)", border: "1px solid var(--gold)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ background: "#25D366", padding: "0.5rem", borderRadius: "10px", color: "white" }}>
                <MessageCircle size={24} />
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", color: "white", fontSize: "1.5rem", margin: 0, fontWeight: 800 }}>Compartilhar</h2>
            </div>
            <p style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Envie a ficha técnica via WhatsApp</p>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", color: "var(--gold)", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>Número do WhatsApp (com DDD)</label>
              <input
                autoFocus
                type="text"
                placeholder="Ex: 22 992630265"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                style={{ width: "100%", padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--gold)", borderRadius: "var(--radius-sm)", color: "white", fontFamily: "var(--font-sans)", fontSize: "1rem" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                type="button"
                disabled={isSharing}
                onClick={() => handleWhatsAppShare("pdf")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "1rem", background: "white", color: "var(--ink)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", opacity: isSharing ? 0.6 : 1 }}
              >
                {isSharing ? "Gerando..." : <><Download size={18} /> Enviar como PDF</>}
              </button>
              <button
                type="button"
                disabled={isSharing}
                onClick={() => handleWhatsAppShare("jpg")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "1rem", background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", opacity: isSharing ? 0.6 : 1 }}
              >
                {isSharing ? "Gerando..." : <><ImageIcon size={18} /> Enviar como Foto (JPG)</>}
              </button>
              <button
                type="button"
                onClick={() => setShareModal(false)}
                style={{ width: "100%", marginTop: "0.5rem", padding: "0.8rem", background: "transparent", color: "rgba(255,255,255,0.4)", border: "none", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", cursor: "pointer", textDecoration: "underline" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
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

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: "var(--font-sans)",
      fontSize: "0.55rem",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "var(--gold)",
      marginBottom: "0.3rem",
      fontWeight: 700,
      ...style
    }}>
      {children}
    </p>
  );
}
