import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const devLogin = trpc.auth.devLogin.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await devLogin.mutateAsync({ username, password });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.8fr]">
        
        {/* Left Side: Brand Visual */}
        <section className="relative hidden lg:flex flex-col justify-between p-16" style={{ background: "var(--ink)", color: "var(--gold)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.05em" }}>DOM</span>
            <div style={{ width: "1px", height: "24px", background: "var(--gold)", opacity: 0.3 }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8 }}>Produções e Eventos</span>
          </div>

          <div className="max-w-xl">
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.6, marginBottom: "1.5rem" }}>
              Gestão Operacional de Eventos
            </p>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "6rem", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 0.85, marginBottom: "2rem" }}>
              Ficha<br />
              <span style={{ color: "var(--gold)", fontStyle: "italic", fontWeight: 400 }}>Técnica</span>
            </h1>
            <div style={{ width: "120px", height: "4px", background: "var(--gold)", marginBottom: "2.5rem" }} />
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              Plataforma exclusiva para organização, logística e documentação de grandes eventos.
            </p>
          </div>

          <div style={{ opacity: 0.4, fontFamily: "var(--font-sans)", fontSize: "0.7rem", letterSpacing: "0.15em" }}>
            DOM PROD © {new Date().getFullYear()}
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="flex items-center justify-center p-6 sm:p-12" style={{ background: "var(--background)" }}>
          <div className="w-full max-w-sm">
            
            {/* Mobile Logo */}
            <div className="lg:hidden flex flex-col items-center mb-12 text-center">
               <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                DOM <span style={{ color: "var(--gold)", fontWeight: 400, fontStyle: "italic" }}>Técnica</span>
              </h1>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginTop: "0.5rem", fontWeight: 700 }}>
                Acesso ao Sistema
              </p>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                Bem-vindo
              </h2>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--ink-light)" }}>
                Entre com suas credenciais de produção.
              </p>
            </div>

            <form onSubmit={handleDevLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.95rem",
                    outline: "none",
                    color: "var(--ink)"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.95rem",
                    outline: "none",
                    color: "var(--ink)"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || devLogin.isPending}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "var(--ink)",
                  color: "var(--gold)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  cursor: (loading || devLogin.isPending) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  marginTop: "1rem",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
                }}
              >
                <KeyRound size={16} />
                {devLogin.isPending ? "Entrando..." : "Entrar no Sistema"}
              </button>

              {devLogin.error && (
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--destructive)", textAlign: "center" }}>
                  {devLogin.error.message}
                </p>
              )}
            </form>

            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <button
                onClick={() => navigate("/instalar")}
                style={{ background: "transparent", border: "none", color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Smartphone size={14} /> Como instalar este App no seu celular?
              </button>
            </div>

            <p style={{ marginTop: "3rem", fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--ink-faint)", textAlign: "center", lineHeight: 1.6 }}>
              Sistema de uso exclusivo da <strong>DOM Produções</strong>.<br />
              Desenvolvido para alta performance em campo.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
