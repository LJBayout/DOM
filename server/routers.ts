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
  getProfessionalsByFichaId,
  getScheduleByFichaId,
  listFichas,
  replaceProfessionals,
  replaceScheduleItems,
  upsertUser,
  updateFicha,
} from "./db";
import { storageGetPresignedPutUrl } from "./storage";

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

const fichaInputSchema = z.object({
  eventName: z.string().min(1).max(255),
  eventDate: z.string().max(32),
  attraction: z.string().max(255).optional().default(""),
  attractionPdfs: z.string().nullable().optional().default(null),
  stateCity: z.string().max(255).optional().default(""),
  location: z.string().max(255),
  address: z.string().optional().default(""),
  localProducerName: z.string().max(255).optional().default(""),
  localProducerContact: z.string().max(255).optional().default(""),
  hotelName: z.string().max(255).optional().default(""),
  hotelAddress: z.string().optional().default(""),
  hotelContact: z.string().max(255).optional().default(""),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  scheduleItems: z.array(scheduleItemSchema),
  professionals: z.array(professionalSchema),
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
      const [schedule, profs] = await Promise.all([
        getScheduleByFichaId(input.id),
        getProfessionalsByFichaId(input.id),
      ]);
      return { ...ficha, scheduleItems: schedule, professionals: profs };
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
        localProducerName: input.localProducerName,
        localProducerContact: input.localProducerContact,
        hotelName: input.hotelName,
        hotelAddress: input.hotelAddress,
        hotelContact: input.hotelContact,
        status: input.status,
        createdByOpenId: ctx.user.openId,
      });
      await replaceScheduleItems(fichaId, input.scheduleItems);
      await replaceProfessionals(fichaId, input.professionals);
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
        localProducerName: input.data.localProducerName,
        localProducerContact: input.data.localProducerContact,
        hotelName: input.data.hotelName,
        hotelAddress: input.data.hotelAddress,
        hotelContact: input.data.hotelContact,
        status: input.data.status,
      });
      await replaceScheduleItems(input.id, input.data.scheduleItems);
      await replaceProfessionals(input.id, input.data.professionals);
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
});
 
 // ─── Storage Router ───────────────────────────────────────────────────────────
 
 const storageRouter = router({
   getUploadUrl: adminProcedure
     .input(z.object({ filename: z.string(), contentType: z.string() }))
     .mutation(async ({ input }) => {
       const { url, key, publicUrl } = await storageGetPresignedPutUrl(input.filename, input.contentType);
       return { url, key, publicUrl };
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
