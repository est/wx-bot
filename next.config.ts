import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client", "openclaw"],
};

export default withWorkflow(config);
