import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import removeConsole from "vite-plugin-remove-console";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [
      react(),
      isProduction &&
        removeConsole({
          includes: ["log", "warn", "error", "info", "debug"],
          excludes: [], // Keep some console methods if needed
        }),
    ].filter(Boolean),

    build: {
      minify: isProduction ? "terser" : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              dead_code: true,
              unused: true,
            },
            format: {
              comments: false,
            },
          }
        : undefined,

      sourcemap: mode !== "production",

      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            monaco: ["@monaco-editor/react"],
          },
        },
      },
    },

    // Environment-specific settings
    define: {
      // Custom build-time constants
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_PRODUCTION__: JSON.stringify(isProduction),
    },
  };
});

