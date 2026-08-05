import { authenticateApiRequest, forbidden, json, notFound, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { syncShop } from "@/lib/sync";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();
  if (!actor.scopes.includes("write")) return forbidden("write");

  const { id } = await params;
  const shop = await prisma.shop.findFirst({ where: { id, userId: actor.userId } });
  if (!shop) return notFound();

  const result = await syncShop(shop.id, "FULL");
  return json(result, result.ok ? 200 : 502);
}
