import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { SignJWT } from "jose";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createFicha,
  deleteFicha,
  getFichaById,
  getHotelsByFichaId,
  getLogisticsByFichaId,
  getProfessionalsByFichaId,
  getScheduleByFichaId,
  listFichas,
  replaceHotels,
  replaceLogistics,
  replaceProfessionals,
  replaceScheduleItems,
  upsertUser,
  updateFicha,
} from "./db";
import { getPresignedUploadUrl } from "./storage";
import { saveSuggestions, getAllSuggestions } from "./redis";

// ─── Admin Middleware ─────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const scheduleItemSchema = z.object({
  time: z.string().max(16),
  activity: z.string().max(255),
});

const professionalSchema = z.object({
  name: z.string().max(255),
  role: z.string().max(128),
  contact: z.string().max(255),
});

const hotelSchema = z.object({
  name: z.string().max(255),
  address: z.string(),
  contact: z.string().max(255),
  contactPerson: z.string().max(255),
  localContact: z.string().max(255),
  gpsLink: z.string(),
  roomListPdfs: z.string().nullable().optional(),
});

const logisticsSchema = z.object({
  role: z.string().max(128),
  name: z.string().max(255),
  contact: z.string().max(255),
});

const fichaInputSchema = z.object({
  eventName: z.string().min(1).max(255),
  eventDate: z.string().max(32),
  attraction: z.string().max(255).optional().default(""),
  attractionPdfs: z.string().nullable().optional().default(null),
  stateCity: z.string().max(255).optional().default(""),
  location: z.string().max(255),
  address: z.string().optional().default(""),
  gpsLink: z.string().optional().default(""),
  localProducerName: z.string().max(255).optional().default(""),
  localProducerContact: z.string().max(255).optional().default(""),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  scheduleItems: z.array(scheduleItemSchema),
  professionals: z.array(professionalSchema),
  hotels: z.array(hotelSchema).optional().default([]),
  logistics: z.array(logisticsSchema).optional().default([]),
});

// ─── Ficha Router ─────────────────────────────────────────────────────────────

const fichaRouter = router({
  list: protectedProcedure.query(async () => {
    return listFichas();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const ficha = await getFichaById(input.id);
      if (!ficha) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha Técnica não encontrada." });
      const [schedule, profs, htls, logis] = await Promise.all([
        getScheduleByFichaId(input.id),
        getProfessionalsByFichaId(input.id),
        getHotelsByFichaId(input.id),
        getLogisticsByFichaId(input.id),
      ]);
      return { ...ficha, scheduleItems: schedule, professionals: profs, hotels: htls, logistics: logis };
    }),

  create: adminProcedure
    .input(fichaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const fichaId = await createFicha({
        eventName: input.eventName,
        eventDate: input.eventDate,
        attraction: input.attraction,
        attractionPdfs: input.attractionPdfs,
        stateCity: input.stateCity,
        location: input.location,
        address: input.address,
        gpsLink: input.gpsLink,
        localProducerName: input.localProducerName,
        localProducerContact: input.localProducerContact,
        status: input.status,
        createdByOpenId: ctx.user.openId,
      });
      await Promise.all([
        replaceScheduleItems(fichaId, input.scheduleItems),
        replaceProfessionals(fichaId, input.professionals),
        replaceHotels(fichaId, input.hotels),
        replaceLogistics(fichaId, input.logistics),
      ]);
      await saveSuggestions(input);
      return { id: fichaId };
    }),

  update: adminProcedure
    .input(z.object({ id: z.number(), data: fichaInputSchema }))
    .mutation(async ({ input }) => {
      const existing = await getFichaById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha Técnica não encontrada." });
      await updateFicha(input.id, {
        eventName: input.data.eventName,
        eventDate: input.data.eventDate,
        attraction: input.data.attraction,
        attractionPdfs: input.data.attractionPdfs,
        stateCity: input.data.stateCity,
        location: input.data.location,
        address: input.data.address,
        gpsLink: input.data.gpsLink,
        localProducerName: input.data.localProducerName,
        localProducerContact: input.data.localProducerContact,
        status: input.data.status,
      });
      await Promise.all([
        replaceScheduleItems(input.id, input.data.scheduleItems),
        replaceProfessionals(input.id, input.data.professionals),
        replaceHotels(input.id, input.data.hotels),
        replaceLogistics(input.id, input.data.logistics),
      ]);
      await saveSuggestions(input.data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await getFichaById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha Técnica não encontrada." });
      await deleteFicha(input.id);
      return { success: true };
    }),

  getAllSuggestions: adminProcedure
    .query(async () => {
      return await getAllSuggestions();
    }),

  processAiCommand: adminProcedure
    .input(z.object({ 
      messages: z.array(z.object({ 
        role: z.enum(["user", "assistant", "system"]), 
        content: z.string() 
      })), 
      model: z.string().optional() 
    }))
    .mutation(async ({ input }) => {
      const { processAiCommand } = await import("./ai");
      return await processAiCommand(input.messages, input.model);
    }),

  listModels: adminProcedure.query(async () => {
    const { listOllamaModels } = await import("./ai");
    return await listOllamaModels();
  }),

  parseFichaText: adminProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const { parseFichaTextWithAi } = await import("./ai");
      return await parseFichaTextWithAi(input.text);
    }),
  
  generateGpsLink: adminProcedure
    .input(z.object({ location: z.string(), address: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { suggestGpsLink } = await import("./ai");
      return await suggestGpsLink(input.location, input.address || "");
    }),
});
 
 // ─── Storage Router ───────────────────────────────────────────────────────────
 
 const storageRouter = router({
   getUploadUrl: adminProcedure
     .input(z.object({ filename: z.string(), contentType: z.string() }))
     .mutation(async ({ input }) => {
       const { url, key, publicUrl, proxyUploadUrl } = await getPresignedUploadUrl(input.filename, input.contentType);
       return { url, key, publicUrl, proxyUploadUrl };
     }),
 });
 
 // ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    devLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Accept any credentials
        const openId = "local-admin";
        await upsertUser({
          openId,
          name: input.username || "Admin",
          email: "admin@local.dev",
          loginMethod: "local",
          role: "admin",
          lastSignedIn: new Date(),
        });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "local-dev-secret-change-me");
        const sessionToken = await new SignJWT({ openId, name: input.username || "Admin" })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
          .sign(secret);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ficha: fichaRouter,
  storage: storageRouter,
});

export type AppRouter = typeof appRouter;
