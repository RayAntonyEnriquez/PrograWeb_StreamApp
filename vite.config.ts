import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
 
  const base = env.BASE_PATH || "/PrograWeb_StreamApp/";
  return {
    plugins: [react()],
    base,
  };
});
