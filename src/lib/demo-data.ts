/**
 * Deterministic-ish sample data used by demo shops and the database seed.
 * Nothing here touches a live marketplace API.
 */

const FIRST = ["Emma", "Olivia", "Liam", "Noah", "Ava", "Sophia", "Mia", "Lucas", "Ethan", "Isabella", "James", "Chloe"];
const LAST = ["Johnson", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Martin", "Clark"];
const CITIES: Array<[string, string, string, string]> = [
  ["Austin", "TX", "78701", "US"],
  ["Portland", "OR", "97205", "US"],
  ["Brooklyn", "NY", "11201", "US"],
  ["Denver", "CO", "80202", "US"],
  ["Toronto", "ON", "M5H 2N2", "CA"],
  ["Manchester", "ENG", "M1 1AE", "GB"],
  ["Sydney", "NSW", "2000", "AU"],
  ["Berlin", "BE", "10115", "DE"],
];

const PRODUCTS: Array<{ title: string; sku: string; price: number; tags: string[] }> = [
  { title: "Personalized Birth Flower Necklace", sku: "JWL-BF-001", price: 38.0, tags: ["jewelry", "personalized", "gift for her"] },
  { title: "Custom Pet Portrait – Digital Download", sku: "ART-PET-014", price: 24.5, tags: ["pet", "portrait", "digital"] },
  { title: "New Parent Gift Box – Neutral", sku: "GFT-NP-220", price: 64.0, tags: ["new parent", "gift box", "baby"] },
  { title: "Minimalist Linen Table Runner", sku: "HOM-LR-330", price: 42.0, tags: ["home", "linen", "table"] },
  { title: "Engraved Wooden Recipe Board", sku: "KIT-RB-101", price: 55.0, tags: ["kitchen", "engraved", "wood"] },
  { title: "Hand-Poured Soy Candle Set of 3", sku: "CND-SOY-045", price: 29.0, tags: ["candle", "soy", "home"] },
  { title: "Custom Family Name Sign", sku: "SGN-FAM-077", price: 78.0, tags: ["sign", "custom", "wedding"] },
  { title: "Watercolor Wedding Invitation Suite", sku: "PPR-WED-512", price: 120.0, tags: ["wedding", "invitation", "watercolor"] },
  { title: "Boho Macrame Wall Hanging", sku: "DEC-MAC-208", price: 46.0, tags: ["boho", "macrame", "wall art"] },
  { title: "Personalized Leather Keychain", sku: "ACC-LKC-019", price: 18.5, tags: ["leather", "keychain", "personalized"] },
  { title: "Ceramic Speckled Mug 12oz", sku: "MUG-CER-088", price: 32.0, tags: ["ceramic", "mug", "handmade"] },
  { title: "Baby Milestone Blanket", sku: "BBY-MSB-140", price: 49.0, tags: ["baby", "blanket", "milestone"] },
  { title: "Vintage Style Map Print", sku: "PRT-MAP-311", price: 27.0, tags: ["print", "map", "vintage"] },
  { title: "Custom Embroidered Sweatshirt", sku: "APP-EMB-602", price: 58.0, tags: ["apparel", "embroidered", "custom"] },
];

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL Express", "Royal Mail"];

const PERSONALIZATIONS = [
  "Name: Amelia | Font: Script",
  "Date: 06.14.2025",
  "Initials: J & M",
  "Color: Sage green",
  null,
  null,
];

function pick<T>(list: T[], index?: number): T {
  const i = index ?? Math.floor(Math.random() * list.length);
  return list[i % list.length];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDemoProducts(shopId: string, count = 12) {
  return Array.from({ length: Math.min(count, PRODUCTS.length) }, (_, index) => {
    const base = PRODUCTS[index];
    return {
      shopId,
      externalId: String(1500000000 + index * 137),
      title: base.title,
      sku: base.sku,
      price: base.price,
      currency: "USD",
      quantity: randomInt(0, 240),
      imageUrl: null as string | null,
      state: randomInt(0, 12) === 0 ? "draft" : "active",
      tags: JSON.stringify(base.tags),
      views: randomInt(120, 9800),
    };
  });
}

export type DemoOrderDraft = {
  order: {
    shopId: string;
    externalId: string;
    orderNumber: string;
    buyerName: string;
    buyerEmail: string;
    buyerMessage: string | null;
    status: string;
    paymentStatus: string;
    fulfillment: string;
    priority: string;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    discount: number;
    total: number;
    currency: string;
    shipName: string;
    shipLine1: string;
    shipLine2: string | null;
    shipCity: string;
    shipState: string;
    shipZip: string;
    shipCountry: string;
    tags: string;
    placedAt: Date;
    paidAt: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  };
  items: Array<{
    title: string;
    sku: string;
    variation: string | null;
    personalization: string | null;
    quantity: number;
    price: number;
  }>;
};

export function generateDemoOrders(shopId: string, count = 30, maxDaysAgo = 60): DemoOrderDraft[] {
  return Array.from({ length: count }, (): DemoOrderDraft => {
    const buyer = `${pick(FIRST)} ${pick(LAST)}`;
    const [city, state, zip, country] = pick(CITIES);
    const daysAgo = randomInt(0, maxDaysAgo);
    const placedAt = new Date(Date.now() - daysAgo * 86400000 - randomInt(0, 82800) * 1000);

    const lineCount = randomInt(1, 3);
    const items = Array.from({ length: lineCount }, () => {
      const base = pick(PRODUCTS);
      return {
        title: base.title,
        sku: base.sku,
        variation: Math.random() > 0.5 ? "Size: Medium, Color: Ivory" : null,
        personalization: pick(PERSONALIZATIONS),
        quantity: randomInt(1, 3),
        price: base.price,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = Math.random() > 0.35 ? Number((randomInt(0, 12) + 3.95).toFixed(2)) : 0;
    const taxAmount = Number((subtotal * 0.07).toFixed(2));
    const discount = Math.random() > 0.8 ? Number((subtotal * 0.1).toFixed(2)) : 0;
    const total = Number((subtotal + shippingCost + taxAmount - discount).toFixed(2));

    // Older orders are more likely to be complete.
    let status: string;
    if (daysAgo > 21) status = Math.random() > 0.1 ? "DELIVERED" : "REFUNDED";
    else if (daysAgo > 10) status = Math.random() > 0.25 ? "DELIVERED" : "SHIPPED";
    else if (daysAgo > 4) status = Math.random() > 0.4 ? "SHIPPED" : "PROCESSING";
    else if (daysAgo > 1) status = Math.random() > 0.5 ? "PROCESSING" : "NEW";
    else status = Math.random() > 0.75 ? "ON_HOLD" : "NEW";

    const shipped = ["SHIPPED", "DELIVERED"].includes(status);
    const delivered = status === "DELIVERED";

    return {
      order: {
        shopId,
        externalId: String(3000000000 + randomInt(1, 999999999)),
        orderNumber: `#${randomInt(2000000, 2999999)}`,
        buyerName: buyer,
        buyerEmail: `${buyer.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        buyerMessage: Math.random() > 0.75 ? "Please gift wrap — it's a birthday present!" : null,
        status,
        paymentStatus: status === "REFUNDED" ? "REFUNDED" : "PAID",
        fulfillment: shipped ? "FULFILLED" : "UNFULFILLED",
        priority: Math.random() > 0.9 ? "HIGH" : "NORMAL",
        subtotal: Number(subtotal.toFixed(2)),
        shippingCost,
        taxAmount,
        discount,
        total,
        currency: "USD",
        shipName: buyer,
        shipLine1: `${randomInt(10, 9800)} ${pick(["Maple", "Oak", "Pine", "Cedar", "Birch"])} ${pick(["St", "Ave", "Rd", "Ln"])}`,
        shipLine2: Math.random() > 0.7 ? `Apt ${randomInt(1, 40)}` : null,
        shipCity: city,
        shipState: state,
        shipZip: zip,
        shipCountry: country,
        tags: JSON.stringify(Math.random() > 0.8 ? ["gift"] : []),
        placedAt,
        paidAt: placedAt,
        shippedAt: shipped ? new Date(placedAt.getTime() + 86400000 * randomInt(1, 3)) : null,
        deliveredAt: delivered ? new Date(placedAt.getTime() + 86400000 * randomInt(4, 9)) : null,
      },
      items,
    };
  });
}

export function demoCarrier() {
  return pick(CARRIERS);
}

export function demoTracking() {
  return `1Z${randomInt(100, 999)}${randomInt(1000000000, 9999999999)}`;
}

export function trackingUrlFor(carrier: string, code: string) {
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${code}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${code}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
    case "DHL Express":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${code}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} ${code}`)}`;
  }
}
