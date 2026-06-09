import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Photo Studio",
    short_name: "AI Photo",
    description: "Generate gambar AI dari Zirolu.id",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#e04585",
    icons: [
      {
        src: "/inaco/home.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/inaco/home.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
