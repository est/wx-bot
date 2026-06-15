import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client", "openclaw"],
};

export default config;
