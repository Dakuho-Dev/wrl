import { AppShell, type NavGroup } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [newOrders, unread] = await Promise.all([
    prisma.order.count({ where: { shop: { userId: user.id }, status: "NEW" } }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const groups: NavGroup[] = [
    {
      title: "Operations",
      items: [
        { href: "/dashboard", label: "Overview", icon: "dashboard" },
        { href: "/dashboard/orders", label: "Orders", icon: "bag", badge: newOrders || undefined },
        { href: "/dashboard/shipping", label: "Shipping", icon: "truck" },
        { href: "/dashboard/products", label: "Products", icon: "boxes" },
      ],
    },
    {
      title: "Channels",
      items: [
        { href: "/dashboard/shops", label: "Shops", icon: "store" },
        { href: "/dashboard/automations", label: "Automations", icon: "workflow" },
        { href: "/dashboard/analytics", label: "Analytics", icon: "analytics" },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
        { href: "/dashboard/api-keys", label: "API & webhooks", icon: "key" },
        { href: "/dashboard/billing", label: "Billing", icon: "billing" },
        { href: "/dashboard/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];

  return (
    <AppShell
      groups={groups}
      variant="seller"
      notifications={unread}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan?.name ? `${user.plan.name} plan` : null,
      }}
    >
      {children}
    </AppShell>
  );
}
