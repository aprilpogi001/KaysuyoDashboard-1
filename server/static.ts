import express, { type Express } from "express";
import compression from "compression";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Enable gzip compression for faster loading
  app.use(compression());

  // Serve static assets with caching headers
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true
  }));

  // Serve other static files with shorter cache
  app.use(express.static(distPath, {
    maxAge: "1h"
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
