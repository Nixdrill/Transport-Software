import { InvoiceCustomization, InvoiceTemplateId } from '../types/invoice';

export const INVOICE_CUSTOMIZATION_STORAGE_KEY = 'logitrack_invoice_customization_v1';

export interface TemplatePresetMeta {
  id: InvoiceTemplateId;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: 'inter' | 'roboto-mono' | 'georgia' | 'system';
  previewBadge: string;
}

export const TEMPLATE_PRESETS: TemplatePresetMeta[] = [
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Sleek contemporary design with emerald accents, clean borders and clear hierarchy.',
    primaryColor: '#0f172a',
    accentColor: '#00E676',
    fontFamily: 'inter',
    previewBadge: 'Popular',
  },
  {
    id: 'classic-corporate',
    name: 'Classic Corporate',
    description: 'Formal navy header band with structured grid, ideal for enterprise logistics clients.',
    primaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    fontFamily: 'inter',
    previewBadge: 'Enterprise',
  },
  {
    id: 'compact-slip',
    name: 'Compact Transport Voucher',
    description: 'Dense, space-optimized layout perfect for multi-trip billing and quick transport receipts.',
    primaryColor: '#334155',
    accentColor: '#0284c7',
    fontFamily: 'system',
    previewBadge: 'High Density',
  },
  {
    id: 'executive-emerald',
    name: 'Executive Emerald',
    description: 'Prestigious deep green accents with subtle card panels and executive typography.',
    primaryColor: '#064e3b',
    accentColor: '#10b981',
    fontFamily: 'georgia',
    previewBadge: 'Executive',
  },
  {
    id: 'crimson-express',
    name: 'Crimson Express',
    description: 'Bold ruby & charcoal styling, high energy branding for express freight haulage.',
    primaryColor: '#881337',
    accentColor: '#e11d48',
    fontFamily: 'inter',
    previewBadge: 'Express',
  },
  {
    id: 'slate-dark',
    name: 'Industrial Slate',
    description: 'Modern heavy-industry styling with dark titanium tones and high contrast data tables.',
    primaryColor: '#18181b',
    accentColor: '#f59e0b',
    fontFamily: 'roboto-mono',
    previewBadge: 'Industrial',
  },
  {
    id: 'monochrome-print',
    name: 'Monochrome Laser / Thermal',
    description: 'Pure black & white ink-saver design, 100% dot-matrix and high-speed laser printer safe.',
    primaryColor: '#000000',
    accentColor: '#000000',
    fontFamily: 'system',
    previewBadge: 'Ink Saver',
  },
];

export const TERMS_PRESETS: { name: string; title: string; text: string }[] = [
  {
    name: 'Standard GTA RCM Freight',
    title: 'Terms & Conditions (GTA Surface Freight)',
    text: `1. Tax payable under Reverse Charge Mechanism (RCM) by GST registered recipient as per GTA Notification No. 11/2017-CT(R).
2. Goods transported at Owner's risk under standard Goods Transport Agency consignment guidelines.
3. Payment is strictly due within 30 days of invoice submission. Overdue interest @18% p.a. applicable.
4. Any shortage, leakage or damage must be endorsed on the original POD / Consignment Note at delivery.
5. All disputes subject to local transporter jurisdiction only.`,
  },
  {
    name: 'Detention & Demurrage Terms',
    title: 'Freight & Detention Contract Terms',
    text: `1. Free loading/unloading time: 24 hours from vehicle arrival at destination.
2. Detention charges @ ₹2,500/day for 6-wheelers and ₹4,000/day for multi-axle/trailers applicable thereafter.
3. Weighbridge slip from certified government weighbridge will be treated as final weight for billing.
4. Invoices must be cleared within 15 days via RTGS/NEFT to avoid vehicle placement hold.
5. Goods carried subject to Carriers Legal Liability Act.`,
  },
  {
    name: 'Bulk Industrial & Steel Haulage',
    title: 'Industrial Bulk Transport Conditions',
    text: `1. Transit insurance to be covered by the consignor/consignee. Transporter holds no liability for force majeure.
2. Shortage allowable up to 0.3% moisture/transit tolerance for bulk commodities.
3. Diesel price escalation clause applicable if fuel rates fluctuate by more than 5% during contract.
4. Payment terms: 50% on dispatch against LR copy, balance 50% against clear digital POD submission within 15 days.
5. Jurisdiction: Transporter registered office.`,
  },
  {
    name: 'Container & Port Drayage',
    title: 'Port & Container Drayage Conditions',
    text: `1. Shipping Line container detention, ground rent and port terminal handling charges payable directly by CHA/Client.
2. Transporter is not responsible for customs clearance delays or terminal gate congestion.
3. Empty container return to designated yard within free time window specified by shipping line.
4. Clean payment required within 7 days of invoice submission.`,
  },
];

