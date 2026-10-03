import { FreightInvoice, InvoicePaymentRecord, PaymentMode } from '../types/invoice';
import { DispatchRecord } from '../types/dispatch';
import { getInvoices, saveInvoices, saveInvoice } from './invoiceService';
import { getLocalDispatches } from './syncManager';
import { generateSafeId } from './calculations';

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'TDS_CREDIT' | 'DEDUCTION' | 'SETTLEMENT_CREDIT' | 'SETTLEMENT_DEBIT' | 'ADVANCE';
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  description: string;
  referenceNumber?: string;
  paymentMode?: PaymentMode;
  lrNumbers?: string[];
  vehicleNumbers?: string[];
  debit: number;  // Increase in party receivable (e.g. Invoice raised)
  credit: number; // Decrease in party receivable (e.g. Payment received / TDS / Adjustment)
  runningBalance: number; // Net balance due from party
  status?: string;
  sourceInvoiceId?: string;
  rawInvoice?: FreightInvoice;
  rawPayment?: InvoicePaymentRecord;
}

export interface PartyLedgerSummary {
  partyName: string;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  totalDebits: number; // Total Invoiced
  totalCredits: number; // Total Payments + TDS + Deductions
  totalTdsDeducted: number;
  totalOtherDeductions: number;
  totalCashBankReceived: number;
  closingBalance: number; // Net outstanding balance (Positive = Receivable, Negative = Advance/Payable)
  totalInvoicesCount: number;
  unpaidInvoicesCount: number;
  entries: LedgerEntry[];
}

export interface TransporterLedgerTrip {
  id: string;
  dispatchId: string;
  date: string;
  vehicleNumber: string;
  route: string;
  lrNumbers: string[];
  commodity: string;
  weight: number;
  grossFreight: number;
  advancePaid: number;
  commission: number;
  otherDeductions: number;
  netFreightPayable: number;
  status: string;
}

export interface TransporterLedgerSummary {
  transporterName: string;
  totalTrips: number;
  totalWeight: number;
  totalGrossFreight: number;
  totalAdvancePaid: number;
  totalCommission: number;
  totalOtherDeductions: number;
  totalNetPayable: number;
  trips: TransporterLedgerTrip[];
}

export interface AgingBucket {
  range: '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
  amount: number;
  count: number;
  invoices: FreightInvoice[];
}

export interface PartyAgingSummary {
  partyName: string;
  totalOutstanding: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
  oldestInvoiceDate?: string;
}

export interface MisFinancialSummary {
  totalTurnover: number;
  totalCollected: number;
  totalTdsCollected: number;
  totalDeductions: number;
  totalOutstanding: number;
  collectionEfficiencyPercent: number;
  agingBuckets: {
    days0_30: AgingBucket;
    days31_60: AgingBucket;
    days61_90: AgingBucket;
    days90Plus: AgingBucket;
  };
  partyAgingList: PartyAgingSummary[];
  monthlyTrends: Array<{
    monthKey: string; // e.g. "2026-04"
    monthLabel: string; // "Apr 2026"
    billedAmount: number;
    collectedAmount: number;
    tdsAmount: number;
    invoicesCount: number;
  }>;
  partyTurnoverRanking: Array<{
    partyName: string;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    invoicesCount: number;
    totalWeight: number;
  }>;
  fleetPlacementMetrics: {
    ownTripsCount: number;
    ownTotalFreight: number;
    marketTripsCount: number;
    marketGrossFreight: number;
    marketNetFreightPayable: number;
    marketCommissionEarned: number;
    estimatedGrossMargin: number;
  };
}

/**
 * Generates itemized Party Ledger / Statement of Account with Running Balance
 */
