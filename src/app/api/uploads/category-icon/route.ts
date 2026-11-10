import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("icon") || formData.get("image")) as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File gambar tidak ditemukan dalam form request." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format file tidak didukung. Harap unggah gambar format PNG, JPG, WebP, atau SVG.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ukuran file terlalu besar. Maksimal 2MB." },
        { status: 400 }
      );
    }

    // Determine extension
    let ext = "png";
    if (file.type === "image/svg+xml") ext = "svg";
    else if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/gif") ext = "gif";
    else if (file.name && file.name.includes(".")) {
      const parts = file.name.split(".");
      ext = parts[parts.length - 1].toLowerCase();
    }

    const uniqueId = Math.random().toString(36).substring(2, 8);
    const fileName = `cat_icon_${Date.now()}_${uniqueId}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "categories");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/categories/${fileName}`;

    return NextResponse.json({
      success: true,
      message: "Ikon kategori berhasil diunggah.",
      data: {
        url: publicUrl,
        filename: fileName,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch (err: any) {
    console.error("Category icon upload error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memproses unggahan ikon kategori." },
      { status: 500 }
    );
  }
}
