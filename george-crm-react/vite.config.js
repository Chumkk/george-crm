import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { staticAssetWorker } from "./build/staticAssetCache.js";
import { buildGosVendor } from "./build/gos-vendor.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const schedulerEntry = require.resolve("scheduler", { paths: [fs.realpathSync(path.join(root, "node_modules/react-dom"))] });
const engineFiles = ["startup", "policy", "crm", "workflows", "quoteRevision", "projectQuoteList", "customerQuoteLayout", "orderRevision", "customerHub", "todoDemoFill", "allocationBatch", "projectFormProgress", "customerIntake", "businessSync", "designWorkflow", "opportunityQuotes", "managementWorkflow", "progressTracking", "taskFollowup", "taskMonitoringDemo", "todoDrawers", "designQuotation", "expenseWorkflow", "managementMonitoring", "designGds", "procurementWorkflow", "unifiedAllocation", "designOrderDelivery", "designScenario", "taskHistory", "bridge"];
const threeEnd = "window.THREE=exports;})();";

function readEngines() {
  const sources = Object.fromEntries(engineFiles.map((name) => [name,
    fs.readFileSync(path.join(root, `src/compat/runtime/${name}.js`), "utf8"),
  ]));
  const boundary = sources.workflows.indexOf(threeEnd);
  if (boundary < 0 || sources.workflows.indexOf(threeEnd, boundary + 1) !== -1)
    throw new Error("Three.js boundary must be unique");
  sources.three = sources.workflows.slice(0, boundary + threeEnd.length).replace("/* The MIT License", "/*! The MIT License");
  sources.workflows = sources.workflows.slice(boundary + threeEnd.length);
  return sources;
}

export default defineConfig(async ({ command }) => {
  await buildGosVendor();
  const raw = readEngines();
  const sources = Object.fromEntries(await Promise.all(Object.entries(raw).map(async ([name, source]) => [
    name, command === "build" ? (await transformWithEsbuild(source, `${name}.js`, {
      loader: "js", target: "es2022", charset: "utf8", legalComments: "inline",
      // Classic engines share global lexical bindings. Do not rename/optimize them independently.
      minifyWhitespace: true, minifySyntax: false, minifyIdentifiers: false,
    })).code : source,
  ])));
  const assets = Object.fromEntries(Object.entries(sources).map(([name, source]) => [
    name, `engine-${name}-${createHash("sha256").update(source).digest("hex").slice(0, 12)}.js`,
  ]));
  const legacyCss = fs.readFileSync(path.join(root, "public/prototype.css"), "utf8");
  const legacyCssName = `crm-style-${createHash("sha256").update(legacyCss).digest("hex").slice(0, 12)}.css`;
  return {
    base: "./",
    resolve: { preserveSymlinks: true, alias: { scheduler: schedulerEntry } },
    define: { __CRM_ENGINE_ASSETS__: JSON.stringify(assets) },
    plugins: [react(), {
      name: "crm-business-engines",
      transformIndexHtml(html) {
        // Fetch business scripts while the browser is loading React and styles.
        return { html: command === "build" ? html.replace(/(["'])(?:\.\/|\/)prototype\.css\1/g, `"./${legacyCssName}"`) : html, tags: engineFiles.map((name) => ({ tag: "link", attrs: {
          rel: "preload", as: "script", href: `./${assets[name]}`,
        }, injectTo: "head" })) };
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const name = Object.keys(assets).find((n) => req.url?.split("?")[0] === `/${assets[n]}`);
          if (!name) return next();
          res.setHeader("Content-Type", "text/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(readEngines()[name]);
        });
      },
      generateBundle() {
        for (const [name, source] of Object.entries(sources))
          this.emitFile({ type: "asset", fileName: assets[name], source });
        this.emitFile({ type: "asset", fileName: legacyCssName, source: legacyCss });
      },
      writeBundle(options) {
        // Inspect final output: Vite removes the temporary HTML entry chunks after generation.
        const outDir = path.resolve(root, options.dir);
        const files = fs.readdirSync(outDir);
        const publicAssets = files.filter(name =>
          /^(?:media-[a-f0-9]+\.(?:png|jpg|jpeg|webp)|floor-plan-[a-f0-9]+\.svg|quote-editor-[a-f0-9]+\.html)$/.test(name));
        const mainAssets = files.filter(name => /^main-[\w-]+\.(?:js|css)$/.test(name));
        const deferredAssets = files.filter(name => /^[\w-]+-[\w-]{8,}\.(?:js|css)$/.test(name) && !name.startsWith("engine-"));
        const warm = [...new Set([...mainAssets, legacyCssName, ...engineFiles.map(name => assets[name])])];
        fs.writeFileSync(path.join(outDir, "asset-cache.js"), staticAssetWorker(
          [...new Set([...warm, ...deferredAssets, assets.three, ...publicAssets])], warm,
        ));
      },
    }],
    build: { assetsDir: "", rollupOptions: { input: {
      main: path.join(root, "index.html"), client: path.join(root, "client.html"),
    } } },
    server: { port: 5180, strictPort: true },
  };
});

