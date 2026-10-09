import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX({ configPath: "source.config.ts" });
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.119"],
};
export default withMDX(config);
