import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Mail, MapPin, Phone, Plus, Trash2, UserRound, ArrowLeft, Save, X, Bed, Download, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type ScheduleRow = { time: string; activity: string };
type ProfessionalRow = { name: string; role: string; contact: string };
type HotelRow = {
  name: string;
  address: string;
  contact: string;
  contactPerson: string;
  localContact: string;
  gpsLink: string;
  roomListPdfs: string | null;
};
type LogisticsRow = { role: string; name: string; contact: string };
type AttractionFile = { name: string; url: string; key: string };

const DEFAULT_SCHEDULE: ScheduleRow[] = [
  { time: "", activity: "Montagem" },
  { time: "", activity: "Passagem de Som" },
  { time: "", activity: "Início" },
  { time: "", activity: "Término" },
];

const DEFAULT_HOTEL: HotelRow = {
  name: "",
  address: "",
  contact: "",
  contactPerson: "",
  localContact: "",
  gpsLink: "",
  roomListPdfs: null,
};

const ACTIVITY_SUGGESTIONS = ["Montagem", "Passagem de Som", "Início", "Término", "Intervalo", "Encerramento", "Desmontagem"];
const ROLE_SUGGESTIONS = ["SOM", "LUZ", "CAMARIM", "GERADOR", "LED", "Carregadores"];
const LOGISTICS_SUGGESTIONS = ["Responsável Banda", "Responsável Local", "Segurança", "Produtor", "Transporte / Van", "Carregadores"];

