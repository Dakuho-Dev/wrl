import { authenticateApiRequest, forbidden, json, notFound, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, shop: { userId: actor.userId } },
    include: { items: true, shipments: true, events: true, shop: true },
  });

  if (!order) return notFound();
  return json(order);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();
  if (!actor.scopes.includes("write")) return forbidden("write");

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, shop: { userId: actor.userId } } });
  if (!order) return notFound();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.priority === "string") data.priority = body.priority;
  if (typeof body.notes === "string") data.notes = body.notes;
  if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags);

  if (!Object.keys(data).length) {
    return json({ error: "bad_request", message: "No updatable fields supplied." }, 400);
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data });
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: "STATUS_CHANGED",
      actor: "api",
      message: `Updated via REST API: ${Object.keys(data).join(", ")}`,
    },
  });

  return json(updated);
}
