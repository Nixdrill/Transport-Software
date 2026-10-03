export type InvoiceType = 'Tax Invoice' | 'Freight Bill' | 'GTA Consignment Note' | 'Transporter Settlement Bill';

export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Adjusted / Reconciled' | 'Excess Paid';

export type TaxType = 'IGST' | 'CGST_SGST' | 'NONE';

export type PaymentMode = 
  | 'Bank Transfer / NEFT / RTGS' 
  | 'Cheque' 
  | 'Cash' 
  | 'UPI'
  | 'Settlement / Bill Reconciliation'
  | 'Credit Note / Adjustment';

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
  logoUrl?: string;
  cinNumber?: string;
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

export type PaymentTypeOption = 'Full' | 'Partial' | 'Settlement / Excess Adjustment';

export interface InvoicePaymentRecord {
  id: string;
  amount: number; // Gross amount credited towards this invoice
  bankReceivedAmount?: number; // Actual money received in bank / cash
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string; // Cheque No / UTR / Transaction ID
  tdsDeducted?: number; // TDS u/s 194C (1% or 2%)
  tdsSection?: string; // e.g. "194C (1%)" or "194C (2%)"
  deductionAmount?: number; // Shortage / damage / rebate / detention penalty
  deductionReason?: string;
  paymentType?: PaymentTypeOption;
  settledAgainstInvoiceId?: string; // Target invoice where excess was adjusted
  settledAgainstInvoiceNo?: string;
  sourceSettlementInvoiceId?: string; // Source invoice from which adjustment came
  sourceSettlementInvoiceNo?: string;
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

  // 100% Invoice Customization Settings
  customization?: InvoiceCustomization;

  createdAt: string;
  updatedAt: string;
}

export type InvoiceTemplateId = 
  | 'modern-clean' 
  | 'classic-corporate' 
  | 'compact-slip' 
  | 'executive-emerald' 
  | 'crimson-express' 
  | 'slate-dark' 
  | 'monochrome-print';

export type FontFamilyType = 'inter' | 'roboto-mono' | 'georgia' | 'system';
export type FontSizeScale = 'compact' | 'normal' | 'large';
export type TableDensity = 'tight' | 'comfortable' | 'spacious';
export type DateFormatType = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MMM-YYYY';
export type NumberFormatType = 'indian' | 'international';
export type LogoPositionType = 'left' | 'center' | 'right';
export type LogoSizeType = 'small' | 'medium' | 'large';

export interface CustomExtraCharge {
  id: string;
  name: string;
  amount: number;
  isDeduction?: boolean;
}

export interface InvoiceColumnConfig {
  visible: boolean;
  label: string;
}

export interface InvoiceCustomization {
  // Theme & Layout
  templateId: InvoiceTemplateId;
  primaryColor: string; // e.g. #0f172a
  accentColor: string; // e.g. #00E676
  fontFamily: FontFamilyType;
  fontSize: FontSizeScale;
  tableDensity: TableDensity;
  
  // Branding & Logo
  showLogo: boolean;
  logoUrl?: string;
  logoPosition: LogoPositionType;
  logoSize: LogoSizeType;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number; // 0.05 to 0.4

  // Document Headers & Context
  documentTitle: string; // e.g. 'TAX INVOICE'
  subTitle: string; // e.g. 'GOODS TRANSPORT AGENCY (GTA) ROAD FREIGHT'
  copyType: string; // 'Original for Recipient', 'Duplicate for Transporter', etc.
  customCopyLabel?: string;
  invoiceNumberLabel: string;
  invoiceDateLabel: string;
  dueDateLabel: string;
  
  // Transport Context Fields
  poNumber?: string;
  poDate?: string;
  eWayBillNumber?: string;
  vehicleType?: string;
  placeOfSupply?: string;
  sacDescription: string;

  // Issuer (Billed By) Block Options
  showBillerGstin: boolean;
  showBillerPan: boolean;
  showBillerCin: boolean;
  billerCin?: string;
  showBillerContact: boolean;
  showBillerBank: boolean;

  // Recipient (Billed To) Block Options
  showPartyGstin: boolean;
  showPartyPan: boolean;
  showPartyContact: boolean;
  showShipToAddress: boolean;
  shipTo?: InvoicePartyInfo;

  // Columns Configuration
  columns: {
    srNo: InvoiceColumnConfig;
    lrNo: InvoiceColumnConfig;
    lrDate: InvoiceColumnConfig;
    vehicleNo: InvoiceColumnConfig;
    route: InvoiceColumnConfig;
    commodity: InvoiceColumnConfig;
    weight: InvoiceColumnConfig;
    rate: InvoiceColumnConfig;
    freightAmount: InvoiceColumnConfig;
    extraCharges: InvoiceColumnConfig;
    advanceDeduction: InvoiceColumnConfig;
    netAmount: InvoiceColumnConfig;
  };

  // Additional Custom Charges / Deductions
  customCharges?: CustomExtraCharge[];

  // Tax, Currency & Number Formatting
  currencySymbol: string; // e.g. '₹'
  currencyCode: string; // 'INR'
  numberFormat: NumberFormatType;
  dateFormat: DateFormatType;
  showAmountInWords: boolean;
  amountInWordsPrefix: string;
  showRcmBanner: boolean;
  rcmNotificationText: string;
  showTaxBreakup: boolean;
  showTdsBreakup: boolean;
  showRoundOff: boolean;

  // Banking & Dynamic UPI QR Code
  showBankDetails: boolean;
  bankSectionTitle: string;
  showUpiQr: boolean;
  upiId?: string;
  upiPayeeName?: string;
  paymentInstructions?: string;

  // Terms, Declaration & Signatures
  showTerms: boolean;
  termsTitle: string;
  termsText: string;
  showDeclaration: boolean;
  declarationText: string;
  showSignatureLeft: boolean;
  signatureLeftTitle: string;
  signatureLeftName: string;
  showSignatureRight: boolean;
  signatureRightTitle: string;
  signatureRightCompany: string;
  signatureStampUrl?: string;
  footerNote?: string;
}
