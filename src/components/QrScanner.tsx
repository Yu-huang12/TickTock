import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { X, ScanLine } from "lucide-react";

/**
 * Full-screen modal that opens the camera and reports the first QR code it reads.
 * Web implementation (zxing). On native builds this is swapped for the MLKit scanner.
 */
export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: IScannerControls | undefined;
    let done = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, ctrl) => {
          controls = ctrl;
          if (result && !done) {
            done = true;
            ctrl.stop();
            onResult(result.getText());
          }
        }
      )
      .then((ctrl) => {
        controls = ctrl;
        if (done) ctrl.stop();
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Camera unavailable";
        setError(msg);
      });

    return () => controls?.stop();
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <ScanLine className="size-4 text-secondary" /> Scan room QR
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close scanner"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative aspect-square w-full bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {!error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-2/3 w-2/3 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-medium text-destructive">Camera unavailable</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">
                Allow camera access, or type the code instead.
              </p>
            </div>
          )}
        </div>

        <p className="px-4 py-3 text-center text-xs text-muted-foreground">
          Point your camera at the host&rsquo;s QR code.
        </p>
      </div>
    </div>
  );
}
