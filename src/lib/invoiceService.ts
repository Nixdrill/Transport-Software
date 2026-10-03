import { 
  FreightInvoice, 
  InvoiceLineItem, 
  BillerCompanyInfo, 
  InvoicePartyInfo, 
  InvoiceType, 
  TaxType,
  PaymentStatus 
} from '../types/invoice';
import { DispatchRecord } from '../types/dispatch';
import { PartyMaster, AllMasters } from '../types/masters';
import { getMasters, findPartyMaster } from './mastersService';
import { generateSafeId } from './calculations';

export const INVOICES_STORAGE_KEY = 'logitrack_invoices_v1';
export const BILLER_PROFILE_STORAGE_KEY = 'logitrack_biller_profile_v1';

export const DEFAULT_BILLER_PROFILE: BillerCompanyInfo = {
  companyName: 'LogiTrack Freight Solutions & Logistics Pvt. Ltd.',
  tagline: 'Premier Surface Transport & Pan-India Fleet Logistics',
  gstin: '27AAACL8890M1Z4',
  panNumber: 'AAACL8890M',
  address: 'Plot 45, Transport Nagar, Phase-2, Industrial Area, Nigdi',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411044',
  phone: '+91 98220 44550 / +91 020 27448899',
  email: 'billing@logitrackfreight.in',
  website: 'www.logitrackfreight.in',
  bankName: 'HDFC Bank Ltd.',
  bankAccountNumber: '50200088991234',
  bankIfsc: 'HDFC0001234',
  bankBranch: 'Nigdi Pradhikaran Branch, Pune',
  accountHolderName: 'LogiTrack Freight Solutions Pvt Ltd',
  upiId: 'logitrack@hdfcbank',
};

// Indian States & GST State Code mapping
export const INDIAN_STATE_CODES: Record<string, string> = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'ANDHRA PRADESH (NEW)': '37',
  'LADAKH': '38',
};

export function getStateCode(stateName?: string, gstin?: string): string {
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().slice(0, 2);
    if (!isNaN(Number(code))) return code;
  }
  if (!stateName) return '27';
  const clean = stateName.trim().toUpperCase();
  return INDIAN_STATE_CODES[clean] || '27';
}

/**
 * Converts numbers to Indian English Words (Rupees and Paise)
 * e.g., 148500 -> "Rupees One Lakh Forty-Eight Thousand Five Hundred Only"
 */
export function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Rupees Zero Only';
  if (!num || isNaN(num)) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return a[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return b[tens] + (ones ? ' ' + a[ones] : '');
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += a[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  };

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let str = '';
  const crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundreds = remainder;

  if (crore > 0) {
    str += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    str += convertThreeDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    str += convertThreeDigits(thousand) + ' Thousand ';
  }
  if (hundreds > 0) {
    str += convertThreeDigits(hundreds) + ' ';
  }

  str = str.trim();
  let result = (isNegative ? 'Minus ' : '') + (str ? 'Rupees ' + str : 'Rupees Zero');

  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  result += ' Only';
  return result;
}

// ================= STORAGE API =================

export function getBillerProfile(): BillerCompanyInfo {
  try {
    const raw = localStorage.getItem(BILLER_PROFILE_STORAGE_KEY);
    if (!raw) {
      saveBillerProfile(DEFAULT_BILLER_PROFILE);
      return DEFAULT_BILLER_PROFILE;
    }
    return { ...DEFAULT_BILLER_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BILLER_PROFILE;
  }
}

export function saveBillerProfile(profile: BillerCompanyInfo): void {
  try {
    localStorage.setItem(BILLER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save biller profile:', e);
  }
}

export function getInvoices(): FreightInvoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) {
      const samples = getSampleInvoices();
      saveInvoices(samples);
      return samples;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse invoices from storage:', e);
    return [];
  }
}

export function saveInvoices(invoices: FreightInvoice[]): void {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices to storage:', e);
  }
}

export function saveInvoice(invoice: FreightInvoice): FreightInvoice {
  const all = getInvoices();
  const index = all.findIndex((inv) => inv.id === invoice.id);
  const updated: FreightInvoice = {
    ...invoice,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    all[index] = updated;
  } else {
    all.unshift(updated);
  }

  saveInvoices(all);
  return updated;
}

