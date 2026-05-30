import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type LogoutButtonProps = {
  hideLabelOnMobile?: boolean;
};

export function LogoutButton({ hideLabelOnMobile = true }: LogoutButtonProps) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao sair.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Sair da conta"
      title="Sair"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(212, 175, 55, 0.55)",
        color: "var(--gold)",
        padding: "0.45rem 0.65rem",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-sans)",
        fontSize: "0.58rem",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: isLoggingOut ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        opacity: isLoggingOut ? 0.65 : 1,
        whiteSpace: "nowrap",
      }}
    >
      <LogOut size={13} />
      <span className={hideLabelOnMobile ? "hidden sm:inline" : undefined}>
        {isLoggingOut ? "Saindo" : "Sair"}
      </span>
    </button>
  );
}
