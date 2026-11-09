"use server";
// Quản lý IP loại trừ khỏi thống kê (mạng công ty, wifi nhà…)
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { clearExcludedIpCache, networkPrefix, normIp } from "@/lib/track-filter";

const IP_RULE = /^[0-9a-f.:]{2,60}\*?$/i;

function refresh() {
  clearExcludedIpCache();
  revalidatePath("/admin/truy-cap");
}

/** Thêm 1 IP / dải IP (nhập tay) */
export async function addExcludedIp(fd: FormData) {
  await requireAdmin();
  const ip = normIp(String(fd.get("ip") ?? "")).replace(/\s+/g, "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 120) || null;
  if (!IP_RULE.test(ip)) throw new Error("IP không hợp lệ");
  await prisma.excludedIp.upsert({ where: { ip }, create: { ip, note }, update: { note } });
  refresh();
}

/**
 * Thêm mạng đang dùng (IP lấy từ request của chính admin).
 * mode = "network": với IPv6 thêm cả dải /64 (mọi máy trong cùng mạng); IPv4 là IP công cộng chung của cả mạng.
 */
export async function addCurrentIp(fd: FormData) {
  await requireAdmin();
  const ip = normIp(clientIp(await headers()));
  if (!ip || ip === "unknown") throw new Error("Không xác định được IP");
  const rule = String(fd.get("mode")) === "exact" ? ip : networkPrefix(ip);
  const note = String(fd.get("note") ?? "").trim().slice(0, 120) || "Mạng của tôi";
  await prisma.excludedIp.upsert({ where: { ip: rule }, create: { ip: rule, note }, update: {} });
  refresh();
}

export async function removeExcludedIp(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) throw new Error("ID không hợp lệ");
  await prisma.excludedIp.delete({ where: { id } }).catch(() => {});
  refresh();
}
