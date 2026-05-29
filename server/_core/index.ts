import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureBucket } from "../storage";


async function startServer() {
  ensureBucket().catch(err => console.error("[Storage] Failed to ensure bucket:", err));
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // Debug route to see database content (development only)
  if (process.env.NODE_ENV === "development") {
    app.get("/debug/db", async (_req, res) => {
      try {
        const { getDb } = await import("../db");
        const { users, fichasTecnicas, professionals, scheduleItems, hotels: hotelsTable, logistics: logisticsTable } = await import("../../drizzle/schema");
        const db = await getDb();
        if (!db) return res.status(500).json({ error: "Database not connected" });

        const [u, f, p, s, h, l] = await Promise.all([
          db.select().from(users),
          db.select().from(fichasTecnicas),
          db.select().from(professionals),
          db.select().from(scheduleItems),
          db.select().from(hotelsTable),
          db.select().from(logisticsTable),
        ]);

        res.json({ users: u, fichas: f, professionals: p, schedule: s, hotels: h, logistics: l });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
