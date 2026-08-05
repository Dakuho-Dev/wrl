import "server-only";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export type ApiActor = { userId: string; keyId: string; scopes: string[] };

/**
 * Authenticates a REST API request using `Authorization: Bearer owl_live_…`.
 * Keys are stored hashed, so we compare against every active key of the matching prefix.
 */
export async function authenticateApiRequest(request: Request): Promise<ApiActor | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("owl_")) return null;

  const candidates = await prisma.apiKey.findMany({
    where: { prefix: token.slice(0, 16), revokedAt: null },
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(token, candidate.keyHash)) {
      await prisma.apiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
      });
      return {
        userId: candidate.userId,
        keyId: candidate.id,
        scopes: parseJson<string[]>(candidate.scopes, ["read"]),
      };
    }
  }

  return null;
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export function unauthorized() {
  return json({ error: "unauthorized", message: "Missing or invalid API key." }, 401);
}

export function forbidden(scope: string) {
  return json({ error: "forbidden", message: `This key lacks the "${scope}" scope.` }, 403);
}

export function notFound() {
  return json({ error: "not_found", message: "Resource not found." }, 404);
}
