import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cropRect, type FloorPlan, type Hotspot } from "@/lib/floorplan";

export type HotspotTone = "occupied" | "vacant" | "common";

export type HotspotStatus = {
  tone: HotspotTone;
  alert?: boolean;
  warranty?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const MAX_CHIPS = 4;

const toneClass: Record<HotspotTone, string> = {
  occupied: "border-primary/70 bg-primary/25 hover:bg-primary/35",
  vacant: "border-muted-foreground/50 bg-muted/40 hover:bg-muted/60",
  common: "border-success/50 bg-success/15 hover:bg-success/25",
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function FloorPlanMap({
  plan,
  statusFor,
  selectedId,
  onSelect,
  codesFor,
  showCodes = false,
  fullscreen = false,
  onToggleFullscreen,
  className,
}: {
  plan: FloorPlan;
  statusFor: (hotspot: Hotspot) => HotspotStatus;
  selectedId: string | null;
  onSelect: (hotspot: Hotspot) => void;
  codesFor?: (hotspot: Hotspot) => string[];
  showCodes?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [plan.key, fullscreen, reset]);

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const clamped = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const k = clamped / z;
    setZoom(clamped);
    setOffset(
      clamped === MIN_ZOOM ? { x: 0, y: 0 } : { x: px - (px - o.x) * k, y: py - (py - o.y) * k },
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      const { zoom: z } = stateRef.current;
      zoomAt(z * Math.exp(-dy * 0.0018), event.clientX - rect.left, event.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const centerZoom = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(stateRef.current.zoom * factor, rect.width / 2, rect.height / 2);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stateRef.current.zoom <= MIN_ZOOM) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  };

  const { crop } = plan;
  const frameRatio = (crop.h / crop.w) * plan.aspect * 100;
  const codeThreshold = fullscreen ? 1 : 1.6;
  const chipsVisible = showCodes && zoom >= codeThreshold;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative overflow-hidden rounded-lg border border-gold-line bg-white ${
          fullscreen ? "h-full" : ""
        }`}
        style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "default" }}
      >
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className={fullscreen ? "relative mx-auto h-full" : "relative w-full"}
            style={
              fullscreen
                ? { aspectRatio: `${crop.w / (crop.h * plan.aspect)}`, maxWidth: "100%" }
                : { paddingTop: `${frameRatio}%` }
            }
          >
            <img
              src={plan.image}
              alt={`Denah ${plan.label} Lavin Kost Purwokerto`}
              className="absolute select-none"
              draggable={false}
              style={{
                width: `${(100 / crop.w) * 100}%`,
                maxWidth: "none",
                left: `${-(crop.x / crop.w) * 100}%`,
                top: `${-(crop.y / crop.h) * 100}%`,
              }}

            />
            {plan.hotspots.map((hotspot) => {
              const status = statusFor(hotspot);
              const active = hotspot.id === selectedId;
              const rect = cropRect(crop, hotspot);
              const codes = codesFor?.(hotspot) ?? [];
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  title={
                    codes.length ? `${hotspot.label} — ${codes.join(", ")}` : hotspot.label
                  }
                  aria-label={hotspot.label}
                  onClick={() => {
                    if (dragRef.current?.moved) return;
                    onSelect(hotspot);
                  }}
                  className={`absolute overflow-hidden rounded-[3px] border transition-colors ${
                    toneClass[status.tone]
                  } ${active ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  style={{
                    left: `${rect.left}%`,
                    top: `${rect.top}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                  }}
                >
                  {chipsVisible && codes.length ? (
                    <span
                      className="flex flex-wrap content-start justify-center gap-[2px] p-[2px] leading-none"
                      style={{ fontSize: `${9 / zoom}px` }}
                    >
                      {codes.slice(0, MAX_CHIPS).map((code) => (
                        <span
                          key={code}
                          className="rounded bg-background/85 px-[3px] py-[1px] font-mono text-foreground"
                        >
                          {code}
                        </span>
                      ))}
                      {codes.length > MAX_CHIPS ? (
                        <span className="rounded bg-foreground/70 px-[3px] py-[1px] font-mono text-background">
                          +{codes.length - MAX_CHIPS}
                        </span>
                      ) : null}
                    </span>
                  ) : codes.length ? (
                    <span
                      className="absolute inset-x-0 bottom-[2px] text-center font-mono text-muted-foreground"
                      style={{ fontSize: `${8 / zoom}px` }}
                    >
                      {codes.length}
                    </span>
                  ) : null}
                  {status.alert ? (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                  ) : null}
                  {status.warranty ? (
                    <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-warning" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute right-2 bottom-2 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label="Perbesar denah"
            onClick={() => centerZoom(1.4)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label="Perkecil denah"
            onClick={() => centerZoom(1 / 1.4)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label="Reset tampilan denah"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {onToggleFullscreen ? (
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              aria-label={fullscreen ? "Keluar layar penuh" : "Layar penuh denah"}
              onClick={onToggleFullscreen}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      </div>
      {fullscreen ? null : (
        <p className="text-xs text-muted-foreground">
          Gulir / pinch untuk zoom, geser untuk berpindah area. Ketuk area untuk melihat detail.
        </p>
      )}
    </div>
  );
}
