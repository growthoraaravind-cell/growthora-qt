/**
 * Computes subtotal, GST amount, discount amount and grand total
 * for the Commercial Proposal section. Shared by preview + doc generation
 * so the numbers are always identical.
 */
function computeTotals(commercialProposal = {}) {
  const rows = commercialProposal.rows || [];
  const subtotal = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const gstPercent = Number(commercialProposal.gstPercent ?? 18);
  const gstAmount = +(subtotal * (gstPercent / 100)).toFixed(2);

  const discount = commercialProposal.discount || {};
  const discountValue = Number(discount.value) || 0;
  let discountAmount = 0;
  if (discountValue > 0) {
    discountAmount =
      discount.type === 'percent' ? +((subtotal + gstAmount) * (discountValue / 100)).toFixed(2) : discountValue;
  }

  const grandTotal = +(subtotal + gstAmount - discountAmount).toFixed(2);

  return { subtotal: +subtotal.toFixed(2), gstPercent, gstAmount, discountAmount, grandTotal };
}

function formatINR(amount = 0) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = { computeTotals, formatINR };
