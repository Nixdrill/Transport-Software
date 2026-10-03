import React, { useState, useEffect, useMemo } from 'react';
import { 
  FreightInvoice, 
  InvoiceLineItem, 
  InvoiceType, 
  BillerCompanyInfo,
  InvoiceCustomization
} from '../types/invoice';
import { DispatchRecord } from '../types/dispatch';
import { PartyMaster } from '../types/masters';
import { 
  getMasters, 
  findPartyMaster,
  getBillingParties 
} from '../lib/mastersService';
import { 
  getBillerProfile, 
  generateNextInvoiceNumber, 
  calculateInvoiceTotals, 
  getStateCode 
} from '../lib/invoiceService';
import { 
  DEFAULT_INVOICE_CUSTOMIZATION, 
  getStoredInvoiceCustomization,
  saveStoredInvoiceCustomization
} from '../lib/invoiceCustomizationDefaults';
import { 
  formatCustomCurrency, 
  formatCustomDate,
  getFontFamilyClass,
  getFontSizeScaleClasses,
  getTableDensityClasses
} from '../lib/invoiceFormatter';
import { formatCurrency, generateSafeId } from '../lib/calculations';
import { InvoiceCustomizerPanel } from './InvoiceCustomizerPanel';
import { UpiPaymentQr } from './UpiPaymentQr';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  FileText, 
  Building2, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Printer,
  Sparkles,
  Layers,
  Search,
  CheckCheck,
  Sliders,
  Eye,
  Settings2,
  Palette,
  ShieldCheck,
  Landmark,
  QrCode
} from 'lucide-react';

interface InvoiceBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: FreightInvoice, autoPrint?: boolean) => void;
  initialDispatch?: DispatchRecord | null;
  editingInvoice?: FreightInvoice | null;
  allDispatches: DispatchRecord[];
}

type BuilderTabMode = 'form' | 'customizer' | 'preview';

