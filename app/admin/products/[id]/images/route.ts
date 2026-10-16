// app/admin/products/[id]/images/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { denyIfNotAdmin } from "@/lib/auth";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const productId = Number((await context.params).id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    // (tuỳ chọn) kiểm tra sản phẩm có tồn tại
    const exists = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const alt = (form.get("alt") as string) || null;
    const sort = form.get("sort") ? Number(form.get("sort")) : 0;

    // Blob -> Buffer (Node runtime)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || "mcbrother",
          resource_type: "auto",
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    const img = await prisma.productImage.create({
      data: {
        url: uploaded.secure_url as string,
        alt: alt || uploaded.original_filename,
        sort,
        productId,
      },
    });

    const res = NextResponse.json({ ok: true, image: img });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}