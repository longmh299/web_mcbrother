// app/admin/news-categories/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ImageField from "@/components/ImageField";
import SubmitButton from "@/components/SubmitButton";
import ConfirmDelete from "@/components/ConfirmDelete";
import { requireAdmin } from '@/lib/auth';
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bool = (fd: FormData, name: string) =>
  fd.getAll(name).map(String).pop() === "1";

/* ---------- actions ---------- */
async function createCat(fd: FormData) {
  "use server";
   await requireAdmin();  
  const name = String(fd.get("name") ?? "").trim();
  if (!name) throw new Error("Thiếu tên chuyên mục");

  const data: any = {
    name,
    slug: (String(fd.get("slug") ?? "").trim()) || name,
    order: Number(fd.get("order") ?? 0),
    parentId: fd.get("parentId") ? Number(fd.get("parentId")) : null,
    // Banner + SEO
    banner: (fd.get("banner") as string) || null,
    metaTitle: (fd.get("metaTitle") as string) || null,
    metaDescription: (fd.get("metaDescription") as string) || null,
    canonicalUrl: (fd.get("canonicalUrl") as string) || null,
    ogImage: (fd.get("ogImage") as string) || null,
    noindex: bool(fd, "noindex"),
    nofollow: bool(fd, "nofollow"),
  };

  await prisma.postCategory.create({ data });
  revalidatePath("/admin/news-categories");
  redirect("/admin/news-categories?ok=1");
}

async function updateCat(fd: FormData) {
  "use server";
   await requireAdmin();  
  const id = Number(fd.get("id"));

  const old = await prisma.postCategory.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!old) throw new Error("Không tìm thấy chuyên mục");

  const data: any = {
    name: (fd.get("name") as string) || undefined,
    slug: (fd.get("slug") as string) || undefined,
    order: fd.get("order") != null ? Number(fd.get("order")) : undefined,
    parentId:
      fd.get("parentId") && String(fd.get("parentId")) !== ""
        ? Number(fd.get("parentId"))
        : null,
    banner: (fd.get("banner") as string) || null,
    metaTitle: (fd.get("metaTitle") as string) || null,
    metaDescription: (fd.get("metaDescription") as string) || null,
    canonicalUrl: (fd.get("canonicalUrl") as string) || null,
    ogImage: (fd.get("ogImage") as string) || null,
    noindex: bool(fd, "noindex"),
    nofollow: bool(fd, "nofollow"),
  };

  const updated = await prisma.postCategory.update({
    where: { id },
    data,
    select: { id: true, slug: true, name: true },
  });

  if (old.slug !== updated.slug) {
    await prisma.slugRedirect
      .create({
        data: {
          entityType: "postCategory",
          fromSlug: old.slug,
          toSlug: updated.slug,
        },
      })
      .catch(() => {});
  }

  revalidatePath("/admin/news-categories");
  redirect("/admin/news-categories?ok=1");
}

async function deleteCatAction(fd: FormData) {
  "use server";
   await requireAdmin();  
  const id = Number(fd.get("id"));
  await prisma.postCategory.delete({ where: { id } });
  revalidatePath("/admin/news-categories");
  redirect("/admin/news-categories?ok=1");
}

/* ---------- page ---------- */
export default async function EditNewsCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params; // Next 15: params là Promise
  const idNum = Number(idParam);
  const isNew = !idParam || Number.isNaN(idNum) || idParam === "new";

  const all = await prisma.postCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const cat = isNew
    ? null
    : await prisma.postCategory.findUnique({
        where: { id: idNum },
      });

  if (!isNew && !cat) {
    return (
      <div className="space-y-3">
        <p>Không tìm thấy chuyên mục.</p>
        <Link href="/admin/news-categories" className="text-blue-600 underline">
          ← Danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {isNew ? "Thêm chuyên mục" : `Sửa chuyên mục #${cat!.id}`}
        </h1>
        <Link href="/admin/news-categories" className="text-blue-600 underline">
          ← Danh sách
        </Link>
      </div>

      <form
        action={isNew ? createCat : updateCat}
        className="bg-white border rounded p-4 grid md:grid-cols-2 gap-3"
      >
        {!isNew && <input type="hidden" name="id" value={cat!.id} />}

        <input
          name="name"
          defaultValue={cat?.name ?? ""}
          placeholder="Tên chuyên mục *"
          className="border rounded px-3 py-2"
          required
        />
        <input
          name="slug"
          defaultValue={cat?.slug ?? ""}
          placeholder="Slug (để trống = tạo từ tên)"
          className="border rounded px-3 py-2"
        />

        <input
          type="number"
          name="order"
          defaultValue={cat?.order ?? 0}
          placeholder="Thứ tự"
          className="border rounded px-3 py-2"
        />

        <select
          name="parentId"
          defaultValue={cat?.parentId ?? ""}
          className="border rounded px-3 py-2"
        >
          <option value="">— Không có cha —</option>
          {all
            .filter((c) => (isNew ? true : c.id !== cat!.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        {/* Banner */}
        <ImageField name="banner" label="Banner" defaultValue={cat?.banner ?? ""} />

        {/* SEO */}
        <div className="bg-slate-50 rounded p-3 md:col-span-2 space-y-3 border">
          <h3 className="font-medium">SEO</h3>
          <input
            name="metaTitle"
            defaultValue={cat?.metaTitle ?? ""}
            placeholder="Meta title"
            className="border rounded px-3 py-2 w-full"
          />
          <textarea
            name="metaDescription"
            defaultValue={cat?.metaDescription ?? ""}
            placeholder="Meta description"
            className="border rounded px-3 py-2 w-full"
            rows={3}
          />
          <input
            name="canonicalUrl"
            defaultValue={cat?.canonicalUrl ?? ""}
            placeholder="Canonical URL"
            className="border rounded px-3 py-2 w-full"
          />
          <ImageField name="ogImage" label="OG Image" defaultValue={cat?.ogImage ?? ""} />
          <div className="flex gap-6">
            <span className="flex items-center gap-2">
              <input type="hidden" name="noindex" value="0" />
              <input type="checkbox" name="noindex" value="1" defaultChecked={!!cat?.noindex} />
              <span>noindex</span>
            </span>
            <span className="flex items-center gap-2">
              <input type="hidden" name="nofollow" value="0" />
              <input type="checkbox" name="nofollow" value="1" defaultChecked={!!cat?.nofollow} />
              <span>nofollow</span>
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <SubmitButton>{isNew ? "Tạo" : "Lưu"}</SubmitButton>
        </div>
      </form>

      {/* Xoá: để ngoài form để tránh lồng <form> */}
      {!isNew && (
        <div>
          <ConfirmDelete
            action={deleteCatAction}
            hidden={{ id: cat!.id }}
            label="Xoá chuyên mục"
            confirmText={`Xoá chuyên mục "${cat!.name}"?`}
          />
        </div>
      )}
    </div>
  );
}
