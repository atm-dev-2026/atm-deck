import type { MetadataRoute } from "next";

// Makes ATM Deck installable — which iPhone/iPad require before a site may
// receive push notifications (Add to Home Screen, iOS 16.4+).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATM Deck",
    short_name: "ATM Deck",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1814",
    theme_color: "#1b1814",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // The card stack sits well inside the maskable safe zone.
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