export function getPartyLedger(
  partyName: string,
  options?: { startDate?: string; endDate?: string }
): PartyLedgerSummary {
  const allInvoices = getInvoices();
  const targetParty = partyName.trim().toLowerCase();

  // Filter invoices belonging to this party
  const partyInvoices = allInvoices.filter((inv) => {
    const pName = (inv.billedTo?.partyName || '').toLowerCase().trim();
    return pName === targetParty || pName.includes(targetParty) || targetParty.includes(pName);
  });

  // Sort chronologically by date
  partyInvoices.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

  let openingBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;
  let totalTds = 0;
  let totalDeductions = 0;
  let totalCashBank = 0;

  const rawTransactions: Array<{
    date: string;
    type: LedgerEntry['type'];
    voucherType: string;
    voucherNumber: string;
    description: string;
    referenceNumber?: string;
    paymentMode?: PaymentMode;
    lrNumbers?: string[];
    vehicleNumbers?: string[];
    debit: number;
    credit: number;
    status?: string;
    sourceInvoiceId?: string;
    rawInvoice?: FreightInvoice;
    rawPayment?: InvoicePaymentRecord;
  }> = [];

  // Flatten invoices and their individual payments/adjustments into chronological events
  for (const inv of partyInvoices) {
    // 1. Invoice Event (Debit)
    const lrs = inv.items.map((i) => i.lrNumber).filter(Boolean);
    const vehs = Array.from(new Set(inv.items.map((i) => i.vehicleNumber).filter(Boolean)));
    const originDest = inv.items.length > 0 
      ? `${inv.items[0].origin} ➔ ${inv.items[0].destination}` 
      : 'Freight Consignment';

    rawTransactions.push({
      date: inv.invoiceDate,
      type: 'INVOICE',
      voucherType: inv.invoiceType || 'Freight Bill',
      voucherNumber: inv.invoiceNumber,
      description: `Freight Bill raised for ${inv.items.length} LR(s) (${originDest})`,
      lrNumbers: lrs,
      vehicleNumbers: vehs,
      debit: inv.grandTotal || 0,
      credit: 0,
      status: inv.paymentStatus,
      sourceInvoiceId: inv.id,
      rawInvoice: inv,
    });

    // 2. Payments & Deductions Events (Credits)
    if (Array.isArray(inv.payments)) {
      for (const pmt of inv.payments) {
        // Direct bank/cash payment
        if (pmt.amount > 0) {
          const isSettlement = pmt.paymentMode === 'Settlement / Bill Reconciliation';
          rawTransactions.push({
            date: pmt.paymentDate,
            type: isSettlement ? 'SETTLEMENT_CREDIT' : 'PAYMENT',
            voucherType: isSettlement ? 'Bill Reconciliation' : 'Payment Receipt',
            voucherNumber: pmt.referenceNumber || `RCPT-${inv.invoiceNumber}`,
            description: isSettlement 
              ? `Reconciled / Settled from Bill #${pmt.sourceSettlementInvoiceNo || 'Excess'} (Ref: ${inv.invoiceNumber})`
              : `Payment received against ${inv.invoiceNumber} via ${pmt.paymentMode}${pmt.notes ? ` - ${pmt.notes}` : ''}`,
            referenceNumber: pmt.referenceNumber,
            paymentMode: pmt.paymentMode,
            debit: 0,
            credit: pmt.amount,
            status: 'Settled',
            sourceInvoiceId: inv.id,
            rawInvoice: inv,
            rawPayment: pmt,
          });
        }

        // TDS Deduction entry if applicable
        if (pmt.tdsDeducted && pmt.tdsDeducted > 0) {
          rawTransactions.push({
            date: pmt.paymentDate,
            type: 'TDS_CREDIT',
            voucherType: 'TDS Certificate / Debit Note',
            voucherNumber: `TDS-${inv.invoiceNumber}`,
            description: `TDS deducted u/s ${pmt.tdsSection || '194C'} on Bill #${inv.invoiceNumber}`,
            referenceNumber: pmt.referenceNumber,
            debit: 0,
            credit: pmt.tdsDeducted,
            status: 'TDS Credited',
            sourceInvoiceId: inv.id,
            rawInvoice: inv,
            rawPayment: pmt,
          });
        }

        // Freight Shortage / Detention / Penalty Deduction if applicable
        if (pmt.deductionAmount && pmt.deductionAmount > 0) {
          rawTransactions.push({
            date: pmt.paymentDate,
            type: 'DEDUCTION',
            voucherType: 'Debit Note / Rebate',
            voucherNumber: `DN-${inv.invoiceNumber}`,
            description: `Deduction on Bill #${inv.invoiceNumber}: ${pmt.deductionReason || 'Shortage / Penalty / Rebate'}`,
            referenceNumber: pmt.referenceNumber,
            debit: 0,
            credit: pmt.deductionAmount,
            status: 'Deduction Allowed',
            sourceInvoiceId: inv.id,
            rawInvoice: inv,
            rawPayment: pmt,
          });
        }
      }
    }
  }

  // Sort all raw transactions chronologically
  rawTransactions.sort((a, b) => {
    const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeDiff !== 0) return timeDiff;
    // Put invoices before payments if on the same date
    return a.type === 'INVOICE' ? -1 : 1;
  });

  const startDateObj = options?.startDate ? new Date(options.startDate).getTime() : null;
  const endDateObj = options?.endDate ? new Date(options.endDate + 'T23:59:59').getTime() : null;

  const entries: LedgerEntry[] = [];
  let currentRunningBalance = 0;

  for (const tx of rawTransactions) {
    const txTime = new Date(tx.date).getTime();

    // Check if before start date -> add to opening balance
    if (startDateObj && txTime < startDateObj) {
      openingBalance += (tx.debit - tx.credit);
      currentRunningBalance = openingBalance;
      continue;
    }

    // Check if after end date -> ignore
    if (endDateObj && txTime > endDateObj) {
      continue;
    }

    currentRunningBalance += (tx.debit - tx.credit);
    totalDebits += tx.debit;
    totalCredits += tx.credit;

    if (tx.type === 'PAYMENT' || tx.type === 'SETTLEMENT_CREDIT') {
      totalCashBank += tx.credit;
    } else if (tx.type === 'TDS_CREDIT') {
      totalTds += tx.credit;
    } else if (tx.type === 'DEDUCTION') {
      totalDeductions += tx.credit;
    }

    entries.push({
      id: generateSafeId('ldg'),
      date: tx.date,
      type: tx.type,
      voucherType: tx.voucherType,
      voucherNumber: tx.voucherNumber,
      partyName,
      description: tx.description,
      referenceNumber: tx.referenceNumber,
      paymentMode: tx.paymentMode,
      lrNumbers: tx.lrNumbers,
      vehicleNumbers: tx.vehicleNumbers,
      debit: tx.debit,
      credit: tx.credit,
      runningBalance: currentRunningBalance,
      status: tx.status,
      sourceInvoiceId: tx.sourceInvoiceId,
      rawInvoice: tx.rawInvoice,
      rawPayment: tx.rawPayment,
    });
  }

  const closingBalance = openingBalance + totalDebits - totalCredits;
  const unpaidInvoices = partyInvoices.filter(
    (inv) => inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partially Paid'
  );

  return {
    partyName,
    startDate: options?.startDate,
    endDate: options?.endDate,
    openingBalance,
    totalDebits,
    totalCredits,
    totalTdsDeducted: totalTds,
    totalOtherDeductions: totalDeductions,
    totalCashBankReceived: totalCashBank,
    closingBalance,
    totalInvoicesCount: partyInvoices.length,
    unpaidInvoicesCount: unpaidInvoices.length,
    entries,
  };
}

