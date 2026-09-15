import { defineConfig, globalIgnores } from "eslint/config";
import nextVite from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVite,
  globalIgnores(["public/_legacy/**", "node_modules/**", ".next/**"]),
]);
