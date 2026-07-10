const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

const rootDir = __dirname;

const productionCsp =
  "default-src 'self' data: gvfile: gvfile://* blob:; img-src 'self' data: gvfile: gvfile://* blob:;";

module.exports = defineConfig(({ mode }) => ({
  root: rootDir,
  base: "./",
  plugins: [
    react(),
    {
      name: "gameverse-csp-production",
      transformIndexHtml(html) {
        if (mode !== "production") return html;
        return html.replace(
          /content="default-src[^"]+"/,
          `content="${productionCsp}"`,
        );
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.DEV_PORT || 5173),
    strictPort: true,
  },
  build: {
    outDir: path.join(rootDir, "dist"),
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
  },
}));
