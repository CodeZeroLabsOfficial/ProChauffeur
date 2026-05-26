import {
  getFirebaseSetupError,
  readFirebaseConfig,
} from "@/lib/firebase/config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = readFirebaseConfig(process.env);
  if (!config) {
    return NextResponse.json(
      { error: getFirebaseSetupError(process.env) },
      { status: 503 }
    );
  }

  return NextResponse.json({ config });
}