/**
 * Generates Transporter / Hired Fleet Ledger
 */
export function getTransporterLedger(
  transporterName: string,
  options?: { startDate?: string; endDate?: string }
): TransporterLedgerSummary {
  const dispatches = getLocalDispatches();
  const target = transporterName.trim().toLowerCase();

  const transporterDispatches = dispatches.filter((d) => {
    const tName = (d.transporterName || '').toLowerCase().trim();
    return tName === target || tName.includes(target) || target.includes(tName);
  });

  const trips: TransporterLedgerTrip[] = [];
  let totalGross = 0;
  let totalAdv = 0;
  let totalComm = 0;
  let totalDed = 0;
  let totalNet = 0;
  let totalWeight = 0;

  for (const d of transporterDispatches) {
    const dTime = new Date(d.date).getTime();
    if (options?.startDate && dTime < new Date(options.startDate).getTime()) continue;
    if (options?.endDate && dTime > new Date(options.endDate + 'T23:59:59').getTime()) continue;

    const gross = d.totalGrossMarketFreight || d.totalFreightAmount || 0;
    const adv = d.totalMarketAdvance || 0;
    const comm = d.totalMarketCommission || 0;
    const net = d.totalNetMarketFreight || Math.max(0, gross - adv - comm);
    const weight = d.totalWeight || 0;

    totalGross += gross;
    totalAdv += adv;
    totalComm += comm;
    totalNet += net;
    totalWeight += weight;

    trips.push({
      id: d.id,
      dispatchId: d.id,
      date: d.date,
      vehicleNumber: d.vehicleNumber,
      route: `${d.fromParty} ➔ ${d.toParty}`,
      lrNumbers: d.lrNumbers || [],
      commodity: d.lrs?.[0]?.remarks || 'Freight Goods',
      weight,
      grossFreight: gross,
      advancePaid: adv,
      commission: comm,
      otherDeductions: 0,
      netFreightPayable: net,
      status: d.status || 'Confirmed',
    });
  }

  // Sort by date descending
  trips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    transporterName,
    totalTrips: trips.length,
    totalWeight,
    totalGrossFreight: totalGross,
    totalAdvancePaid: totalAdv,
    totalCommission: totalComm,
    totalOtherDeductions: totalDed,
    totalNetPayable: totalNet,
    trips,
  };
}

