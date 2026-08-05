"use server";

import { getCurrentUser, logActivity } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ContactState = { ok: boolean; message: string } | null;

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL");
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !subject || !message) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "That email address doesn't look right." };
  }

  const user = await getCurrentUser();

  await prisma.ticket.create({
    data: {
      userId: user?.id ?? null,
      name,
      email,
      subject,
      category,
      message,
      priority: category === "INTEGRATION" ? "HIGH" : "NORMAL",
    },
  });

  await logActivity({
    userId: user?.id,
    category: "SYSTEM",
    message: `New support ticket: ${subject}`,
    meta: { email, category },
  });

  return {
    ok: true,
    message: "Thanks — your message is in. Our team replies within one business day.",
  };
}