export const InvoiceBuilderModal: React.FC<InvoiceBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDispatch,
  editingInvoice,
  allDispatches,
}) => {
  const masters = useMemo(() => getMasters(), [isOpen]);
  const defaultBiller = useMemo(() => getBillerProfile(), [isOpen]);
  const billingParties = useMemo(() => getBillingParties(), [isOpen, masters]);

  // Tab Mode (Form vs Customizer vs Live Preview)
  const [activeTabMode, setActiveTabMode] = useState<BuilderTabMode>('form');

  // Billed By (Billing From / Issuer Entity) State
  const [billedBy, setBilledBy] = useState<BillerCompanyInfo>(() => {
    if (editingInvoice?.billedBy) return editingInvoice.billedBy;
    return getBillerProfile();
  });
  const [selectedBillerId, setSelectedBillerId] = useState<string>('');
  const [showBillerEditor, setShowBillerEditor] = useState<boolean>(false);
  const biller = billedBy;

  // Form State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Tax Invoice');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Client / Billed To Party Info
  const [partyName, setPartyName] = useState<string>('');
  const [partyGstin, setPartyGstin] = useState<string>('');
  const [partyPan, setPartyPan] = useState<string>('');
  const [partyAddress, setPartyAddress] = useState<string>('');
  const [partyCity, setPartyCity] = useState<string>('');
  const [partyState, setPartyState] = useState<string>('Maharashtra');
  const [partyPincode, setPartyPincode] = useState<string>('');
  const [partyContact, setPartyContact] = useState<string>('');
  const [partyPhone, setPartyPhone] = useState<string>('');

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // GST & Taxes
  const [gstRate, setGstRate] = useState<number>(5);
  const [isRcm, setIsRcm] = useState<boolean>(true);
  const [totalExtraCharges, setTotalExtraCharges] = useState<number>(0);
  const [totalAdvancePaid, setTotalAdvancePaid] = useState<number>(0);
  const [tdsRate, setTdsRate] = useState<number>(0);

  // Notes & Terms
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>(
    '1. Tax payable under Reverse Charge Mechanism (RCM) by GST registered recipient.\n2. Goods transported at Owner\'s risk under standard GTA consignment guidelines.\n3. Payment strictly due within 30 days.\n4. Subject to Pune jurisdiction.'
  );

  // 100% Customization State
  const [customization, setCustomization] = useState<InvoiceCustomization>(() => {
    if (editingInvoice?.customization) {
      return { ...DEFAULT_INVOICE_CUSTOMIZATION, ...editingInvoice.customization };
    }
    return getStoredInvoiceCustomization();
  });

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Multi-dispatch selector modal state
  const [showDispatchPicker, setShowDispatchPicker] = useState(false);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<string[]>([]);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setActiveTabMode('form');

    if (editingInvoice) {
      // Load editing invoice
      setInvoiceType(editingInvoice.invoiceType);
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setInvoiceDate(editingInvoice.invoiceDate);
      setDueDate(editingInvoice.dueDate);
      setPartyName(editingInvoice.billedTo.partyName);
      setPartyGstin(editingInvoice.billedTo.gstin || '');
      setPartyPan(editingInvoice.billedTo.panNumber || '');
      setPartyAddress(editingInvoice.billedTo.address || '');
      setPartyCity(editingInvoice.billedTo.city || '');
      setPartyState(editingInvoice.billedTo.state || 'Maharashtra');
      setPartyPincode(editingInvoice.billedTo.pincode || '');
      setPartyContact(editingInvoice.billedTo.contactPerson || '');
      setPartyPhone(editingInvoice.billedTo.phone || '');
      setLineItems(editingInvoice.items || []);
      setGstRate(editingInvoice.gstRate);
      setIsRcm(editingInvoice.isRcm);
      setTotalExtraCharges(editingInvoice.totalExtraCharges || 0);
      setTotalAdvancePaid(editingInvoice.totalAdvancePaid || 0);
      setTdsRate(editingInvoice.tdsRate || 0);
      setNotes(editingInvoice.notes || '');
      setTerms(editingInvoice.termsAndConditions || '');
      setCustomization(
        editingInvoice.customization
          ? { ...DEFAULT_INVOICE_CUSTOMIZATION, ...editingInvoice.customization }
          : getStoredInvoiceCustomization()
      );
    } else if (initialDispatch) {
      // Build from single dispatch
      setInvoiceType('Tax Invoice');
      setInvoiceNumber(generateNextInvoiceNumber());
      setInvoiceDate(new Date().toISOString().split('T')[0]);

      const clientName = initialDispatch.fromParty || 'Consignor';
      const pm = findPartyMaster(clientName) || findPartyMaster(initialDispatch.toParty);

      setPartyName(clientName);
      setPartyGstin(pm?.gstin || '');
      setPartyPan(pm?.panNumber || '');
      setPartyAddress(pm?.address || `${pm?.city || initialDispatch.fromParty}, ${pm?.state || 'Maharashtra'}`);
      setPartyCity(pm?.city || '');
      setPartyState(pm?.state || 'Maharashtra');
      setPartyPincode(pm?.pincode || '');
      setPartyContact(pm?.contactPerson || '');
      setPartyPhone(pm?.phone || '');

      const items: InvoiceLineItem[] = (initialDispatch.lrs && initialDispatch.lrs.length > 0)
        ? initialDispatch.lrs.map((lr, idx) => ({
            id: lr.id || generateSafeId('item'),
            dispatchId: initialDispatch.id,
            lrNumber: lr.lrNumber || `LR-${idx + 1}`,
            lrDate: lr.lrDate || initialDispatch.date,
            vehicleNumber: initialDispatch.vehicleNumber,
            origin: lr.consignorCity || initialDispatch.fromParty,
            destination: lr.consigneeCity || initialDispatch.toParty,
            commodity: lr.remarks || 'Industrial Cargo Transport',
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
              dispatchId: initialDispatch.id,
              lrNumber: initialDispatch.lrNumbers?.[0] || 'LR-001',
              lrDate: initialDispatch.date,
              vehicleNumber: initialDispatch.vehicleNumber,
              origin: initialDispatch.fromParty,
              destination: initialDispatch.toParty,
              commodity: 'Industrial Cargo Transport',
              weight: initialDispatch.totalWeight || 0,
              weightUnit: 'MT',
              rate: Math.round((initialDispatch.totalFreightAmount || 0) / (initialDispatch.totalWeight || 1)),
              rateType: 'per_mt',
              freightAmount: initialDispatch.totalFreightAmount || 0,
              otherCharges: initialDispatch.totalExtraCharges || 0,
              advanceDeduction: initialDispatch.totalAdvance || 0,
              netLineTotal: initialDispatch.netPayable || initialDispatch.totalFreightAmount,
              sacCode: '996511',
            },
          ];

      setLineItems(items);
      setTotalExtraCharges(initialDispatch.totalExtraCharges || 0);
      setTotalAdvancePaid(initialDispatch.totalAdvance || 0);
      setGstRate(5);
      setIsRcm(true);
      setNotes(`Consignment freight invoice for vehicle ${initialDispatch.vehicleNumber} trip on ${initialDispatch.date}.`);
      setCustomization(getStoredInvoiceCustomization());
    } else {
      // Fresh new invoice
      setInvoiceType('Tax Invoice');
      setInvoiceNumber(generateNextInvoiceNumber());
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setPartyName('');
      setPartyGstin('');
      setPartyPan('');
      setPartyAddress('');
      setPartyCity('');
      setPartyState('Maharashtra');
      setPartyPincode('');
      setPartyContact('');
      setPartyPhone('');
      setLineItems([
        {
          id: generateSafeId('item'),
          lrNumber: 'LR-001',
          lrDate: new Date().toISOString().split('T')[0],
          vehicleNumber: '',
          origin: '',
          destination: '',
          commodity: 'Industrial Goods Transport',
          weight: 20,
          weightUnit: 'MT',
          rate: 2200,
          rateType: 'per_mt',
          freightAmount: 44000,
          loadingCharges: 0,
          unloadingCharges: 0,
          detentionCharges: 0,
          otherCharges: 0,
          advanceDeduction: 0,
          netLineTotal: 44000,
          sacCode: '996511',
        },
      ]);
      setTotalExtraCharges(0);
      setTotalAdvancePaid(0);
      setGstRate(5);
      setIsRcm(true);
      setNotes('');
      setCustomization(getStoredInvoiceCustomization());
    }
  }, [isOpen, initialDispatch, editingInvoice]);

  // Handle Billing Party (Issuer / Billing From) selection from masters
  const handleSelectBillingParty = (partyIdentifier: string) => {
    setSelectedBillerId(partyIdentifier);
    const found = masters.parties.find(
      (p) => p.id === partyIdentifier || p.name === partyIdentifier
    );
    if (!found) return;

    const newBiller: BillerCompanyInfo = {
      companyName: found.name,
      tagline: found.tagline || defaultBiller.tagline || '',
      logoUrl: found.logoUrl || defaultBiller.logoUrl || '',
      cinNumber: found.cinNumber || defaultBiller.cinNumber || '',
      gstin: found.gstin || defaultBiller.gstin || '',
      panNumber: found.panNumber || defaultBiller.panNumber || '',
      address: found.address || defaultBiller.address || '',
      city: found.city || defaultBiller.city || '',
      state: found.state || defaultBiller.state || 'Maharashtra',
      pincode: found.pincode || defaultBiller.pincode || '',
      phone: found.phone || defaultBiller.phone || '',
      email: found.email || defaultBiller.email || '',
      website: found.website || defaultBiller.website || '',
      bankName: found.bankName || defaultBiller.bankName || '',
      bankAccountNumber: found.bankAccountNumber || defaultBiller.bankAccountNumber || '',
      bankIfsc: found.bankIfsc || defaultBiller.bankIfsc || '',
      bankBranch: found.bankBranch || defaultBiller.bankBranch || '',
      accountHolderName: found.accountHolderName || found.name,
      upiId: found.upiId || defaultBiller.upiId || '',
    };

    setBilledBy(newBiller);

    // Auto-update logo, UPI and signatory in customization
    setCustomization((prev) => ({
      ...prev,
      logoUrl: found.logoUrl || prev.logoUrl || '',
      showLogo: Boolean(found.logoUrl || prev.logoUrl),
      upiId: found.upiId || prev.upiId,
      upiPayeeName: found.name,
      signatureRightCompany: `For ${found.name}`,
    }));
  };

  // Handle party selection from masters (Billed To)
  const handleSelectPartyFromMasters = (selectedName: string) => {
    setPartyName(selectedName);
    const pm = findPartyMaster(selectedName);
    if (pm) {
      setPartyGstin(pm.gstin || '');
      setPartyPan(pm.panNumber || '');
      setPartyAddress(pm.address || `${pm.city}, ${pm.state}`);
      setPartyCity(pm.city || '');
      setPartyState(pm.state || 'Maharashtra');
      setPartyPincode(pm.pincode || '');
      setPartyContact(pm.contactPerson || '');
      setPartyPhone(pm.phone || '');
    }
  };

  // Line item manipulation
  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: generateSafeId('item'),
      lrNumber: `LR-${String(lineItems.length + 1).padStart(3, '0')}`,
      lrDate: invoiceDate,
      vehicleNumber: '',
      origin: '',
      destination: '',
      commodity: 'Commercial Goods',
      weight: 10,
      weightUnit: 'MT',
      rate: 2000,
      rateType: 'per_mt',
      freightAmount: 20000,
      otherCharges: 0,
      advanceDeduction: 0,
      netLineTotal: 20000,
      sacCode: '996511',
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    // Auto recalculate freight
    if (field === 'weight' || field === 'rate' || field === 'rateType') {
      const w = Number(field === 'weight' ? value : item.weight) || 0;
      const r = Number(field === 'rate' ? value : item.rate) || 0;
      const rType = field === 'rateType' ? value : item.rateType;
      
      let freight = 0;
      if (rType === 'fixed') {
        freight = r;
      } else {
        freight = Math.round(w * r);
      }
      item.freightAmount = freight;
    }

    // Net line total
    const fAmt = Number(item.freightAmount) || 0;
    const extra = Number(item.otherCharges || 0);
    const adv = Number(item.advanceDeduction || 0);
    item.netLineTotal = fAmt + extra - adv;

    updated[index] = item;
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      setValidationError('Invoice must contain at least one line item.');
      return;
    }
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  // Consolidate Selected Dispatches into Line items
  const handleImportSelectedDispatches = () => {
    const chosen = allDispatches.filter((d) => selectedDispatchIds.includes(d.id));
    if (chosen.length === 0) return;

    const importedItems: InvoiceLineItem[] = [];
    let addedAdvance = 0;
    let addedExtra = 0;

    for (const dsp of chosen) {
      addedAdvance += Number(dsp.totalAdvance) || 0;
      addedExtra += Number(dsp.totalExtraCharges) || 0;

      if (dsp.lrs && dsp.lrs.length > 0) {
        for (const lr of dsp.lrs) {
          importedItems.push({
            id: lr.id || generateSafeId('item'),
            dispatchId: dsp.id,
            lrNumber: lr.lrNumber || `LR-${importedItems.length + 1}`,
            lrDate: lr.lrDate || dsp.date,
            vehicleNumber: dsp.vehicleNumber,
            origin: lr.consignorCity || dsp.fromParty,
            destination: lr.consigneeCity || dsp.toParty,
            commodity: lr.remarks || 'Commercial Transport',
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
        importedItems.push({
          id: generateSafeId('item'),
          dispatchId: dsp.id,
          lrNumber: dsp.lrNumbers?.[0] || 'TRIP-LR',
          lrDate: dsp.date,
          vehicleNumber: dsp.vehicleNumber,
          origin: dsp.fromParty,
          destination: dsp.toParty,
          commodity: 'Industrial Goods Transport',
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

    setLineItems(importedItems);
    setTotalAdvancePaid(addedAdvance);
    setTotalExtraCharges(addedExtra);
    setShowDispatchPicker(false);
  };

  // Real-time live totals calculation
  const calculations = useMemo(() => {
    return calculateInvoiceTotals({
      items: lineItems,
      gstRate,
      isRcm,
      billerState: biller.state || 'Maharashtra',
      clientState: partyState || 'Maharashtra',
      tdsRate,
      totalExtraCharges,
      totalAdvancePaid,
    });
  }, [lineItems, gstRate, isRcm, biller.state, partyState, tdsRate, totalExtraCharges, totalAdvancePaid]);

  // Handle Save
  const handleSubmit = (e: React.FormEvent, autoPrint: boolean = false) => {
    e.preventDefault();
    setValidationError(null);

    if (!partyName.trim()) {
      setValidationError('Party Name (Billed To) is required.');
      setActiveTabMode('form');
      return;
    }
    if (!invoiceNumber.trim()) {
      setValidationError('Invoice Number is required.');
      setActiveTabMode('form');
      return;
    }
    if (lineItems.length === 0) {
      setValidationError('At least one LR line item is required.');
      setActiveTabMode('form');
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.lrNumber.trim()) {
        setValidationError(`Line item #${i + 1} is missing LR Number.`);
        setActiveTabMode('form');
        return;
      }
      if (!item.vehicleNumber.trim()) {
        setValidationError(`Line item #${i + 1} (${item.lrNumber}) is missing Vehicle Number.`);
        setActiveTabMode('form');
        return;
      }
    }

    const stateCode = getStateCode(partyState, partyGstin);

    const finalInvoice: FreightInvoice = {
      id: editingInvoice?.id || generateSafeId('inv'),
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      invoiceType,
      billedTo: {
        partyName: partyName.trim(),
        gstin: partyGstin.trim().toUpperCase(),
        panNumber: partyPan.trim().toUpperCase(),
        address: partyAddress.trim(),
        city: partyCity.trim(),
        state: partyState.trim(),
        pincode: partyPincode.trim(),
        stateCode,
        contactPerson: partyContact.trim(),
        phone: partyPhone.trim(),
      },
      billedBy: biller,
      sacCode: '996511',
      serviceDescription: 'Goods Transport Agency (GTA) Surface Road Freight Logistics',
      items: lineItems,
      totalWeight: calculations.totalWeight,
      subTotalFreight: calculations.subTotalFreight,
      totalExtraCharges: calculations.totalExtraCharges,
      totalAdvancePaid: calculations.totalAdvancePaid,
      taxableAmount: calculations.taxableAmount,
      gstRate,
      isRcm,
      taxType: calculations.taxType,
      cgstRate: calculations.cgstRate,
      cgstAmount: calculations.cgstAmount,
      sgstRate: calculations.sgstRate,
      sgstAmount: calculations.sgstAmount,
      igstRate: calculations.igstRate,
      igstAmount: calculations.igstAmount,
      totalTax: calculations.totalTax,
      tdsRate,
      tdsAmount: calculations.tdsAmount,
      roundOff: calculations.roundOff,
      grandTotal: calculations.grandTotal,
      amountInWords: calculations.amountInWords,
      paymentStatus: editingInvoice?.paymentStatus || 'Unpaid',
      amountPaid: editingInvoice?.amountPaid || 0,
      balanceDue: editingInvoice ? Math.max(0, calculations.grandTotal - (editingInvoice.amountPaid || 0)) : calculations.grandTotal,
      payments: editingInvoice?.payments || [],
      notes: notes.trim(),
      termsAndConditions: terms.trim(),
      preparedBy: customization.signatureLeftName || 'Billing Officer',
      authorizedSignatoryName: customization.signatureRightCompany || `For ${biller.companyName}`,
      customization,
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(finalInvoice, autoPrint);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-4 max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* ================= MODAL HEADER & WORKFLOW TABS ================= */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {editingInvoice ? `Edit Invoice (${editingInvoice.invoiceNumber})` : 'Generate Freight Invoice'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Create GST-compliant bills with 100% custom layouts, themes & QR codes.
              </p>
            </div>
          </div>

          {/* Workflow Step Tabs (Form -> 100% Customizer -> Live Preview) */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTabMode('form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTabMode === 'form'
                  ? 'bg-[#00E676] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>1. Data & LRs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabMode('customizer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTabMode === 'customizer'
                  ? 'bg-[#00E676] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>2. 100% Styler</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTabMode === 'preview'
                  ? 'bg-[#00E676] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>3. Live Preview</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ================= TAB 1: FORM DATA & LRs ================= */}
        {activeTabMode === 'form' && (
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
            
            {/* Top Invoice Metadata Grid */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice / Bill Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => {
                    const newType = e.target.value as InvoiceType;
                    setInvoiceType(newType);
                    setCustomization((prev) => ({ ...prev, documentTitle: newType.toUpperCase() }));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#00E676]"
                >
                  <option value="Tax Invoice">Tax Invoice (GST Compliant)</option>
                  <option value="Freight Bill">Freight Bill</option>
                  <option value="GTA Consignment Note">GTA Consignment Note</option>
                  <option value="Transporter Settlement Bill">Transporter Settlement Bill</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase font-bold text-slate-900 focus:ring-2 focus:ring-[#00E676]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* ================= BILLING FROM (ISSUER / SERVICE PROVIDER ENTITY) ================= */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-slate-800" />
                  <span className="font-black text-slate-950 text-xs uppercase tracking-wide">
                    Billing From (Transport Service Provider / Issuer Entity)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-950 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Master Logo & Profile
                  </span>
                </div>

                {/* Master Billing Parties Quick Selector */}
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <span className="text-slate-600 font-bold">Select Billing Party:</span>
                  <select
                    value={selectedBillerId}
                    onChange={(e) => {
                      if (e.target.value) handleSelectBillingParty(e.target.value);
                    }}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#00E676] cursor-pointer"
                  >
                    <option value="">-- Default Biller Profile --</option>
                    {billingParties.map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.name} {bp.city ? `(${bp.city})` : ''} {bp.type === 'Billing Party (Issuer)' ? '★ Master Billing Party' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Billing Entity Card with Logo & Coordinates */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-3.5">
                  {/* Logo Display */}
                  <div className="relative group flex-shrink-0">
                    {billedBy.logoUrl ? (
                      <img
                        src={billedBy.logoUrl}
                        alt={`${billedBy.companyName} Logo`}
                        className="h-12 w-12 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="h-5 w-5 text-slate-400" />
                        <span className="text-[7px] font-bold mt-0.5">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4 className="font-black text-slate-950 text-sm">
                        {billedBy.companyName || 'LogiTrack Freight Solutions'}
                      </h4>
                      {billedBy.gstin && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          GSTIN: {billedBy.gstin}
                        </span>
                      )}
                    </div>
                    {billedBy.tagline && (
                      <p className="text-[11px] text-slate-500 italic font-medium">{billedBy.tagline}</p>
                    )}
                    <div className="text-[11px] text-slate-600 flex items-center space-x-2 flex-wrap mt-0.5">
                      <span>{billedBy.city ? `${billedBy.city}, ${billedBy.state || 'Maharashtra'}` : 'Head Office'}</span>
                      {billedBy.bankName && (
                        <>
                          <span>•</span>
                          <span>Bank: <strong>{billedBy.bankName}</strong> ({billedBy.bankAccountNumber ? `A/C ...${billedBy.bankAccountNumber.slice(-4)}` : ''})</span>
                        </>
                      )}
                      {billedBy.upiId && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-mono font-semibold">UPI: {billedBy.upiId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Toggle Edit Fields */}
                <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBillerEditor(!showBillerEditor)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {showBillerEditor ? 'Hide Edit Fields' : 'Edit Billing From Details'}
                  </button>
                </div>
              </div>

              {/* Expandable Editable Biller Details Form */}
              {showBillerEditor && (
                <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Company / Billing Issuer Name *</label>
                      <input
                        type="text"
                        value={billedBy.companyName}
                        onChange={(e) => {
                          const updated = { ...billedBy, companyName: e.target.value };
                          setBilledBy(updated);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Company GSTIN</label>
                      <input
                        type="text"
                        value={billedBy.gstin || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setBilledBy({ ...billedBy, gstin: val });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={billedBy.address || ''}
                        onChange={(e) => setBilledBy({ ...billedBy, address: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={billedBy.city || ''}
                        onChange={(e) => setBilledBy({ ...billedBy, city: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={billedBy.state || 'Maharashtra'}
                        onChange={(e) => setBilledBy({ ...billedBy, state: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Logo & Bank Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Logo URL or Upload</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="https://... or base64"
                          value={billedBy.logoUrl || ''}
                          onChange={(e) => {
                            const url = e.target.value;
                            setBilledBy({ ...billedBy, logoUrl: url });
                            setCustomization((prev) => ({ ...prev, logoUrl: url, showLogo: Boolean(url) }));
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <label className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-800">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const dataUrl = event.target?.result as string;
                                if (dataUrl) {
                                  setBilledBy({ ...billedBy, logoUrl: dataUrl });
                                  setCustomization((prev) => ({ ...prev, logoUrl: dataUrl, showLogo: true }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Bank Name & A/C #</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank - 50200012345678"
                        value={billedBy.bankName ? `${billedBy.bankName} - ${billedBy.bankAccountNumber || ''}` : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parts = val.split('-');
                          setBilledBy({
                            ...billedBy,
                            bankName: parts[0]?.trim() || '',
                            bankAccountNumber: parts[1]?.trim() || '',
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">UPI ID (for QR Code)</label>
                      <input
                        type="text"
                        placeholder="e.g. logitrack@okhdfcbank"
                        value={billedBy.upiId || ''}
                        onChange={(e) => {
                          const upi = e.target.value;
                          setBilledBy({ ...billedBy, upiId: upi });
                          setCustomization((prev) => ({ ...prev, upiId: upi }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Client (Billed To) Details & Quick Masters Selection */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-emerald-800" />
                  <span className="font-black text-slate-950 text-xs uppercase tracking-wide">
                    Billed To (Client / Consignor / Consignee)
                  </span>
                </div>

                {/* Master Party Quick Picker */}
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <span className="text-slate-600 font-bold">Autofill from Masters:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectPartyFromMasters(e.target.value);
                    }}
                    defaultValue=""
                    className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Select Master Party --</option>
                    {masters.parties.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Party / Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Steel Processing Ltd"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-950 focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Chars)</label>
                  <input
                    type="text"
                    placeholder="e.g. 20AAACT2727Q1ZS"
                    value={partyGstin}
                    onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold uppercase text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Billing / Plant Address</label>
                  <input
                    type="text"
                    placeholder="Industrial Area, Gate 4..."
                    value={partyAddress}
                    onChange={(e) => setPartyAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Jamshedpur"
                    value={partyCity}
                    onChange={(e) => setPartyCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Jharkhand"
                    value={partyState}
                    onChange={(e) => setPartyState(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* LR Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-slate-800" />
                  <span className="font-black text-slate-950 text-xs uppercase tracking-wide">
                    Consignment Trips & LR Line Items ({lineItems.length})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDispatchPicker(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5 text-indigo-700" />
                    <span>Import Multi-Dispatches</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add LR Line</span>
                  </button>
                </div>
              </div>

              {/* Table of Line Items */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2.5 w-8">#</th>
                      <th className="p-2.5">LR No. *</th>
                      <th className="p-2.5">Vehicle No. *</th>
                      <th className="p-2.5">Route (From ➔ To)</th>
                      <th className="p-2.5">Commodity</th>
                      <th className="p-2.5 w-24">Weight (MT)</th>
                      <th className="p-2.5 w-24">Rate (₹)</th>
                      <th className="p-2.5 w-28">Rate Type</th>
                      <th className="p-2.5 text-right">Freight Amount</th>
                      <th className="p-2.5 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            required
                            placeholder="LR-001"
                            value={item.lrNumber}
                            onChange={(e) => handleUpdateLineItem(idx, 'lrNumber', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            required
                            placeholder="MH 12 AB 1234"
                            value={item.vehicleNumber}
                            onChange={(e) => handleUpdateLineItem(idx, 'vehicleNumber', e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono uppercase font-bold text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              placeholder="From"
                              value={item.origin}
                              onChange={(e) => handleUpdateLineItem(idx, 'origin', e.target.value)}
                              className="w-20 px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                            <span>➔</span>
                            <input
                              type="text"
                              placeholder="To"
                              value={item.destination}
                              onChange={(e) => handleUpdateLineItem(idx, 'destination', e.target.value)}
                              className="w-20 px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                          </div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="Material"
                            value={item.commodity}
                            onChange={(e) => handleUpdateLineItem(idx, 'commodity', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.weight || ''}
                            onChange={(e) => handleUpdateLineItem(idx, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.rate || ''}
                            onChange={(e) => handleUpdateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.rateType}
                            onChange={(e) => handleUpdateLineItem(idx, 'rateType', e.target.value)}
                            className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold"
                          >
                            <option value="per_mt">Per MT</option>
                            <option value="fixed">Fixed Trip</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900">
                          {formatCurrency(item.freightAmount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GST & Totals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: GST Configuration */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-black text-slate-950 text-xs uppercase tracking-wide block">
                  GST & Tax Structure
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GTA GST Rate (%)</label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="5">5% (Standard GTA Rate)</option>
                      <option value="12">12% (Forward Charge with ITC)</option>
                      <option value="18">18% (Commercial / Courier)</option>
                      <option value="0">0% (Exempted / Zero Tax)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reverse Charge (RCM)</label>
                    <select
                      value={isRcm ? 'yes' : 'no'}
                      onChange={(e) => setIsRcm(e.target.value === 'yes')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="yes">YES (Recipient pays GST)</option>
                      <option value="no">NO (Transporter charges GST)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Extra Charges (Loading/Detention) ₹</label>
                    <input
                      type="number"
                      min="0"
                      value={totalExtraCharges || ''}
                      onChange={(e) => setTotalExtraCharges(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Less: Advance Paid ₹</label>
                    <input
                      type="number"
                      min="0"
                      value={totalAdvancePaid || ''}
                      onChange={(e) => setTotalAdvancePaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-rose-700"
                    />
                  </div>
                </div>

                {/* Quick Shortcut to Open 100% Styler */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTabMode('customizer')}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-[#00E676] font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-800"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Customize Invoice Theme, Branding, Bank & QR Code ➔</span>
                  </button>
                </div>
              </div>

              {/* Right: Live Calculation Breakdown Summary */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="font-black text-slate-950 text-xs uppercase tracking-wide">
                    Live Bill Computations
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-emerald-300 font-bold text-emerald-900">
                    {calculations.taxType} Tax
                  </span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Total Cargo Weight:</span>
                  <span className="font-mono font-bold text-slate-950">{calculations.totalWeight} MT</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Subtotal Basic Freight:</span>
                  <span className="font-mono font-bold text-slate-950">{formatCurrency(calculations.subTotalFreight)}</span>
                </div>

                {calculations.totalExtraCharges > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Extra Charges:</span>
                    <span className="font-mono font-semibold text-slate-900">+{formatCurrency(calculations.totalExtraCharges)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-bold border-t border-emerald-200 pt-1">
                  <span>Taxable Freight Value:</span>
                  <span className="font-mono">{formatCurrency(calculations.taxableAmount)}</span>
                </div>

                {!isRcm && calculations.totalTax > 0 && (
                  <div className="space-y-1 text-slate-700 border-t border-emerald-200 pt-1">
                    {calculations.taxType === 'CGST_SGST' ? (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span>CGST ({calculations.cgstRate}%):</span>
                          <span className="font-mono">+{formatCurrency(calculations.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>SGST ({calculations.sgstRate}%):</span>
                          <span className="font-mono">+{formatCurrency(calculations.sgstAmount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-[11px]">
                        <span>IGST ({calculations.igstRate}%):</span>
                        <span className="font-mono">+{formatCurrency(calculations.igstAmount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {calculations.totalAdvancePaid > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Less: Advance Deducted:</span>
                    <span className="font-mono">-{formatCurrency(calculations.totalAdvancePaid)}</span>
                  </div>
                )}

                {/* Net Grand Total */}
                <div className="p-3 bg-white rounded-xl border border-emerald-400 flex items-center justify-between text-sm font-black text-slate-950 shadow-xs mt-2">
                  <span>Net Grand Total Payable:</span>
                  <span className="font-mono text-base text-emerald-950 font-black">
                    {formatCurrency(calculations.grandTotal)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-600 font-medium pt-1">
                  <span className="font-bold">In Words: </span>
                  <span>{calculations.amountInWords}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes for client or reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => {
                    setTerms(e.target.value);
                    setCustomization((prev) => ({ ...prev, termsText: e.target.value }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMode('preview')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Eye className="h-4 w-4 text-[#00E676]" />
                <span>Preview Document</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                <span>Save & Print PDF</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs shadow-xs border border-emerald-400 flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="h-4 w-4 text-slate-950" />
                <span>{editingInvoice ? 'Update Invoice' : 'Save Invoice'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 2: 100% STYLING & FORMATTING CUSTOMIZER ================= */}
        {activeTabMode === 'customizer' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <InvoiceCustomizerPanel
              customization={customization}
              onChange={setCustomization}
              onSaveAsDefault={() => saveStoredInvoiceCustomization(customization)}
            />

            <div className="pt-3 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTabMode('form')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                ← Back to Invoice Form
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('preview')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Eye className="h-4 w-4 text-[#00E676]" />
                  <span>View Live Preview ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: LIVE DOCUMENT PREVIEW ================= */}
        {activeTabMode === 'preview' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-100">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-slate-600">
                Live Document Render • Template: <strong className="text-slate-900">{customization.templateId}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('customizer')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Palette className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Edit Styling</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>

            {/* Document Render Box */}
            <div 
              className={`p-8 bg-white border border-slate-300 rounded-2xl shadow-lg relative text-slate-900 ${getFontFamilyClass(customization.fontFamily)} ${getFontSizeScaleClasses(customization.fontSize)}`}
            >
              {/* Watermark */}
              {customization.showWatermark && customization.watermarkText && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-0"
                  style={{ opacity: customization.watermarkOpacity || 0.08 }}
                >
                  <span className="text-8xl font-black uppercase font-mono tracking-widest rotate-[-30deg] border-8 border-dashed border-current p-8 rounded-3xl">
                    {customization.watermarkText}
                  </span>
                </div>
              )}

              <div className="relative z-10 space-y-4">
                {/* Header */}
                <div 
                  className="flex justify-between items-start pb-4 border-b-2 gap-4"
                  style={{ borderColor: customization.primaryColor }}
                >
                  <div className="flex items-start space-x-3">
                    {customization.showLogo && customization.logoUrl && (
                      <img
                        src={customization.logoUrl}
                        alt="Logo"
                        className="h-12 max-w-[140px] object-contain rounded"
                      />
                    )}
                    <div>
                      <span 
                        className="text-[10px] font-mono uppercase tracking-widest font-black block"
                        style={{ color: customization.primaryColor }}
                      >
                        {customization.subTitle}
                      </span>
                      <h1 
                        className="text-2xl font-black uppercase tracking-tight"
                        style={{ color: customization.primaryColor }}
                      >
                        {customization.documentTitle || invoiceType}
                      </h1>
                      {customization.sacDescription && (
                        <span className="text-[10px] text-slate-600 font-semibold block">
                          SAC: 996511 — {customization.sacDescription}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span 
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded border mb-1 inline-block"
                      style={{
                        backgroundColor: `${customization.primaryColor}15`,
                        borderColor: customization.primaryColor,
                        color: customization.primaryColor,
                      }}
                    >
                      {customization.copyType}
                    </span>
                    <div className="text-xs text-slate-700 font-semibold">
                      {customization.invoiceNumberLabel}: <strong className="font-mono text-sm font-black text-slate-950">{invoiceNumber}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {customization.invoiceDateLabel}: <strong className="font-mono font-bold text-slate-900">{formatCustomDate(invoiceDate, customization.dateFormat)}</strong> | {customization.dueDateLabel}: <strong className="font-mono font-bold text-slate-900">{formatCustomDate(dueDate, customization.dateFormat)}</strong>
                    </div>
                  </div>
                </div>

                {/* 2-Column Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 space-y-1">
                    <span 
                      className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded inline-block mb-1"
                      style={{ backgroundColor: `${customization.primaryColor}15`, color: customization.primaryColor }}
                    >
                      Issuer
                    </span>
                    <div className="font-black text-slate-950 text-xs">{biller.companyName}</div>
                    <div className="text-[11px] text-slate-600">{biller.address}, {biller.city}, {biller.state}</div>
                    <div className="text-[11px] pt-1">
                      GSTIN: <strong className="font-mono">{biller.gstin}</strong> | PAN: <strong className="font-mono">{biller.panNumber}</strong>
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 space-y-1">
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded inline-block mb-1 bg-emerald-100 text-emerald-900">
                      Billed To
                    </span>
                    <div className="font-black text-slate-950 text-xs">{partyName || 'Party Name'}</div>
                    <div className="text-[11px] text-slate-600">{partyAddress || `${partyCity}, ${partyState}`}</div>
                    <div className="text-[11px] pt-1">
                      GSTIN: <strong className="font-mono">{partyGstin || 'Unregistered'}</strong> | PAN: <strong className="font-mono">{partyPan || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="text-white font-bold text-[11px]" style={{ backgroundColor: customization.primaryColor }}>
                      <th className="border border-slate-400/50 p-2 text-center w-8">#</th>
                      <th className="border border-slate-400/50 p-2 text-left">LR No. & Date</th>
                      <th className="border border-slate-400/50 p-2 text-left">Vehicle No.</th>
                      <th className="border border-slate-400/50 p-2 text-left">Route</th>
                      <th className="border border-slate-400/50 p-2 text-right">Weight</th>
                      <th className="border border-slate-400/50 p-2 text-right">Rate</th>
                      <th className="border border-slate-400/50 p-2 text-right">Freight (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono font-bold text-slate-950">{item.lrNumber}</td>
                        <td className="border border-slate-300 p-2 font-mono uppercase font-bold">{item.vehicleNumber}</td>
                        <td className="border border-slate-300 p-2">{item.origin} ➔ {item.destination}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{item.weight} MT</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{formatCustomCurrency(item.rate, customization)}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-black text-slate-950">{formatCustomCurrency(item.freightAmount, customization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & UPI QR */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {customization.showUpiQr && (
                      <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center space-x-3">
                        <UpiPaymentQr
                          upiId={customization.upiId || biller.upiId || 'logitrack@hdfcbank'}
                          payeeName={customization.upiPayeeName || biller.companyName}
                          amount={calculations.grandTotal}
                          invoiceNumber={invoiceNumber}
                          size={70}
                        />
                        <div className="text-[11px] text-slate-600">
                          <strong className="text-slate-900 block text-xs">Scan & Pay via UPI</strong>
                          <span>Instant digital settlement directly to bank account.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Basic Freight:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCustomCurrency(calculations.subTotalFreight, customization)}</span>
                    </div>
                    {isRcm ? (
                      <div className="text-[10px] text-amber-800 bg-amber-100/60 p-1.5 rounded">
                        GST @{gstRate}% Payable by Recipient under RCM.
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({gstRate}%):</span>
                        <span className="font-mono">{formatCustomCurrency(calculations.totalTax, customization)}</span>
                      </div>
                    )}
                    <div 
                      className="flex justify-between text-slate-950 font-black border-t-2 pt-1.5 text-sm p-2 rounded-lg"
                      style={{ backgroundColor: `${customization.primaryColor}15`, borderColor: customization.primaryColor }}
                    >
                      <span>Grand Total:</span>
                      <span className="font-mono text-base font-black" style={{ color: customization.primaryColor }}>
                        {formatCustomCurrency(calculations.grandTotal, customization)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs">
                  <div>
                    <strong className="text-slate-900 font-bold block text-xs">Declaration:</strong>
                    <p className="text-[10px] text-slate-500">{customization.declarationText}</p>
                  </div>
                  <div className="text-right space-y-6">
                    <div className="text-xs font-bold text-slate-900">
                      {customization.signatureRightCompany || `For ${biller.companyName}`}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-700 inline-block min-w-[180px] text-center">
                      {customization.signatureRightTitle || 'Authorized Signatory'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setActiveTabMode('form')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Back to Edit Data
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs shadow-xs border border-emerald-400 cursor-pointer"
              >
                Save Invoice
              </button>
            </div>
          </div>
        )}

        {/* ================= MULTI-DISPATCH PICKER MODAL ================= */}
        {showDispatchPicker && (() => {
          const filteredPickerDispatches = allDispatches.filter((dsp) => {
            if (!pickerSearchQuery.trim()) return true;
            const q = pickerSearchQuery.toLowerCase().trim();
            return (
              dsp.vehicleNumber.toLowerCase().includes(q) ||
              dsp.fromParty.toLowerCase().includes(q) ||
              dsp.toParty.toLowerCase().includes(q) ||
              dsp.date.includes(q) ||
              (dsp.lrNumbers || []).some((lr) => lr.toLowerCase().includes(q))
            );
          });

          const isAllPickerSelected =
            filteredPickerDispatches.length > 0 &&
            filteredPickerDispatches.every((d) => selectedDispatchIds.includes(d.id));

          const selectedPickerTrips = allDispatches.filter((d) => selectedDispatchIds.includes(d.id));
          const totalSelectedWeight = selectedPickerTrips.reduce((s, d) => s + (Number(d.totalWeight) || 0), 0);
          const totalSelectedFreight = selectedPickerTrips.reduce((s, d) => s + (Number(d.totalFreightAmount) || 0), 0);

          const handleSelectAllPicker = () => {
            const visibleIds = filteredPickerDispatches.map((d) => d.id);
            setSelectedDispatchIds((prev) => {
              const allSelected = visibleIds.every((id) => prev.includes(id));
              if (allSelected) {
                return prev.filter((id) => !visibleIds.includes(id));
              } else {
                return Array.from(new Set([...prev, ...visibleIds]));
              }
            });
          };

          const handleInvertPicker = () => {
            const visibleIds = filteredPickerDispatches.map((d) => d.id);
            setSelectedDispatchIds((prev) => {
              const remaining = prev.filter((id) => !visibleIds.includes(id));
              const newlySelected = visibleIds.filter((id) => !prev.includes(id));
              return [...remaining, ...newlySelected];
            });
          };

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
              <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h4 className="font-black text-slate-950 text-sm">
                      Select Dispatches for Consolidated Freight Invoice
                    </h4>
                    <p className="text-xs text-slate-500">
                      Check one or more trips to aggregate all LRs into this single invoice.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDispatchPicker(false);
                      setPickerSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Bar & Selection Control Buttons */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by vehicle #, from/to party, LR number, date..."
                      value={pickerSearchQuery}
                      onChange={(e) => setPickerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                    />
                    {pickerSearchQuery && (
                      <button
                        onClick={() => setPickerSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Showing <strong>{filteredPickerDispatches.length}</strong> of <strong>{allDispatches.length}</strong> trips
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllPicker}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                          isAllPickerSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>{isAllPickerSelected ? 'Deselect All' : `Select All Visible (${filteredPickerDispatches.length})`}</span>
                      </button>

                      {selectedDispatchIds.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleInvertPicker}
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold"
                          >
                            Invert
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchIds([])}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold"
                          >
                            Clear ({selectedDispatchIds.length})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dispatches List */}
                <div className="overflow-y-auto space-y-2 flex-1 text-xs pr-1">
                  {filteredPickerDispatches.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      No dispatches found matching your search.
                    </div>
                  ) : (
                    filteredPickerDispatches.map((dsp) => {
                      const isChecked = selectedDispatchIds.includes(dsp.id);
                      return (
                        <div
                          key={dsp.id}
                          onClick={() => {
                            setSelectedDispatchIds((prev) =>
                              isChecked ? prev.filter((id) => id !== dsp.id) : [...prev, dsp.id]
                            );
                          }}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isChecked
                              ? 'border-[#00E676] bg-emerald-50/70 ring-1 ring-emerald-300'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-slate-950 flex items-center space-x-2">
                                <span className="font-mono">{dsp.vehicleNumber}</span>
                                <span>•</span>
                                <span>{dsp.fromParty} ➔ {dsp.toParty}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                <span className="font-mono">{dsp.date}</span>
                                <span>•</span>
                                <span>{dsp.totalLrsCount || dsp.lrs?.length || 1} LR(s)</span>
                                <span>•</span>
                                <span className="font-mono">{dsp.totalWeight} MT</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono font-black text-slate-950">
                            {formatCurrency(dsp.totalFreightAmount)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Bar */}
                <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-700 flex items-center space-x-2">
                    <span className="font-bold text-slate-950">{selectedDispatchIds.length} trip(s) selected</span>
                    {selectedDispatchIds.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-emerald-800 font-bold">{totalSelectedWeight.toFixed(2)} MT</span>
                        <span>•</span>
                        <span className="font-mono text-slate-950 font-black">{formatCurrency(totalSelectedFreight)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDispatchPicker(false);
                        setPickerSearchQuery('');
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImportSelectedDispatches}
                      disabled={selectedDispatchIds.length === 0}
                      className="px-4 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black shadow-xs disabled:opacity-40"
                    >
                      Import Selected LRs ({selectedDispatchIds.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
