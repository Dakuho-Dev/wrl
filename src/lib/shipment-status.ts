/**
 * The shared vocabulary for parcel state, and the rules that decide which
 * provider resolves a given parcel.
 *
 * Two very different sources write into this vocabulary — the USPS developer
 * API (server side, scheduled) and the local 17track agent (a human's machine,
 * driving 17track.net) — so the mapping from "whatever words the source used"
 * to our enum lives here, in one place, rather than in each provider.
 */

/** Our own vocabulary, stored on Shipment.status. */
export type ShipmentStatus =
  | "LABEL_CREATED"
  | "PRE_TRANSIT"
  | "IN_TRANSIT"
  | "AVAILABLE_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILURE"
  | "DELIVERED"
  | "EXCEPTION"
  | "EXPIRED"
  | "NOT_FOUND";

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "LABEL_CREATED",
  "PRE_TRANSIT",
  "IN_TRANSIT",
  "AVAILABLE_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILURE",
  "DELIVERED",
  "EXCEPTION",
  "EXPIRED",
  "NOT_FOUND",
];

export function isShipmentStatus(value: unknown): value is ShipmentStatus {
  return typeof value === "string" && (SHIPMENT_STATUSES as string[]).includes(value);
}

/** Statuses we stop polling on — the parcel is not going to move again. */
export const TERMINAL_STATUSES: ShipmentStatus[] = ["DELIVERED", "EXPIRED"];

/** Which lane resolves a parcel. Stored on Shipment.trackerProvider. */
export type TrackerProvider = "USPS" | "MANUAL";

/**
 * USPS labels bought through Etsy usually say "USPS", but sellers also pick
 * "Other" and type the carrier by hand, so the number's own shape is the more
 * reliable signal of the two. Both are consulted.
 *
 * Patterns (USPS Publication 199, "Intelligent Mail package barcode"):
 *   9x + 20 digits      domestic IMpb, the common case (9400…, 9205…, 9114…)
 *   420 + ZIP + IMpb    the same barcode with a routing prefix printed in front
 *   XX 9 digits US      international S10 barcode (EA123456789US, LZ…US)
 *   82 + 8-10 digits    older Signature Confirmation
 */
const USPS_NUMBER_PATTERNS: RegExp[] = [
  /^9[0-5]\d{18,24}$/,
  /^420\d{5,9}9[0-5]\d{18,24}$/,
  /^[A-Z]{2}\d{9}US$/i,
  /^82\d{8,10}$/,
];

const USPS_NAME = /usps|united states postal|u\.?s\.? postal|first[- ]?class mail|priority mail|ground advantage/i;

/** True when the parcel is one the USPS developer API can answer for. */
export function isUsps(carrierName?: string | null, trackingNumber?: string | null): boolean {
  const number = (trackingNumber ?? "").replace(/\s+/g, "").toUpperCase();
  if (number && USPS_NUMBER_PATTERNS.some((pattern) => pattern.test(number))) return true;

  const name = (carrierName ?? "").trim();
  if (!name) return false;
  // "DHL eCommerce" and "DHL Global Mail" hand the last mile to USPS but are
  // tracked end to end under their own number, so a name match alone is not
  // enough when the number clearly is not a USPS barcode.
  if (/dhl|fedex|ups\b|ontrac|lasership|uds|uni ?uni|yanwen|yun ?express|spx|cainiao/i.test(name)) {
    return false;
  }
  return USPS_NAME.test(name);
}

export function trackerProviderFor(
  carrierName?: string | null,
  trackingNumber?: string | null,
): TrackerProvider {
  return isUsps(carrierName, trackingNumber) ? "USPS" : "MANUAL";
}

/**
 * Map a carrier's own wording onto our enum.
 *
 * Kept deliberately broad: it takes USPS `statusCategory` ("Pre-Shipment"),
 * USPS free-text `status` ("Arrived at USPS Regional Facility"), and the labels
 * 17track.net prints ("In Transit", "Not Found", "Pickup"). Order matters —
 * the most specific phrases are tested first.
 */
export function statusFromText(raw?: string | null): ShipmentStatus | null {
  const text = (raw ?? "").trim().toLowerCase();
  if (!text) return null;

  // "Not yet shipped" has to be caught before the /shipped/ rule below, which
  // would otherwise read it as the opposite of what it says.
  if (/^not (yet )?shipped$|awaiting shipment|unshipped/.test(text)) return "LABEL_CREATED";

  if (/delivered to agent|left with individual|delivered/.test(text)) return "DELIVERED";
  if (/out for delivery|with delivery courier|delivery vehicle/.test(text)) return "OUT_FOR_DELIVERY";
  if (/available for pickup|available for collection|ready for pickup|pickup|held at|awaiting collection/.test(text)) {
    return "AVAILABLE_FOR_PICKUP";
  }
  if (/undelivered|delivery attempt|delivery failure|notice left|unsuccessful|failed attempt|return to sender|returning to sender/.test(text)) {
    return "DELIVERY_FAILURE";
  }
  if (/alert|exception|damaged|seized|lost|refused|problem/.test(text)) return "EXCEPTION";
  if (/expired|no tracking information for a long time|over \d+ days/.test(text)) return "EXPIRED";
  if (/pre-?shipment|pre-?transit|shipping label created|label created|info ?received|awaiting item|acceptance pending|shipment information sent/.test(text)) {
    return "PRE_TRANSIT";
  }
  if (
    /in ?transit|in ?process|accepted|arrived|departed|processed|picked up|shipped|customs|sorting|en route|moving through network/.test(
      text,
    )
  ) {
    return "IN_TRANSIT";
  }
  if (/not ?found|no information|inquiry|未查询到/.test(text)) return "NOT_FOUND";

  return null;
}

/** Vietnamese labels for the CMS, so both sides read the same vocabulary. */
export const STATUS_LABELS_VI: Record<ShipmentStatus, string> = {
  LABEL_CREATED: "Đã tạo nhãn",
  PRE_TRANSIT: "Chờ lấy hàng (Pre-transit)",
  IN_TRANSIT: "Đang vận chuyển (In-transit)",
  AVAILABLE_FOR_PICKUP: "Chờ nhận tại điểm",
  OUT_FOR_DELIVERY: "Đang giao",
  DELIVERY_FAILURE: "Giao thất bại",
  DELIVERED: "Đã giao",
  EXCEPTION: "Sự cố",
  EXPIRED: "Quá hạn theo dõi",
  NOT_FOUND: "Chưa có dữ liệu",
};
