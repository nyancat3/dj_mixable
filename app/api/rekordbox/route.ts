import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { parseRekordboxXml, parseRekordboxTxt } from "@/lib/rekordbox";
import { setLibrary } from "@/lib/rekordbox-store";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50MB." },
      { status: 413 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50MB." },
      { status: 413 }
    );
  }

  // Decode file — detect UTF-16 LE by BOM (FF FE) and use proper decoder
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isUtf16Le = bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE;
  const raw = isUtf16Le
    ? new TextDecoder("utf-16le").decode(bytes)
    : new TextDecoder("utf-8").decode(bytes);
  // Strip BOM if present
  const content = raw.replace(/^\uFEFF/, "");

  // Detect format and parse
  let tracks;
  if (content.includes("<DJ_PLAYLISTS") || content.includes("<COLLECTION")) {
    tracks = parseRekordboxXml(content);
  } else if (/^#\t/m.test(content) || content.includes("Track Title\t")) {
    tracks = parseRekordboxTxt(content);
  } else {
    return NextResponse.json(
      { error: "Unrecognized file format. Please upload a Rekordbox XML or TXT export." },
      { status: 400 }
    );
  }

  if (tracks.length === 0) {
    return NextResponse.json(
      { error: "No tracks found in the file." },
      { status: 400 }
    );
  }

  // Get or create session ID
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("rb_session")?.value;
  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString("hex");
    cookieStore.set("rb_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  }

  setLibrary(sessionId, tracks);

  return NextResponse.json({
    trackCount: tracks.length,
  });
}
