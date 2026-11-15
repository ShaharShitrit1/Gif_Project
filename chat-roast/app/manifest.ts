import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChatRoast · רוסט לצ'אט הקבוצתי",
    short_name: "ChatRoast",
    description: "מעלים צ'אט מוואטסאפ ומקבלים רוסט מצחיק ופרופיל לכל אחד בקבוצה.",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#fff8f0",
    theme_color: "#ff5a36",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
