// app/api/upload/route.ts
// Chỉ admin được upload (ảnh dùng trong form sản phẩm / tin tức).
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

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function folder() {
  return process.env.CLOUDINARY_FOLDER || 'mcbrother/products';
}

/** Chỉ nhận URL http(s) công khai; chặn localhost / IP nội bộ. */
function isSafeRemoteUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const h = u.hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === '[::1]'
  ) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const form = await req.formData();

    // CASE A: re-host từ URL ngoài
    const url = form.get('url')?.toString().trim();
    if (url) {
      if (!isSafeRemoteUrl(url)) {
        return NextResponse.json({ ok: false, error: 'URL không hợp lệ' }, { status: 400 });
      }
      const uploaded = await cloudinary.uploader.upload(url, {
        folder: folder(),
        resource_type: 'image', // chỉ nhận ảnh
      });
      return NextResponse.json({ ok: true, url: uploaded.secure_url, from: 'url' });
    }

    // CASE B: upload file từ máy
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Thiếu file hoặc url' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Chỉ nhận file ảnh' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'File quá lớn (>10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: folder(), resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return NextResponse.json({ ok: true, url: uploaded.secure_url as string, from: 'file' });
  } catch (e) {
    console.error('UPLOAD_ERROR', e);
    // Không trả chi tiết lỗi nội bộ ra ngoài
    return NextResponse.json({ ok: false, error: 'Upload thất bại' }, { status: 500 });
  }
}