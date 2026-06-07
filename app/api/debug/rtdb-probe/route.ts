import { getDatabase } from "firebase-admin/database";
import { NextResponse } from "next/server";

import { adminApp } from "@/lib/firebase/admin";
import { getDatabaseUrl } from "@/lib/env";
import { rtdbLiveLocationsPath } from "@/lib/models";

const RTDB_URL = "https://transport-app-27260-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function GET() {
  try {
    const db = getDatabase(adminApp(), RTDB_URL);
    const snapshot = await db.ref(rtdbLiveLocationsPath).once("value");
    const value = snapshot.val() ?? {};
    const keys = Object.keys(value as Record<string, unknown>);

    // #region agent log
    await fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "de9315" },
      body: JSON.stringify({
        sessionId: "de9315",
        location: "api/debug/rtdb-probe/route.ts:GET",
        message: "Admin RTDB probe",
        data: {
          configuredDatabaseUrl: getDatabaseUrl(),
          probedDatabaseUrl: RTDB_URL,
          liveLocationKeyCount: keys.length,
          sampleDriverIds: keys.slice(0, 5)
        },
        timestamp: Date.now(),
        hypothesisId: "E",
        runId: "pre-fix"
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({
      ok: true,
      databaseUrl: RTDB_URL,
      path: rtdbLiveLocationsPath,
      liveLocationKeyCount: keys.length,
      sample: keys.slice(0, 3).map((id) => ({ id, ...(value as Record<string, unknown>)[id] }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // #region agent log
    await fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "de9315" },
      body: JSON.stringify({
        sessionId: "de9315",
        location: "api/debug/rtdb-probe/route.ts:GET",
        message: "Admin RTDB probe failed",
        data: { error: message },
        timestamp: Date.now(),
        hypothesisId: "E",
        runId: "pre-fix"
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
