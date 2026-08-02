/** Sheet title for add-vs-edit compliance flows. */
export function complianceSheetTitle(
  isNew: boolean,
  labels: { add: string; edit: string }
): string {
  return isNew ? labels.add : labels.edit;
}
