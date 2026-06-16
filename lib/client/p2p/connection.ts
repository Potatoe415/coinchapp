"use client";

/**
 * Thin WebRTC wrapper for one host<->client link over a single data channel.
 * Signaling is manual and offline: the SDP (with ICE candidates inlined) is
 * exchanged out of band via QR codes. The host is always the offerer.
 */
export type P2PHandler = (data: string) => void;

export interface P2PConnection {
  /** Host: create an offer SDP to show as a QR. */
  createOffer(): Promise<string>;
  /** Host: apply the client's answer SDP. */
  acceptAnswer(answer: string): Promise<void>;
  /** Client: apply the host's offer SDP and return the answer SDP. */
  acceptOffer(offer: string): Promise<string>;
  send(data: string): void;
  onMessage(handler: P2PHandler): void;
  onOpen(handler: () => void): void;
  onClose(handler: () => void): void;
  close(): void;
}

const noop = () => {};

/** Resolve once ICE gathering is complete so localDescription carries every candidate. */
function waitIceComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });
}

function serialize(desc: RTCSessionDescription | null): string {
  if (!desc) throw new Error("no_local_description");
  return JSON.stringify({ type: desc.type, sdp: desc.sdp });
}

export function createP2PConnection(): P2PConnection {
  const pc = new RTCPeerConnection();
  let channel: RTCDataChannel | null = null;
  const handlers = { message: noop as P2PHandler, open: noop, close: noop };
  let closedNotified = false;

  const notifyClose = () => {
    if (closedNotified) return;
    closedNotified = true;
    handlers.close();
  };

  const bindChannel = (ch: RTCDataChannel) => {
    channel = ch;
    ch.onmessage = (e) => handlers.message(e.data as string);
    ch.onopen = () => handlers.open();
    ch.onclose = notifyClose;
  };

  pc.ondatachannel = (e) => bindChannel(e.channel);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      notifyClose();
    }
  };

  return {
    async createOffer() {
      bindChannel(pc.createDataChannel("game"));
      await pc.setLocalDescription(await pc.createOffer());
      await waitIceComplete(pc);
      return serialize(pc.localDescription);
    },
    async acceptAnswer(answer) {
      await pc.setRemoteDescription(JSON.parse(answer) as RTCSessionDescriptionInit);
    },
    async acceptOffer(offer) {
      await pc.setRemoteDescription(JSON.parse(offer) as RTCSessionDescriptionInit);
      await pc.setLocalDescription(await pc.createAnswer());
      await waitIceComplete(pc);
      return serialize(pc.localDescription);
    },
    send(data) {
      if (channel?.readyState === "open") channel.send(data);
    },
    onMessage(handler) {
      handlers.message = handler;
    },
    onOpen(handler) {
      handlers.open = handler;
    },
    onClose(handler) {
      handlers.close = handler;
    },
    close() {
      channel?.close();
      pc.close();
    },
  };
}
