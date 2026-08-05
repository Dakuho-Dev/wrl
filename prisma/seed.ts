import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  demoCarrier,
  demoTracking,
  generateDemoOrders,
  generateDemoProducts,
  trackingUrlFor,
} from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding OwlFlow database…");

  // ------------------------------------------------------------ Reset
  await prisma.orderEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticketReply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.oAuthState.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.setting.deleteMany();

  // ------------------------------------------------------------ Plans
  const plans = await Promise.all(
    [
      {
        name: "Starter",
        slug: "starter",
        priceMonthly: 0,
        priceYearly: 0,
        orderLimit: 100,
        shopLimit: 1,
        sortOrder: 1,
        features: JSON.stringify([
          "1 connected shop",
          "100 orders / month",
          "Order sync every 30 minutes",
          "Manual tracking upload",
          "Email support",
        ]),
      },
      {
        name: "Growth",
        slug: "growth",
        priceMonthly: 29,
        priceYearly: 290,
        orderLimit: 2500,
        shopLimit: 5,
        sortOrder: 2,
        features: JSON.stringify([
          "5 connected shops",
          "2,500 orders / month",
          "Real-time order sync",
          "Automation workflows",
          "Bulk label generation",
          "Tracking pushed back to marketplace",
          "Priority email support",
        ]),
      },
      {
        name: "Scale",
        slug: "scale",
        priceMonthly: 89,
        priceYearly: 890,
        orderLimit: 25000,
        shopLimit: 25,
        sortOrder: 3,
        features: JSON.stringify([
          "25 connected shops",
          "25,000 orders / month",
          "Real-time sync + webhooks",
          "Unlimited automations",
          "REST API access",
          "Custom logistics partners",
          "Dedicated account manager",
        ]),
      },
    ].map((plan) => prisma.plan.create({ data: plan })),
  );

  const [starter, growth, scale] = plans;

  // ------------------------------------------------------------ Users
  // Passwords come from the environment so production never ships known credentials.
  const sellerPassword = process.env.DEMO_SELLER_PASSWORD ?? "Password123!";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!";
  const password = await bcrypt.hash(sellerPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: process.env.DEMO_ADMIN_EMAIL ?? "admin@owlflow.io",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: "Platform Admin",
      company: "OwlFlow",
      country: "VN",
      role: "ADMIN",
      emailVerified: true,
      planId: scale.id,
      lastLoginAt: new Date(),
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: process.env.DEMO_SELLER_EMAIL ?? "seller@owlflow.io",
      passwordHash: password,
      name: "Hannah Lewis",
      company: "Little Thistle Studio",
      country: "US",
      role: "USER",
      emailVerified: true,
      planId: growth.id,
      lastLoginAt: new Date(),
    },
  });

  const extraUsers = await Promise.all(
    [
      { email: "mia@craftbarn.co", name: "Mia Chen", company: "Craft Barn", plan: growth.id },
      { email: "david@northprints.com", name: "David Novak", company: "North Prints", plan: starter.id },
      { email: "sara@bloomandwick.com", name: "Sara Ellis", company: "Bloom & Wick", plan: scale.id },
      { email: "tom@oakleather.io", name: "Tom Baxter", company: "Oak Leather Co", plan: starter.id },
      { email: "yuki@paperfoxstudio.jp", name: "Yuki Sato", company: "Paper Fox Studio", plan: growth.id },
    ].map((user, index) =>
      prisma.user.create({
        data: {
          email: user.email,
          passwordHash: password,
          name: user.name,
          company: user.company,
          planId: user.plan,
          emailVerified: index % 3 !== 0,
          status: index === 4 ? "SUSPENDED" : "ACTIVE",
          createdAt: new Date(Date.now() - (index + 2) * 9 * 86400000),
          lastLoginAt: new Date(Date.now() - index * 3600000),
        },
      }),
    ),
  );

  // ------------------------------------------------------------ Shops
  const shopSpecs = [
    { userId: seller.id, platform: "ETSY", name: "LittleThistleStudio", url: "https://www.etsy.com/shop/LittleThistleStudio", orders: 46 },
    { userId: seller.id, platform: "SHOPIFY", name: "littlethistle.myshopify.com", url: "https://littlethistle.myshopify.com", orders: 18 },
    { userId: seller.id, platform: "TIKTOK", name: "Little Thistle TikTok", url: "https://shop.tiktok.com/littlethistle", orders: 12 },
    { userId: extraUsers[0].id, platform: "ETSY", name: "CraftBarnGoods", url: "https://www.etsy.com/shop/CraftBarnGoods", orders: 22 },
    { userId: extraUsers[1].id, platform: "ETSY", name: "NorthPrintsCo", url: "https://www.etsy.com/shop/NorthPrintsCo", orders: 14 },
    { userId: extraUsers[2].id, platform: "AMAZON", name: "Bloom & Wick US", url: "https://sellercentral.amazon.com", orders: 20 },
  ];

  for (const spec of shopSpecs) {
    const shop = await prisma.shop.create({
      data: {
        userId: spec.userId,
        platform: spec.platform,
        name: spec.name,
        url: spec.url,
        externalId: String(20000000 + Math.floor(Math.random() * 9999999)),
        isDemo: true,
        status: "CONNECTED",
        currency: "USD",
        scopes: "shops_r listings_r transactions_r transactions_w",
        lastSyncAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
        createdAt: new Date(Date.now() - 40 * 86400000),
      },
    });

    for (const product of generateDemoProducts(shop.id, 12)) {
      await prisma.product.create({ data: product });
    }

    for (const draft of generateDemoOrders(shop.id, spec.orders)) {
      const order = await prisma.order.create({ data: draft.order });
      await prisma.orderItem.createMany({
        data: draft.items.map((item) => ({ ...item, orderId: order.id })),
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "CREATED",
          message: `Order imported from ${spec.platform}`,
          createdAt: order.placedAt,
        },
      });

      if (order.shippedAt) {
        const carrier = demoCarrier();
        const code = demoTracking();
        await prisma.shipment.create({
          data: {
            orderId: order.id,
            carrier,
            service: "Standard",
            trackingNumber: code,
            trackingUrl: trackingUrlFor(carrier, code),
            status: order.deliveredAt ? "DELIVERED" : "IN_TRANSIT",
            cost: Number((Math.random() * 9 + 3).toFixed(2)),
            weightGrams: Math.floor(Math.random() * 1400) + 120,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            pushedToShop: true,
          },
        });
        await prisma.orderEvent.create({
          data: {
            orderId: order.id,
            type: "SHIPPED",
            message: `Shipped via ${carrier} — tracking ${code} pushed back to ${spec.platform}`,
            createdAt: order.shippedAt,
          },
        });
      }
    }

    await prisma.syncJob.create({
      data: {
        shopId: shop.id,
        type: "FULL",
        status: "SUCCESS",
        itemsRead: spec.orders + 12,
        itemsSaved: spec.orders + 12,
        message: "Initial import completed",
        startedAt: new Date(Date.now() - 3700000),
        finishedAt: new Date(Date.now() - 3600000),
      },
    });
  }

  // ------------------------------------------------------------ Automations
  const automations = [
    {
      name: "Auto-accept paid Etsy orders",
      description: "Moves paid Etsy receipts straight into production queue.",
      trigger: "ORDER_PAID",
      conditions: JSON.stringify([{ field: "platform", op: "equals", value: "ETSY" }]),
      actions: JSON.stringify([{ type: "SET_STATUS", value: "PROCESSING" }, { type: "NOTIFY", value: "production@studio" }]),
      runCount: 268,
    },
    {
      name: "Flag high-value orders",
      description: "Tags orders above $150 as high priority for manual QC.",
      trigger: "ORDER_CREATED",
      conditions: JSON.stringify([{ field: "total", op: "gt", value: 150 }]),
      actions: JSON.stringify([{ type: "SET_PRIORITY", value: "HIGH" }, { type: "ADD_TAG", value: "vip" }]),
      runCount: 41,
    },
    {
      name: "Push tracking back to marketplace",
      description: "Sends tracking numbers to Etsy/Shopify as soon as a label is created.",
      trigger: "ORDER_SHIPPED",
      conditions: JSON.stringify([]),
      actions: JSON.stringify([{ type: "PUSH_TRACKING" }, { type: "EMAIL_BUYER" }]),
      runCount: 512,
    },
    {
      name: "Hold personalized orders missing details",
      description: "Puts orders on hold when the personalization field is empty.",
      trigger: "ORDER_CREATED",
      conditions: JSON.stringify([{ field: "personalization", op: "is_empty", value: true }]),
      actions: JSON.stringify([{ type: "SET_STATUS", value: "ON_HOLD" }, { type: "EMAIL_BUYER" }]),
      enabled: false,
      runCount: 17,
    },
  ];

  for (const automation of automations) {
    const created = await prisma.automation.create({
      data: { ...automation, userId: seller.id, lastRunAt: new Date(Date.now() - 5400000) },
    });
    for (let i = 0; i < 6; i += 1) {
      await prisma.automationRun.create({
        data: {
          automationId: created.id,
          status: i === 4 ? "SKIPPED" : "SUCCESS",
          message: i === 4 ? "Conditions not met" : `Applied "${created.name}"`,
          durationMs: Math.floor(Math.random() * 400) + 30,
          createdAt: new Date(Date.now() - i * 5400000),
        },
      });
    }
  }

  // ------------------------------------------------------------ API keys & webhooks
  await prisma.apiKey.create({
    data: {
      userId: seller.id,
      name: "Production integration",
      prefix: "owl_live_8f2b",
      keyHash: await bcrypt.hash("owl_live_8f2b_demo_key", 10),
      scopes: JSON.stringify(["read", "write"]),
      lastUsedAt: new Date(Date.now() - 1800000),
    },
  });

  await prisma.webhookEndpoint.create({
    data: {
      userId: seller.id,
      url: "https://hooks.littlethistle.co/owlflow",
      events: JSON.stringify(["order.created", "order.shipped", "shop.sync_failed"]),
      secret: "whsec_" + Math.random().toString(36).slice(2, 18),
    },
  });

  // ------------------------------------------------------------ Tickets
  const tickets = [
    { name: "Mia Chen", email: "mia@craftbarn.co", subject: "Etsy sync stopped after token refresh", category: "INTEGRATION", priority: "HIGH", status: "OPEN", message: "My Etsy shop shows an error since this morning. Reconnecting did not help." },
    { name: "David Novak", email: "david@northprints.com", subject: "Upgrade to Growth plan", category: "BILLING", priority: "NORMAL", status: "PENDING", message: "How do I move from Starter to Growth mid-cycle?" },
    { name: "Sara Ellis", email: "sara@bloomandwick.com", subject: "Bulk label export as ZIP", category: "TECHNICAL", priority: "LOW", status: "RESOLVED", message: "Can I export 200 labels at once instead of one by one?" },
  ];

  for (const ticket of tickets) {
    const created = await prisma.ticket.create({
      data: { ...ticket, createdAt: new Date(Date.now() - Math.random() * 6 * 86400000) },
    });
    if (ticket.status !== "OPEN") {
      await prisma.ticketReply.create({
        data: {
          ticketId: created.id,
          userId: admin.id,
          authorName: "OwlFlow Support",
          isStaff: true,
          message: "Thanks for reaching out — we've looked into this and pushed a fix. Let us know if it persists.",
        },
      });
    }
  }

  // ------------------------------------------------------------ Logs & notifications
  const logs = [
    { category: "AUTH", level: "INFO", message: "User signed in", userId: seller.id },
    { category: "SYNC", level: "INFO", message: "Etsy order sync completed — 46 receipts imported", userId: seller.id },
    { category: "SYNC", level: "WARN", message: "Etsy rate limit reached, retrying in 60s", userId: seller.id },
    { category: "ORDER", level: "INFO", message: "Order #2481930 marked as shipped", userId: seller.id },
    { category: "AUTOMATION", level: "INFO", message: 'Automation "Push tracking back to marketplace" ran 12 times', userId: seller.id },
    { category: "ADMIN", level: "INFO", message: "Plan 'Growth' updated by admin", userId: admin.id },
    { category: "SYSTEM", level: "ERROR", message: "Webhook delivery failed (503) — https://hooks.littlethistle.co/owlflow", userId: seller.id },
  ];

  for (const [index, log] of logs.entries()) {
    await prisma.activityLog.create({
      data: { ...log, ip: "203.0.113." + (10 + index), createdAt: new Date(Date.now() - index * 2400000) },
    });
  }

  await prisma.notification.createMany({
    data: [
      { userId: seller.id, title: "12 new orders imported", body: "Your Etsy shop synced 12 new orders in the last hour.", type: "SUCCESS", link: "/dashboard/orders" },
      { userId: seller.id, title: "Tracking pushed to Etsy", body: "8 tracking numbers were sent back to the marketplace.", type: "INFO", link: "/dashboard/shipping" },
      { userId: seller.id, title: "Approaching plan limit", body: "You have used 82% of your monthly order quota.", type: "WARNING", link: "/dashboard/billing" },
    ],
  });

  // ------------------------------------------------------------ Settings
  await prisma.setting.createMany({
    data: [
      { key: "site.name", value: "OwlFlow" },
      { key: "site.tagline", value: "Automate your entire order lifecycle" },
      { key: "site.supportEmail", value: "support@owlflow.io" },
      { key: "signup.enabled", value: "true" },
      { key: "sync.intervalMinutes", value: "15" },
      { key: "maintenance.enabled", value: "false" },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    shops: await prisma.shop.count(),
    orders: await prisma.order.count(),
    products: await prisma.product.count(),
  };

  console.log("✓ Seed complete", counts);
  console.log(`  Admin  → ${admin.email} / ${adminPassword}`);
  console.log(`  Seller → ${seller.email} / ${sellerPassword}`);
  if (!process.env.DEMO_ADMIN_PASSWORD) {
    console.warn(
      "  ! Using the default demo passwords. Set DEMO_ADMIN_PASSWORD and DEMO_SELLER_PASSWORD before seeding production.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
