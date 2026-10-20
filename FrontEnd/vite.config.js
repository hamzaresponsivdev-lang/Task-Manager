import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const backend = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    publicDir: "../public",
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      proxy: Object.fromEntries(
        ["/auth", "/teams", "/tasks", "/test-db", "/health"].map((path) => [
          path,
          { target: backend, changeOrigin: true },
        ]),
      ),
    },
  };
});
