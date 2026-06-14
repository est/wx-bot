import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
};

export default withWorkflow(config);
