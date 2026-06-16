"use client";

/**
 * Encode/decode an SDP payload so it fits inside a single QR code.
 * SDP JSON is gzipped (CompressionStream) then base64-encoded; this typically
 * shrinks a ~2-4 KB offer below the QR byte-mode capacity.
 */

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesFromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Compress an SDP string into a compact QR-safe payload. */
export async function encodeSignal(sdp: string): Promise<string> {
  return base64FromBytes(await gzip(sdp));
}

/** Restore the original SDP string from a scanned QR payload. */
export async function decodeSignal(payload: string): Promise<string> {
  return gunzip(bytesFromBase64(payload.trim()));
}
