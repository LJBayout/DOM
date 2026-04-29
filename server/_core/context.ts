import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getSecret() {
  const secret = process.env.JWT_SECRET || "local-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];
    if (token) {
      const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
      const openId = payload.openId as string;
      if (openId) {
        user = (await db.getUserByOpenId(openId)) ?? null;
      }
    }
  } catch {
    // No valid session — login page will show
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
