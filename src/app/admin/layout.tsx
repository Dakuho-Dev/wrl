import { AppShell, type NavGroup } from "@/components/app/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [openTickets, brokenShops] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.shop.count({ where: { status: "ERROR" } }),
  ]);

  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard" },
        { href: "/admin/analytics", label: "Platform analytics", icon: "analytics" },
      ],
    },
    {
      title: "Manage",
      items: [
        { href: "/admin/users", label: "Users", icon: "users" },
        { href: "/admin/shops", label: "Shops", icon: "store", badge: brokenShops || undefined },
        { href: "/admin/orders", label: "Orders", icon: "bag" },
        { href: "/admin/products", label: "Products", icon: "boxes" },
        { href: "/admin/automations", label: "Automations", icon: "workflow" },
      ],
    },
    {
      title: "Platform",
      items: [
        { href: "/admin/plans", label: "Plans & pricing", icon: "billing" },
        { href: "/admin/integrations", label: "Integrations", icon: "plug" },
        { href: "/admin/tickets", label: "Support tickets", icon: "support", badge: openTickets || undefined },
        { href: "/admin/logs", label: "Activity log", icon: "activity" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];

  return (
    <AppShell
      groups={groups}
      variant="admin"
      notifications={openTickets}
      user={{ name: admin.name, email: admin.email, role: admin.role, plan: "Administrator" }}
    >
      {children}
    </AppShell>
  );
}