export function deleteInvoice(id: string): void {
  const all = getInvoices();
  const filtered = all.filter((inv) => inv.id !== id);
  saveInvoices(filtered);
}

// ================= INVOICE NUMBER GENERATOR =================

export function generateNextInvoiceNumber(existingInvoices?: FreightInvoice[]): string {
  const invoices = existingInvoices || getInvoices();
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYearShort = String((currentYear + 1) % 100).padStart(2, '0');
  const finYear = `${currentYear}-${nextYearShort}`;

  // Find max sequence for current financial year
  let maxSeq = 0;
  const prefix = `INV/${finYear}/`;

  for (const inv of invoices) {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
      const parts = inv.invoiceNumber.split('/');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

// ================= TAX & TOTALS CALCULATIONS =================

export interface CalculationInput {
  items: InvoiceLineItem[];
  gstRate: number; // 0, 5, 12, 18
  isRcm: boolean;
  billerState: string;
  clientState: string;
  tdsRate?: number;
  totalExtraCharges?: number;
  totalAdvancePaid?: number;
}

export interface CalculationResult {
  totalWeight: number;
  subTotalFreight: number;
  totalExtraCharges: number;
  totalAdvancePaid: number;
  taxableAmount: number;
  taxType: TaxType;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  tdsAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export function calculateInvoiceTotals(input: CalculationInput): CalculationResult {
  const {
    items,
    gstRate,
    isRcm,
    billerState,
    clientState,
    tdsRate = 0,
    totalExtraCharges = 0,
    totalAdvancePaid = 0,
  } = input;

  const totalWeight = items.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
  const subTotalFreight = items.reduce((acc, item) => acc + (Number(item.freightAmount) || 0), 0);
  
  // Extra charges from items if not provided at invoice level
  const itemsExtra = items.reduce(
    (acc, item) =>
      acc +
      (Number(item.loadingCharges) || 0) +
      (Number(item.unloadingCharges) || 0) +
      (Number(item.detentionCharges) || 0) +
      (Number(item.otherCharges) || 0),
    0
  );
  
  const finalExtraCharges = totalExtraCharges > 0 ? totalExtraCharges : itemsExtra;
  
  // Advance paid
  const itemsAdvance = items.reduce((acc, item) => acc + (Number(item.advanceDeduction) || 0), 0);
  const finalAdvance = totalAdvancePaid > 0 ? totalAdvancePaid : itemsAdvance;

  const taxableAmount = Math.max(0, subTotalFreight + finalExtraCharges);

  // Determine Tax Type (Inter-State = IGST, Intra-State = CGST+SGST)
  const isSameState =
    billerState &&
    clientState &&
    billerState.trim().toLowerCase() === clientState.trim().toLowerCase();

  let taxType: TaxType = 'NONE';
  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;
  let totalTax = 0;

  if (gstRate > 0 && !isRcm) {
    if (isSameState) {
      taxType = 'CGST_SGST';
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      cgstAmount = Math.round((taxableAmount * cgstRate) / 100);
      sgstAmount = Math.round((taxableAmount * sgstRate) / 100);
      totalTax = cgstAmount + sgstAmount;
    } else {
      taxType = 'IGST';
      igstRate = gstRate;
      igstAmount = Math.round((taxableAmount * igstRate) / 100);
      totalTax = igstAmount;
    }
  } else if (isRcm) {
    // Under RCM, recipient pays tax directly to Govt; invoice total doesn't add tax to payable amount
    taxType = isSameState ? 'CGST_SGST' : 'IGST';
    totalTax = 0;
  }

  // TDS Deduction
  const tdsAmount = tdsRate > 0 ? Math.round((taxableAmount * tdsRate) / 100) : 0;

  // Raw Payable before advance and roundoff
  const rawGrandTotal = taxableAmount + totalTax - finalAdvance;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
  const grandTotal = Math.max(0, roundedGrandTotal);
  const amountInWords = numberToWordsIndian(grandTotal);

  return {
    totalWeight: Number(totalWeight.toFixed(3)),
    subTotalFreight,
    totalExtraCharges: finalExtraCharges,
    totalAdvancePaid: finalAdvance,
    taxableAmount,
    taxType,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    tdsAmount,
    roundOff,
    grandTotal,
    amountInWords,
  };
}

// ================= INVOICE GENERATOR FACTORIES =================

/**
 * Creates a formal Freight Invoice from a single Dispatch Record
 */
export function createInvoiceFromDispatch(
  dispatch: DispatchRecord,
  options?: {
    invoiceType?: InvoiceType;
    gstRate?: number;
    isRcm?: boolean;
    dueDateDays?: number;
    notes?: string;
  }
): FreightInvoice {
  const biller = getBillerProfile();
  const partyMaster = findPartyMaster(dispatch.fromParty) || findPartyMaster(dispatch.toParty);

  // Line items from nested LRs or default line
  const lineItems: InvoiceLineItem[] = (dispatch.lrs && dispatch.lrs.length > 0)
    ? dispatch.lrs.map((lr, idx) => ({
        id: lr.id || generateSafeId('item'),
        dispatchId: dispatch.id,
        lrNumber: lr.lrNumber || `LR-${idx + 1}`,
        lrDate: lr.lrDate || dispatch.date,
        vehicleNumber: dispatch.vehicleNumber,
        origin: lr.consignorCity || dispatch.fromParty,
        destination: lr.consigneeCity || dispatch.toParty,
        commodity: lr.remarks || 'Industrial Cargo / Freight Transport',
        weight: Number(lr.weight) || 0,
        weightUnit: lr.weightUnit || 'MT',
        rate: Number(lr.rate) || 0,
        rateType: lr.rateType || 'per_mt',
        freightAmount: Number(lr.freightAmount) || 0,
        loadingCharges: 0,
        unloadingCharges: 0,
        detentionCharges: 0,
        otherCharges: Number(lr.extraCharges) || 0,
        advanceDeduction: Number(lr.advanceAmount) || 0,
        netLineTotal: Number(lr.freightAmount) + (Number(lr.extraCharges) || 0) - (Number(lr.advanceAmount) || 0),
        sacCode: '996511',
      }))
    : [
        {
          id: generateSafeId('item'),
          dispatchId: dispatch.id,
          lrNumber: dispatch.lrNumbers?.[0] || 'LR-001',
          lrDate: dispatch.date,
          vehicleNumber: dispatch.vehicleNumber,
          origin: dispatch.fromParty,
          destination: dispatch.toParty,
          commodity: 'Industrial Cargo Transport',
          weight: dispatch.totalWeight || 0,
          weightUnit: 'MT',
          rate: Math.round((dispatch.totalFreightAmount || 0) / (dispatch.totalWeight || 1)),
          rateType: 'per_mt',
          freightAmount: dispatch.totalFreightAmount || 0,
          otherCharges: dispatch.totalExtraCharges || 0,
          advanceDeduction: dispatch.totalAdvance || 0,
          netLineTotal: dispatch.netPayable || dispatch.totalFreightAmount,
          sacCode: '996511',
        },
      ];

  const clientPartyName = dispatch.fromParty || partyMaster?.name || 'Valued Client';
  const clientState = partyMaster?.state || 'Maharashtra';
  const clientGstin = partyMaster?.gstin || '';
  const clientPan = partyMaster?.panNumber || '';
  const clientAddress = partyMaster?.address || `${partyMaster?.city || 'Industrial Zone'}, ${clientState}`;

  const invoiceDate = new Date().toISOString().split('T')[0];
  const dueDateDays = options?.dueDateDays || 30;
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + dueDateDays);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const gstRate = options?.gstRate ?? 5; // Standard 5% for GTA
  const isRcm = options?.isRcm ?? true; // Default RCM for GTA in India

  const totals = calculateInvoiceTotals({
    items: lineItems,
    gstRate,
    isRcm,
    billerState: biller.state || 'Maharashtra',
    clientState,
    totalExtraCharges: dispatch.totalExtraCharges || 0,
    totalAdvancePaid: dispatch.totalAdvance || 0,
  });

  const invoiceNumber = generateNextInvoiceNumber();

  return {
    id: generateSafeId('inv'),
    invoiceNumber,
    invoiceDate,
    dueDate,
    invoiceType: options?.invoiceType || 'Tax Invoice',
    billedTo: {
      partyName: clientPartyName,
      gstin: clientGstin,
      panNumber: clientPan,
      address: clientAddress,
      city: partyMaster?.city || '',
      state: clientState,
      pincode: partyMaster?.pincode || '',
      stateCode: getStateCode(clientState, clientGstin),
      phone: partyMaster?.phone || '',
      email: partyMaster?.email || '',
      contactPerson: partyMaster?.contactPerson || '',
    },
    shipTo: {
      partyName: dispatch.toParty || clientPartyName,
      city: dispatch.toParty,
      state: clientState,
      stateCode: getStateCode(clientState),
    },
    billedBy: biller,
    sacCode: '996511',
    serviceDescription: 'Goods Transport Agency (GTA) Road Freight & Consignment Services',
    items: lineItems,
    totalWeight: totals.totalWeight,
    subTotalFreight: totals.subTotalFreight,
    totalExtraCharges: totals.totalExtraCharges,
    totalAdvancePaid: totals.totalAdvancePaid,
    taxableAmount: totals.taxableAmount,
    gstRate,
    isRcm,
    taxType: totals.taxType,
    cgstRate: totals.cgstRate,
    cgstAmount: totals.cgstAmount,
    sgstRate: totals.sgstRate,
    sgstAmount: totals.sgstAmount,
    igstRate: totals.igstRate,
    igstAmount: totals.igstAmount,
    totalTax: totals.totalTax,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,
    amountInWords: totals.amountInWords,
    paymentStatus: 'Unpaid',
    amountPaid: 0,
    balanceDue: totals.grandTotal,
    payments: [],
    notes: options?.notes || `Freight invoice for vehicle ${dispatch.vehicleNumber} dispatched on ${dispatch.date}.`,
    termsAndConditions: '1. Payment due within specified terms.\n2. In case of delayed payment, interest @18% p.a. will be levied.\n3. Goods transported at Owner\'s risk under standard GTA consignment guidelines.\n4. Subject to Pune jurisdiction.',
    preparedBy: 'Dispatcher',
    authorizedSignatoryName: 'For LogiTrack Freight Solutions Pvt Ltd',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a Consolidated Multi-Trip / Periodical Freight Invoice for a Party
 */
export function createConsolidatedInvoice(
  partyName: string,
  selectedDispatches: DispatchRecord[],
  options?: {
    invoiceType?: InvoiceType;
    gstRate?: number;
    isRcm?: boolean;
    dueDateDays?: number;
    billingPeriod?: string;
  }
): FreightInvoice {
  const biller = getBillerProfile();
  const partyMaster = findPartyMaster(partyName);

  const lineItems: InvoiceLineItem[] = [];
  let totalAdvance = 0;
  let totalExtra = 0;

  for (const dsp of selectedDispatches) {
    totalAdvance += Number(dsp.totalAdvance) || 0;
    totalExtra += Number(dsp.totalExtraCharges) || 0;

    if (dsp.lrs && dsp.lrs.length > 0) {
      for (const lr of dsp.lrs) {
        lineItems.push({
          id: lr.id || generateSafeId('item'),
          dispatchId: dsp.id,
          lrNumber: lr.lrNumber || `LR-${lineItems.length + 1}`,
          lrDate: lr.lrDate || dsp.date,
          vehicleNumber: dsp.vehicleNumber,
          origin: lr.consignorCity || dsp.fromParty,
          destination: lr.consigneeCity || dsp.toParty,
          commodity: lr.remarks || 'Industrial Cargo Freight',
          weight: Number(lr.weight) || 0,
          weightUnit: lr.weightUnit || 'MT',
          rate: Number(lr.rate) || 0,
          rateType: lr.rateType || 'per_mt',
          freightAmount: Number(lr.freightAmount) || 0,
          otherCharges: Number(lr.extraCharges) || 0,
          advanceDeduction: Number(lr.advanceAmount) || 0,
          netLineTotal: Number(lr.freightAmount) + (Number(lr.extraCharges) || 0) - (Number(lr.advanceAmount) || 0),
          sacCode: '996511',
        });
      }
    } else {
      lineItems.push({
        id: generateSafeId('item'),
        dispatchId: dsp.id,
        lrNumber: dsp.lrNumbers?.[0] || `TRIP-${dsp.id.slice(0, 6)}`,
        lrDate: dsp.date,
        vehicleNumber: dsp.vehicleNumber,
        origin: dsp.fromParty,
        destination: dsp.toParty,
        commodity: 'Goods Transport Service',
        weight: dsp.totalWeight || 0,
        weightUnit: 'MT',
        rate: Math.round((dsp.totalFreightAmount || 0) / (dsp.totalWeight || 1)),
        rateType: 'per_mt',
        freightAmount: dsp.totalFreightAmount || 0,
        otherCharges: dsp.totalExtraCharges || 0,
        advanceDeduction: dsp.totalAdvance || 0,
        netLineTotal: dsp.netPayable || dsp.totalFreightAmount,
        sacCode: '996511',
      });
    }
  }

  const clientState = partyMaster?.state || 'Maharashtra';
  const clientGstin = partyMaster?.gstin || '';
  const clientPan = partyMaster?.panNumber || '';
  const clientAddress = partyMaster?.address || `${partyMaster?.city || 'Industrial Area'}, ${clientState}`;

  const invoiceDate = new Date().toISOString().split('T')[0];
  const dueDateDays = options?.dueDateDays || 30;
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + dueDateDays);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const gstRate = options?.gstRate ?? 5;
  const isRcm = options?.isRcm ?? true;

  const totals = calculateInvoiceTotals({
    items: lineItems,
    gstRate,
    isRcm,
    billerState: biller.state || 'Maharashtra',
    clientState,
    totalExtraCharges: totalExtra,
    totalAdvancePaid: totalAdvance,
  });

  const invoiceNumber = generateNextInvoiceNumber();

  return {
    id: generateSafeId('inv'),
    invoiceNumber,
    invoiceDate,
    dueDate,
    invoiceType: options?.invoiceType || 'Tax Invoice',
    billedTo: {
      partyName,
      gstin: clientGstin,
      panNumber: clientPan,
      address: clientAddress,
      city: partyMaster?.city || '',
      state: clientState,
      pincode: partyMaster?.pincode || '',
      stateCode: getStateCode(clientState, clientGstin),
      phone: partyMaster?.phone || '',
      email: partyMaster?.email || '',
      contactPerson: partyMaster?.contactPerson || '',
    },
    billedBy: biller,
    sacCode: '996511',
    serviceDescription: 'Consolidated Periodical Road Freight & Transportation Bill',
    items: lineItems,
    totalWeight: totals.totalWeight,
    subTotalFreight: totals.subTotalFreight,
    totalExtraCharges: totals.totalExtraCharges,
    totalAdvancePaid: totals.totalAdvancePaid,
    taxableAmount: totals.taxableAmount,
    gstRate,
    isRcm,
    taxType: totals.taxType,
    cgstRate: totals.cgstRate,
    cgstAmount: totals.cgstAmount,
    sgstRate: totals.sgstRate,
    sgstAmount: totals.sgstAmount,
    igstRate: totals.igstRate,
    igstAmount: totals.igstAmount,
    totalTax: totals.totalTax,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,
    amountInWords: totals.amountInWords,
    paymentStatus: 'Unpaid',
    amountPaid: 0,
    balanceDue: totals.grandTotal,
    payments: [],
    notes: `Consolidated freight bill for ${selectedDispatches.length} trip(s) / ${lineItems.length} LR(s). ${options?.billingPeriod ? `Billing Period: ${options.billingPeriod}` : ''}`,
    termsAndConditions: '1. Payment due within specified terms.\n2. Delayed payments attract interest @18% p.a.\n3. Transport governed under GTA carriage conditions.\n4. Subject to Pune jurisdiction.',
    preparedBy: 'Billing Department',
    authorizedSignatoryName: 'For LogiTrack Freight Solutions Pvt Ltd',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ================= SAMPLE INVOICES DATASET =================

export function getSampleInvoices(): FreightInvoice[] {
  const biller = DEFAULT_BILLER_PROFILE;

  const inv1: FreightInvoice = {
    id: 'inv-sample-1',
    invoiceNumber: 'INV/2026-27/001',
    invoiceDate: '2026-09-28',
    dueDate: '2026-10-28',
    invoiceType: 'Tax Invoice',
    billedTo: {
      partyName: 'Tata Steel Processing Ltd',
      gstin: '20AAACT2727Q1ZS',
      panNumber: 'AAACT2727Q',
      address: 'Plot No. 4B, Phase 1 Industrial Area, Adityapur Complex',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      pincode: '831001',
      stateCode: '20',
      contactPerson: 'Rajesh Sharma (Logistics GM)',
      phone: '+91 98321 00921',
      email: 'dispatch@tatasteel.com',
    },
    billedBy: biller,
    sacCode: '996511',
    serviceDescription: 'Goods Transport Agency (GTA) Surface Road Freight Services',
    items: [
      {
        id: 'item-101',
        lrNumber: 'LR-2026-0901',
        lrDate: '2026-09-25',
        vehicleNumber: 'MH 12 RN 4589',
        origin: 'Jamshedpur',
        destination: 'Pune',
        commodity: 'HR Steel Coils (High Tensile)',
        weight: 25.0,
        weightUnit: 'MT',
        rate: 2600,
        rateType: 'per_mt',
        freightAmount: 65000,
        otherCharges: 1000,
        advanceDeduction: 15000,
        netLineTotal: 51000,
        sacCode: '996511',
      },
      {
        id: 'item-102',
        lrNumber: 'LR-2026-0902',
        lrDate: '2026-09-26',
        vehicleNumber: 'DL 01 AB 8844',
        origin: 'Jamshedpur',
        destination: 'Mumbai',
        commodity: 'TMT 550D Rebars Bundle',
        weight: 16.0,
        weightUnit: 'MT',
        rate: 2400,
        rateType: 'per_mt',
        freightAmount: 38400,
        otherCharges: 500,
        advanceDeduction: 10000,
        netLineTotal: 28900,
        sacCode: '996511',
      },
    ],
    totalWeight: 41.0,
    subTotalFreight: 103400,
    totalExtraCharges: 1500,
    totalAdvancePaid: 25000,
    taxableAmount: 104900,
    gstRate: 5,
    isRcm: true,
    taxType: 'IGST',
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 5,
    igstAmount: 0, // In RCM, payable is 0 on bill
    totalTax: 0,
    roundOff: 0,
    grandTotal: 79900,
    amountInWords: 'Rupees Seventy-Nine Thousand Nine Hundred Only',
    paymentStatus: 'Paid',
    amountPaid: 79900,
    balanceDue: 0,
    payments: [
      {
        id: 'pmt-1',
        amount: 79900,
        paymentDate: '2026-10-01',
        paymentMode: 'Bank Transfer / NEFT / RTGS',
        referenceNumber: 'NEFT-HDFC-99482103',
        notes: 'Full balance settled by Tata Accounts',
        recordedAt: '2026-10-01T14:30:00.000Z',
      },
    ],
    notes: 'Consolidated dispatch invoice for Jamshedpur steel dispatches.',
    termsAndConditions: '1. Tax payable under Reverse Charge Mechanism (RCM) by GST registered recipient.\n2. Goods transported under Carriage by Road Act.\n3. Subject to Pune jurisdiction.',
    preparedBy: 'Dispatcher',
    authorizedSignatoryName: 'For LogiTrack Freight Solutions Pvt Ltd',
    createdAt: '2026-09-28T10:00:00.000Z',
    updatedAt: '2026-10-01T14:30:00.000Z',
  };

  const inv2: FreightInvoice = {
    id: 'inv-sample-2',
    invoiceNumber: 'INV/2026-27/002',
    invoiceDate: '2026-10-01',
    dueDate: '2026-10-31',
    invoiceType: 'Freight Bill',
    billedTo: {
      partyName: 'UltraTech Cement Works',
      gstin: '24AAACU7890N1Z2',
      panNumber: 'AAACU7890N',
      address: 'Bulk Cement Logistics Terminal, NH-48 Corridor',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382110',
      stateCode: '24',
      contactPerson: 'Anand Mehta',
      phone: '+91 98790 55123',
      email: 'logistics@ultratech.adityabirla.com',
    },
    billedBy: biller,
    sacCode: '996511',
    serviceDescription: 'Bulk Cement Highway Logistics & Multi-Axle Transportation',
    items: [
      {
        id: 'item-201',
        lrNumber: 'LR-2026-0915',
        lrDate: '2026-09-30',
        vehicleNumber: 'GJ 06 TT 9021',
        origin: 'Ahmedabad',
        destination: 'Mumbai',
        commodity: 'Portland Cement (50kg HDPE Bags)',
        weight: 18.5,
        weightUnit: 'MT',
        rate: 1850,
        rateType: 'per_mt',
        freightAmount: 34225,
        otherCharges: 750,
        advanceDeduction: 10000,
        netLineTotal: 24975,
        sacCode: '996511',
      },
    ],
    totalWeight: 18.5,
    subTotalFreight: 34225,
    totalExtraCharges: 750,
    totalAdvancePaid: 10000,
    taxableAmount: 34975,
    gstRate: 12,
    isRcm: false, // Forward charge 12%
    taxType: 'IGST',
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 12,
    igstAmount: 4197,
    totalTax: 4197,
    roundOff: 0.0,
    grandTotal: 29172,
    amountInWords: 'Rupees Twenty-Nine Thousand One Hundred Seventy-Two Only',
    paymentStatus: 'Unpaid',
    amountPaid: 0,
    balanceDue: 29172,
    payments: [],
    notes: 'Single-trip consignment bill for cement transit.',
    termsAndConditions: '1. GST @12% charged under forward charge mechanism with ITC eligibility.\n2. Payment terms 30 days net.\n3. Subject to Pune jurisdiction.',
    preparedBy: 'Finance Desk',
    authorizedSignatoryName: 'For LogiTrack Freight Solutions Pvt Ltd',
    createdAt: '2026-10-01T11:20:00.000Z',
    updatedAt: '2026-10-01T11:20:00.000Z',
  };

  return [inv1, inv2];
}

export interface InvoicesBackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  totalInvoices: number;
  totalTurnover: number;
  billerProfile?: BillerCompanyInfo;
  invoices: FreightInvoice[];
}

/**
 * Exports current invoices and biller profile as a structured backup object
 */
export function exportInvoicesBackupJSON(): InvoicesBackupPayload {
  const invoices = getInvoices();
  const billerProfile = getBillerProfile();
  const totalTurnover = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  return {
    app: 'LogiTrack Freight Invoicing Suite',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    totalInvoices: invoices.length,
    totalTurnover,
    billerProfile,
    invoices,
  };
}

/**
 * Restores invoices from a backup payload with 'overwrite' or 'merge' strategy
 */
export function restoreInvoicesFromBackupJSON(
  payload: any,
  mode: 'overwrite' | 'merge' = 'merge'
): { success: boolean; count: number; updatedInvoices: FreightInvoice[] } {
  const candidateInvoices: FreightInvoice[] = Array.isArray(payload?.invoices)
    ? payload.invoices
    : Array.isArray(payload)
    ? payload
    : [];

  if (!candidateInvoices || candidateInvoices.length === 0) {
    throw new Error('Backup file contains 0 valid invoice records.');
  }

  // Sanitize and validate records
  const validInvoices: FreightInvoice[] = candidateInvoices.filter(
    (inv) => inv && typeof inv.invoiceNumber === 'string' && inv.invoiceNumber.trim() !== ''
  );

  if (validInvoices.length === 0) {
    throw new Error('No valid invoice records found with valid Invoice Numbers.');
  }

  // Optional: Restore biller profile if present in payload
  if (payload.billerProfile && payload.billerProfile.companyName) {
    saveBillerProfile(payload.billerProfile);
  }

  let finalInvoices: FreightInvoice[] = [];

  if (mode === 'overwrite') {
    finalInvoices = validInvoices;
  } else {
    // Merge by invoiceNumber and ID
    const currentInvoices = getInvoices();
    const map = new Map<string, FreightInvoice>();

    // Put current invoices first
    for (const inv of currentInvoices) {
      const key = (inv.invoiceNumber || inv.id).toLowerCase().trim();
      map.set(key, inv);
    }

    // Merge incoming invoices (updating existing or appending new)
    for (const incoming of validInvoices) {
      const key = (incoming.invoiceNumber || incoming.id).toLowerCase().trim();
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, ...incoming, updatedAt: new Date().toISOString() });
      } else {
        map.set(key, incoming);
      }
    }

    finalInvoices = Array.from(map.values());
  }

  // Persist to storage
  saveInvoices(finalInvoices);

  return {
    success: true,
    count: finalInvoices.length,
    updatedInvoices: finalInvoices,
  };
}

