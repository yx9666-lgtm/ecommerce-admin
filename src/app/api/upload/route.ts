import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getAuthContext, rateLimit, withTryCatch } from "@/lib/api-utils";

const MAX_UPLOAD_MB = 20;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const POST = withTryCatch(async (req: NextRequest) => {
  // Auth check
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  // Rate limit — allow burst image uploads in purchasing details
  const limited = rateLimit(req, { max: 120, window: 60_000, key: "upload-image" });
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

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_UPLOAD_MB}MB)` }, { status: 400 });
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

  return NextResponse.json({ url: `/api/upload/${filename}` });
});
