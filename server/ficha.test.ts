import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ─────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  listFichas: vi.fn().mockResolvedValue([
    { id: 1, eventName: "Festival 2024", eventDate: "2024-06-15", location: "SP", status: "published", createdByOpenId: "admin-1", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getFichaById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) return { id: 1, eventName: "Festival 2024", eventDate: "2024-06-15", location: "SP", status: "published", createdByOpenId: "admin-1", createdAt: new Date(), updatedAt: new Date() };
    return null;
  }),
  createFicha: vi.fn().mockResolvedValue(42),
  updateFicha: vi.fn().mockResolvedValue(undefined),
  deleteFicha: vi.fn().mockResolvedValue(undefined),
  getScheduleByFichaId: vi.fn().mockResolvedValue([
    { id: 1, fichaId: 1, time: "09:00", activity: "Montagem", sortOrder: 0 },
    { id: 2, fichaId: 1, time: "14:00", activity: "Passagem de Som", sortOrder: 1 },
  ]),
  getProfessionalsByFichaId: vi.fn().mockResolvedValue([
    { id: 1, fichaId: 1, name: "João Silva", role: "Diretor", sortOrder: 0 },
  ]),
  replaceScheduleItems: vi.fn().mockResolvedValue(undefined),
  replaceProfessionals: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context Factories ────────────────────────────────────────────────────────

function makeCtx(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: role === "admin" ? "admin-1" : "user-1",
      name: role === "admin" ? "Admin User" : "Regular User",
      email: `${role}@example.com`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ficha.list", () => {
  it("returns fichas for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.ficha.list();
    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe("Festival 2024");
  });

  it("returns fichas for admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.ficha.list();
    expect(result).toHaveLength(1);
  });

  it("throws UNAUTHORIZED for unauthenticated access", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.ficha.list()).rejects.toThrow();
  });
});

describe("ficha.getById", () => {
  it("returns ficha with schedule and professionals for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.ficha.getById({ id: 1 });
    expect(result.eventName).toBe("Festival 2024");
    expect(result.scheduleItems).toHaveLength(2);
    expect(result.professionals).toHaveLength(1);
    expect(result.scheduleItems[0].activity).toBe("Montagem");
    expect(result.scheduleItems[1].activity).toBe("Passagem de Som");
  });

  it("throws NOT_FOUND for non-existent ficha", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.ficha.getById({ id: 9999 })).rejects.toThrow("Ficha Técnica não encontrada.");
  });
});

describe("ficha.create (admin only)", () => {
  const validPayload = {
    eventName: "Novo Festival",
    eventDate: "2024-09-20",
    location: "Rio de Janeiro",
    status: "draft" as const,
    scheduleItems: [
      { time: "08:00", activity: "Montagem" },
      { time: "13:00", activity: "Passagem de Som" },
      { time: "18:00", activity: "Início" },
      { time: "22:00", activity: "Término" },
    ],
    professionals: [
      { name: "Maria Santos", role: "Diretora" },
      { name: "Carlos Lima", role: "Produtor" },
      { name: "Ana Costa", role: "Técnico de Som" },
    ],
  };

  it("allows admin to create a ficha", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.ficha.create(validPayload);
    expect(result.id).toBe(42);
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.ficha.create(validPayload)).rejects.toThrow("Acesso restrito a administradores.");
  });

  it("throws UNAUTHORIZED for unauthenticated request", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.ficha.create(validPayload)).rejects.toThrow();
  });
});

describe("ficha.update (admin only)", () => {
  it("allows admin to update a ficha", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.ficha.update({
      id: 1,
      data: {
        eventName: "Festival Atualizado",
        eventDate: "2024-06-20",
        location: "Curitiba",
        status: "published",
        scheduleItems: [{ time: "10:00", activity: "Início" }],
        professionals: [{ name: "João", role: "Diretor" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.ficha.update({ id: 1, data: { eventName: "X", eventDate: "", location: "", status: "draft", scheduleItems: [], professionals: [] } })
    ).rejects.toThrow("Acesso restrito a administradores.");
  });
});

describe("ficha.delete (admin only)", () => {
  it("allows admin to delete a ficha", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.ficha.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.ficha.delete({ id: 1 })).rejects.toThrow("Acesso restrito a administradores.");
  });

  it("throws NOT_FOUND for non-existent ficha", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.ficha.delete({ id: 9999 })).rejects.toThrow("Ficha Técnica não encontrada.");
  });
});
