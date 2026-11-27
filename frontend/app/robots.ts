import type { MetadataRoute } from "next";

// Private app: ask every crawler to stay out entirely (served at /robots.txt).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
