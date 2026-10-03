import { LRItem, DispatchRecord, RateType, WeightUnit, PlacementType } from '../types/dispatch';

/**
 * Calculates LR freight amount based on weight, rate, and rate basis.
 */
export function calculateLRFreight(
  weight: number,
  weightUnit: WeightUnit,
  rate: number,
  rateType: RateType
): number {
  if (isNaN(weight) || isNaN(rate) || weight <= 0 || rate <= 0) {
    return 0;
  }

  // Normalize weight to metric tons or calculation unit
  switch (rateType) {
    case 'per_mt':
      if (weightUnit === 'MT') {
        return Math.round(weight * rate);
      } else if (weightUnit === 'Kg') {
        return Math.round((weight / 1000) * rate);
      } else if (weightUnit === 'Quintal') {
        return Math.round((weight / 10) * rate);
      }
      return Math.round(weight * rate);

    case 'per_kg':
      if (weightUnit === 'Kg') {
        return Math.round(weight * rate);
      } else if (weightUnit === 'MT') {
        return Math.round(weight * 1000 * rate);
      } else if (weightUnit === 'Quintal') {
        return Math.round(weight * 100 * rate);
      }
      return Math.round(weight * rate);

    case 'per_quintal':
      if (weightUnit === 'Quintal') {
        return Math.round(weight * rate);
      } else if (weightUnit === 'MT') {
        return Math.round(weight * 10 * rate);
      } else if (weightUnit === 'Kg') {
        return Math.round((weight / 100) * rate);
      }
      return Math.round(weight * rate);

    case 'fixed':
      return Math.round(rate);

    default:
      return Math.round(weight * rate);
  }
}

/**
 * Calculates Gross Market Freight based on agreed market weight and market rate.
 */
export function calculateGrossMarketFreight(
  marketWeight: number,
  marketRate: number
): number {
  if (isNaN(marketWeight) || isNaN(marketRate) || marketWeight <= 0 || marketRate <= 0) {
    return 0;
  }
  return Math.round(marketWeight * marketRate);
}

/**
 * Calculates Net Market Freight after Deductions (Commission + Advance).
 */
export function calculateNetMarketFreight(
  grossMarketFreight: number,
  commission: number,
  advance: number
): number {
  const totalDeductions = (Number(commission) || 0) + (Number(advance) || 0);
  return Math.max(0, Math.round((Number(grossMarketFreight) || 0) - totalDeductions));
}

/**
 * Recalculates total values for a dispatch record based on its LRs.
 */
export function recalculateDispatchTotals(
  lrs: LRItem[],
  placement: PlacementType = 'Market'
): {
  totalWeight: number;
  totalFreightAmount: number;
  totalAdvance: number;
  totalExtraCharges: number;
  netPayable: number;
  totalLrsCount: number;
  lrNumbers: string[];
  totalGrossMarketFreight: number;
  totalMarketCommission: number;
  totalMarketAdvance: number;
  totalNetMarketFreight: number;
  marketMargin: number;
} {
  let totalWeight = 0;
  let totalFreightAmount = 0;
  let totalAdvance = 0;
  let totalExtraCharges = 0;
  let totalGrossMarketFreight = 0;
  let totalMarketCommission = 0;
  let totalMarketAdvance = 0;
  let totalNetMarketFreight = 0;
  const lrNumbersSet = new Set<string>();

  for (const lr of lrs) {
    // Standardize weight for aggregate (in MT)
    let weightInMT = lr.weight || 0;
    if (lr.weightUnit === 'Kg') {
      weightInMT = (lr.weight || 0) / 1000;
    } else if (lr.weightUnit === 'Quintal') {
      weightInMT = (lr.weight || 0) / 10;
    }
    totalWeight += weightInMT;

    totalFreightAmount += Number(lr.freightAmount) || 0;
    totalAdvance += Number(lr.advanceAmount) || 0;
    totalExtraCharges += Number(lr.extraCharges) || 0;

    // Market placement calculations
    if (placement === 'Market') {
      const gFreight = Number(lr.grossMarketFreight) || 0;
      const comm = Number(lr.marketCommission) || 0;
      const adv = Number(lr.marketAdvance) || 0;
      const netMkt = Number(lr.netMarketFreight) || Math.max(0, gFreight - (comm + adv));

      totalGrossMarketFreight += gFreight;
      totalMarketCommission += comm;
      totalMarketAdvance += adv;
      totalNetMarketFreight += netMkt;
    }

    const trimmed = (lr.lrNumber || '').trim();
    if (trimmed) {
      lrNumbersSet.add(trimmed);
    }
  }

  const netPayable = Math.max(0, totalFreightAmount + totalExtraCharges - totalAdvance);
  const marketMargin = totalFreightAmount - totalGrossMarketFreight;

  return {
    totalWeight: Number(totalWeight.toFixed(3)),
    totalFreightAmount: Math.round(totalFreightAmount),
    totalAdvance: Math.round(totalAdvance),
    totalExtraCharges: Math.round(totalExtraCharges),
    netPayable: Math.round(netPayable),
    totalLrsCount: lrs.length,
    lrNumbers: Array.from(lrNumbersSet),
    totalGrossMarketFreight: Math.round(totalGrossMarketFreight),
    totalMarketCommission: Math.round(totalMarketCommission),
    totalMarketAdvance: Math.round(totalMarketAdvance),
    totalNetMarketFreight: Math.round(totalNetMarketFreight),
    marketMargin: Math.round(marketMargin),
  };
}

/**
 * Formats currency values in Indian Rupees (₹)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats vehicle number to standard uppercase format (e.g., MH12AB1234 -> MH 12 AB 1234)
 */
export function formatVehicleNumber(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Generate a unique ID (safe for Firestore path validation: ^[a-zA-Z0-9_\-]+$)
 */
export function generateSafeId(prefix = 'dsp'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}
