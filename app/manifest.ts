import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coinchapp — Coinche et la Bouilla",
    short_name: "Coinchapp",
    description: "Jouez à la Coinche et à la Bouilla, même hors ligne en solo.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffedd8",
    theme_color: "#ffedd8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
