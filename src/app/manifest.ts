import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padel Tourni",
    short_name: "Tourni",
    description:
      "Fair draws, live scoring, and standings for better padel events.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2e9",
    theme_color: "#102f27",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
