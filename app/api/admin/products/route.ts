// app/api/admin/products/route.ts
// Danh sách sản phẩm cho editor admin (chèn link sản phẩm vào bài viết).
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { denyIfNotAdmin } from '@/lib/auth';

export async function GET() {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const products = await prisma.product.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
      },
    });

    const res = NextResponse.json({ ok: true, products });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('ADMIN_PRODUCTS_ERROR', e);
    return NextResponse.json({ ok: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}