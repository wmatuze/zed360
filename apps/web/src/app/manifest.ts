import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zed360",
    short_name: "Zed360",
    description:
      "Find relevant, active businesses and compare current responses across Zambia.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#b8f238",
    icons: [
      {
        src: "/brand/zed360-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
