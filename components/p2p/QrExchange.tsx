"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useI18n } from "@/lib/client/i18n";

/** Render a payload as a QR, with an always-available copy-the-code fallback. */
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

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {tooLarge ? (
        <textarea
          data-id="qr-fallback-text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="h-32 w-full rounded-lg bg-[rgba(32,40,58,0.08)] p-2 text-xs"
        />
      ) : (
        <canvas
          ref={canvasRef}
          data-id="qr-code-canvas"
          className="rounded-lg bg-white"
          style={{ width: size, height: size }}
        />
      )}
      <CodeReveal value={value} />
    </div>
  );
}

/** Manual code fallback: reveal the payload as selectable text plus a copy button. */
function CodeReveal({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API needs a secure context: the user can still select manually.
    }
  }

  return (
    <details className="w-full" data-id="qr-code-reveal">
      <summary className="cursor-pointer text-center text-sm text-white/70">{t("showCode")}</summary>
      <textarea
        data-id="qr-code-text"
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 h-24 w-full rounded-lg bg-black/20 p-2 text-xs text-white"
      />
      <button
        data-id="qr-copy-code-button"
        onClick={copy}
        className="mt-2 w-full rounded-lg bg-[var(--accent-cyan)] px-4 py-2 font-bold text-[var(--surface)]"
      >
        {copied ? t("codeCopied") : t("copyCode")}
      </button>
    </details>
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
