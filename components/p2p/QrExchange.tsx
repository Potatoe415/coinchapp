"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

/** Render a payload as a QR. Falls back to a copyable textarea if it is too large. */
export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooLarge, setTooLarge] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTooLarge(false);
    QRCode.toCanvas(canvas, value, { width: size, errorCorrectionLevel: "L", margin: 1 }).catch(
      () => setTooLarge(true),
    );
  }, [value, size]);

  if (tooLarge) {
    return (
      <textarea
        data-id="qr-fallback-text"
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="h-32 w-full rounded-lg bg-[rgba(32,40,58,0.08)] p-2 text-xs"
      />
    );
  }
  return (
    <canvas
      ref={canvasRef}
      data-id="qr-code-canvas"
      className="rounded-lg bg-white"
      style={{ width: size, height: size }}
    />
  );
}

/** Live camera QR scanner. Calls onScan once with the first decoded payload. */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let active = true;
    let controls: IScannerControls | null = null;
    const video = videoRef.current;
    if (!video) return;
    reader
      .decodeFromVideoDevice(undefined, video, (result, _err, ctrl) => {
        if (!result || !active) return;
        active = false;
        ctrl.stop();
        onScanRef.current(result.getText());
      })
      .then((ctrl) => {
        controls = ctrl;
        if (!active) ctrl.stop();
      })
      .catch(() => setError(true));
    return () => {
      active = false;
      controls?.stop();
    };
  }, []);

  if (error) {
    return (
      <p data-id="qr-scanner-error" className="text-center text-sm text-[var(--accent-red)]">
        Caméra indisponible — utilisez le collage manuel.
      </p>
    );
  }
  return (
    <video
      ref={videoRef}
      data-id="qr-scanner-video"
      className="aspect-square w-full rounded-lg bg-black object-cover"
      muted
      playsInline
    />
  );
}

/** Manual paste fallback when the camera cannot be used. */
export function QrPaste({ onSubmit, label }: { onSubmit: (text: string) => void; label: string }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <textarea
        data-id="qr-paste-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={label}
        className="h-20 w-full rounded-lg bg-[rgba(32,40,58,0.08)] p-2 text-xs"
      />
      <button
        data-id="qr-paste-submit"
        disabled={text.trim().length === 0}
        onClick={() => onSubmit(text.trim())}
        className="rounded-lg bg-[var(--accent-cyan)] px-4 py-2 font-bold text-[var(--surface)] disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  );
}
