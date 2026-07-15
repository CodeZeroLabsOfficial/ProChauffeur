import { DEFAULT_BRANCH_ID } from "@/lib/models/branch";

/**
 * When true, readers may fall back to legacy top-level collections / operator docs
 * if the nested branch path is empty or missing. Set NEXT_PUBLIC_BRANCHES_DUAL_READ=false
 * after nested cutover to disable fallbacks.
 */
export function isBranchesDualReadEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BRANCHES_DUAL_READ !== "false";
}
