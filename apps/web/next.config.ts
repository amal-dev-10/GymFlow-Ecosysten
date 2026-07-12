import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the Docker
  // runtime image only needs the traced files, not the whole monorepo.
  output: "standalone",
  // In an npm-workspaces monorepo, tracing must start from the repo root so
  // shared/hoisted dependencies get included in the standalone output.
  outputFileTracingRoot: path.join(process.cwd(), "..", ".."),
};

export default nextConfig;
