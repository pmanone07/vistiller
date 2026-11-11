import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Event lists and private edit links must never be indexed.
      disallow: ["/a/", "/b/", "/dashboard", "/api/", "/auth/"],
    },
    host: SITE_URL,
  };
}