/**
 * Calculates Full MIS & Financial Analytics Summary
 */
export function getMisFinancialSummary(options?: { startDate?: string; endDate?: string }): MisFinancialSummary {
  const invoices = getInvoices();
  const dispatches = getLocalDispatches();
  const now = new Date();

  let totalTurnover = 0;
  let totalCollected = 0;
  let totalTds = 0;
  let totalDeductions = 0;

  const aging0_30: FreightInvoice[] = [];
  const aging31_60: FreightInvoice[] = [];
  const aging61_90: FreightInvoice[] = [];
  const aging90Plus: FreightInvoice[] = [];

  const partyAgingMap = new Map<string, PartyAgingSummary>();
  const monthlyMap = new Map<string, { billed: number; collected: number; tds: number; count: number }>();
  const partyTurnoverMap = new Map<string, { billed: number; paid: number; count: number; weight: number }>();

  for (const inv of invoices) {
    const invDate = new Date(inv.invoiceDate);
    const invTime = invDate.getTime();

    if (options?.startDate && invTime < new Date(options.startDate).getTime()) continue;
    if (options?.endDate && invTime > new Date(options.endDate + 'T23:59:59').getTime()) continue;

    const grand = inv.grandTotal || 0;
    const paid = inv.amountPaid || 0;
    const outstanding = Math.max(0, grand - paid);
    const pName = inv.billedTo?.partyName?.trim() || 'Unknown Party';

    totalTurnover += grand;
    totalCollected += paid;

    // Payments detail analysis
    if (Array.isArray(inv.payments)) {
      for (const pmt of inv.payments) {
        if (pmt.tdsDeducted) totalTds += pmt.tdsDeducted;
        if (pmt.deductionAmount) totalDeductions += pmt.deductionAmount;
      }
    }

    // Aging Bucketing for Outstanding Invoices
    if (outstanding > 0 && inv.paymentStatus !== 'Paid') {
      const daysOld = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let bucketKey: 'b0_30' | 'b31_60' | 'b61_90' | 'b90+' = 'b0_30';
      if (daysOld <= 30) {
        aging0_30.push(inv);
        bucketKey = 'b0_30';
      } else if (daysOld <= 60) {
        aging31_60.push(inv);
        bucketKey = 'b31_60';
      } else if (daysOld <= 90) {
        aging61_90.push(inv);
        bucketKey = 'b61_90';
      } else {
        aging90Plus.push(inv);
        bucketKey = 'b90+';
      }

      if (!partyAgingMap.has(pName)) {
        partyAgingMap.set(pName, {
          partyName: pName,
          totalOutstanding: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucket90Plus: 0,
          oldestInvoiceDate: inv.invoiceDate,
        });
      }
      const pAging = partyAgingMap.get(pName)!;
      pAging.totalOutstanding += outstanding;
      if (bucketKey === 'b0_30') pAging.bucket0_30 += outstanding;
      else if (bucketKey === 'b31_60') pAging.bucket31_60 += outstanding;
      else if (bucketKey === 'b61_90') pAging.bucket61_90 += outstanding;
      else if (bucketKey === 'b90+') pAging.bucket90Plus += outstanding;

      if (!pAging.oldestInvoiceDate || new Date(inv.invoiceDate) < new Date(pAging.oldestInvoiceDate)) {
        pAging.oldestInvoiceDate = inv.invoiceDate;
      }
    }

    // Monthly Trend Map
    const monthKey = inv.invoiceDate.slice(0, 7); // "YYYY-MM"
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { billed: 0, collected: 0, tds: 0, count: 0 });
    }
    const mData = monthlyMap.get(monthKey)!;
    mData.billed += grand;
    mData.collected += paid;
    mData.count += 1;

    // Party Turnover Map
    if (!partyTurnoverMap.has(pName)) {
      partyTurnoverMap.set(pName, { billed: 0, paid: 0, count: 0, weight: 0 });
    }
    const pData = partyTurnoverMap.get(pName)!;
    pData.billed += grand;
    pData.paid += paid;
    pData.count += 1;
    pData.weight += (inv.totalWeight || 0);
  }

  const totalOutstanding = Math.max(0, totalTurnover - totalCollected);
  const collectionEfficiencyPercent = totalTurnover > 0 
    ? Math.min(100, Math.round((totalCollected / totalTurnover) * 100)) 
    : 0;

  // Monthly trends sorted chronologically
  const monthlyTrends = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [y, m] = key.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        monthKey: key,
        monthLabel,
        billedAmount: data.billed,
        collectedAmount: data.collected,
        tdsAmount: data.tds,
        invoicesCount: data.count,
      };
    });

  // Party Turnover Ranking sorted descending
  const partyTurnoverRanking = Array.from(partyTurnoverMap.entries())
    .map(([name, data]) => ({
      partyName: name,
      totalBilled: data.billed,
      totalPaid: data.paid,
      outstanding: Math.max(0, data.billed - data.paid),
      invoicesCount: data.count,
      totalWeight: data.weight,
    }))
    .sort((a, b) => b.totalBilled - a.totalBilled);

  // Fleet Placement Analytics
  let ownTrips = 0;
  let ownFreight = 0;
  let marketTrips = 0;
  let marketGross = 0;
  let marketNet = 0;
  let marketComm = 0;

  for (const d of dispatches) {
    if (d.placement === 'Own') {
      ownTrips += 1;
      ownFreight += (d.totalFreightAmount || 0);
    } else {
      marketTrips += 1;
      const gross = d.totalGrossMarketFreight || d.totalFreightAmount || 0;
      const adv = d.totalMarketAdvance || 0;
      const comm = d.totalMarketCommission || 0;
      marketGross += gross;
      marketComm += comm;
      marketNet += (d.totalNetMarketFreight || (gross - adv - comm));
    }
  }

  const estimatedGrossMargin = marketGross > 0 
    ? Math.round((marketComm / marketGross) * 100) 
    : 0;

  return {
    totalTurnover,
    totalCollected,
    totalTdsCollected: totalTds,
    totalDeductions,
    totalOutstanding,
    collectionEfficiencyPercent,
    agingBuckets: {
      days0_30: {
        range: '0-30 Days',
        amount: aging0_30.reduce((s, i) => s + (i.balanceDue || (i.grandTotal - i.amountPaid)), 0),
        count: aging0_30.length,
        invoices: aging0_30,
      },
      days31_60: {
        range: '31-60 Days',
        amount: aging31_60.reduce((s, i) => s + (i.balanceDue || (i.grandTotal - i.amountPaid)), 0),
        count: aging31_60.length,
        invoices: aging31_60,
      },
      days61_90: {
        range: '61-90 Days',
        amount: aging61_90.reduce((s, i) => s + (i.balanceDue || (i.grandTotal - i.amountPaid)), 0),
        count: aging61_90.length,
        invoices: aging61_90,
      },
      days90Plus: {
        range: '90+ Days',
        amount: aging90Plus.reduce((s, i) => s + (i.balanceDue || (i.grandTotal - i.amountPaid)), 0),
        count: aging90Plus.length,
        invoices: aging90Plus,
      },
    },
    partyAgingList: Array.from(partyAgingMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding),
    monthlyTrends,
    partyTurnoverRanking,
    fleetPlacementMetrics: {
      ownTripsCount: ownTrips,
      ownTotalFreight: ownFreight,
      marketTripsCount: marketTrips,
      marketGrossFreight: marketGross,
      marketNetFreightPayable: marketNet,
      marketCommissionEarned: marketComm,
      estimatedGrossMargin,
    },
  };
}

