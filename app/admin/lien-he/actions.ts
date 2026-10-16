"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const STATUSES = ["new", "done"] as const;
type Status = (typeof STATUSES)[number];

function getId(fd: FormData) {
  const id = String(fd.get("id") ?? "").trim();
  // id là UUID
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("ID không hợp lệ");
  return id;
}

function refresh() {
  revalidatePath("/admin/lien-he");
  revalidatePath("/admin");
}

/** Đổi trạng thái: mới ⇄ đã xử lý */
export async function setContactStatus(fd: FormData) {
  await requireAdmin();
  const id = getId(fd);
  const status = String(fd.get("status") ?? "") as Status;
  if (!STATUSES.includes(status)) throw new Error("Trạng thái không hợp lệ");

  await prisma.contactMessage.update({ where: { id }, data: { status } });
  refresh();
}

/** Lưu ghi chú nội bộ (đã gọi lại, đã báo giá…) */
export async function saveContactNote(fd: FormData) {
  await requireAdmin();
  const id = getId(fd);
  const note = String(fd.get("note") ?? "").trim().slice(0, 2000) || null;

  await prisma.contactMessage.update({ where: { id }, data: { note } });
  refresh();
}

/** Xoá liên hệ (spam, trùng…) */
export async function deleteContact(fd: FormData) {
  await requireAdmin();
  const id = getId(fd);

  await prisma.contactMessage.delete({ where: { id } });
  refresh();
}