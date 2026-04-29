import type { Express } from "express";
import { ENV } from "./env";

import { getPresignedDownloadUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string | number, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await getPresignedDownloadUrl(key);
      
      // If we are in Docker, the URL contains "http://minio:9000".
      // We need the browser to reach it. Since we exposed 9000 on the VPS,
      // we can replace "minio" with the VPS IP/Host.
      // Or, better, we could proxy the data, but redirect is faster.
      
      // For now, let's assume the user accesses via the same host.
      const host = req.get('host')?.split(':')[0] || 'localhost';
      const browserUrl = url.replace("minio", host);

      res.set("Cache-Control", "no-store");
      res.redirect(307, browserUrl);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
