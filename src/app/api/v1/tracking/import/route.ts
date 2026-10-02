import { authenticateApiRequest, forbidden, json, unauthorized } from "@/lib/api-auth";
import { importTracking, type ImportRow } from "@/lib/tracking-import";

/**
 * POST /api/v1/tracking/import
 *
 * The single door for tracking numbers produced outside Etsy — Lark, a
 * spreadsheet, a fulfiller's own site. Body: { rows: [{ order, tracking,
 * carrier?, service?, alertHours? }] }.
 *
 * It does not push anything to Etsy. Filling the number in here and telling
 * Etsy about it are separate decisions, and the second one stays the operator's.
 */
export async function POST(request: Request) {
  const actor = await authenticateApiRequest(request);
  if (!actor) return unauthorized();
  if (!actor.scopes.includes("write")) return forbidden("write");

  const body = (await request.json().catch(() => ({}))) as { rows?: unknown };
  const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : null;
  if (!rows) return json({ error: "Body phải có mảng 'rows'" }, 400);
  if (rows.length > 500) return json({ error: "Tối đa 500 dòng mỗi lượt" }, 400);

  const result = await importTracking(actor.userId, rows);
  return json(result);
}
