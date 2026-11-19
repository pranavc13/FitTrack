import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/home",
    name: "FitTrack AI",
    short_name: "FitTrack",
    description: "Track Indian meals with your camera, workouts, steps and body transformation — with an AI coach.",
    start_url: "/home?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#090B0A",
    theme_color: "#090B0A",
    categories: ["health", "fitness", "food", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan a meal", short_name: "Scan", url: "/scan?source=shortcut", icons: [{ src: "/icons/shortcut-scan.png", sizes: "96x96" }] },
      { name: "Food diary", short_name: "Food", url: "/food?source=shortcut", icons: [{ src: "/icons/shortcut-food.png", sizes: "96x96" }] },
      { name: "Log activity", short_name: "Activity", url: "/activity?source=shortcut", icons: [{ src: "/icons/shortcut-activity.png", sizes: "96x96" }] },
      { name: "AI coach", short_name: "Coach", url: "/coach?source=shortcut", icons: [{ src: "/icons/shortcut-coach.png", sizes: "96x96" }] },
    ],
  };
}
