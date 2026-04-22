import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(_req: NextRequest, context: { params: { filename: string } }) {
  const rawName = context.params.filename || "";
  const filename = path.basename(rawName);
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (!filename || !ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", filename);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
