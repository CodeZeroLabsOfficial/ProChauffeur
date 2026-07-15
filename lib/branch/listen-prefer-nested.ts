import {
  onSnapshot,
  type Query,
  type QuerySnapshot,
  type DocumentData,
  type FirestoreError
} from "firebase/firestore";

import { isBranchesDualReadEnabled } from "@/lib/branch/dual-read";

type Unsub = () => void;

/**
 * Prefer the nested (primary) query. If dual-read is enabled and the first
 * nested snapshot is empty, also subscribe to the legacy query and use it
 * until nested data appears.
 */
export function listenPreferNested<T>(
  nestedQuery: Query,
  legacyQuery: Query,
  map: (snap: QuerySnapshot<DocumentData>) => T[],
  onUpdate: (rows: T[]) => void,
  onError: (error: FirestoreError) => void
): Unsub {
  let legacyUnsub: Unsub | null = null;
  let usingLegacy = false;

  const nestedUnsub = onSnapshot(
    nestedQuery,
    (snap) => {
      if (snap.size > 0 || !isBranchesDualReadEnabled()) {
        if (legacyUnsub) {
          legacyUnsub();
          legacyUnsub = null;
          usingLegacy = false;
        }
        onUpdate(map(snap));
        return;
      }

      if (!legacyUnsub) {
        usingLegacy = true;
        legacyUnsub = onSnapshot(
          legacyQuery,
          (legacySnap) => {
            if (usingLegacy) onUpdate(map(legacySnap));
          },
          onError
        );
      }
    },
    onError
  );

  return () => {
    nestedUnsub();
    legacyUnsub?.();
  };
}