/**
 * Reconciles and settles a payment across one or multiple invoices.
 * Supports:
 * - Full payment
 * - Partial payment
 * - Settlement / adjustment of excess against next bill
 */
export function recordInvoicePaymentWithReconciliation(params: {
  invoiceId: string;
  paymentType: 'Full' | 'Partial' | 'Settlement / Excess Adjustment';
  bankReceivedAmount: number;
  tdsDeducted: number;
  tdsSection?: string;
  deductionAmount: number;
  deductionReason?: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber: string;
  notes?: string;
  // Next bills to settle with excess amount
  nextBillsSettlement?: Array<{
    invoiceId: string;
    allocatedAmount: number;
  }>;
}): {
  primaryInvoice: FreightInvoice;
  settledInvoices: FreightInvoice[];
  totalCreditApplied: number;
  excessCreditRemaining: number;
} {
  const allInvoices = getInvoices();
  const invoiceIndex = allInvoices.findIndex((inv) => inv.id === params.invoiceId);

  if (invoiceIndex === -1) {
    throw new Error(`Invoice with ID ${params.invoiceId} not found.`);
  }

  const invoice = { ...allInvoices[invoiceIndex] };
  const currentPaid = invoice.amountPaid || 0;
  const currentGrand = invoice.grandTotal || 0;
  const currentBalance = Math.max(0, currentGrand - currentPaid);

  // Total credit generated by this payment event
  const totalCredit = params.bankReceivedAmount + params.tdsDeducted + params.deductionAmount;

  // Credit applied directly to this primary invoice
  const creditToPrimary = Math.min(currentBalance, totalCredit);
  const excessCredit = Math.max(0, totalCredit - currentBalance);

  // Create primary invoice payment record
  const primaryPaymentRecord: InvoicePaymentRecord = {
    id: generateSafeId('pmt'),
    amount: creditToPrimary,
    bankReceivedAmount: params.bankReceivedAmount,
    paymentDate: params.paymentDate,
    paymentMode: params.paymentMode,
    referenceNumber: params.referenceNumber,
    tdsDeducted: params.tdsDeducted,
    tdsSection: params.tdsSection || '194C',
    deductionAmount: params.deductionAmount,
    deductionReason: params.deductionReason,
    paymentType: params.paymentType,
    notes: params.notes,
    recordedAt: new Date().toISOString(),
  };

  invoice.payments = [...(invoice.payments || []), primaryPaymentRecord];
  invoice.amountPaid = currentPaid + creditToPrimary;
  invoice.balanceDue = Math.max(0, currentGrand - invoice.amountPaid);
  
  if (invoice.balanceDue === 0) {
    invoice.paymentStatus = 'Paid';
  } else if (invoice.amountPaid > 0) {
    invoice.paymentStatus = 'Partially Paid';
  }

  invoice.updatedAt = new Date().toISOString();
  allInvoices[invoiceIndex] = invoice;

  const settledInvoices: FreightInvoice[] = [];
  let remainingExcess = excessCredit;

  // If excess credit exists and next bills settlement was specified
  if (params.nextBillsSettlement && params.nextBillsSettlement.length > 0) {
    for (const item of params.nextBillsSettlement) {
      if (item.allocatedAmount <= 0) continue;

      const nextInvIdx = allInvoices.findIndex((inv) => inv.id === item.invoiceId);
      if (nextInvIdx === -1) continue;

      const nextInv = { ...allInvoices[nextInvIdx] };
      const nextPaid = nextInv.amountPaid || 0;
      const nextGrand = nextInv.grandTotal || 0;
      const nextBal = Math.max(0, nextGrand - nextPaid);
      const applyAmt = Math.min(nextBal, item.allocatedAmount);

      const nextPmtRecord: InvoicePaymentRecord = {
        id: generateSafeId('pmt'),
        amount: applyAmt,
        bankReceivedAmount: 0,
        paymentDate: params.paymentDate,
        paymentMode: 'Settlement / Bill Reconciliation',
        referenceNumber: `REC-${invoice.invoiceNumber}`,
        paymentType: 'Settlement / Excess Adjustment',
        sourceSettlementInvoiceId: invoice.id,
        sourceSettlementInvoiceNo: invoice.invoiceNumber,
        notes: `Adjusted / Reconciled from excess on Bill #${invoice.invoiceNumber} (Ref: ${params.referenceNumber})`,
        recordedAt: new Date().toISOString(),
      };

      nextInv.payments = [...(nextInv.payments || []), nextPmtRecord];
      nextInv.amountPaid = nextPaid + applyAmt;
      nextInv.balanceDue = Math.max(0, nextGrand - nextInv.amountPaid);

      if (nextInv.balanceDue === 0) {
        nextInv.paymentStatus = 'Paid';
      } else if (nextInv.amountPaid > 0) {
        nextInv.paymentStatus = 'Partially Paid';
      }

      nextInv.updatedAt = new Date().toISOString();
      allInvoices[nextInvIdx] = nextInv;
      settledInvoices.push(nextInv);
      remainingExcess -= applyAmt;
    }
  }

  // Save all updated invoices
  saveInvoices(allInvoices);

  return {
    primaryInvoice: invoice,
    settledInvoices,
    totalCreditApplied: totalCredit,
    excessCreditRemaining: remainingExcess,
  };
}

