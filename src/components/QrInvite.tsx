import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a QR code for the given text/URL as an <img>. No network required. */
export function QrInvite({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0b14", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc("");
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className="animate-pulse rounded-xl bg-muted"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code to join this room"
      className="rounded-xl bg-white p-2 shadow-lg"
    />
  );
}
