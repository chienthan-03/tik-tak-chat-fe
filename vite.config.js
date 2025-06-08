import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js,ts,tsx}",
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    dedupe: ["react", "react-dom"],
  },
  json: {
    namedExports: true,
  },
  optimizeDeps: {
    include: ["@emoji-mart/data", "@emoji-mart/react"],
  },

});
