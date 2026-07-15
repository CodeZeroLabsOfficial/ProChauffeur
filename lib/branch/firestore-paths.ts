import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore
} from "firebase/firestore";

import {
  branchCollectionSegments,
  branchSettingsSegments,
  type BranchSettingsDocId,
  type BranchSubcollection
} from "@/lib/models/branch";
import { getActiveBranchId } from "@/lib/branch/active-branch-store";

type OpsSubcollection = Exclude<BranchSubcollection, "settings">;

export function branchCollectionRef(
  db: Firestore,
  sub: OpsSubcollection,
  branchId: string = getActiveBranchId()
): CollectionReference {
  const [a, b, c] = branchCollectionSegments(branchId, sub);
  return collection(db, a, b, c);
}

export function branchDocRef(
  db: Firestore,
  sub: OpsSubcollection,
  docId: string,
  branchId: string = getActiveBranchId()
): DocumentReference {
  return doc(branchCollectionRef(db, sub, branchId), docId);
}

export function branchSettingsDocRef(
  db: Firestore,
  settingsDocId: BranchSettingsDocId,
  branchId: string = getActiveBranchId()
): DocumentReference {
  const [a, b, c, d] = branchSettingsSegments(branchId, settingsDocId);
  return doc(db, a, b, c, d);
}

export function branchesCollectionRef(db: Firestore): CollectionReference {
  return collection(db, "branches");
}

export function branchMetaDocRef(db: Firestore, branchId: string): DocumentReference {
  return doc(db, "branches", branchId);
}
