import React, { useState, useEffect } from 'react';
import { DispatchRecord, LRItem, PlacementType, DispatchStatus } from '../types/dispatch';
import { LRItemForm } from './LRItemForm';
import { AIRouteMapsModal } from './AIRouteMapsModal';
import { AIMarketRateAdvisorModal } from './AIMarketRateAdvisorModal';
import { AISmartTextParserModal } from './AISmartTextParserModal';
import { ExtractedDispatch } from '../lib/geminiService';
import { 
  getMasters, 
  findVehicleMaster, 
  findPartyMaster, 
  findRouteMaster 
} from '../lib/mastersService';
import { RouteMaster } from '../types/masters';
import { 
  recalculateDispatchTotals, 
  generateSafeId, 
  formatCurrency, 
  formatVehicleNumber,
  calculateGrossMarketFreight,
  calculateNetMarketFreight
} from '../lib/calculations';
import { 
  Calendar, 
  Building2, 
  Truck, 
  Hash, 
  Plus, 
  Save, 
  RotateCcw, 
  Shield, 
  Phone, 
  User, 
  AlertTriangle,
  Sparkles,
  MapPin,
  TrendingUp,
  ExternalLink,
  Check,
  Route
} from 'lucide-react';

interface DispatchFormProps {
  initialRecord?: DispatchRecord | null;
  onSave: (record: DispatchRecord) => Promise<void>;
  onCancel?: () => void;
  isOnline: boolean;
  existingParties?: string[];
  existingTransporters?: string[];
}

