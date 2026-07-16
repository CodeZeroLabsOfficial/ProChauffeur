import {
  onSnapshot,
  type Query,
  type QuerySnapshot,
  type DocumentData,
  type FirestoreError
} from "firebase/firestore";

type Unsub = () => void;

/** Subscribes to a single Firestore query and maps snapshots to rows. */
export function listenQuery<T>(
  q: Query,
  map: (snap: QuerySnapshot<DocumentData>) => T[],
  onUpdate: (rows: T[]) => void,
  onError: (error: FirestoreError) => void
): Unsub {
  return onSnapshot(q, (snap) => onUpdate(map(snap)), onError);
}
