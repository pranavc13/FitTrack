"use client";

import { Camera, CameraOff, ImagePlus, RefreshCcw, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { captureFrame, compressImage } from "@/lib/client/image";
import { cn } from "@/lib/utils";

export interface Shot {
  blob: Blob;
  url: string;
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Rear-camera viewfinder with capture, multi-shot (up to `max` angles) and gallery upload fallback.
 * When `onBarcode` is set it continuously scans frames with the browser BarcodeDetector API where available
 * (Android Chrome); elsewhere the caller reads the captured photo instead.
 */
export function CameraCapture({
  shots,
  setShots,
  max = 3,
  overlay = "plate",
  onBarcode,
}: {
  shots: Shot[];
  setShots: (s: Shot[]) => void;
  max?: number;
  overlay?: "plate" | "label" | "barcode";
  onBarcode?: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "denied" | "unavailable">("idle");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("live");
    } catch (e) {
      setStatus((e as DOMException).name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, [facing, stop]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  // Live barcode detection.
  useEffect(() => {
    if (!onBarcode || status !== "live") return;
    const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) return;
    const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    let stopped = false;
    const tick = async () => {
      if (stopped || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
        if (code) {
          stopped = true;
          navigator.vibrate?.(60);
          onBarcode(code.rawValue);
          return;
        }
      } catch {
        /* ignore frame errors */
      }
    };
    const id = setInterval(tick, 350);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [onBarcode, status]);

  async function capture() {
    if (!videoRef.current || shots.length >= max) return;
    setBusy(true);
    try {
      const blob = await captureFrame(videoRef.current);
      navigator.vibrate?.(30);
      setShots([...shots, { blob, url: URL.createObjectURL(blob) }]);
    } finally {
      setBusy(false);
    }
  }

  async function fromGallery(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next = [...shots];
      for (const f of Array.from(files).slice(0, max - shots.length)) {
        const blob = await compressImage(f);
        next.push({ blob, url: URL.createObjectURL(blob) });
      }
      setShots(next);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const supportsBarcode = typeof globalThis !== "undefined" && "BarcodeDetector" in globalThis;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-line bg-black sm:aspect-[4/3]">
        <video ref={videoRef} playsInline muted className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100", status !== "live" && "opacity-0")} />
        {status === "live" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            {overlay === "barcode" ? (
              <div className="relative h-32 w-4/5 rounded-2xl border-2 border-lime/90">
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-lime" />
              </div>
            ) : overlay === "label" ? (
              <div className="h-4/5 w-4/5 rounded-3xl border-2 border-dashed border-lime/80" />
            ) : (
              <div className="aspect-square w-4/5 rounded-full border-2 border-lime/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            )}
            <p className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {overlay === "barcode" ? (supportsBarcode ? "Point at the barcode — or tap the shutter" : "Fill the box with the barcode and tap the shutter") : overlay === "label" ? "Fit the nutrition table inside the frame" : shots.length ? `Photo ${shots.length + 1} of ${max}: try another angle` : "Fit the whole plate in the circle, shoot from ~45°"}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            {status === "starting" || status === "idle" ? (
              <p className="text-sm text-muted">Starting camera…</p>
            ) : (
              <div className="space-y-3">
                <CameraOff className="mx-auto h-10 w-10 text-faint" />
                <p className="text-sm text-muted">{status === "denied" ? "Camera permission was denied. Allow camera access in your browser's site settings, or upload a photo from your gallery." : "Camera isn't available here. Upload a photo from your gallery instead."}</p>
                <div className="flex justify-center gap-2">
                  {status === "denied" ? (
                    <Button size="sm" variant="secondary" onClick={start}>
                      <RefreshCcw className="h-4 w-4" /> Retry
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> Gallery
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {shots.length ? (
        <div className="flex gap-2">
          {shots.map((s, i) => (
            <div key={s.url} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
              <img src={s.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button onClick={() => setShots(shots.filter((x) => x !== s))} className="absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-black/70" aria-label={`Remove photo ${i + 1}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {overlay !== "barcode" || shots.length < max ? (
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => fileRef.current?.click()} className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted" aria-label="Upload from gallery">
            <ImagePlus className="h-6 w-6" />
          </button>
          <button onClick={capture} disabled={status !== "live" || busy || shots.length >= max} className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-lime/40 bg-lime text-lime-ink disabled:opacity-40 active:scale-95" aria-label="Take photo">
            <Camera className="h-8 w-8" />
          </button>
          <button onClick={() => setFacing(facing === "environment" ? "user" : "environment")} className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted" aria-label="Switch camera">
            <SwitchCamera className="h-6 w-6" />
          </button>
        </div>
      ) : null}
      <input ref={fileRef} type="file" accept="image/*" multiple={max > 1} className="hidden" onChange={(e) => fromGallery(e.target.files)} />
    </div>
  );
}