export const DispatchForm: React.FC<DispatchFormProps> = ({
  initialRecord,
  onSave,
  onCancel,
  isOnline,
  existingParties = [],
  existingTransporters = [],
}) => {
  const [date, setDate] = useState(
    initialRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [fromParty, setFromParty] = useState(initialRecord?.fromParty || '');
  const [toParty, setToParty] = useState(initialRecord?.toParty || '');
  const [placement, setPlacement] = useState<PlacementType>(
    initialRecord?.placement || 'Market'
  );
  const [transporterName, setTransporterName] = useState(
    initialRecord?.transporterName || ''
  );
  const [vehicleNumber, setVehicleNumber] = useState(
    initialRecord?.vehicleNumber || ''
  );
  const [driverName, setDriverName] = useState(initialRecord?.driverName || '');
  const [driverPhone, setDriverPhone] = useState(initialRecord?.driverPhone || '');
  const [status, setStatus] = useState<DispatchStatus>(
    initialRecord?.status || 'Confirmed'
  );
  const [notes, setNotes] = useState(initialRecord?.notes || '');

  // LRs collection inside this dispatch
  const [lrs, setLrs] = useState<LRItem[]>(() => {
    if (initialRecord?.lrs && initialRecord.lrs.length > 0) {
      return initialRecord.lrs;
    }
    // Default initial blank LR
    return [
      {
        id: generateSafeId('lr'),
        lrNumber: '',
        lrDate: new Date().toISOString().split('T')[0],
        consignorName: '',
        consignorCity: '',
        consigneeName: '',
        consigneeCity: '',
        invoiceNumbers: [],
        ewaybillNumbers: [],
        weight: 0,
        weightUnit: 'MT',
        rate: 0,
        rateType: 'per_mt',
        freightAmount: 0,
        advanceAmount: 0,
        extraCharges: 0,
        remarks: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: '',
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // AI Modal States
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [rateAdvisorTargetLR, setRateAdvisorTargetLR] = useState<LRItem | null>(null);

  // Masters Data State & Automation Notices
  const [masters] = useState(() => getMasters());
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);
  const [matchedRoute, setMatchedRoute] = useState<RouteMaster | null>(null);

  // Handle AI Auto-extracted dispatch from text
  const handleApplyExtracted = (extracted: ExtractedDispatch) => {
    if (extracted.date) setDate(extracted.date);
    if (extracted.placement) setPlacement(extracted.placement);
    if (extracted.vehicleNumber) setVehicleNumber(formatVehicleNumber(extracted.vehicleNumber));
    if (extracted.fromParty) setFromParty(extracted.fromParty);
    if (extracted.toParty) setToParty(extracted.toParty);
    if (extracted.transporterName) setTransporterName(extracted.transporterName);
    if (extracted.driverName) setDriverName(extracted.driverName);
    if (extracted.driverPhone) setDriverPhone(extracted.driverPhone);
    if (extracted.notes) {
      setNotes((prev) => (prev ? `${prev}\n${extracted.notes}` : extracted.notes || ''));
    }

    if (extracted.lrs && extracted.lrs.length > 0) {
      const mappedLRs: LRItem[] = extracted.lrs.map((extLR, idx) => {
        const weight = extLR.weight || 0;
        const rate = extLR.rate || 0;
        const freight = extLR.freightAmount || Math.round(weight * rate);
        const mWeight = extLR.marketWeight || (extracted.placement === 'Market' ? weight : 0);
        const mRate = extLR.marketRate || 0;
        const grossM = calculateGrossMarketFreight(mWeight, mRate);
        const comm = extLR.marketCommission || 0;
        const adv = extLR.marketAdvance || 0;
        const netM = calculateNetMarketFreight(grossM, comm, adv);

        return {
          id: generateSafeId('lr'),
          lrNumber: extLR.lrNumber || `LR-${Date.now().toString().slice(-4)}-${idx + 1}`,
          lrDate: extLR.lrDate || (extracted.date || date),
          consignorName: extLR.consignorName || extracted.fromParty || fromParty,
          consignorCity: extLR.consignorCity || '',
          consigneeName: extLR.consigneeName || extracted.toParty || toParty,
          consigneeCity: extLR.consigneeCity || '',
          invoiceNumbers: extLR.invoiceNumbers && extLR.invoiceNumbers.length > 0
            ? extLR.invoiceNumbers
            : (extLR as any).invoiceNumber
            ? [(extLR as any).invoiceNumber]
            : [],
          ewaybillNumbers: extLR.ewaybillNumbers && extLR.ewaybillNumbers.length > 0
            ? extLR.ewaybillNumbers
            : (extLR as any).ewayBillNumber
            ? [(extLR as any).ewayBillNumber]
            : [],
          weight: weight,
          weightUnit: (extLR.weightUnit as any) || 'MT',
          rate: rate,
          rateType: (extLR.rateType as any) || 'per_mt',
          freightAmount: freight,
          advanceAmount: extLR.advanceAmount || 0,
          extraCharges: extLR.extraCharges || 0,
          marketWeight: mWeight,
          marketRate: mRate,
          grossMarketFreight: grossM,
          marketCommission: comm,
          marketAdvance: adv,
          netMarketFreight: netM,
          remarks: extLR.remarks || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: '',
        };
      });
      setLrs(mappedLRs);
    }
  };

  const handleApplyRouteDistance = (distanceKm: number) => {
    const routeTag = `[Google Maps Grounded Route: ~${distanceKm} km]`;
    setNotes((prev) => (prev ? `${prev} | ${routeTag}` : routeTag));
  };

  const handleApplyRecommendedRate = (recommendedRate: number, commission?: number, advancePercent?: number) => {
    if (!rateAdvisorTargetLR) return;
    const targetId = rateAdvisorTargetLR.id;
    setLrs((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        const mWeight = item.marketWeight || item.weight || 0;
        const gross = calculateGrossMarketFreight(mWeight, recommendedRate);
        const comm = commission !== undefined ? commission : (item.marketCommission || 500);
        const adv = advancePercent ? Math.round(gross * (advancePercent / 100)) : (item.marketAdvance || 0);
        const net = calculateNetMarketFreight(gross, comm, adv);
        return {
          ...item,
          marketRate: recommendedRate,
          grossMarketFreight: gross,
          marketCommission: comm,
          marketAdvance: adv,
          netMarketFreight: net,
        };
      })
    );
  };

  // Recalculate totals automatically whenever LRs list changes or placement changes
  const totals = recalculateDispatchTotals(lrs, placement);

  // Handle vehicle number input with Vehicle Master Auto-Fill
  const handleVehicleChange = (val: string) => {
    const formatted = formatVehicleNumber(val);
    setVehicleNumber(formatted);

    // Auto-fill from Vehicle Master if registered
    const matchedVeh = findVehicleMaster(formatted);
    if (matchedVeh) {
      setPlacement(matchedVeh.placement);
      if (matchedVeh.transporterName) setTransporterName(matchedVeh.transporterName);
      if (matchedVeh.driverName) setDriverName(matchedVeh.driverName);
      if (matchedVeh.driverPhone) setDriverPhone(matchedVeh.driverPhone);

      // Pre-fill weight on LR 1 if blank
      setLrs((prev) =>
        prev.map((lr, idx) => {
          if (idx === 0 && (!lr.weight || lr.weight === 0) && matchedVeh.capacityMT) {
            return {
              ...lr,
              weight: matchedVeh.capacityMT,
              marketWeight: matchedVeh.placement === 'Market' ? matchedVeh.capacityMT : (lr.marketWeight || 0),
            };
          }
          return lr;
        })
      );

      setAutoFillNotice(`⚡ Auto-filled specs from Vehicle Master: ${matchedVeh.vehicleType} (${matchedVeh.capacityMT} MT), ${matchedVeh.placement} fleet!`);
      setTimeout(() => setAutoFillNotice(null), 6000);
    }
  };

  const handleFromPartyChange = (val: string) => {
    setFromParty(val);
    const pty = findPartyMaster(val);
    if (pty) {
      setLrs((prev) =>
        prev.map((lr, i) => (i === 0 && !lr.consignorCity ? { ...lr, consignorName: pty.name, consignorCity: pty.city } : lr))
      );
    }
    const rt = findRouteMaster(val, toParty);
    setMatchedRoute(rt || null);
  };

  const handleToPartyChange = (val: string) => {
    setToParty(val);
    const pty = findPartyMaster(val);
    if (pty) {
      setLrs((prev) =>
        prev.map((lr, i) => (i === 0 && !lr.consigneeCity ? { ...lr, consigneeName: pty.name, consigneeCity: pty.city } : lr))
      );
    }
    const rt = findRouteMaster(fromParty, val);
    setMatchedRoute(rt || null);
  };

  const handleApplyRouteBenchmarks = () => {
    if (!matchedRoute) return;
    const corridorTag = `[Corridor: ${matchedRoute.origin} → ${matchedRoute.destination} | ${matchedRoute.distanceKm} km | Est. ${matchedRoute.transitDays} Days | Hwy: ${matchedRoute.primaryHighways || 'NH'}]`;
    setNotes((prev) => (prev ? `${prev}\n${corridorTag}` : corridorTag));

    // Update first LR rate if 0
    setLrs((prev) =>
      prev.map((lr, i) => {
        if (i === 0 && (!lr.rate || lr.rate === 0)) {
          const w = lr.weight || 20;
          return {
            ...lr,
            rate: matchedRoute.benchmarkRatePerMT,
            freightAmount: Math.round(w * matchedRoute.benchmarkRatePerMT),
            marketRate: lr.marketRate || Math.round(matchedRoute.benchmarkRatePerMT * 0.9),
          };
        }
        return lr;
      })
    );
    setAutoFillNotice(`⚡ Applied Route Master benchmark (₹${matchedRoute.benchmarkRatePerMT}/MT, ${matchedRoute.distanceKm} km)!`);
    setTimeout(() => setAutoFillNotice(null), 5000);
  };

  // Update a single LR
  const handleLRChange = (index: number, updated: LRItem) => {
    setLrs((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  // Add a new empty LR
  const handleAddLR = () => {
    const lastLR = lrs[lrs.length - 1];
    const newLR: LRItem = {
      id: generateSafeId('lr'),
      lrNumber: '',
      lrDate: date || new Date().toISOString().split('T')[0],
      consignorName: lastLR?.consignorName || fromParty || '',
      consignorCity: lastLR?.consignorCity || '',
      consigneeName: lastLR?.consigneeName || toParty || '',
      consigneeCity: lastLR?.consigneeCity || '',
      invoiceNumbers: [],
      ewaybillNumbers: [],
      weight: 0,
      weightUnit: 'MT',
      rate: 0,
      rateType: 'per_mt',
      freightAmount: 0,
      advanceAmount: 0,
      extraCharges: 0,
      marketWeight: 0,
      marketRate: 0,
      grossMarketFreight: 0,
      marketCommission: 0,
      marketAdvance: 0,
      netMarketFreight: 0,
      remarks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: '',
    };
    setLrs((prev) => [...prev, newLR]);
  };

  // Duplicate an LR
  const handleDuplicateLR = (index: number) => {
    const target = lrs[index];
    const duplicated: LRItem = {
      ...target,
      id: generateSafeId('lr'),
      lrNumber: target.lrNumber ? `${target.lrNumber}-COPY` : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLrs((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
  };

  // Delete an LR
  const handleDeleteLR = (index: number) => {
    if (lrs.length <= 1) {
      setValidationError('At least one LR consignment is required for every dispatch.');
      return;
    }
    setLrs((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset form
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset this form?')) {
      setDate(new Date().toISOString().split('T')[0]);
      setFromParty('');
      setToParty('');
      setPlacement('Market');
      setTransporterName('');
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      setNotes('');
      setLrs([
        {
          id: generateSafeId('lr'),
          lrNumber: '',
          lrDate: new Date().toISOString().split('T')[0],
          consignorName: '',
          consignorCity: '',
          consigneeName: '',
          consigneeCity: '',
          invoiceNumbers: [],
          ewaybillNumbers: [],
          weight: 0,
          weightUnit: 'MT',
          rate: 0,
          rateType: 'per_mt',
          freightAmount: 0,
          advanceAmount: 0,
          extraCharges: 0,
          remarks: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: '',
        },
      ]);
      setValidationError(null);
    }
  };

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    if (!vehicleNumber.trim()) {
      setValidationError('Vehicle number is required.');
      return;
    }
    if (!fromParty.trim()) {
      setValidationError('From Party (Origin) is required.');
      return;
    }
    if (!toParty.trim()) {
      setValidationError('To Party (Destination) is required.');
      return;
    }
    if (!transporterName.trim()) {
      setValidationError('Transporter Name is required.');
      return;
    }

    if (lrs.length === 0) {
      setValidationError('Please add at least one LR record.');
      return;
    }

    for (let i = 0; i < lrs.length; i++) {
      const lr = lrs[i];
      if (!lr.lrNumber.trim()) {
        setValidationError(`LR #${i + 1} is missing the LR Number.`);
        return;
      }
      if (!lr.consignorName.trim()) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) is missing Consignor Name.`);
        return;
      }
      if (!lr.consignorCity.trim()) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) is missing Consignor City.`);
        return;
      }
      if (!lr.consigneeName.trim()) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) is missing Consignee Name.`);
        return;
      }
      if (!lr.consigneeCity.trim()) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) is missing Consignee City.`);
        return;
      }
      if (!lr.weight || lr.weight <= 0) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) has invalid weight.`);
        return;
      }
      if (lr.rate < 0) {
        setValidationError(`LR #${i + 1} (${lr.lrNumber}) has negative rate.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const dispatchId = initialRecord?.id || generateSafeId('dsp');
      const record: DispatchRecord = {
        id: dispatchId,
        date,
        fromParty: fromParty.trim(),
        toParty: toParty.trim(),
        placement,
        transporterName: transporterName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        lrNumbers: totals.lrNumbers,
        lrs,
        totalWeight: totals.totalWeight,
        totalFreightAmount: totals.totalFreightAmount,
        totalAdvance: totals.totalAdvance,
        totalExtraCharges: totals.totalExtraCharges,
        netPayable: totals.netPayable,
        totalLrsCount: totals.totalLrsCount,
        totalGrossMarketFreight: totals.totalGrossMarketFreight,
        totalMarketCommission: totals.totalMarketCommission,
        totalMarketAdvance: totals.totalMarketAdvance,
        totalNetMarketFreight: totals.totalNetMarketFreight,
        marketMargin: totals.marketMargin,
        status,
        notes: notes.trim(),
        createdAt: initialRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: initialRecord?.ownerId || 'current-user',
      };

      await onSave(record);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Error saving dispatch record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
              <Truck className="h-6 w-6 text-slate-900" />
            </span>
            <span>{initialRecord ? 'Edit Dispatch & LR Record' : 'New Dispatch Data Entry'}</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Record vehicle placement, transporter, multiple LRs, invoices, e-waybills & freight costs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-bold hidden sm:inline">Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DispatchStatus)}
            className="bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00E676] cursor-pointer"
          >
            <option value="Confirmed">Confirmed</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* AI Copilot Intelligence Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#00E676] to-[#00c864] flex items-center justify-center text-slate-950 font-black shadow-xs border border-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-slate-950 tracking-tight">Gemini AI Logistics Copilot</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300">
                Maps Grounded
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Auto-extract full dispatch details from raw text/WhatsApp, or analyze real-world highway routes & mileage.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={() => setIsParserOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-emerald-400 text-xs font-black shadow-xs flex items-center space-x-1.5 transition-all hover:border-emerald-500"
            title="Paste WhatsApp text, transporter SMS, or challan summary to auto-populate form"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>AI Smart Text / WhatsApp Parser</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRouteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 border border-emerald-500 text-xs font-black shadow-xs flex items-center space-x-1.5 transition-all"
            title="Run Google Maps Grounded Route & Distance calculation"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-950" />
            <span>AI Maps Route & Transit</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TRIP & VEHICLE PARTICULARS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
            <Building2 className="h-4 w-4" />
          </span>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            1. Trip & Vehicle Particulars
          </h3>
        </div>

        {/* Row 1: Date, Placement (Market/Own), Vehicle Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Dispatch Date <span className="text-rose-600">*</span></span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>

          {/* Placement: Market or Own */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              <span>Placement Type <span className="text-rose-600">*</span></span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlacement('Market')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
                  placement === 'Market'
                    ? 'bg-[#FFB700] hover:bg-[#e6a500] text-stone-950 shadow-xs border border-amber-500'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>Market Vehicle</span>
              </button>
              <button
                type="button"
                onClick={() => setPlacement('Own')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
                  placement === 'Own'
                    ? 'bg-[#00E676] hover:bg-[#00c864] text-slate-950 shadow-xs border border-emerald-500'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>Own Fleet</span>
              </button>
            </div>
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Truck className="h-3.5 w-3.5 text-slate-500" />
                <span>Vehicle Number <span className="text-rose-600">*</span></span>
              </span>
              <span className="text-[10px] text-emerald-800 font-bold">Auto-fills from Master</span>
            </label>
            <input
              type="text"
              required
              list="vehicles-list"
              placeholder="e.g. MH 12 RN 4589"
              value={vehicleNumber}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 placeholder-slate-400 font-mono uppercase tracking-wider font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>
        </div>

        {/* Master Auto-Fill Notice */}
        {autoFillNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-black rounded-xl flex items-center space-x-2 animate-in fade-in duration-150 shadow-xs">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{autoFillNotice}</span>
          </div>
        )}

        {/* Row 2: From Party & To Party with AI Maps Route trigger */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Dispatch Route Corridor</span>
            <button
              type="button"
              onClick={() => setIsRouteModalOpen(true)}
              className="text-xs font-black text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors shadow-xs"
              title="Calculate route distance and transit time via Google Maps Grounding"
            >
              <MapPin className="h-3.5 w-3.5 text-emerald-700" />
              <span>Verify Distance with Google Maps (AI)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                From Party (Origin / Billing Party) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                list="parties-list"
                placeholder="e.g. Tata Steel Processing Ltd"
                value={fromParty}
                onChange={(e) => handleFromPartyChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                To Party (Destination / Client) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                list="parties-list"
                placeholder="e.g. Larsen & Toubro Infra Projects"
                value={toParty}
                onChange={(e) => handleToPartyChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>
          </div>

          {/* Matched Route Master Banner */}
          {matchedRoute && (
            <div className="p-3 bg-sky-50 border border-sky-300 text-sky-950 text-xs rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center space-x-2 font-bold">
                <Route className="h-4 w-4 text-sky-700 flex-shrink-0" />
                <span>
                  Matched Route Master: <strong>{matchedRoute.origin} → {matchedRoute.destination}</strong> ({matchedRoute.distanceKm} km, Benchmark: ₹{matchedRoute.benchmarkRatePerMT}/MT, Transit: {matchedRoute.transitDays} Days)
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyRouteBenchmarks}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-lg text-[11px] shadow-xs cursor-pointer"
              >
                Apply Corridor Benchmark (₹{matchedRoute.benchmarkRatePerMT}/MT)
              </button>
            </div>
          )}
        </div>

        {/* Row 3: Transporter Name & Driver details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transporter Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              list="transporters-list"
              placeholder={
                placement === 'Own'
                  ? 'e.g. Own Fleet Division #1'
                  : 'e.g. Patel Roadways Logistics Ltd'
              }
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Driver Name (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Singh"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              <span>Driver Mobile (Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. +91 98234 11204"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>
        </div>

        {/* Suggestion datalists powered by Masters */}
        <datalist id="parties-list">
          {Array.from(new Set([...masters.parties.map((p) => p.name), ...existingParties])).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="vehicles-list">
          {masters.vehicles.map((v) => (
            <option key={v.id} value={v.vehicleNumber}>
              {v.vehicleType} • {v.capacityMT} MT ({v.placement})
            </option>
          ))}
        </datalist>
        <datalist id="transporters-list">
          {Array.from(new Set([...masters.transporters.map((t) => t.name), ...existingTransporters])).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="commodities-list">
          {masters.commodities.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </div>

      {/* SECTION 2: INSIDE LR NUMBER (MULTIPLE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
              <Hash className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              2. Inside LR Number (Multiple LRs)
            </h3>
            <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full font-mono font-black border border-slate-300">
              {lrs.length} {lrs.length === 1 ? 'LR' : 'LRs'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddLR}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs font-black shadow-xs border border-emerald-400 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add Another LR (+)</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Enter individual Consignment Notes / Lorry Receipts with multiple invoices, e-waybills, cargo weight, and rate. Costs will automatically calculate below.
        </p>

        {/* List of LRs */}
        {lrs.map((lr, index) => (
          <LRItemForm
            key={lr.id}
            item={lr}
            index={index}
            totalCount={lrs.length}
            placement={placement}
            onChange={(updated) => handleLRChange(index, updated)}
            onDelete={() => handleDeleteLR(index)}
            onDuplicate={() => handleDuplicateLR(index)}
            onOpenRateAdvisor={(targetItem) => setRateAdvisorTargetLR(targetItem)}
          />
        ))}

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleAddLR}
            className="flex items-center space-x-2 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-[#00E676] hover:bg-emerald-50/50 text-slate-700 hover:text-slate-950 rounded-2xl text-xs font-bold transition-all w-full justify-center bg-white shadow-xs"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Click to Add Another LR (Consignment Note) to this Vehicle</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: TRIP NOTES / SPECIAL INSTRUCTIONS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Trip Notes / Special Delivery Instructions (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Tarpaulin cover required, GPS monitored route, Delivery acknowledgment slip needed."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
        />
      </div>

      {/* SECTION 4: AUTO-CALCULATED TOTAL COSTS SUMMARY & ACTION DOCK */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Summary Stats */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs w-full md:w-auto">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total LRs</span>
              <span className="font-black text-slate-950 text-base font-mono">{totals.totalLrsCount}</span>
            </div>

            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Cargo Weight</span>
              <span className="font-black text-amber-800 text-base font-mono">{totals.totalWeight} MT</span>
            </div>

            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                {placement === 'Market' ? 'Client Billing' : 'Total Freight'}
              </span>
              <span className="font-black text-emerald-700 text-base font-mono">{formatCurrency(totals.totalFreightAmount)}</span>
            </div>

            {placement === 'Market' ? (
              <>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-amber-800 block text-[10px] uppercase font-bold">Gross Market Hire</span>
                  <span className="font-black text-amber-900 text-base font-mono">{formatCurrency(totals.totalGrossMarketFreight)}</span>
                </div>

                <div className="border-l border-slate-200 pl-3 hidden sm:block">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Deductions (Comm + Adv)</span>
                  <span className="font-bold text-rose-700 text-base font-mono">
                    -{formatCurrency(totals.totalMarketCommission + totals.totalMarketAdvance)}
                  </span>
                </div>

                <div className="border-l border-slate-200 pl-3">
                  <span className="text-amber-900 block text-[10px] uppercase font-black">Net Market Payable</span>
                  <span className="font-black text-amber-950 text-base font-mono">{formatCurrency(totals.totalNetMarketFreight)}</span>
                </div>

                <div className="border-l border-slate-200 pl-3 hidden md:block">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Gross Margin</span>
                  <span className="font-black text-emerald-800 text-base font-mono">{formatCurrency(totals.marketMargin)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="border-l border-slate-200 pl-3 hidden sm:block">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Advance</span>
                  <span className="font-bold text-slate-700 text-base font-mono">{formatCurrency(totals.totalAdvance)}</span>
                </div>

                <div className="border-l border-slate-200 pl-3">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Net Balance Payable</span>
                  <span className="font-black text-slate-950 text-base font-mono">{formatCurrency(totals.netPayable)}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center space-x-1 border border-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black text-xs sm:text-sm shadow-xs border border-emerald-400 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Saving...' : initialRecord ? 'Update Dispatch' : 'Save Dispatch Record'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Smart Text / WhatsApp Parser Modal */}
      <AISmartTextParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        onApplyExtracted={handleApplyExtracted}
      />

      {/* AI Google Maps Grounded Route & Distance Modal */}
      <AIRouteMapsModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        defaultOrigin={fromParty}
        defaultDestination={toParty}
        vehicleType={placement === 'Market' ? 'Market Commercial Truck' : 'Dedicated Fleet Vehicle'}
        cargoWeight={totals.totalWeight}
        onApplyDistance={handleApplyRouteDistance}
      />

      {/* AI Market Rate Benchmark & Negotiation Modal */}
      {rateAdvisorTargetLR && (
        <AIMarketRateAdvisorModal
          isOpen={Boolean(rateAdvisorTargetLR)}
          onClose={() => setRateAdvisorTargetLR(null)}
          origin={rateAdvisorTargetLR.consignorCity || fromParty}
          destination={rateAdvisorTargetLR.consigneeCity || toParty}
          weightMT={rateAdvisorTargetLR.marketWeight || rateAdvisorTargetLR.weight || 10}
          currentRate={rateAdvisorTargetLR.marketRate}
          billingRate={rateAdvisorTargetLR.rate}
          cargoType={rateAdvisorTargetLR.remarks || 'Industrial Freight'}
          onApplyRate={handleApplyRecommendedRate}
        />
      )}
    </form>
  );
};
