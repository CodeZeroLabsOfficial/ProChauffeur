/**
 * Compute promo discount for QuotePromoApplication { type: percent|fixed, value }.
 * Percent: fraction when value <= 1, else percent points (value/100).
 */
function computePromoDiscountAmount(applied, amount) {
  if (amount <= 0 || !applied || !(applied.value > 0)) return 0;
  let raw;
  if (applied.type === "percent") {
    const fraction = applied.value <= 1 ? applied.value : applied.value / 100;
    raw = amount * fraction;
  } else {
    raw = Math.min(applied.value, amount);
  }
  return Math.min(amount, Math.max(0, Math.round(raw * 100) / 100));
}

function applyPromoDiscountLayer(amount, lines, applied, lineId) {
  if (!applied) return { amount, lines };
  const discount = computePromoDiscountAmount(applied, amount);
  if (discount <= 0) return { amount, lines };
  return {
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
    lines: [
      ...lines,
      {
        id: lineId(),
        label: applied.title || applied.code || "Promo",
        amount: -discount,
        category: "discount",
        isInternal: false,
      },
    ],
  };
}

module.exports = {
  computePromoDiscountAmount,
  applyPromoDiscountLayer,
};
