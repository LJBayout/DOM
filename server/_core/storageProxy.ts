import type { Express } from "express";
import { ENV } from "./env";

import { getPresignedDownloadUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/api/storage/*", async (req, res) => {
    const key = (req.params as Record<string | number, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await getPresignedDownloadUrl(key);
      
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
