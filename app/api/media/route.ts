// app/api/media/route.ts
// Thư viện ảnh Cloudinary cho editor admin. CHỈ admin được xem.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { denyIfNotAdmin } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function GET() {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const result = await cloudinary.search
      .expression('folder:mcbrother/*')
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    const images = result.resources.map((img: any) => ({
      url: img.secure_url,
      thumb: img.secure_url,
    }));

    const res = NextResponse.json({ ok: true, images });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('MEDIA_LIST_ERROR', e);
    return NextResponse.json({ ok: false, error: 'Không tải được thư viện ảnh' }, { status: 500 });
  }
}