/**
 * Allocates a lump-sum payment received from a party across multiple pending invoices (FIFO or Custom)
 */
export function allocateLumpSumPaymentAcrossPartyInvoices(params: {
  partyName: string;
  totalReceived: number;
  tdsDeducted?: number;
  deductionAmount?: number;
  deductionReason?: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber: string;
  notes?: string;
  customAllocations?: Array<{ invoiceId: string; amount: number }>;
}): {
  settledInvoices: FreightInvoice[];
  totalAllocated: number;
  unallocatedBalance: number;
} {
  const allInvoices = getInvoices();
  const targetParty = params.partyName.trim().toLowerCase();

  // Find all unpaid or partially paid invoices for this party
  const partyInvoices = allInvoices.filter((inv) => {
    const pName = (inv.billedTo?.partyName || '').toLowerCase().trim();
    const isParty = pName === targetParty || pName.includes(targetParty) || targetParty.includes(pName);
    const hasBalance = (inv.balanceDue || (inv.grandTotal - (inv.amountPaid || 0))) > 0;
    return isParty && hasBalance;
  });

  // Sort by invoiceDate ascending (FIFO)
  partyInvoices.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

  let totalPool = params.totalReceived + (params.tdsDeducted || 0) + (params.deductionAmount || 0);
  let totalAllocated = 0;
  const settledInvoices: FreightInvoice[] = [];

  if (params.customAllocations && params.customAllocations.length > 0) {
    // Custom allocation specified
    for (const alloc of params.customAllocations) {
      if (alloc.amount <= 0) continue;
      const invIndex = allInvoices.findIndex((i) => i.id === alloc.invoiceId);
      if (invIndex === -1) continue;

      const inv = { ...allInvoices[invIndex] };
      const currentPaid = inv.amountPaid || 0;
      const grandTotal = inv.grandTotal || 0;
      const bal = Math.max(0, grandTotal - currentPaid);
      const apply = Math.min(bal, alloc.amount);

      const pmtRecord: InvoicePaymentRecord = {
        id: generateSafeId('pmt'),
        amount: apply,
        bankReceivedAmount: apply,
        paymentDate: params.paymentDate,
        paymentMode: params.paymentMode,
        referenceNumber: params.referenceNumber,
        tdsDeducted: params.tdsDeducted,
        deductionAmount: params.deductionAmount,
        deductionReason: params.deductionReason,
        paymentType: apply >= bal ? 'Full' : 'Partial',
        notes: params.notes || `Lump-sum reconciliation allocation (Ref: ${params.referenceNumber})`,
        recordedAt: new Date().toISOString(),
      };

      inv.payments = [...(inv.payments || []), pmtRecord];
      inv.amountPaid = currentPaid + apply;
      inv.balanceDue = Math.max(0, grandTotal - inv.amountPaid);
      inv.paymentStatus = inv.balanceDue === 0 ? 'Paid' : 'Partially Paid';
      inv.updatedAt = new Date().toISOString();

      allInvoices[invIndex] = inv;
      settledInvoices.push(inv);
      totalAllocated += apply;
    }
  } else {
    // FIFO automatic allocation
    for (const inv of partyInvoices) {
      if (totalPool <= 0) break;

      const invIndex = allInvoices.findIndex((i) => i.id === inv.id);
      if (invIndex === -1) continue;

      const currentInv = { ...allInvoices[invIndex] };
      const currentPaid = currentInv.amountPaid || 0;
      const grandTotal = currentInv.grandTotal || 0;
      const bal = Math.max(0, grandTotal - currentPaid);
      const apply = Math.min(bal, totalPool);

      const pmtRecord: InvoicePaymentRecord = {
        id: generateSafeId('pmt'),
        amount: apply,
        bankReceivedAmount: apply,
        paymentDate: params.paymentDate,
        paymentMode: params.paymentMode,
        referenceNumber: params.referenceNumber,
        paymentType: apply >= bal ? 'Full' : 'Partial',
        notes: params.notes || `FIFO Auto-allocation from Lump Sum (Ref: ${params.referenceNumber})`,
        recordedAt: new Date().toISOString(),
      };

      currentInv.payments = [...(currentInv.payments || []), pmtRecord];
      currentInv.amountPaid = currentPaid + apply;
      currentInv.balanceDue = Math.max(0, grandTotal - currentInv.amountPaid);
      currentInv.paymentStatus = currentInv.balanceDue === 0 ? 'Paid' : 'Partially Paid';
      currentInv.updatedAt = new Date().toISOString();

      allInvoices[invIndex] = currentInv;
      settledInvoices.push(currentInv);
      totalAllocated += apply;
      totalPool -= apply;
    }
  }

  saveInvoices(allInvoices);

  return {
    settledInvoices,
    totalAllocated,
    unallocatedBalance: Math.max(0, totalPool),
  };
}

