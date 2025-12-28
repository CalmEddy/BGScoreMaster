import { useEffect, useRef, useState } from "react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

const Tooltip = ({
  content,
  children,
  position = "top",
  show = true,
  onDismiss,
}: {
  content: string;
  children: React.ReactNode;
  position?: TooltipPosition;
  show?: boolean;
  onDismiss?: () => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case "right":
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Keep tooltip within viewport
    const padding = 8;
    if (top < scrollY + padding) top = scrollY + padding;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible && show) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isVisible, show, position]);

  if (!show) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        style={{ display: "inline-block" }}
      >
        {children}
      </div>
      {isVisible && tooltipPosition && (
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            position: "absolute",
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            zIndex: 1000,
          }}
          role="tooltip"
        >
          <div className="tooltip-content">{content}</div>
          {onDismiss && (
            <button
              className="tooltip-dismiss"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
                setIsVisible(false);
              }}
              aria-label="Don't show again"
            >
              ×
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default Tooltip;