export const DEFAULT_INVOICE_CUSTOMIZATION: InvoiceCustomization = {
  templateId: 'modern-clean',
  primaryColor: '#0f172a',
  accentColor: '#00E676',
  fontFamily: 'inter',
  fontSize: 'normal',
  tableDensity: 'comfortable',
  
  showLogo: true,
  logoUrl: '',
  logoPosition: 'left',
  logoSize: 'medium',
  showWatermark: false,
  watermarkText: 'ORIGINAL',
  watermarkOpacity: 0.08,

  documentTitle: 'TAX INVOICE',
  subTitle: 'GOODS TRANSPORT AGENCY (GTA) ROAD FREIGHT',
  copyType: 'Original for Recipient',
  customCopyLabel: '',
  invoiceNumberLabel: 'Invoice No',
  invoiceDateLabel: 'Invoice Date',
  dueDateLabel: 'Due Date',

  poNumber: '',
  poDate: '',
  eWayBillNumber: '',
  vehicleType: 'Heavy Commercial Vehicle (HCV)',
  placeOfSupply: '',
  sacDescription: 'Road transport services of goods including consignment transport (SAC 996511)',

  showBillerGstin: true,
  showBillerPan: true,
  showBillerCin: false,
  billerCin: '',
  showBillerContact: true,
  showBillerBank: true,

  showPartyGstin: true,
  showPartyPan: true,
  showPartyContact: true,
  showShipToAddress: false,

  columns: {
    srNo: { visible: true, label: '#' },
    lrNo: { visible: true, label: 'LR No. & Date' },
    lrDate: { visible: true, label: 'LR Date' },
    vehicleNo: { visible: true, label: 'Vehicle No.' },
    route: { visible: true, label: 'Route (From ➔ To)' },
    commodity: { visible: true, label: 'Cargo Description' },
    weight: { visible: true, label: 'Weight (MT)' },
    rate: { visible: true, label: 'Freight Rate' },
    freightAmount: { visible: true, label: 'Freight Amount' },
    extraCharges: { visible: false, label: 'Extra Charges' },
    advanceDeduction: { visible: false, label: 'Advance' },
    netAmount: { visible: true, label: 'Net Amount' },
  },

  customCharges: [],

  currencySymbol: '₹',
  currencyCode: 'INR',
  numberFormat: 'indian',
  dateFormat: 'DD/MM/YYYY',
  showAmountInWords: true,
  amountInWordsPrefix: 'Indian Rupees',
  showRcmBanner: true,
  rcmNotificationText: 'GTA Notification No. 11/2017-CT(R)',
  showTaxBreakup: true,
  showTdsBreakup: true,
  showRoundOff: true,

  showBankDetails: true,
  bankSectionTitle: 'Bank Payment Coordinates (RTGS / NEFT / IMPS)',
  showUpiQr: true,
  upiId: 'logitrack@hdfcbank',
  upiPayeeName: 'LogiTrack Freight Solutions',
  paymentInstructions: 'Please quote Invoice Number in your NEFT/RTGS transaction description.',

  showTerms: true,
  termsTitle: 'Terms & Conditions:',
  termsText: `1. Tax payable under Reverse Charge Mechanism (RCM) by GST registered recipient.
2. Goods transported at Owner's risk under standard GTA consignment guidelines.
3. Payment strictly due within 30 days of submission. Overdue interest @18% p.a. applicable.
4. Subject to local transporter jurisdiction.`,

  showDeclaration: true,
  declarationText: 'We declare that this invoice shows the actual price of the goods transport services described and that all particulars are true and correct.',

  showSignatureLeft: true,
  signatureLeftTitle: 'Prepared By / Logistics Supervisor',
  signatureLeftName: 'Billing Officer',

  showSignatureRight: true,
  signatureRightTitle: 'Authorized Signatory / Finance Officer',
  signatureRightCompany: 'For LogiTrack Freight Solutions & Logistics Pvt. Ltd.',
  signatureStampUrl: '',
  footerNote: 'This is a computer generated invoice and requires no physical stamp if signed digitally.',
};

export function getStoredInvoiceCustomization(): InvoiceCustomization {
  try {
    const raw = localStorage.getItem(INVOICE_CUSTOMIZATION_STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICE_CUSTOMIZATION;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INVOICE_CUSTOMIZATION,
      ...parsed,
      columns: {
        ...DEFAULT_INVOICE_CUSTOMIZATION.columns,
        ...(parsed.columns || {}),
      },
    };
  } catch (e) {
    console.warn('Failed to load invoice customization:', e);
    return DEFAULT_INVOICE_CUSTOMIZATION;
  }
}

export function saveStoredInvoiceCustomization(customization: InvoiceCustomization): void {
  try {
    localStorage.setItem(INVOICE_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
  } catch (e) {
    console.error('Failed to save invoice customization:', e);
  }
}
