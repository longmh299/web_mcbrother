// app/api/upload/sign/route.ts
// Cấp chữ ký để trình duyệt (admin) upload THẲNG lên Cloudinary.
// Không đi qua server nên không bị giới hạn dung lượng request (~4.5MB trên Vercel) → upload được video lớn.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { denyIfNotAdmin } from '@/lib/auth';

/** Video được Cloudinary chuyển sẵn sang MP4 H.264 (xem được trên mọi trình duyệt, kể cả video .MOV quay từ iPhone), nén nhẹ, tối đa 1280px. */
const VIDEO_EAGER = 'c_limit,w_1280,q_auto,vc_h264';

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ ok: false, error: 'Chưa cấu hình Cloudinary' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === 'video' ? 'video' : 'image';
  const raw = String(body?.folder || '').trim();
  // Chỉ cho upload vào thư mục mcbrother/...
  const folder = /^mcbrother(\/[a-z0-9_-]+)*$/i.test(raw) ? raw : kind === 'video' ? 'mcbrother/videos' : 'mcbrother/products';

  const params: Record<string, string | number | boolean> = {
    timestamp: Math.round(Date.now() / 1000),
    folder,
  };
  if (kind === 'video') {
    params.eager = `${VIDEO_EAGER}/mp4`;
    params.eager_async = true;
  }

  const signature = cloudinary.utils.api_sign_request(params, apiSecret);

  const res = NextResponse.json({
    ok: true,
    cloudName,
    apiKey,
    signature,
    params,
    resourceType: kind,
    videoTransform: kind === 'video' ? VIDEO_EAGER : undefined,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
