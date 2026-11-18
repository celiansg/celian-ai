import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL(".", import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Agent Elements is vendored from the official 21st.dev registry. It is
  // typechecked with the application, but its upstream lint conventions are
  // intentionally kept intact.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "components/agent-elements/**", "public/pdf.worker.min.mjs"] },
];

export default config;
