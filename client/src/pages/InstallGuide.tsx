import { motion } from "framer-motion";
import { Apple, Smartphone, ArrowLeft, Download, Share, PlusSquare, MoreVertical, Smartphone as AndroidIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function InstallGuide() {
  const [, navigate] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ink)", color: "var(--cream)", padding: "2rem 1.25rem" }}>
      <header style={{ maxWidth: "600px", margin: "0 auto", marginBottom: "3rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "transparent", border: "none", color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2rem" }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h1 variants={itemVariants} style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem", lineHeight: 1.1 }}>
            DOM na sua <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Tela de Início</span>
          </motion.h1>
          <motion.p variants={itemVariants} style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.5 }}>
            Tenha acesso rápido às fichas técnicas como se fosse um aplicativo nativo. Siga o guia abaixo para o seu dispositivo.
          </motion.p>
        </motion.div>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto" }}>
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          
          {/* iOS Section */}
          <motion.section variants={itemVariants} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "var(--radius)", padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "var(--gold)", padding: "0.75rem", borderRadius: "12px", color: "var(--ink)" }}>
                <Apple size={24} />
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700 }}>iPhone & iPad</h2>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Step number="1" text="Abra este site no navegador Safari." icon={<Download size={16} />} />
              <Step number="2" text="Toque no botão de Compartilhar na barra inferior." icon={<Share size={16} />} />
              <Step number="3" text="Role para baixo e selecione 'Adicionar à Tela de Início'." icon={<PlusSquare size={16} />} />
              <Step number="4" text="Confirme tocando em 'Adicionar' no canto superior." />
            </div>
          </motion.section>

          {/* Android Section */}
          <motion.section variants={itemVariants} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "var(--radius)", padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "var(--gold)", padding: "0.75rem", borderRadius: "12px", color: "var(--ink)" }}>
                <AndroidIcon size={24} />
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700 }}>Android (Chrome)</h2>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Step number="1" text="Abra este site no Google Chrome." icon={<Download size={16} />} />
              <Step number="2" text="Toque nos três pontos (menu) no canto superior direito." icon={<MoreVertical size={16} />} />
              <Step number="3" text="Toque em 'Instalar aplicativo' ou 'Adicionar à tela inicial'." icon={<Smartphone size={16} />} />
              <Step number="4" text="Siga as instruções na tela para confirmar." />
            </div>
          </motion.section>

          <motion.footer variants={itemVariants} style={{ textAlign: "center", marginTop: "4rem", paddingBottom: "4rem" }}>
             <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 800, color: "var(--gold)", marginBottom: "0.5rem" }}>
               DOM <span style={{ fontWeight: 400, fontStyle: "italic", color: "var(--cream)" }}>PRODUÇÕES</span>
             </div>
             <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
               Tecnologia para Eventos
             </p>
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}

function Step({ number, text, icon }: { number: string, text: string, icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      <div style={{ 
        minWidth: "24px", 
        height: "24px", 
        borderRadius: "50%", 
        background: "rgba(212,175,55,0.15)", 
        color: "var(--gold)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontSize: "0.75rem", 
        fontWeight: 800,
        fontFamily: "var(--font-sans)",
        border: "1px solid var(--gold)"
      }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
          {text}
        </p>
        {icon && (
          <div style={{ marginTop: "0.5rem", color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
