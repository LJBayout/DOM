import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TourStep = {
  target: string;
  title: string;
  description: string;
};

type TourGuideProps = {
  steps: TourStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoStartKey?: string;
};

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const CARD_WIDTH = 360;
const CARD_HEIGHT = 280;
const VIEWPORT_GAP = 16;

export function TourGuide({ steps, open, onOpenChange, autoStartKey }: TourGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;

  useEffect(() => {
    if (!autoStartKey || totalSteps === 0) return;
    if (localStorage.getItem(autoStartKey)) return;

    const timer = window.setTimeout(() => onOpenChange(true), 700);
    return () => window.clearTimeout(timer);
  }, [autoStartKey, onOpenChange, totalSteps]);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !currentStep) return;

    let frame = 0;
    const updateRect = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${currentStep.target}"]`);
      if (!element) {
        setRect(null);
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      frame = window.requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        setRect({
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        });
      });
    };

    const timer = window.setTimeout(updateRect, 120);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [currentStep, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishTour();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const cardPosition = useMemo(() => {
    if (!rect || window.innerWidth < 720) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(92vw, 380px)",
      } as const;
    }

    const maxLeft = window.innerWidth - CARD_WIDTH - VIEWPORT_GAP;
    const left = Math.min(Math.max(rect.left, VIEWPORT_GAP), maxLeft);
    const enoughSpaceBelow = rect.top + rect.height + CARD_HEIGHT + VIEWPORT_GAP < window.innerHeight;
    const top = enoughSpaceBelow
      ? rect.top + rect.height + VIEWPORT_GAP
      : Math.max(VIEWPORT_GAP, rect.top - CARD_HEIGHT - VIEWPORT_GAP);

    return {
      left,
      top,
      width: CARD_WIDTH,
      transform: "none",
    };
  }, [rect]);

  if (!open || !currentStep || totalSteps === 0) return null;

  function finishTour() {
    if (autoStartKey) localStorage.setItem(autoStartKey, "done");
    onOpenChange(false);
    setStepIndex(0);
  }

  function goNext() {
    if (stepIndex >= totalSteps - 1) {
      finishTour();
      return;
    }
    setStepIndex((index) => index + 1);
  }

  function goBack() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  return (
    <div aria-live="polite" style={{ pointerEvents: "none" }}>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          background: "rgba(0, 0, 0, 0.66)",
          backdropFilter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      {rect && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            zIndex: 501,
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: "10px",
            border: "2px solid var(--gold)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.14), 0 0 28px rgba(212,175,55,0.5)",
            pointerEvents: "none",
          }}
        />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        style={{
          position: "fixed",
          zIndex: 502,
          ...cardPosition,
          background: "var(--card)",
          color: "var(--foreground)",
          border: "1px solid var(--gold)",
          borderRadius: "var(--radius)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.45)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <div style={{ padding: "1rem 1.1rem", borderBottom: "1px solid var(--border)", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Guia do sistema
          </span>
          <button
            type="button"
            onClick={finishTour}
            aria-label="Fechar guia"
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", display: "grid", placeItems: "center" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.85rem" }}>
            {steps.map((step, index) => (
              <span
                key={`${step.target}-${index}`}
                aria-hidden="true"
                style={{
                  height: "4px",
                  flex: 1,
                  borderRadius: "999px",
                  background: index <= stepIndex ? "var(--gold)" : "rgba(255,255,255,0.14)",
                }}
              />
            ))}
          </div>

          <p style={{ margin: "0 0 0.45rem", color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Passo {stepIndex + 1} de {totalSteps}
          </p>
          <h2 id="tour-title" style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-serif)", fontSize: "1.35rem", lineHeight: 1.1, color: "var(--foreground)" }}>
            {currentStep.title}
          </h2>
          <p id="tour-description" style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.55, color: "rgba(255,255,255,0.74)" }}>
            {currentStep.description}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginTop: "1.35rem" }}>
            <button
              type="button"
              onClick={finishTour}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Pular
            </button>

            <div style={{ display: "flex", gap: "0.55rem" }}>
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                aria-label="Voltar para o passo anterior"
                style={{ width: "38px", height: "38px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)", color: "white", cursor: stepIndex === 0 ? "not-allowed" : "pointer", opacity: stepIndex === 0 ? 0.45 : 1, display: "grid", placeItems: "center" }}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={goNext}
                style={{ height: "38px", padding: "0 0.9rem", borderRadius: "var(--radius-sm)", border: "none", background: "var(--gold)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {stepIndex === totalSteps - 1 ? "Concluir" : "Próximo"}
                {stepIndex < totalSteps - 1 && <ChevronRight size={17} />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
