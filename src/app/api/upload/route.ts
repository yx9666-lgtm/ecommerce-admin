import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getAuthContext, rateLimit, withTryCatch } from "@/lib/api-utils";

export const POST = withTryCatch(async (req: NextRequest) => {
  // Auth check
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  // Rate limit — 10 uploads per minute
  const limited = rateLimit(req, { max: 10, window: 60_000, key: "upload" });
  if (limited) return limited;

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitize extension — only allow known safe extensions
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
  const rawExt = path.basename(file.name).split(".").pop()?.toLowerCase() || "jpg";
  const ext = allowedExts.includes(rawExt) ? rawExt : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
});
