import { useEffect, useMemo, useState } from "react";
import { Bug, EyeOff } from "lucide-react";
import { isEmbeddedPreviewWindow, isLovableEditorPreviewHost } from "@/lib/adminPreviewStability";

type LayerInfo = {
  label: string;
  zIndex: string;
  pointerEvents: string;
  position: string;
};

type ClickSnapshot = {
  target: LayerInfo | null;
  received: LayerInfo | null;
  blocker: LayerInfo | null;
  stack: LayerInfo[];
  point: { x: number; y: number };
  rect: { left: number; top: number; width: number; height: number } | null;
};

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "summary",
  "[role='button']",
  "[data-click-target]",
].join(", ");

const formatElementLabel = (element: Element | null) => {
  if (!element) return "—";

  const htmlElement = element as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const id = htmlElement.id ? `#${htmlElement.id}` : "";
  const role = htmlElement.getAttribute("role");
  const name = htmlElement.getAttribute("aria-label") || htmlElement.getAttribute("name") || htmlElement.dataset.clickTarget;
  const classes = htmlElement.className
    ?.toString()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((token) => `.${token}`)
    .join("");

  return [tag + id + (classes || ""), role ? `role=${role}` : null, name ? `name=${name}` : null]
    .filter(Boolean)
    .join(" · ");
};

const getLayerInfo = (element: Element | null): LayerInfo | null => {
  if (!element || !(element instanceof HTMLElement || element instanceof SVGElement)) {
    return null;
  }

  const style = window.getComputedStyle(element);

  return {
    label: formatElementLabel(element),
    zIndex: style.zIndex,
    pointerEvents: style.pointerEvents,
    position: style.position,
  };
};

const isPotentialBlocker = (element: Element, target: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.dataset.authDebugOverlay === "true") return false;
  if (!target) return false;
  if (element === target || element.contains(target) || target.contains(element)) return false;

  const style = window.getComputedStyle(element);
  if (style.pointerEvents === "none") return false;

  return style.position === "fixed" || style.position === "sticky" || style.zIndex !== "auto";
};

export function AuthInteractionDebugOverlay() {
  const debugAvailable = useMemo(
    () => import.meta.env.DEV || isEmbeddedPreviewWindow() || isLovableEditorPreviewHost(),
    [],
  );
  const [visible, setVisible] = useState(debugAvailable);
  const [snapshot, setSnapshot] = useState<ClickSnapshot | null>(null);

  useEffect(() => {
    if (!debugAvailable || !visible || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const stack = document
        .elementsFromPoint(event.clientX, event.clientY)
        .filter((element) => !(element instanceof HTMLElement && element.dataset.authDebugOverlay === "true"));

      const received = stack[0] ?? target;
      const interactiveTarget = stack.find((element) => element.matches(INTERACTIVE_SELECTOR)) ?? target;
      const blocker = stack.find((element) => isPotentialBlocker(element, interactiveTarget ?? null)) ?? null;
      const rectSource = (interactiveTarget ?? received) as HTMLElement | null;
      const rect = rectSource?.getBoundingClientRect();

      setSnapshot({
        target: getLayerInfo(interactiveTarget ?? null),
        received: getLayerInfo(received ?? null),
        blocker: getLayerInfo(blocker),
        stack: stack.slice(0, 4).map((element) => getLayerInfo(element)).filter(Boolean) as LayerInfo[],
        point: { x: Math.round(event.clientX), y: Math.round(event.clientY) },
        rect: rect
          ? {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          : null,
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [debugAvailable, visible]);

  if (!debugAvailable) {
    return null;
  }

  if (!visible) {
    return (
      <div className="pointer-events-none fixed bottom-4 left-4 z-[120]" data-auth-debug-overlay="true">
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-card-foreground shadow-lg"
          data-auth-debug-overlay="true"
        >
          <Bug className="h-4 w-4" />
          Debug clicks
        </button>
      </div>
    );
  }

  return (
    <>
      {snapshot?.rect && (
        <div
          className="pointer-events-none fixed z-[119] rounded-md border-2 border-primary/80 bg-primary/10"
          data-auth-debug-overlay="true"
          style={{
            left: snapshot.rect.left,
            top: snapshot.rect.top,
            width: snapshot.rect.width,
            height: snapshot.rect.height,
          }}
        />
      )}

      <div className="pointer-events-none fixed bottom-4 left-4 z-[120] max-w-[min(92vw,28rem)]" data-auth-debug-overlay="true">
        <div
          className="pointer-events-auto rounded-md border border-border bg-card/95 p-3 text-card-foreground shadow-2xl backdrop-blur"
          data-auth-debug-overlay="true"
        >
          <div className="mb-2 flex items-center justify-between gap-3" data-auth-debug-overlay="true">
            <div className="flex items-center gap-2 text-sm font-semibold" data-auth-debug-overlay="true">
              <Bug className="h-4 w-4 text-primary" />
              Click debug
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              data-auth-debug-overlay="true"
            >
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </button>
          </div>

          <div className="space-y-2 text-xs" data-auth-debug-overlay="true">
            <div data-auth-debug-overlay="true">
              <span className="font-medium text-foreground">Point:</span> {snapshot ? `${snapshot.point.x}, ${snapshot.point.y}` : "Click anywhere"}
            </div>
            <div data-auth-debug-overlay="true">
              <span className="font-medium text-foreground">Interactive target:</span> {snapshot?.target?.label ?? "Waiting for click"}
            </div>
            <div data-auth-debug-overlay="true">
              <span className="font-medium text-foreground">Element that received it:</span> {snapshot?.received?.label ?? "—"}
            </div>
            <div data-auth-debug-overlay="true">
              <span className="font-medium text-foreground">Possible blocker:</span>{" "}
              {snapshot?.blocker
                ? `${snapshot.blocker.label} · z=${snapshot.blocker.zIndex} · pe=${snapshot.blocker.pointerEvents}`
                : "None detected"}
            </div>

            {snapshot?.stack?.length ? (
              <div className="rounded-md bg-muted/60 p-2" data-auth-debug-overlay="true">
                <div className="mb-1 font-medium text-foreground" data-auth-debug-overlay="true">Top layers</div>
                <div className="space-y-1 text-[11px] text-muted-foreground" data-auth-debug-overlay="true">
                  {snapshot.stack.map((layer, index) => (
                    <div key={`${layer.label}-${index}`} data-auth-debug-overlay="true">
                      {index + 1}. {layer.label} · z={layer.zIndex} · pe={layer.pointerEvents} · pos={layer.position}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}