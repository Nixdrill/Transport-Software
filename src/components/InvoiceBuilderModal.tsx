import React, { useState, useEffect, useMemo } from 'react';
import { 
  FreightInvoice, 
  InvoiceLineItem, 
  InvoiceType, 
  BillerCompanyInfo 
} from '../types/invoice';
import { DispatchRecord } from '../types/dispatch';
import { PartyMaster } from '../types/masters';
import { 
  getMasters, 
  findPartyMaster 
} from '../lib/mastersService';
import { 
  getBillerProfile, 
  generateNextInvoiceNumber, 
  calculateInvoiceTotals, 
  getStateCode 
} from '../lib/invoiceService';
import { formatCurrency, generateSafeId } from '../lib/calculations';
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
  Layers
} from 'lucide-react';

interface InvoiceBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: FreightInvoice, autoPrint?: boolean) => void;
  initialDispatch?: DispatchRecord | null;
  editingInvoice?: FreightInvoice | null;
  allDispatches: DispatchRecord[];
}

export const InvoiceBuilderModal: React.FC<InvoiceBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDispatch,
  editingInvoice,
  allDispatches,
}) => {
  const masters = useMemo(() => getMasters(), [isOpen]);
  const biller = useMemo(() => getBillerProfile(), [isOpen]);

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

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Multi-dispatch selector modal state
  const [showDispatchPicker, setShowDispatchPicker] = useState(false);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<string[]>([]);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);

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
    }
  }, [isOpen, initialDispatch, editingInvoice]);

  // Handle party selection from masters
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
      return;
    }
    if (!invoiceNumber.trim()) {
      setValidationError('Invoice Number is required.');
      return;
    }
    if (lineItems.length === 0) {
      setValidationError('At least one LR line item is required.');
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.lrNumber.trim()) {
        setValidationError(`Line item #${i + 1} is missing LR Number.`);
        return;
      }
      if (!item.vehicleNumber.trim()) {
        setValidationError(`Line item #${i + 1} (${item.lrNumber}) is missing Vehicle Number.`);
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
      preparedBy: 'Billing Officer',
      authorizedSignatoryName: `For ${biller.companyName}`,
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(finalInvoice, autoPrint);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-4 max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {editingInvoice ? 'Edit Freight Invoice' : 'Generate New Bill / Tax Invoice'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Create GST-compliant Goods Transport Agency (GTA) freight bills with auto-tax computation & LR items.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6 overflow-y-auto text-xs">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Top Invoice Metadata Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Invoice / Bill Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
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
                  className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none"
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State & Place of Supply *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra"
                  value={partyState}
                  onChange={(e) => setPartyState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  placeholder="e.g. AAACT2727Q"
                  value={partyPan}
                  onChange={(e) => setPartyPan(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="Manager Name"
                  value={partyContact}
                  onChange={(e) => setPartyContact(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91..."
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Consignment Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-indigo-700" />
                <h4 className="font-black text-slate-950 text-xs uppercase tracking-wide">
                  LR Consignment Line Items ({lineItems.length})
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                {/* Pick from Dispatches Button */}
                {allDispatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDispatchPicker(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold border border-indigo-200 flex items-center space-x-1.5 transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Select from Dispatches</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-3 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs bg-white">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 w-8">#</th>
                    <th className="p-2.5">LR No. & Date *</th>
                    <th className="p-2.5">Vehicle No. *</th>
                    <th className="p-2.5">Route (Origin ➔ Destination)</th>
                    <th className="p-2.5">Cargo Description</th>
                    <th className="p-2.5 w-24">Weight (MT)</th>
                    <th className="p-2.5 w-28">Rate & Type</th>
                    <th className="p-2.5 w-28 text-right">Freight (₹)</th>
                    <th className="p-2.5 w-8 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70">
                      <td className="p-2.5 font-mono text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="LR-001"
                          value={item.lrNumber}
                          onChange={(e) => handleUpdateLineItem(idx, 'lrNumber', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase text-slate-900"
                        />
                        <input
                          type="date"
                          value={item.lrDate || invoiceDate}
                          onChange={(e) => handleUpdateLineItem(idx, 'lrDate', e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          placeholder="MH 12 AB 1234"
                          value={item.vehicleNumber}
                          onChange={(e) => handleUpdateLineItem(idx, 'vehicleNumber', e.target.value.toUpperCase())}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono uppercase font-bold text-slate-900"
                        />
                      </td>

                      <td className="p-2.5 space-y-1">
                        <input
                          type="text"
                          placeholder="Origin (From)"
                          value={item.origin}
                          onChange={(e) => handleUpdateLineItem(idx, 'origin', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Destination (To)"
                          value={item.destination}
                          onChange={(e) => handleUpdateLineItem(idx, 'destination', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="e.g. Steel Coils"
                          value={item.commodity}
                          onChange={(e) => handleUpdateLineItem(idx, 'commodity', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.weight || ''}
                          onChange={(e) => handleUpdateLineItem(idx, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right"
                        />
                      </td>

                      <td className="p-2.5 space-y-1">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={item.rate || ''}
                          onChange={(e) => handleUpdateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-right"
                        />
                        <select
                          value={item.rateType}
                          onChange={(e) => handleUpdateLineItem(idx, 'rateType', e.target.value)}
                          className="w-full px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px]"
                        >
                          <option value="per_mt">Per MT</option>
                          <option value="per_kg">Per Kg</option>
                          <option value="fixed">Fixed Rate</option>
                        </select>
                      </td>

                      <td className="p-2.5 text-right font-mono font-black text-slate-900">
                        {formatCurrency(item.freightAmount)}
                      </td>

                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove Line Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST & Tax Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: GST Configuration */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                <Building2 className="h-4 w-4 text-slate-700" />
                <span>GST Rate & RCM Classification</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="5">5% (Standard GTA Rate)</option>
                    <option value="12">12% (Forward Charge with ITC)</option>
                    <option value="18">18% (Commercial / Courier)</option>
                    <option value="0">0% (Exempt Transport)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reverse Charge (RCM)?</label>
                  <select
                    value={isRcm ? 'yes' : 'no'}
                    onChange={(e) => setIsRcm(e.target.value === 'yes')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="yes">YES - Recipient Pays GST (RCM)</option>
                    <option value="no">NO - Charge GST in Bill (Forward)</option>
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

              {/* RCM Information Notice */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-snug">
                <strong>GST Note: </strong>
                {isRcm
                  ? 'Under 5% RCM, tax is payable by the recipient (Client). Bill total excludes GST amount from payable collection.'
                  : 'Under Forward Charge, GST is added to the bill and collected from the client.'}
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
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="h-4 w-4 text-emerald-700" />
              <span>Save & Print PDF</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs shadow-xs border border-emerald-400 flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4 text-slate-950" />
              <span>{editingInvoice ? 'Update Invoice' : 'Save Invoice to Ledger'}</span>
            </button>
          </div>
        </form>

        {/* MULTI-DISPATCH PICKER MODAL (Consolidated Billing) */}
        {showDispatchPicker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
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
                  onClick={() => setShowDispatchPicker(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 text-xs">
                {allDispatches.map((dsp) => {
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
                          onChange={() => {}} // Handled by parent div
                          className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
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
                })}
              </div>

              <div className="pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold">
                  {selectedDispatchIds.length} trip(s) selected
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDispatchPicker(false)}
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
                    Import Selected LRs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
