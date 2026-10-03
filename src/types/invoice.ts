export type InvoiceType = 'Tax Invoice' | 'Freight Bill' | 'GTA Consignment Note' | 'Transporter Settlement Bill';

export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';

export type TaxType = 'IGST' | 'CGST_SGST' | 'NONE';

export type PaymentMode = 'Bank Transfer / NEFT / RTGS' | 'Cheque' | 'Cash' | 'UPI';

export interface InvoicePartyInfo {
  partyName: string;
  gstin?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  stateCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface BillerCompanyInfo {
  companyName: string;
  tagline?: string;
  gstin?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  accountHolderName?: string;
  upiId?: string;
}

export interface InvoiceLineItem {
  id: string;
  dispatchId?: string;
  lrNumber: string;
  lrDate?: string;
  vehicleNumber: string;
  origin: string;
  destination: string;
  commodity: string;
  weight: number;
  weightUnit: string;
  rate: number;
  rateType: string;
  freightAmount: number;
  loadingCharges?: number;
  unloadingCharges?: number;
  detentionCharges?: number;
  otherCharges?: number;
  advanceDeduction?: number;
  netLineTotal: number;
  sacCode?: string; // 996511 for Goods Transport
}

export interface InvoicePaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string; // Cheque No / UTR / Transaction ID
  notes?: string;
  recordedAt: string;
}

export interface FreightInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV/2026-27/001
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  invoiceType: InvoiceType;
  
  // Billed To (Customer / Party)
  billedTo: InvoicePartyInfo;

  // Consignee / Ship To (Optional if different from Billed To)
  shipTo?: InvoicePartyInfo;

  // Billed By (Issuer / Logistics Agency)
  billedBy: BillerCompanyInfo;

  // Service Classification
  sacCode: string; // Default: '996511'
  serviceDescription: string;

  // Consignment / LR Items
  items: InvoiceLineItem[];

  // Financial Computations
  totalWeight: number; // in MT
  subTotalFreight: number;
  totalExtraCharges: number; // loading, unloading, detention, toll, etc.
  totalAdvancePaid: number; // Advance paid by client
  taxableAmount: number; // subTotalFreight + extra - advance (or gross)

  // GST & Tax Configuration
  gstRate: number; // 0, 5, 12, 18
  isRcm: boolean; // Reverse Charge Mechanism (GTA 5% RCM or 12% Forward)
  taxType: TaxType; // IGST (Inter-state) or CGST_SGST (Intra-state)
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;

  // TDS / Withholding Preview
  tdsRate?: number; // e.g. 1% or 2%
  tdsAmount?: number;

  // Grand Total & Rounding
  roundOff: number;
  grandTotal: number; // Final payable
  amountInWords: string;

  // Payment Tracking
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number;
  payments: InvoicePaymentRecord[];

  // Terms, Declarations & Notes
  notes?: string;
  termsAndConditions?: string;
  preparedBy?: string;
  authorizedSignatoryName?: string;

  createdAt: string;
  updatedAt: string;
}
