// app/api/upload/r2/route.ts
// Cấp link upload tạm (presigned URL, hết hạn sau 1 giờ) để trình duyệt admin PUT video THẲNG lên Cloudflare R2.
// File không đi qua server → không giới hạn dung lượng của Vercel.
//
// Biến môi trường cần có (Vercel → Settings → Environment Variables):
//   R2_ACCOUNT_ID         ID tài khoản Cloudflare
//   R2_ACCESS_KEY_ID      Access Key ID của R2 API token (quyền Object Read & Write)
//   R2_SECRET_ACCESS_KEY  Secret Access Key của token đó
//   R2_BUCKET             tên bucket, VD: mcbrother-videos
//   R2_PUBLIC_URL         link công khai của bucket, VD: https://pub-xxxx.r2.dev hoặc https://media.mcbrother.com.vn
// Thiếu biến → trả configured:false, trình duyệt tự quay về upload lên Cloudinary như cũ.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { denyIfNotAdmin } from '@/lib/auth';

const MAX_BYTES = 1024 * 1024 * 1024; // 1GB

const EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/ogg': 'ogv',
};

function slug(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'video'
  );
}

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    return NextResponse.json({ ok: false, configured: false, error: 'Chưa cấu hình R2' });
  }

  const body = await req.json().catch(() => ({}));
  const contentType = String(body?.contentType || '');
  const size = Number(body?.size || 0);
  const ext = EXT[contentType];
  if (!ext) {
    return NextResponse.json({ ok: false, configured: true, error: 'Chỉ nhận video MP4, WEBM, MOV' }, { status: 400 });
  }
  if (!size || size > MAX_BYTES) {
    return NextResponse.json({ ok: false, configured: true, error: 'Video quá lớn (> 1GB)' }, { status: 400 });
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const key = `videos/web/${month}/${Date.now().toString(36)}-${slug(String(body?.filename || ''))}.${ext}`;

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
    // Không gắn checksum vào link ký sẵn (SDK mới mặc định gắn checksum của body rỗng → R2 từ chối file thật)
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 3600 }
  );

  const res = NextResponse.json({
    ok: true,
    configured: true,
    uploadUrl,
    contentType,
    publicUrl: `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
