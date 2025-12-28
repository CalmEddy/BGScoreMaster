import { useEffect, useRef, useState } from "react";

export type OnboardingStep = {
  id: string;
  target: string; // CSS selector or element ref
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
};

type OnboardingProps = {
  steps: OnboardingStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
};

const Onboarding = ({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: OnboardingProps) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  useEffect(() => {
    if (!step) return;

    const findTarget = () => {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setOverlayRect(rect);
      }
    };

    // Wait for DOM to be ready
    const timer = setTimeout(findTarget, 100);
    findTarget();

    const handleResize = () => {
      findTarget();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", findTarget, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", findTarget, true);
    };
  }, [step]);

  useEffect(() => {
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [targetElement]);

  if (!step || currentStep < 0 || currentStep >= steps.length) {
    return null;
  }

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="onboarding-overlay" ref={overlayRef}>
      {overlayRect && (
        <div
          className="onboarding-spotlight"
          style={{
            position: "fixed",
            top: `${overlayRect.top}px`,
            left: `${overlayRect.left}px`,
            width: `${overlayRect.width}px`,
            height: `${overlayRect.height}px`,
            borderRadius: "8px",
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
            pointerEvents: "none",
            zIndex: 999,
            transition: "all 0.3s ease",
          }}
        />
      )}
      <div
        className="onboarding-tooltip"
        style={{
          position: "fixed",
          top: overlayRect
            ? `${overlayRect.bottom + 20}px`
            : "50%",
          left: overlayRect
            ? `${overlayRect.left + overlayRect.width / 2}px`
            : "50%",
          transform: overlayRect ? "translateX(-50%)" : "translate(-50%, -50%)",
          zIndex: 1000,
          maxWidth: "400px",
        }}
      >
        <div className="onboarding-header">
          <div>
            <h3 className="onboarding-title">{step.title}</h3>
            <div className="onboarding-progress">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <button className="onboarding-close" onClick={onSkip} aria-label="Skip tour">
            ×
          </button>
        </div>
        <div className="onboarding-content">{step.content}</div>
        <div className="onboarding-actions">
          <button className="button secondary" onClick={onSkip}>
            Skip Tour
          </button>
          <div className="onboarding-nav">
            <button
              className="button secondary"
              onClick={onPrevious}
              disabled={isFirst}
            >
              Previous
            </button>
            <button className="button" onClick={handleNext}>
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

