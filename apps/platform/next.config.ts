import type { NextConfig } from "next";
import path from "path";

// The platform admin app historically served under /platform (path-based, one
// domain shared with apps/web). basePath means routes/links inside this app are
// written WITHOUT the prefix; Next.js adds it automatically.
//
// For subdomain hosting (e.g. admin.gymflow.io) it should serve at the root.
// NEXT_PUBLIC_BASE_PATH controls this:
//   - unset       -> "/platform"  (legacy path-based default, unchanged)
//   - "" (empty)  -> no basePath   (root — used for admin.gymflow.io)
//   - "/anything" -> custom prefix
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/platform";
const basePath = rawBasePath === "" ? undefined : rawBasePath;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Self-contained server bundle for the Docker runtime image.
  output: "standalone",
  // Trace from the monorepo root so hoisted deps are bundled.
  outputFileTracingRoot: path.join(process.cwd(), "..", ".."),
};

export default nextConfig;
