// components/HeaderShell.tsx
import { prisma } from "@/lib/prisma";
import Header from "./Header";


type Cat = {
  id: number;
  name: string;
  slug: string;
  children?: Cat[];
};

export default async function HeaderShell() {

  // Chỉ lấy đúng các cột Header dùng (id, name, slug, ogImage) — trước đây lấy toàn bộ cột
  // (meta, canonical, banner…) của 3 cấp danh mục rồi gửi xuống trình duyệt ở MỌI trang.
  const base = { id: true, name: true, slug: true, ogImage: true } as const;
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      ...base,
      children: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          ...base,
          children: {
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: base,
          },
        },
      },
    },
  });

  // optional: filter slug null (an toàn SEO)
const clean = categories.map((c) => ({
  ...c,
  children: c.children?.map((sub) => ({
    ...sub,
    children: sub.children ?? [],
  })),
}));

  // console.log("HEADER TREE:", JSON.stringify(clean, null, 2));

  return <Header categories={clean} />;
}