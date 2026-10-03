import React, { useState, useMemo } from 'react';
import { 
  FreightInvoice, 
  InvoiceCustomization, 
  InvoiceTemplateId 
} from '../types/invoice';
import { 
  DEFAULT_INVOICE_CUSTOMIZATION, 
  TEMPLATE_PRESETS,
  getStoredInvoiceCustomization 
} from '../lib/invoiceCustomizationDefaults';
import { 
  formatCustomCurrency, 
  formatCustomDate, 
  getFontFamilyClass, 
  getFontSizeScaleClasses, 
  getTableDensityClasses 
} from '../lib/invoiceFormatter';
import { UpiPaymentQr } from './UpiPaymentQr';
import { InvoiceCustomizerPanel } from './InvoiceCustomizerPanel';
import { 
  downloadInvoicePdfFromElement, 
  getInvoicePdfFileName 
} from '../lib/invoicePdfGenerator';
import { 
  Printer, 
  X, 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  ShieldCheck, 
  QrCode,
  FileText,
  Copy,
  Sliders,
  Sparkles,
  Download,
  Share2,
  Loader2
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: FreightInvoice | null;
  onClose: () => void;
  onUpdateInvoiceCustomization?: (customization: InvoiceCustomization) => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose,
  onUpdateInvoiceCustomization,
}) => {
  const [selectedCopy, setSelectedCopy] = useState<string>('Original for Recipient');
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [pdfStatus, setPdfStatus] = useState<string>('');

  // Initialize customization from invoice or stored defaults
  const [customization, setCustomization] = useState<InvoiceCustomization>(() => {
    if (invoice?.customization) {
      return {
        ...DEFAULT_INVOICE_CUSTOMIZATION,
        ...invoice.customization,
      };
    }
    return getStoredInvoiceCustomization();
  });

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('printable-invoice-container');
    if (!el || !invoice) return;
    setIsDownloadingPdf(true);
    setPdfStatus('Generating PDF...');
    try {
      const fileName = getInvoicePdfFileName(invoice);
      await downloadInvoicePdfFromElement(el, fileName, (msg) => setPdfStatus(msg));
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
      setPdfStatus('');
    }
  };

  const handleCustomizationChange = (updated: InvoiceCustomization) => {
    setCustomization(updated);
    if (onUpdateInvoiceCustomization) {
      onUpdateInvoiceCustomization(updated);
    }
  };

  const isRcm = invoice.isRcm;
  const isInterState = invoice.taxType === 'IGST';

  // Apply custom template preset
  const handleQuickTemplateChange = (tmplId: InvoiceTemplateId) => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === tmplId);
    if (!preset) return;
    handleCustomizationChange({
      ...customization,
      templateId: preset.id,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
    });
  };

  // Font family and sizing classes
  const fontClass = getFontFamilyClass(customization.fontFamily);
  const sizeClass = getFontSizeScaleClasses(customization.fontSize);
  const densityClass = getTableDensityClasses(customization.tableDensity);

  // Columns visibility & labels
  const cols = customization.columns || DEFAULT_INVOICE_CUSTOMIZATION.columns;

  // Custom charges
  const customChargesList = customization.customCharges || [];
  const extraChargesSum = customChargesList
    .filter((c) => !c.isDeduction)
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const deductionsSum = customChargesList
    .filter((c) => c.isDeduction)
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  // Final adjusted grand total preview with custom charges
  const finalDisplayTotal = Math.max(0, invoice.grandTotal + extraChargesSum - deductionsSum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-300 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none">
        
        {/* ================= MODAL TOP TOOLBAR (Hidden when printing) ================= */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2.5 print:hidden border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center space-x-2">
                <span>{customization.documentTitle || invoice.invoiceType}</span>
                <span className="text-slate-400 font-mono font-normal text-xs">• {invoice.invoiceNumber}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Billed to {invoice.billedTo.partyName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Quick Template Switcher Dropdown */}
            <div className="flex items-center space-x-1 bg-slate-800 rounded-xl px-2 py-1 border border-slate-700">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <select
                value={customization.templateId}
                onChange={(e) => handleQuickTemplateChange(e.target.value as InvoiceTemplateId)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {TEMPLATE_PRESETS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Copy Type Selector */}
            <div className="hidden md:flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
              {(['Original for Recipient', 'Duplicate for Transporter', 'Office Copy'] as const).map((copy) => (
                <button
                  key={copy}
                  type="button"
                  onClick={() => setSelectedCopy(copy)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedCopy === copy
                      ? 'bg-[#00E676] text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {copy.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Toggle Full Customizer Drawer */}
            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border ${
                showCustomizer
                  ? 'bg-slate-800 text-[#00E676] border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showCustomizer ? 'Close Styler' : 'Customize Look'}</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-600 transition-all cursor-pointer disabled:opacity-60"
              title="Download direct high-resolution vector/raster PDF file"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{pdfStatus || 'Saving PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================= CUSTOMIZER EXPANDABLE DRAWER (Print Hidden) ================= */}
        {showCustomizer && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 print:hidden animate-in slide-in-from-top-4 duration-200">
            <InvoiceCustomizerPanel
              customization={customization}
              onChange={handleCustomizationChange}
              onSaveAsDefault={() => {}}
            />
          </div>
        )}

        {/* ================= PRINTABLE DOCUMENT CANVAS ================= */}
        <div 
          id="printable-invoice-container"
          className={`p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto print:p-0 print:m-0 print:overflow-visible relative ${fontClass} ${sizeClass}`}
          style={{
            // CSS variable overrides for custom theme colors
            ['--theme-primary' as any]: customization.primaryColor,
            ['--theme-accent' as any]: customization.accentColor,
          }}
        >
          {/* Watermark Overlay */}
          {customization.showWatermark && customization.watermarkText && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-0"
              style={{ opacity: customization.watermarkOpacity || 0.08 }}
            >
              <span className="text-7xl sm:text-9xl font-black uppercase font-mono tracking-widest rotate-[-30deg] border-8 border-dashed border-current p-8 rounded-3xl">
                {customization.watermarkText}
              </span>
            </div>
          )}

          <div className="relative z-10 space-y-4">
            
            {/* 1. TOP HEADER & LOGO SECTION */}
            <div 
              className="flex flex-wrap justify-between items-start pb-4 border-b-2 gap-4"
              style={{ borderColor: customization.primaryColor }}
            >
              {/* Left/Center Logo & Company Header */}
              <div className="flex items-start space-x-3">
                {customization.showLogo && customization.logoUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={customization.logoUrl}
                      alt="Company Logo"
                      className={`object-contain rounded ${
                        customization.logoSize === 'small'
                          ? 'h-10 max-w-[100px]'
                          : customization.logoSize === 'large'
                          ? 'h-20 max-w-[180px]'
                          : 'h-14 max-w-[140px]'
                      }`}
                    />
                  </div>
                )}
                <div>
                  <span 
                    className="text-[10px] font-mono uppercase tracking-widest font-black block"
                    style={{ color: customization.primaryColor }}
                  >
                    {customization.subTitle || 'GOODS TRANSPORT AGENCY (GTA) ROAD FREIGHT'}
                  </span>
                  <h1 
                    className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
                    style={{ color: customization.primaryColor }}
                  >
                    {customization.documentTitle || invoice.invoiceType}
                  </h1>
                  {customization.sacDescription && (
                    <span className="text-[10px] text-slate-600 font-semibold block">
                      SAC: <strong className="font-mono text-slate-900">{invoice.sacCode || '996511'}</strong> — {customization.sacDescription}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Copy Badge & Document Numbers */}
              <div className="text-right flex flex-col items-end">
                <span 
                  className="text-[10px] font-black uppercase px-2.5 py-1 rounded border mb-1.5 shadow-2xs"
                  style={{
                    backgroundColor: `${customization.primaryColor}15`,
                    borderColor: customization.primaryColor,
                    color: customization.primaryColor,
                  }}
                >
                  {customization.copyType === 'Custom' && customization.customCopyLabel
                    ? customization.customCopyLabel
                    : selectedCopy}
                </span>
                
                <div className="text-xs text-slate-700 font-semibold">
                  {customization.invoiceNumberLabel || 'Invoice No'}:{' '}
                  <strong className="font-mono text-base font-black text-slate-950">
                    {invoice.invoiceNumber}
                  </strong>
                </div>

                <div className="text-[11px] text-slate-600 space-x-2">
                  <span>
                    {customization.invoiceDateLabel || 'Date'}:{' '}
                    <strong className="font-mono font-bold text-slate-900">
                      {formatCustomDate(invoice.invoiceDate, customization.dateFormat)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    {customization.dueDateLabel || 'Due'}:{' '}
                    <strong className="font-mono font-bold text-slate-900">
                      {formatCustomDate(invoice.dueDate, customization.dateFormat)}
                    </strong>
                  </span>
                </div>

                {/* Additional Reference Fields (PO / E-Way Bill / Place of Supply) */}
                {(customization.poNumber || customization.eWayBillNumber || customization.placeOfSupply) && (
                  <div className="text-[10px] text-slate-600 space-x-2 pt-1 font-medium">
                    {customization.poNumber && (
                      <span>PO No: <strong className="font-mono font-bold text-slate-900">{customization.poNumber}</strong></span>
                    )}
                    {customization.eWayBillNumber && (
                      <span>E-Way: <strong className="font-mono font-bold text-slate-900">{customization.eWayBillNumber}</strong></span>
                    )}
                    {customization.placeOfSupply && (
                      <span>Place of Supply: <strong>{customization.placeOfSupply}</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. ISSUER (BILLED BY), CLIENT (BILLED TO) & SHIP-TO (CONSIGNEE) CARDS */}
            <div className={`grid gap-3.5 ${customization.showShipToAddress ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              
              {/* COLUMN 1: ISSUER (BILLED BY) */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-1">
                <span 
                  className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded inline-block mb-1"
                  style={{
                    backgroundColor: `${customization.primaryColor}15`,
                    color: customization.primaryColor,
                  }}
                >
                  Transport Service Provider (Issuer)
                </span>
                <div className="font-black text-slate-950 text-sm leading-tight">
                  {invoice.billedBy.companyName}
                </div>
                {invoice.billedBy.tagline && (
                  <div className="text-[10px] text-slate-500 italic font-medium">{invoice.billedBy.tagline}</div>
                )}
                <div className="text-[11px] text-slate-600 leading-snug">
                  {invoice.billedBy.address}, {invoice.billedBy.city}, {invoice.billedBy.state} - {invoice.billedBy.pincode}
                </div>

                {/* Tax Reg & Contact Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  {customization.showBillerGstin && (
                    <div>
                      <span className="text-slate-500 font-semibold">GSTIN: </span>
                      <strong className="font-mono text-slate-900">{invoice.billedBy.gstin || 'N/A'}</strong>
                    </div>
                  )}
                  {customization.showBillerPan && (
                    <div>
                      <span className="text-slate-500 font-semibold">PAN: </span>
                      <strong className="font-mono text-slate-900">{invoice.billedBy.panNumber || 'N/A'}</strong>
                    </div>
                  )}
                  {customization.showBillerCin && customization.billerCin && (
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold">CIN/MSME: </span>
                      <strong className="font-mono text-slate-900">{customization.billerCin}</strong>
                    </div>
                  )}
                </div>

                {customization.showBillerContact && (
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    Phone: {invoice.billedBy.phone} | Email: {invoice.billedBy.email}
                  </div>
                )}
              </div>

              {/* COLUMN 2: CLIENT (BILLED TO) */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-1">
                <span 
                  className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded inline-block mb-1"
                  style={{
                    backgroundColor: `${customization.accentColor}25`,
                    color: '#047857',
                  }}
                >
                  Billed To (Client / Consignor / Consignee)
                </span>
                <div className="font-black text-slate-950 text-sm leading-tight">
                  {invoice.billedTo.partyName}
                </div>
                <div className="text-[11px] text-slate-600 leading-snug">
                  {invoice.billedTo.address || `${invoice.billedTo.city || ''}, ${invoice.billedTo.state || ''}`}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  {customization.showPartyGstin && (
                    <div>
                      <span className="text-slate-500 font-semibold">GSTIN: </span>
                      <strong className="font-mono text-slate-900">{invoice.billedTo.gstin || 'Unregistered'}</strong>
                    </div>
                  )}
                  {customization.showPartyPan && (
                    <div>
                      <span className="text-slate-500 font-semibold">PAN: </span>
                      <strong className="font-mono text-slate-900">{invoice.billedTo.panNumber || 'N/A'}</strong>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 flex items-center space-x-2 flex-wrap">
                  <span>State: <strong>{invoice.billedTo.state || 'Maharashtra'}</strong></span>
                  <span>•</span>
                  <span>State Code: <strong className="font-mono">{invoice.billedTo.stateCode || '27'}</strong></span>
                  {customization.showPartyContact && invoice.billedTo.contactPerson && (
                    <>
                      <span>•</span>
                      <span>Attn: {invoice.billedTo.contactPerson}</span>
                    </>
                  )}
                </div>
              </div>

              {/* COLUMN 3: SEPARATE SHIP-TO / DESTINATION (If Enabled) */}
              {customization.showShipToAddress && (
                <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded inline-block mb-1 bg-sky-100 text-sky-900">
                    Ship-To / Delivery Consignee Plant
                  </span>
                  <div className="font-black text-slate-950 text-sm leading-tight">
                    {customization.shipTo?.partyName || 'Destination Plant / Warehouse'}
                  </div>
                  <div className="text-[11px] text-slate-600 leading-snug">
                    {customization.shipTo?.address || 'Site Delivery Location'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    City/State: <strong>{customization.shipTo?.city || 'Destination Site'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3. REVERSE CHARGE (RCM) NOTIFICATION BANNER */}
            {customization.showRcmBanner && (
              <div 
                className={`px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  isRcm 
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-slate-900" />
                  <span>
                    Tax Payable under Reverse Charge (RCM):{' '}
                    <strong className="uppercase font-black text-slate-950">
                      {isRcm ? 'YES (Recipient liable to pay GST)' : 'NO (Forward Charge GST charged in Bill)'}
                    </strong>
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white border border-slate-300">
                  {customization.rcmNotificationText || 'GTA Notification No. 11/2017-CT(R)'}
                </span>
              </div>
            )}

            {/* 4. CONSIGNMENT LR ITEMS TABLE (With Configurable Columns) */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr 
                    className="text-white font-bold text-[11px]"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {cols.srNo.visible && <th className="border border-slate-400/50 p-2 text-center w-8">{cols.srNo.label}</th>}
                    {cols.lrNo.visible && <th className="border border-slate-400/50 p-2 text-left">{cols.lrNo.label}</th>}
                    {cols.vehicleNo.visible && <th className="border border-slate-400/50 p-2 text-left">{cols.vehicleNo.label}</th>}
                    {cols.route.visible && <th className="border border-slate-400/50 p-2 text-left">{cols.route.label}</th>}
                    {cols.commodity.visible && <th className="border border-slate-400/50 p-2 text-left">{cols.commodity.label}</th>}
                    {cols.weight.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.weight.label}</th>}
                    {cols.rate.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.rate.label}</th>}
                    {cols.freightAmount.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.freightAmount.label}</th>}
                    {cols.extraCharges.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.extraCharges.label}</th>}
                    {cols.advanceDeduction.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.advanceDeduction.label}</th>}
                    {cols.netAmount.visible && <th className="border border-slate-400/50 p-2 text-right">{cols.netAmount.label}</th>}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                      {cols.srNo.visible && (
                        <td className={`border border-slate-300 font-mono text-center text-slate-500 ${densityClass}`}>
                          {idx + 1}
                        </td>
                      )}
                      {cols.lrNo.visible && (
                        <td className={`border border-slate-300 ${densityClass}`}>
                          <div className="font-black font-mono text-slate-950">{item.lrNumber}</div>
                          {item.lrDate && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {formatCustomDate(item.lrDate, customization.dateFormat)}
                            </div>
                          )}
                        </td>
                      )}
                      {cols.vehicleNo.visible && (
                        <td className={`border border-slate-300 font-mono font-bold text-slate-900 uppercase ${densityClass}`}>
                          {item.vehicleNumber}
                        </td>
                      )}
                      {cols.route.visible && (
                        <td className={`border border-slate-300 ${densityClass}`}>
                          <div className="font-semibold text-slate-900">{item.origin} ➔ {item.destination}</div>
                        </td>
                      )}
                      {cols.commodity.visible && (
                        <td className={`border border-slate-300 text-slate-700 ${densityClass}`}>
                          {item.commodity}
                        </td>
                      )}
                      {cols.weight.visible && (
                        <td className={`border border-slate-300 text-right font-mono font-semibold ${densityClass}`}>
                          {item.weight} {item.weightUnit || 'MT'}
                        </td>
                      )}
                      {cols.rate.visible && (
                        <td className={`border border-slate-300 text-right font-mono text-slate-800 ${densityClass}`}>
                          {formatCustomCurrency(item.rate, customization)}
                          <span className="text-[10px] text-slate-500">/{item.rateType === 'per_mt' ? 'MT' : 'Trip'}</span>
                        </td>
                      )}
                      {cols.freightAmount.visible && (
                        <td className={`border border-slate-300 text-right font-mono font-bold text-slate-900 ${densityClass}`}>
                          {formatCustomCurrency(item.freightAmount, customization)}
                        </td>
                      )}
                      {cols.extraCharges.visible && (
                        <td className={`border border-slate-300 text-right font-mono text-slate-700 ${densityClass}`}>
                          {formatCustomCurrency(item.otherCharges || 0, customization)}
                        </td>
                      )}
                      {cols.advanceDeduction.visible && (
                        <td className={`border border-slate-300 text-right font-mono text-rose-700 ${densityClass}`}>
                          -{formatCustomCurrency(item.advanceDeduction || 0, customization)}
                        </td>
                      )}
                      {cols.netAmount.visible && (
                        <td className={`border border-slate-300 text-right font-mono font-black text-slate-950 ${densityClass}`}>
                          {formatCustomCurrency(item.netLineTotal, customization)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. SETTLEMENT, BANK COORDINATES, DYNAMIC UPI QR & TOTAL COMPUTATION GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* LEFT COLUMN: Bank Details, UPI QR & Terms */}
              <div className="space-y-3">
                
                {/* Bank Coordinates & UPI QR Box */}
                {(customization.showBankDetails || customization.showUpiQr) && (
                  <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <div className="flex items-center space-x-1.5 font-black text-slate-900 text-xs">
                        <Landmark className="h-4 w-4" style={{ color: customization.primaryColor }} />
                        <span>{customization.bankSectionTitle || 'Bank Payment Coordinates'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {/* Bank Details Text */}
                      {customization.showBankDetails && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] flex-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Bank Name:</span>
                            <strong className="text-slate-900">{invoice.billedBy.bankName || 'HDFC Bank Ltd'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Account Number:</span>
                            <strong className="font-mono text-slate-950 text-xs">{invoice.billedBy.bankAccountNumber || '50200088991234'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">IFSC Code:</span>
                            <strong className="font-mono font-black" style={{ color: customization.primaryColor }}>
                              {invoice.billedBy.bankIfsc || 'HDFC0001234'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Branch:</span>
                            <span className="text-slate-800">{invoice.billedBy.bankBranch || 'Pune Main'}</span>
                          </div>
                        </div>
                      )}

                      {/* Scannable Real-Time UPI QR Code */}
                      {customization.showUpiQr && (
                        <div className="flex-shrink-0">
                          <UpiPaymentQr
                            upiId={customization.upiId || invoice.billedBy.upiId || 'logitrack@hdfcbank'}
                            payeeName={customization.upiPayeeName || invoice.billedBy.companyName}
                            amount={finalDisplayTotal}
                            invoiceNumber={invoice.invoiceNumber}
                            size={85}
                          />
                        </div>
                      )}
                    </div>

                    {customization.paymentInstructions && (
                      <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200 italic">
                        {customization.paymentInstructions}
                      </div>
                    )}
                  </div>
                )}

                {/* Terms & Conditions Box */}
                {customization.showTerms && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white text-[10px] text-slate-600 space-y-1 leading-relaxed">
                    <strong className="text-slate-900 uppercase font-black block text-[10px]">
                      {customization.termsTitle || 'Terms & Conditions:'}
                    </strong>
                    <p className="whitespace-pre-line">
                      {customization.termsText || invoice.termsAndConditions || '1. Goods carried at owner risk.\n2. Payment strictly due within 30 days.'}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Financial Totals Breakdown & Surcharges */}
              <div className="bg-slate-50/80 border border-slate-300 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Total Cargo Weight:</span>
                  <span className="font-bold text-slate-900 font-mono">{invoice.totalWeight} MT</span>
                </div>
                
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Basic Freight Subtotal:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatCustomCurrency(invoice.subTotalFreight, customization)}</span>
                </div>

                {invoice.totalExtraCharges > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Loading / Transport Surcharges:</span>
                    <span className="font-mono text-slate-900 font-semibold">{formatCustomCurrency(invoice.totalExtraCharges, customization)}</span>
                  </div>
                )}

                {/* Custom Additional Charges from customization */}
                {customChargesList.filter((c) => !c.isDeduction).map((charge) => (
                  <div key={charge.id} className="flex justify-between text-slate-700 text-xs">
                    <span>{charge.name}:</span>
                    <span className="font-mono font-semibold text-slate-900">+{formatCustomCurrency(charge.amount, customization)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5 text-xs">
                  <span>Taxable Freight Amount:</span>
                  <span className="font-mono">{formatCustomCurrency(invoice.taxableAmount + extraChargesSum, customization)}</span>
                </div>

                {/* GST Tax Breakdown */}
                {customization.showTaxBreakup && (
                  <>
                    {isRcm ? (
                      <div className="p-2 bg-amber-100/70 rounded-lg border border-amber-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-bold text-amber-950">
                          <span>GST @{invoice.gstRate}% (Reverse Charge RCM):</span>
                          <span className="font-mono">₹0 (Paid by Recipient)</span>
                        </div>
                        <span className="text-[9px] text-amber-800 block">
                          Recipient is liable to pay approx {formatCustomCurrency(Math.round((invoice.taxableAmount * invoice.gstRate) / 100), customization)} directly under GTA RCM.
                        </span>
                      </div>
                    ) : (
                      <div className="border-t border-slate-200 pt-1.5 space-y-1 text-slate-700 text-xs">
                        {invoice.taxType === 'CGST_SGST' ? (
                          <>
                            <div className="flex justify-between">
                              <span>CGST @{invoice.cgstRate}%:</span>
                              <span className="font-mono text-slate-900">{formatCustomCurrency(invoice.cgstAmount, customization)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST @{invoice.sgstRate}%:</span>
                              <span className="font-mono text-slate-900">{formatCustomCurrency(invoice.sgstAmount, customization)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>IGST @{invoice.igstRate}%:</span>
                            <span className="font-mono text-slate-900">{formatCustomCurrency(invoice.igstAmount, customization)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Advance Deductions & Custom Deductions */}
                {invoice.totalAdvancePaid > 0 && (
                  <div className="flex justify-between text-rose-700 font-medium text-xs">
                    <span>Less: Advance Paid:</span>
                    <span className="font-mono">-{formatCustomCurrency(invoice.totalAdvancePaid, customization)}</span>
                  </div>
                )}

                {customChargesList.filter((c) => c.isDeduction).map((deduction) => (
                  <div key={deduction.id} className="flex justify-between text-rose-700 font-medium text-xs">
                    <span>Less: {deduction.name}:</span>
                    <span className="font-mono">-{formatCustomCurrency(deduction.amount, customization)}</span>
                  </div>
                ))}

                {/* TDS Preview */}
                {customization.showTdsBreakup && invoice.tdsAmount && invoice.tdsAmount > 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>TDS (u/s 194C @{invoice.tdsRate || 1}%):</span>
                    <span className="font-mono text-slate-700">-{formatCustomCurrency(invoice.tdsAmount, customization)}</span>
                  </div>
                )}

                {/* Round Off */}
                {customization.showRoundOff && invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off:</span>
                    <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
                  </div>
                )}

                {/* GRAND TOTAL ROW */}
                <div 
                  className="flex justify-between text-slate-950 font-black border-t-2 pt-2 text-sm p-2.5 rounded-xl shadow-xs"
                  style={{
                    backgroundColor: `${customization.primaryColor}15`,
                    borderColor: customization.primaryColor,
                  }}
                >
                  <span className="text-slate-950 font-black">Grand Total Net Payable:</span>
                  <span 
                    className="font-mono text-lg font-black"
                    style={{ color: customization.primaryColor }}
                  >
                    {formatCustomCurrency(finalDisplayTotal, customization)}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. AMOUNT IN WORDS BANNER */}
            {customization.showAmountInWords && (
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-300 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] block">
                  Amount Chargeable in Words:
                </span>
                <strong className="text-slate-950 text-xs font-bold tracking-tight">
                  {invoice.amountInWords}
                </strong>
              </div>
            )}

            {/* 7. LEGAL DECLARATION & SIGNATURE BLOCKS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs">
              {/* Left Declaration & Prepared By */}
              <div className="text-slate-600 space-y-4">
                {customization.showDeclaration && (
                  <div>
                    <strong className="text-slate-900 font-bold block text-xs">Declaration:</strong>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {customization.declarationText || 'We declare that this invoice shows the actual price of the goods transport services described and that all particulars are true and correct.'}
                    </p>
                  </div>
                )}

                {customization.showSignatureLeft && (
                  <div className="pt-2">
                    <div className="font-bold text-slate-800 text-xs">
                      {customization.signatureLeftName || 'Billing Officer'}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-600 inline-block min-w-[160px]">
                      {customization.signatureLeftTitle || 'Prepared By / Logistics Supervisor'}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Authorized Signatory & Digital Stamp */}
              <div className="text-right space-y-2 flex flex-col items-end justify-end">
                <div className="text-xs font-bold text-slate-900">
                  {customization.signatureRightCompany || `For ${invoice.billedBy.companyName}`}
                </div>

                {customization.signatureStampUrl ? (
                  <div className="py-1">
                    <img
                      src={customization.signatureStampUrl}
                      alt="Digital Stamp / Signature"
                      className="h-14 object-contain max-w-[160px] inline-block"
                    />
                  </div>
                ) : (
                  <div className="h-10" />
                )}

                {customization.showSignatureRight && (
                  <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800 inline-block min-w-[200px] text-center">
                    {customization.signatureRightTitle || 'Authorized Signatory / Finance Officer'}
                  </div>
                )}
              </div>
            </div>

            {/* 8. FOOTER NOTE */}
            {customization.footerNote && (
              <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-100 italic">
                {customization.footerNote}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
