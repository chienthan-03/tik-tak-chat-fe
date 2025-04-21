import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // Add this to process JSX in .js files
      include: "**/*.{jsx,js,ts,tsx}",
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
});
