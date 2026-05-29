import type { Express } from "express";
import express from "express";
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
      const { s3Client } = await import("../storage");
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      
      const command = new GetObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (response.ContentType) res.set("Content-Type", response.ContentType);
      if (response.ContentLength) res.set("Content-Length", response.ContentLength.toString());
      
      if (response.Body) {
        (response.Body as any).pipe(res);
      } else {
        res.status(404).send("File body not found");
      }
    } catch (err) {
      console.error("[StorageProxy] GET failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  // Proxy for direct uploads to avoid CORS/Network issues
  app.put("/api/storage/upload/*", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    const key = (req.params as Record<string | number, string>)[0];
    if (!key) return res.status(400).send("Missing key");

    try {
      const { s3Client } = await import("../storage");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      
      await s3Client.send(new PutObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: key,
        Body: req.body,
        ContentType: req.headers["content-type"] as string,
      }));
      
      res.json({ success: true });
    } catch (err) {
      console.error("[StorageProxy] PUT failed:", err);
      res.status(500).send("Upload proxy error");
    }
  });
}
