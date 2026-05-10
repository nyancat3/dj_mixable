import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLibrary } from "@/lib/rekordbox-store";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("rb_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ uploaded: false, trackCount: 0 });
  }

  const library = getLibrary(sessionId);
  if (!library) {
    return NextResponse.json({ uploaded: false, trackCount: 0 });
  }

  return NextResponse.json({ uploaded: true, trackCount: library.length });
}