export default function FichaForm() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const fichaId = params.id ? parseInt(params.id, 10) : null;
  const isEditing = fichaId !== null;

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [attraction, setAttraction] = useState("");
  const [attractionFiles, setAttractionFiles] = useState<AttractionFile[]>([]);
  const [stateCity, setStateCity] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [gpsLink, setGpsLink] = useState("");
  const [localProducerName, setLocalProducerName] = useState("");
  const [localProducerContact, setLocalProducerContact] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [schedule, setSchedule] = useState<ScheduleRow[]>(DEFAULT_SCHEDULE);
  const [profs, setProfs] = useState<ProfessionalRow[]>([{ name: "", role: "", contact: "" }]);
  const [logisticsRows, setLogisticsRows] = useState<LogisticsRow[]>([{ role: "", name: "", contact: "" }]);
  
  // Multiple Hotels state
  const [hotels, setHotels] = useState<HotelRow[]>([{ ...DEFAULT_HOTEL }]);
  const [activeHotelTab, setActiveHotelTab] = useState(0);

  // Magic Fill state
  const [showMagicInput, setShowMagicInput] = useState(false);
  const [magicText, setMagicText] = useState("");

  // GPS Modal state
  const [gpsModal, setGpsModal] = useState<{ open: boolean; target: "venue" | "hotel"; initialValue: string; hotelIdx?: number }>({
    open: false,
    target: "venue",
    initialValue: ""
  });
  const [gpsSearchValue, setGpsSearchValue] = useState("");

  const parseMutation = trpc.ficha.parseFichaText.useMutation({
    onSuccess: (data) => {
      if (data.eventName) setEventName(data.eventName);
      if (data.eventDate) setEventDate(data.eventDate);
      if (data.location) setLocation(data.location);
      if (data.address) setAddress(data.address);
      if (data.attraction) setAttraction(data.attraction);
      if (data.localProducerName) setLocalProducerName(data.localProducerName);
      if (data.localProducerContact) setLocalProducerContact(data.localProducerContact);
      
      if (data.professionals && data.professionals.length > 0) setProfs(data.professionals);
      if (data.hotels && data.hotels.length > 0) setHotels(data.hotels.map((h: Partial<HotelRow>) => ({ ...DEFAULT_HOTEL, ...h })));
      if (data.logistics && data.logistics.length > 0) setLogisticsRows(data.logistics);
      if (data.scheduleItems && data.scheduleItems.length > 0) setSchedule(data.scheduleItems);

      toast.success("Formulário preenchido com sucesso pela IA!");
      setShowMagicInput(false);
      setMagicText("");
    },
    onError: (err) => toast.error(err.message)
  });

  const gpsMutation = trpc.ficha.generateGpsLink.useMutation();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate("/");
    if (!authLoading && user && user.role !== "admin") {
      toast.error("Apenas administradores podem editar fichas.");
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  // Load existing ficha
  const { data: fichaData, isLoading: fichaLoading } = trpc.ficha.getById.useQuery(
    { id: fichaId! },
    { enabled: isEditing && !!user }
  );

  useEffect(() => {
    if (fichaData) {
      setEventName(fichaData.eventName);
      setEventDate(fichaData.eventDate);
      setAttraction(fichaData.attraction);
      try {
        setAttractionFiles(fichaData.attractionPdfs ? JSON.parse(fichaData.attractionPdfs) : []);
      } catch (e) {
        setAttractionFiles([]);
      }
      setStateCity(fichaData.stateCity);
      setLocation(fichaData.location);
      setAddress(fichaData.address);
      setGpsLink(fichaData.gpsLink || "");
      setLocalProducerName(fichaData.localProducerName);
      setLocalProducerContact(fichaData.localProducerContact);
      setStatus(fichaData.status);
      setSchedule(fichaData.scheduleItems.length > 0 ? fichaData.scheduleItems : DEFAULT_SCHEDULE);
      setProfs(fichaData.professionals.length > 0 ? fichaData.professionals : [{ name: "", role: "", contact: "" }]);
      setLogisticsRows(fichaData.logistics.length > 0 ? fichaData.logistics : [{ role: "", name: "", contact: "" }]);
      
      if (fichaData.hotels && fichaData.hotels.length > 0) {
        setHotels(fichaData.hotels.map(h => ({
          name: h.name,
          address: h.address,
          contact: h.contact,
          contactPerson: h.contactPerson,
          localContact: h.localContact,
          gpsLink: h.gpsLink,
          roomListPdfs: h.roomListPdfs
        })));
      } else {
        // Fallback for old data structure if still present in DB fields
        if (fichaData.hotelName) {
          setHotels([{
            name: fichaData.hotelName,
            address: fichaData.hotelAddress || "",
            contact: fichaData.hotelContact || "",
            contactPerson: fichaData.hotelContactPerson || "",
            localContact: fichaData.hotelLocalContact || "",
            gpsLink: fichaData.hotelGpsLink || "",
            roomListPdfs: fichaData.hotelRoomListPdfs || null,
          }]);
        } else {
          setHotels([{ ...DEFAULT_HOTEL }]);
        }
      }
    }
  }, [fichaData]);

  const createMutation = trpc.ficha.create.useMutation({
    onSuccess: (data) => {
      toast.success("Ficha Técnica criada com sucesso.");
      navigate(`/ficha/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.ficha.update.useMutation({
    onSuccess: () => {
      toast.success("Ficha Técnica atualizada.");
      navigate(`/ficha/${fichaId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: suggestions } = trpc.ficha.getAllSuggestions.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) { toast.error("Nome do evento é obrigatório."); return; }
    const payload = {
      eventName: eventName.trim(),
      eventDate,
      attraction,
      attractionPdfs: attractionFiles.length > 0 ? JSON.stringify(attractionFiles) : null,
      stateCity,
      location,
      address,
      gpsLink,
      localProducerName,
      localProducerContact,
      status,
      scheduleItems: schedule.map((r) => ({ time: r.time, activity: r.activity })),
      professionals: profs
        .filter((p) => p.name.trim() || p.role.trim() || p.contact.trim())
        .map((p) => ({ name: p.name, role: p.role, contact: p.contact })),
      hotels: hotels
        .filter(h => h.name.trim())
        .map(h => ({
          name: h.name,
          address: h.address,
          contact: h.contact,
          contactPerson: h.contactPerson,
          localContact: h.localContact,
          gpsLink: h.gpsLink,
          roomListPdfs: h.roomListPdfs
        })),
      logistics: logisticsRows
        .filter((l) => l.name.trim() || l.role.trim() || l.contact.trim())
        .map((l) => ({ name: l.name, role: l.role, contact: l.contact })),
    };
    if (isEditing) {
      updateMutation.mutate({ id: fichaId!, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const updateScheduleRow = (i: number, field: keyof ScheduleRow, val: string) => {
    setSchedule((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addScheduleRow = () => setSchedule((prev) => [...prev, { time: "", activity: "" }]);
  const removeScheduleRow = (i: number) => setSchedule((prev) => prev.filter((_, idx) => idx !== i));

  const updateProfRow = (i: number, field: keyof ProfessionalRow, val: string) => {
    setProfs((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addProfRow = () => setProfs((prev) => [...prev, { name: "", role: "", contact: "" }]);
  const removeProfRow = (i: number) => setProfs((prev) => prev.filter((_, idx) => idx !== i));

  const updateLogisticsRow = (i: number, field: keyof LogisticsRow, val: string) => {
    setLogisticsRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addLogisticsRow = () => setLogisticsRows((prev) => [...prev, { role: "", name: "", contact: "" }]);
  const removeLogisticsRow = (i: number) => setLogisticsRows((prev) => prev.filter((_, idx) => idx !== i));

  // Hotel Helpers
  const updateHotelField = (i: number, field: keyof HotelRow, val: string) => {
    setHotels(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));
  };
  const addHotel = () => {
    setHotels(prev => [...prev, { ...DEFAULT_HOTEL }]);
    setActiveHotelTab(hotels.length);
  };
  const removeHotel = (i: number) => {
    if (hotels.length <= 1) return;
    setHotels(prev => prev.filter((_, idx) => idx !== i));
    if (activeHotelTab >= i && activeHotelTab > 0) setActiveHotelTab(activeHotelTab - 1);
  };
 
  const getUploadUrlMutation = trpc.storage.getUploadUrl.useMutation();
 
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são permitidos."); return; }
 
    try {
      const { url, publicUrl, key } = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
 
      if (!resp.ok) throw new Error("Falha no upload.");
 
      setAttractionFiles((prev) => [...prev, { name: file.name, url: publicUrl, key }]);
      toast.success("PDF enviado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar.");
    } finally {
      e.target.value = "";
    }
  };
 
  const removeFile = (key: string) => {
    setAttractionFiles((prev) => prev.filter((f) => f.key !== key));
  };

  if (authLoading || (isEditing && fichaLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--gold)" }}>
          Carregando...
        </span>
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
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {isEditing ? "Editar" : "Nova"} Ficha
          </span>
          <div style={{ width: "80px" }} />
        </div>
      </header>

      {/* Form */}
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(2rem, 8vw, 4rem) 1.25rem 8rem" }}>
        <form onSubmit={handleSubmit}>
          {/* Masthead */}
          <div style={{ marginBottom: "clamp(2.5rem, 8vw, 4rem)" }}>
            <div style={{ height: "2px", background: "var(--ink)", marginBottom: "1.5rem", borderRadius: "2px" }} />
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.5rem", fontWeight: 600 }}>
              Formulário Técnico
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 7vw, 3.5rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                Dados da Operação
              </h1>
              <button 
                type="button" 
                onClick={() => setShowMagicInput(!showMagicInput)} 
                style={{ background: 'var(--gold)', color: 'var(--ink)', padding: '0.6rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(var(--gold-rgb), 0.3)' }}
              >
                 <Wand2 size={16} /> Preenchimento Mágico
              </button>
            </div>

            {showMagicInput && (
               <div style={{ marginTop: '1.5rem', background: 'var(--card)', padding: '1.5rem', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', animation: 'fadeIn 0.3s ease' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--ink)', marginBottom: '1rem', fontWeight: 600 }}>
                    Cole abaixo as mensagens do WhatsApp ou o texto do Checklist. O DOM AI vai ler e preencher todos os campos do formulário para você.
                  </p>
                  <textarea 
                    value={magicText} 
                    onChange={e => setMagicText(e.target.value)} 
                    placeholder="Ex: CHECKLIST ALINE BARROS Silva Jardim 08/05/2026..." 
                    style={{ ...inputStyle, minHeight: '150px', marginBottom: '1rem', resize: 'vertical' }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={() => setShowMagicInput(false)} style={{ background: 'transparent', color: 'var(--ink)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.75rem' }}>
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => parseMutation.mutate({ text: magicText })} 
                      disabled={parseMutation.isPending || !magicText.trim()} 
                      style={{ background: 'var(--ink)', color: 'var(--gold)', padding: '0.6rem 1.25rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: parseMutation.isPending ? 'not-allowed' : 'pointer', opacity: parseMutation.isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}
                    >
                      {parseMutation.isPending ? "Processando IA..." : "Extrair e Preencher"}
                    </button>
                  </div>
               </div>
            )}

            <div style={{ height: "1px", background: "var(--rule)", marginTop: "1.5rem" }} />
          </div>

          {/* ── SECTION 1: Identificação ─────────────────────────────────── */}
          <Section number="01" title="Identificação" subtitle="Dados básicos do evento" icon={MapPin}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Nome do Evento</FieldLabel>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ex.: Festival DOM 2024" list="event-names" required style={inputStyle} />
                <datalist id="event-names">
                  {suggestions?.events?.names?.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Atração Principal</FieldLabel>
                <input type="text" value={attraction} onChange={(e) => setAttraction(e.target.value)} placeholder="Ex.: Artista ou Banda Principal" list="event-attractions" style={inputStyle} />
                <datalist id="event-attractions">
                  {suggestions?.events?.attractions?.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Riders e Mapas (PDF)</FieldLabel>
                <div style={{ border: "1px dashed var(--gold)", padding: "1.25rem", background: "rgba(var(--gold-rgb), 0.05)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {attractionFiles.map((file) => (
                      <div key={file.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--ink)", color: "var(--gold)", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.65rem", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                        <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name.toUpperCase()}</span>
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", cursor: "pointer", marginLeft: "0.25rem", display: "inline-flex", alignItems: "center" }}><Download size={12} /></a>
                        <button type="button" onClick={() => removeFile(file.key)} style={{ background: "transparent", border: "none", color: "var(--gold)", cursor: "pointer", fontWeight: 800, padding: "0 0 0 0.25rem" }}><X size={12} /></button>
                      </div>
                    ))}
                    {attractionFiles.length === 0 && <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--ink-faint)", fontStyle: "italic" }}>Nenhum arquivo enviado.</span>}
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    <Plus size={14} /> Enviar PDF
                    <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
              <div>
                <FieldLabel>Data do Evento</FieldLabel>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Cidade / UF</FieldLabel>
                <input type="text" value={stateCity} onChange={(e) => setStateCity(e.target.value)} placeholder="Ex.: Rio de Janeiro, RJ" list="event-stateCities" style={inputStyle} />
                <datalist id="event-stateCities">
                  {suggestions?.events?.stateCities?.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <FieldLabel>Local / Venue</FieldLabel>
                  <button
                    type="button"
                    disabled={gpsMutation.isPending}
                    onClick={() => {
                      setGpsSearchValue(location || address);
                      setGpsModal({ open: true, target: "venue", initialValue: location || address });
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--gold)", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", cursor: "pointer", textDecoration: "underline", opacity: gpsMutation.isPending ? 0.5 : 1 }}
                  >
                    {gpsMutation.isPending ? "Gerando..." : "Localizar GPS (IA)"}
                  </button>
                </div>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Arena DOM" list="event-locations" style={inputStyle} />
                <datalist id="event-locations">
                  {suggestions?.events?.locations?.map((l) => <option key={l} value={l} />)}
                </datalist>
              </div>
              <div>
                <FieldLabel>Status da Ficha</FieldLabel>
                <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicada</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Endereço Completo</FieldLabel>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço para logística" list="event-addresses" style={inputStyle} />
                <datalist id="event-addresses">
                  {suggestions?.events?.addresses?.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div>
                <FieldLabel>Produtor Responsável</FieldLabel>
                <input type="text" value={localProducerName} onChange={(e) => setLocalProducerName(e.target.value)} placeholder="Nome do produtor" list="producer-names" style={inputStyle} />
                <datalist id="producer-names">
                  {suggestions?.producers?.names?.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <FieldLabel>Contato Produção</FieldLabel>
                <input type="text" value={localProducerContact} onChange={(e) => setLocalProducerContact(e.target.value)} placeholder="Telefone ou e-mail" list="producer-contacts" style={inputStyle} />
                <datalist id="producer-contacts">
                  {suggestions?.producers?.contacts?.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
          </Section>

          {/* ── SECTION 2: Cronograma ─────────────────────────── */}
          <Section number="02" title="Cronograma" subtitle="Linha do tempo do evento" icon={Plus}>
            <div className="hidden sm:grid" style={{ gridTemplateColumns: "100px 1fr 40px", gap: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--ink)", marginBottom: "1rem" }}>
              <span style={colHeaderStyle}>Horário</span>
              <span style={colHeaderStyle}>Atividade</span>
              <span />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {schedule.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "clamp(80px, 20vw, 100px) 1fr clamp(30px, 10vw, 40px)", gap: "0.5rem 1rem", alignItems: "center" }}>
                  <input type="time" value={row.time} onChange={(e) => updateScheduleRow(i, "time", e.target.value)} style={{ ...inputStyle, fontSize: "0.85rem", padding: "0.6rem" }} />
                  <input type="text" value={row.activity} onChange={(e) => updateScheduleRow(i, "activity", e.target.value)} placeholder="Atividade" list={`activity-suggestions-${i}`} style={{ ...inputStyle, fontSize: "0.85rem", padding: "0.6rem" }} />
                  <datalist id={`activity-suggestions-${i}`}>
                    {ACTIVITY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                  <button type="button" onClick={() => removeScheduleRow(i)} disabled={schedule.length <= 1} style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", opacity: schedule.length <= 1 ? 0 : 1, padding: "0.5rem" }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <AddRowButton onClick={addScheduleRow} label="Novo Horário" />
          </Section>

          {/* ── SECTION 3: Profissionais ─────────────────────────────────── */}
          <Section number="03" title="Profissionais" subtitle="Equipe e contatos diretos" icon={UserRound}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {profs.map((row, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", position: "relative" }}>
                  <button type="button" onClick={() => removeProfRow(i)} disabled={profs.length <= 1} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", opacity: profs.length <= 1 ? 0 : 0.6 }}><X size={16} /></button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <FieldLabel>Nome</FieldLabel>
                      <input type="text" value={row.name} onChange={(e) => updateProfRow(i, "name", e.target.value)} placeholder="Nome completo" list={`prof-names-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`prof-names-${i}`}>
                        {suggestions?.professionals?.names?.map((n) => <option key={n} value={n} />)}
                      </datalist>
                    </div>
                    <div>
                      <FieldLabel>Função</FieldLabel>
                      <input type="text" value={row.role} onChange={(e) => updateProfRow(i, "role", e.target.value)} placeholder="Ex.: Técnico de Som" list={`role-suggestions-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`role-suggestions-${i}`}>
                        {ROLE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                        {suggestions?.professionals?.roles?.map((s) => <option key={`dyn-${s}`} value={s} />)}
                      </datalist>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <FieldLabel>Contato</FieldLabel>
                      <input type="text" value={row.contact} onChange={(e) => updateProfRow(i, "contact", e.target.value)} placeholder="Telefone ou WhatsApp" list={`prof-contacts-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`prof-contacts-${i}`}>
                        {suggestions?.professionals?.contacts?.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AddRowButton onClick={addProfRow} label="Novo Profissional" />
          </Section>

          {/* ── SECTION 04: Hospedagem (Multi-tab) ─────────────────────────────────── */}
          <Section number="04" title="Hospedagem" subtitle="Informações de hotel e acomodação" icon={Bed}>
            {/* Tabs Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
              {hotels.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveHotelTab(i)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    background: activeHotelTab === i ? "var(--ink)" : "var(--card)",
                    color: activeHotelTab === i ? "var(--gold)" : "var(--ink-light)",
                    border: "1px solid " + (activeHotelTab === i ? "var(--ink)" : "var(--border)"),
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Bed size={14} />
                  {h.name || `Hotel ${i + 1}`}
                  {hotels.length > 1 && (
                    <X
                      size={14}
                      onClick={(e) => { e.stopPropagation(); removeHotel(i); }}
                      style={{ marginLeft: "0.5rem", opacity: 0.6 }}
                    />
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={addHotel}
                style={{
                  padding: "0.6rem 1rem",
                  background: "rgba(var(--gold-rgb), 0.1)",
                  color: "var(--gold)",
                  border: "1px dashed var(--gold)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "all 0.2s"
                }}
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {/* Active Tab Content */}
            <div style={{ background: "rgba(var(--gold-rgb), 0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Nome do Hotel</FieldLabel>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].name}
                    onChange={(e) => updateHotelField(activeHotelTab, "name", e.target.value)}
                    placeholder="Ex.: Grand Hyatt Rio"
                    list={`hotel-names-${activeHotelTab}`}
                    style={inputStyle}
                  />
                  <datalist id={`hotel-names-${activeHotelTab}`}>
                    {suggestions?.hotels?.names?.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Endereço do Hotel</FieldLabel>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].address}
                    onChange={(e) => updateHotelField(activeHotelTab, "address", e.target.value)}
                    placeholder="Endereço completo para a van/logística"
                    list={`hotel-addresses-${activeHotelTab}`}
                    style={inputStyle}
                  />
                  <datalist id={`hotel-addresses-${activeHotelTab}`}>
                    {suggestions?.hotels?.addresses?.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel>Contato do Hotel / Recepção</FieldLabel>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].contact}
                    onChange={(e) => updateHotelField(activeHotelTab, "contact", e.target.value)}
                    placeholder="Telefone ou e-mail"
                    list={`hotel-contacts-${activeHotelTab}`}
                    style={inputStyle}
                  />
                  <datalist id={`hotel-contacts-${activeHotelTab}`}>
                    {suggestions?.hotels?.contacts?.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel>Pessoa de Contato</FieldLabel>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].contactPerson}
                    onChange={(e) => updateHotelField(activeHotelTab, "contactPerson", e.target.value)}
                    placeholder="Nome do gerente ou reserva"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Contato Direto / WhatsApp</FieldLabel>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].localContact}
                    onChange={(e) => updateHotelField(activeHotelTab, "localContact", e.target.value)}
                    placeholder="Celular do contato"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <FieldLabel>Link GPS (Google Maps)</FieldLabel>
                    <button
                      type="button"
                      disabled={gpsMutation.isPending}
                      onClick={() => {
                        const h = hotels[activeHotelTab];
                        setGpsSearchValue(h.name || h.address);
                        setGpsModal({ open: true, target: "hotel", initialValue: h.name || h.address, hotelIdx: activeHotelTab });
                      }}
                      style={{ background: "transparent", border: "none", color: "var(--gold)", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", cursor: "pointer", textDecoration: "underline", opacity: gpsMutation.isPending ? 0.5 : 1 }}
                    >
                      {gpsMutation.isPending ? "Gerando..." : "Gerar com IA"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={hotels[activeHotelTab].gpsLink}
                    onChange={(e) => updateHotelField(activeHotelTab, "gpsLink", e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Room List (PDF)</FieldLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label style={{ 
                      flex: 1, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "0.5rem", 
                      padding: "0.75rem", 
                      background: "rgba(255,255,255,0.05)", 
                      border: "1px dashed var(--rule)", 
                      borderRadius: "var(--radius)", 
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.7rem",
                      color: "var(--ink-light)"
                    }}>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        style={{ display: "none" }} 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { url, publicUrl, key } = await getUploadUrlMutation.mutateAsync({
                              filename: file.name,
                              contentType: file.type,
                            });
                            await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
                            updateHotelField(activeHotelTab, "roomListPdfs", publicUrl);
                            toast.success("Room List enviada!");
                          } catch (err) {
                            toast.error("Erro no upload.");
                          }
                        }}
                      />
                      <Download size={14} /> {hotels[activeHotelTab].roomListPdfs ? "Alterar Room List" : "Upload Room List (PDF)"}
                    </label>
                    {hotels[activeHotelTab].roomListPdfs && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "var(--gold)", fontSize: "0.65rem", fontWeight: 700 }}>✓ CARREGADO</span>
                        <a 
                          href={hotels[activeHotelTab].roomListPdfs} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            background: "var(--ink)", 
                            color: "var(--gold)", 
                            padding: "0.4rem 0.8rem", 
                            borderRadius: "var(--radius-sm)", 
                            fontSize: "0.65rem", 
                            fontWeight: 700, 
                            textDecoration: "none", 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "0.3rem" 
                          }}
                        >
                          <Download size={12} /> ABRIR PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </Section>

          {/* ── SECTION 05: Logística ─────────────────────────────────── */}
          <Section number="05" title="Logística" subtitle="Transporte e coordenação da equipe" icon={MapPin}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {logisticsRows.map((row, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", position: "relative" }}>
                  <button type="button" onClick={() => removeLogisticsRow(i)} disabled={logisticsRows.length <= 1} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", opacity: logisticsRows.length <= 1 ? 0 : 0.6 }}><X size={16} /></button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <FieldLabel>Cargo / Função</FieldLabel>
                      <input type="text" value={row.role} onChange={(e) => updateLogisticsRow(i, "role", e.target.value)} placeholder="Ex.: Motorista Van" list={`logistics-roles-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`logistics-roles-${i}`}>
                        {LOGISTICS_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                        {suggestions?.logistics?.roles?.map((s) => <option key={`dyn-${s}`} value={s} />)}
                      </datalist>
                    </div>
                    <div>
                      <FieldLabel>Nome</FieldLabel>
                      <input type="text" value={row.name} onChange={(e) => updateLogisticsRow(i, "name", e.target.value)} placeholder="Nome completo" list={`logistics-names-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`logistics-names-${i}`}>
                        {suggestions?.logistics?.names?.map((n) => <option key={n} value={n} />)}
                      </datalist>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <FieldLabel>Contato</FieldLabel>
                      <input type="text" value={row.contact} onChange={(e) => updateLogisticsRow(i, "contact", e.target.value)} placeholder="Telefone ou WhatsApp" list={`logistics-contacts-${i}`} style={{ ...inputStyle, padding: "0.6rem" }} />
                      <datalist id={`logistics-contacts-${i}`}>
                        {suggestions?.logistics?.contacts?.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AddRowButton onClick={addLogisticsRow} label="Novo Logística" />
          </Section>

          {/* Submit */}
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "3rem", display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              style={{ flex: "1", minWidth: "140px", padding: "1rem", background: "transparent", color: "var(--ink)", border: "1px solid var(--rule)", borderRadius: "var(--radius)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: "1", minWidth: "200px", padding: "1rem", background: "var(--ink)", color: "var(--gold)", border: "none", borderRadius: "var(--radius)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              {isPending ? "Salvando..." : <><Save size={16} /> {isEditing ? "Salvar Alterações" : "Criar Ficha"}</>}
            </button>
          </div>
        </form>
      </main>

      {/* Custom GPS AI Modal */}
      {gpsModal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--ink)", width: "100%", maxWidth: "500px", padding: "2.5rem", borderRadius: "var(--radius)", border: "1px solid var(--gold)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", color: "white", fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: 800 }}>Localização GPS (IA)</h2>
            <p style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Refine o local para a busca do Google Maps</p>
            
            <FieldLabel style={{ color: "var(--gold)" }}>Nome do Local ou Endereço</FieldLabel>
            <input 
              autoFocus
              type="text" 
              value={gpsSearchValue} 
              onChange={e => setGpsSearchValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const btn = document.getElementById('gps-confirm-btn');
                  btn?.click();
                }
              }}
              style={{ ...inputStyle, background: "rgba(255,255,255,0.05)", border: "1px solid var(--gold)", color: "white" }} 
            />
            
            <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
              <button 
                type="button" 
                onClick={() => setGpsModal({ ...gpsModal, open: false })}
                style={{ flex: 1, padding: "0.8rem", background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button 
                id="gps-confirm-btn"
                type="button"
                disabled={gpsMutation.isPending || !gpsSearchValue.trim()}
                onClick={async () => {
                  try {
                    const result = await gpsMutation.mutateAsync({ location: gpsSearchValue, address: "" });
                    if (gpsModal.target === "venue") {
                      setGpsLink(result.url);
                      if (result.refinedName) setLocation(result.refinedName);
                      if (result.refinedAddress) setAddress(result.refinedAddress);
                    } else if (gpsModal.hotelIdx !== undefined) {
                      updateHotelField(gpsModal.hotelIdx, "gpsLink", result.url);
                      if (result.refinedName) updateHotelField(gpsModal.hotelIdx, "name", result.refinedName);
                      if (result.refinedAddress) updateHotelField(gpsModal.hotelIdx, "address", result.refinedAddress);
                    }
                    toast.success("Link GPS e dados atualizados!");
                    setGpsModal({ ...gpsModal, open: false });
                  } catch (e) {
                    toast.error("Erro ao gerar link.");
                  }
                }}
                style={{ flex: 1, padding: "0.8rem", background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", opacity: gpsMutation.isPending ? 0.6 : 1 }}
              >
                {gpsMutation.isPending ? "Gerando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ number, title, subtitle, children, icon: Icon }: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div style={{ marginBottom: "clamp(3rem, 10vw, 4rem)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", fontWeight: 800, color: "var(--cream-deeper)", lineHeight: 1, letterSpacing: "-0.04em", userSelect: "none" }}>
          {number}
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {Icon ? <Icon size={18} style={{ color: "var(--gold)" }} /> : null}
            {title}
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", color: "var(--ink-light)", fontWeight: 400 }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div style={{ height: "1px", background: "var(--rule)", marginBottom: "1.5rem" }} />
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.55rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.4rem", fontWeight: 700 }}>
      {children}
    </label>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: "1rem",
        background: "rgba(var(--gold-rgb), 0.05)",
        border: "1px dashed var(--gold)",
        color: "var(--gold)",
        fontFamily: "var(--font-sans)",
        fontSize: "0.6rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        padding: "0.75rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
        justifyContent: "center",
        borderRadius: "var(--radius)",
        transition: "all 0.15s",
      }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-sans)",
  fontSize: "0.9rem",
  color: "var(--ink)",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const colHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.6rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  fontWeight: 700,
};
