import React, { useState } from 'react';
import { 
  InvoiceCustomization, 
  InvoiceTemplateId, 
  FontFamilyType, 
  FontSizeScale, 
  TableDensity,
  DateFormatType,
  NumberFormatType,
  LogoPositionType,
  LogoSizeType,
  CustomExtraCharge
} from '../types/invoice';
import { 
  TEMPLATE_PRESETS, 
  TERMS_PRESETS, 
  DEFAULT_INVOICE_CUSTOMIZATION, 
  saveStoredInvoiceCustomization 
} from '../lib/invoiceCustomizationDefaults';
import { generateSafeId } from '../lib/calculations';
import { 
  Palette, 
  FileText, 
  Building2, 
  Table, 
  PlusCircle, 
  Coins, 
  QrCode, 
  PenTool, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  Upload, 
  Trash2, 
  Sliders,
  CheckSquare,
  Square,
  HelpCircle,
  Layers,
  ShieldAlert
} from 'lucide-react';

interface InvoiceCustomizerPanelProps {
  customization: InvoiceCustomization;
  onChange: (updated: InvoiceCustomization) => void;
  onSaveAsDefault?: () => void;
  onResetToDefault?: () => void;
  compactMode?: boolean;
}

type CustomizerTab = 
  | 'themes' 
  | 'context' 
  | 'parties' 
  | 'columns' 
  | 'charges' 
  | 'taxes' 
  | 'banking' 
  | 'terms';

export const InvoiceCustomizerPanel: React.FC<InvoiceCustomizerPanelProps> = ({
  customization,
  onChange,
  onSaveAsDefault,
  onResetToDefault,
  compactMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizerTab>('themes');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Helper to update specific root field
  const updateField = <K extends keyof InvoiceCustomization>(key: K, value: InvoiceCustomization[K]) => {
    onChange({
      ...customization,
      [key]: value,
    });
  };

  // Helper to update columns config
  const updateColumn = (colKey: keyof InvoiceCustomization['columns'], updates: Partial<InvoiceCustomization['columns']['srNo']>) => {
    onChange({
      ...customization,
      columns: {
        ...customization.columns,
        [colKey]: {
          ...customization.columns[colKey],
          ...updates,
        },
      },
    });
  };

  // Handle Preset Selection
  const handleApplyPreset = (presetId: InvoiceTemplateId) => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onChange({
      ...customization,
      templateId: preset.id,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
    });
  };

  // Handle Terms Preset Selection
  const handleApplyTermsPreset = (index: number) => {
    const p = TERMS_PRESETS[index];
    if (!p) return;
    onChange({
      ...customization,
      termsTitle: p.title,
      termsText: p.text,
    });
  };

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateField('logoUrl', dataUrl);
        updateField('showLogo', true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle stamp file upload
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateField('signatureStampUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add custom charge
  const handleAddCustomCharge = (isDeduction: boolean = false) => {
    const newCharge: CustomExtraCharge = {
      id: generateSafeId('chg'),
      name: isDeduction ? 'Shortage Deduction' : 'Toll Charges',
      amount: 500,
      isDeduction,
    };
    const current = customization.customCharges || [];
    updateField('customCharges', [...current, newCharge]);
  };

  const handleUpdateCustomCharge = (id: string, updates: Partial<CustomExtraCharge>) => {
    const current = customization.customCharges || [];
    const updated = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
    updateField('customCharges', updated);
  };

  const handleRemoveCustomCharge = (id: string) => {
    const current = customization.customCharges || [];
    updateField('customCharges', current.filter((c) => c.id !== id));
  };

  // Save current customization as global default
  const handleSaveDefaults = () => {
    saveStoredInvoiceCustomization(customization);
    if (onSaveAsDefault) onSaveAsDefault();
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col text-xs">
      {/* Top Banner & Tab Navigation */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
            <Sliders className="h-4 w-4" />
          </span>
          <div>
            <h4 className="font-black text-sm tracking-tight text-white flex items-center space-x-1.5">
              <span>100% Invoice Customization Suite</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#00E676] text-[10px] font-mono font-bold border border-emerald-500/30">
                PRO STYLER
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Customize layouts, context labels, brand colors, QR codes, columns & tax formatting.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveSuccessNotice && (
            <span className="text-[11px] text-[#00E676] font-bold flex items-center space-x-1 animate-in fade-in">
              <Check className="h-3.5 w-3.5" />
              <span>Saved as Default!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveDefaults}
            className="px-3 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            title="Save these styling settings as default for future bills"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save as Default</span>
          </button>

          {onResetToDefault && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center space-x-1 transition-all cursor-pointer"
              title="Reset to factory logistics layout"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-3 pt-2 bg-slate-950/80 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { id: 'themes', label: 'Theme & Styling', icon: Palette },
          { id: 'context', label: 'Context & Labels', icon: FileText },
          { id: 'parties', label: 'Parties & Ship-To', icon: Building2 },
          { id: 'columns', label: 'Table Columns', icon: Table },
          { id: 'charges', label: 'Extra Charges', icon: PlusCircle },
          { id: 'taxes', label: 'Taxes & Currency', icon: Coins },
          { id: 'banking', label: 'Bank & UPI QR', icon: QrCode },
          { id: 'terms', label: 'Terms & Signature', icon: PenTool },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CustomizerTab)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-[#00E676] border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#00E676]' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents Area */}
      <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto bg-slate-900/90 text-slate-200">
        
        {/* ================= TAB 1: THEMES & STYLING ================= */}
        {activeTab === 'themes' && (
          <div className="space-y-4">
            {/* Quick Template Presets */}
            <div>
              <label className="block font-black text-slate-300 text-xs mb-2">
                1. Select Design Template Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {TEMPLATE_PRESETS.map((preset) => {
                  const isSelected = customization.templateId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                          <span className="font-bold text-xs text-white">{preset.name}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                          {preset.previewBadge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {preset.description}
                      </p>
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-0.5 rounded-full bg-emerald-500 text-slate-950">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors & Typography */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              {/* Primary Color */}
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Primary Header Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={customization.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-slate-700 p-0.5"
                  />
                  <input
                    type="text"
                    value={customization.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Accent Highlight Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={customization.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-slate-700 p-0.5"
                  />
                  <input
                    type="text"
                    value={customization.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Typography Font Family
                </label>
                <select
                  value={customization.fontFamily}
                  onChange={(e) => updateField('fontFamily', e.target.value as FontFamilyType)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold"
                >
                  <option value="inter">Inter (Modern Clean Sans)</option>
                  <option value="roboto-mono">Roboto Mono (Technical)</option>
                  <option value="georgia">Georgia (Classic Serif)</option>
                  <option value="system">System Standard</option>
                </select>
              </div>

              {/* Density / Font Scale */}
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Layout Density & Padding
                </label>
                <select
                  value={customization.tableDensity}
                  onChange={(e) => updateField('tableDensity', e.target.value as TableDensity)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold"
                >
                  <option value="tight">Compact (Tight spacing)</option>
                  <option value="comfortable">Comfortable (Standard)</option>
                  <option value="spacious">Spacious (Large cards)</option>
                </select>
              </div>
            </div>

            {/* Logo & Watermark Settings */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Logo Branding & Watermark Stamp</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Logo Upload / URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 text-[11px]">Show Company Logo</label>
                    <input
                      type="checkbox"
                      checked={customization.showLogo}
                      onChange={(e) => updateField('showLogo', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                  </div>
                  {customization.showLogo && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer border border-slate-700">
                          <Upload className="h-3 w-3" />
                          <span>Upload Image</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {customization.logoUrl && (
                          <button
                            type="button"
                            onClick={() => updateField('logoUrl', '')}
                            className="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded-lg"
                            title="Remove Logo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={customization.logoPosition}
                          onChange={(e) => updateField('logoPosition', e.target.value as LogoPositionType)}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px]"
                        >
                          <option value="left">Position: Left</option>
                          <option value="center">Position: Center</option>
                          <option value="right">Position: Right</option>
                        </select>
                        <select
                          value={customization.logoSize}
                          onChange={(e) => updateField('logoSize', e.target.value as LogoSizeType)}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px]"
                        >
                          <option value="small">Size: Small</option>
                          <option value="medium">Size: Medium</option>
                          <option value="large">Size: Large</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Watermark Controls */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 text-[11px]">Print Watermark Overlay</label>
                    <input
                      type="checkbox"
                      checked={customization.showWatermark}
                      onChange={(e) => updateField('showWatermark', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                  </div>
                  {customization.showWatermark && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          placeholder="e.g. ORIGINAL / PAID / DUPLICATE"
                          value={customization.watermarkText}
                          onChange={(e) => updateField('watermarkText', e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono uppercase font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">Opacity: {Math.round((customization.watermarkOpacity || 0.08) * 100)}%</span>
                        <input
                          type="range"
                          min="0.04"
                          max="0.30"
                          step="0.02"
                          value={customization.watermarkOpacity}
                          onChange={(e) => updateField('watermarkOpacity', parseFloat(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CONTEXT & LABELS ================= */}
        {activeTab === 'context' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Document Header Title
                </label>
                <input
                  type="text"
                  value={customization.documentTitle}
                  onChange={(e) => updateField('documentTitle', e.target.value.toUpperCase())}
                  placeholder="e.g. TAX INVOICE / FREIGHT BILL"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-black uppercase text-xs text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Service Subtitle / Classification
                </label>
                <input
                  type="text"
                  value={customization.subTitle}
                  onChange={(e) => updateField('subTitle', e.target.value)}
                  placeholder="e.g. GOODS TRANSPORT AGENCY (GTA) ROAD FREIGHT"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Copy Identifier Badge
                </label>
                <select
                  value={customization.copyType}
                  onChange={(e) => updateField('copyType', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="Original for Recipient">Original for Recipient</option>
                  <option value="Duplicate for Transporter">Duplicate for Transporter</option>
                  <option value="Triplicate for Consignor">Triplicate for Consignor</option>
                  <option value="Quadruplicate for Consignee">Quadruplicate for Consignee</option>
                  <option value="Office Copy">Office Copy</option>
                  <option value="Custom">Custom Label</option>
                </select>
              </div>
            </div>

            {customization.copyType === 'Custom' && (
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Custom Copy Badge Text
                </label>
                <input
                  type="text"
                  value={customization.customCopyLabel || ''}
                  onChange={(e) => updateField('customCopyLabel', e.target.value)}
                  placeholder="e.g. Bank Clearance Copy / Customs Copy"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold"
                />
              </div>
            )}

            {/* Renaming Metadata Field Labels */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-slate-200 text-xs block">
                Custom Labels for Document Metadata
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Invoice No. Label</label>
                  <input
                    type="text"
                    value={customization.invoiceNumberLabel}
                    onChange={(e) => updateField('invoiceNumberLabel', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Invoice Date Label</label>
                  <input
                    type="text"
                    value={customization.invoiceDateLabel}
                    onChange={(e) => updateField('invoiceDateLabel', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Due Date Label</label>
                  <input
                    type="text"
                    value={customization.dueDateLabel}
                    onChange={(e) => updateField('dueDateLabel', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Logistics Specific Context Fields */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-slate-200 text-xs block">
                Transport & Contract Reference Numbers (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">PO / Work Order No.</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-8890"
                    value={customization.poNumber || ''}
                    onChange={(e) => updateField('poNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">PO Date</label>
                  <input
                    type="date"
                    value={customization.poDate || ''}
                    onChange={(e) => updateField('poDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">E-Way Bill No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 541098765432"
                    value={customization.eWayBillNumber || ''}
                    onChange={(e) => updateField('eWayBillNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Place of Supply (State)</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra (27)"
                    value={customization.placeOfSupply || ''}
                    onChange={(e) => updateField('placeOfSupply', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PARTIES & SHIP-TO ================= */}
        {activeTab === 'parties' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Biller / Issuer Box Toggles */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-emerald-400 text-xs block">
                  Issuer (Billed By) Company Display Options
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Company GSTIN</span>
                    <input
                      type="checkbox"
                      checked={customization.showBillerGstin}
                      onChange={(e) => updateField('showBillerGstin', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Company PAN</span>
                    <input
                      type="checkbox"
                      checked={customization.showBillerPan}
                      onChange={(e) => updateField('showBillerPan', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show CIN / MSME Reg. No.</span>
                    <input
                      type="checkbox"
                      checked={customization.showBillerCin}
                      onChange={(e) => updateField('showBillerCin', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                  {customization.showBillerCin && (
                    <input
                      type="text"
                      placeholder="e.g. U60231PN2021PTC199882 / UDYAM-MH-26-00123"
                      value={customization.billerCin || ''}
                      onChange={(e) => updateField('billerCin', e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono"
                    />
                  )}
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Contact Phones & Email</span>
                    <input
                      type="checkbox"
                      checked={customization.showBillerContact}
                      onChange={(e) => updateField('showBillerContact', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                </div>
              </div>

              {/* Recipient / Billed To Options */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-indigo-400 text-xs block">
                  Billed To (Client / Party) Display Options
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Client GSTIN</span>
                    <input
                      type="checkbox"
                      checked={customization.showPartyGstin}
                      onChange={(e) => updateField('showPartyGstin', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Client PAN</span>
                    <input
                      type="checkbox"
                      checked={customization.showPartyPan}
                      onChange={(e) => updateField('showPartyPan', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                    <span>Show Contact Person & Phone</span>
                    <input
                      type="checkbox"
                      checked={customization.showPartyContact}
                      onChange={(e) => updateField('showPartyContact', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Separate Consignee / Ship-To Address Block Toggle */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 text-xs block">
                    Separate Ship-To / Destination Delivery Address Block
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Enable if the billed client is different from destination delivery plant / warehouse consignee.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showShipToAddress}
                  onChange={(e) => updateField('showShipToAddress', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 h-4 w-4"
                />
              </div>

              {customization.showShipToAddress && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Consignee / Plant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jamshedpur Works Gate 2"
                      value={customization.shipTo?.partyName || ''}
                      onChange={(e) =>
                        updateField('shipTo', {
                          ...(customization.shipTo || { partyName: '' }),
                          partyName: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="Plot 10, Industrial Park"
                      value={customization.shipTo?.address || ''}
                      onChange={(e) =>
                        updateField('shipTo', {
                          ...(customization.shipTo || { partyName: '' }),
                          address: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Destination City & State</label>
                    <input
                      type="text"
                      placeholder="Jamshedpur, Jharkhand"
                      value={customization.shipTo?.city || ''}
                      onChange={(e) =>
                        updateField('shipTo', {
                          ...(customization.shipTo || { partyName: '' }),
                          city: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: TABLE COLUMNS ================= */}
        {activeTab === 'columns' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-slate-200 text-xs block">
                Invoice Table Columns Customizer (Visibility & Custom Header Labels)
              </span>
              <p className="text-[10px] text-slate-400">
                Check to show/hide columns and rename any header label to match your specific transport nomenclature.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                {[
                  { key: 'srNo' as const, defaultLabel: '#' },
                  { key: 'lrNo' as const, defaultLabel: 'LR No. & Date' },
                  { key: 'vehicleNo' as const, defaultLabel: 'Vehicle No.' },
                  { key: 'route' as const, defaultLabel: 'Route (From ➔ To)' },
                  { key: 'commodity' as const, defaultLabel: 'Cargo Description' },
                  { key: 'weight' as const, defaultLabel: 'Weight (MT)' },
                  { key: 'rate' as const, defaultLabel: 'Freight Rate' },
                  { key: 'freightAmount' as const, defaultLabel: 'Freight Amount (₹)' },
                  { key: 'extraCharges' as const, defaultLabel: 'Extra Charges' },
                  { key: 'advanceDeduction' as const, defaultLabel: 'Advance Deduction' },
                  { key: 'netAmount' as const, defaultLabel: 'Net Line Amount' },
                ].map((col) => {
                  const cfg = customization.columns[col.key] || { visible: true, label: col.defaultLabel };
                  return (
                    <div
                      key={col.key}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={cfg.visible}
                        onChange={(e) => updateColumn(col.key, { visible: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 h-4 w-4"
                      />
                      <input
                        type="text"
                        value={cfg.label}
                        onChange={(e) => updateColumn(col.key, { label: e.target.value })}
                        disabled={!cfg.visible}
                        className={`w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-semibold ${
                          !cfg.visible ? 'opacity-40 text-slate-600' : 'text-slate-100'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: CHARGES & DEDUCTIONS ================= */}
        {activeTab === 'charges' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 text-xs block">
                    Custom Additional Surcharges & Specific Deductions
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Add custom items like Toll charges, Green Cess, Weighbridge, Detention, or Diesel vouchers.
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleAddCustomCharge(false)}
                    className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer border border-emerald-500/30"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>+ Extra Charge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCustomCharge(true)}
                    className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer border border-rose-500/30"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>- Deduction</span>
                  </button>
                </div>
              </div>

              {(customization.customCharges || []).length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg text-xs">
                  No custom additional charges added. Click buttons above to add Tolls, Weighbridge slips, or Detention.
                </div>
              ) : (
                <div className="space-y-2">
                  {(customization.customCharges || []).map((charge) => (
                    <div
                      key={charge.id}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            charge.isDeduction
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {charge.isDeduction ? 'Deduction (-)' : 'Surcharge (+)'}
                        </span>
                      </div>
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={charge.name}
                          onChange={(e) => handleUpdateCustomCharge(charge.id, { name: e.target.value })}
                          placeholder="Charge Name (e.g. Highway Toll / Demurrage)"
                          className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          value={charge.amount || ''}
                          onChange={(e) => handleUpdateCustomCharge(charge.id, { amount: parseFloat(e.target.value) || 0 })}
                          placeholder="Amount"
                          className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs font-bold"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomCharge(charge.id)}
                          className="p-1 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: TAXES & CURRENCY ================= */}
        {activeTab === 'taxes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={customization.currencySymbol}
                  onChange={(e) => updateField('currencySymbol', e.target.value)}
                  placeholder="₹"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-bold font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Numbering Format
                </label>
                <select
                  value={customization.numberFormat}
                  onChange={(e) => updateField('numberFormat', e.target.value as NumberFormatType)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="indian">Indian Lakhs (1,00,000.00)</option>
                  <option value="international">International (100,000.00)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 text-[11px] mb-1">
                  Date Format
                </label>
                <select
                  value={customization.dateFormat}
                  onChange={(e) => updateField('dateFormat', e.target.value as DateFormatType)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 03/10/2026)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 03-Oct-2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-03)</option>
                </select>
              </div>
            </div>

            {/* Tax & Total Summary Options */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-slate-200 text-xs block">
                GST Breakdown & Legal RCM Options
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                  <span>Show RCM Law Notification Banner</span>
                  <input
                    type="checkbox"
                    checked={customization.showRcmBanner}
                    onChange={(e) => updateField('showRcmBanner', e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                  <span>Show Tax Breakdown (CGST/SGST/IGST)</span>
                  <input
                    type="checkbox"
                    checked={customization.showTaxBreakup}
                    onChange={(e) => updateField('showTaxBreakup', e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                  <span>Show TDS Rate & Amount Preview</span>
                  <input
                    type="checkbox"
                    checked={customization.showTdsBreakup}
                    onChange={(e) => updateField('showTdsBreakup', e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-900">
                  <span>Show Amount Chargeable in Words</span>
                  <input
                    type="checkbox"
                    checked={customization.showAmountInWords}
                    onChange={(e) => updateField('showAmountInWords', e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: BANKING & UPI QR ================= */}
        {activeTab === 'banking' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 text-xs block">
                    Bank Coordinates Block
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Include bank name, account number, IFSC code and branch in the printed invoice.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showBankDetails}
                  onChange={(e) => updateField('showBankDetails', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 h-4 w-4"
                />
              </div>

              {customization.showBankDetails && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Section Title</label>
                  <input
                    type="text"
                    value={customization.bankSectionTitle}
                    onChange={(e) => updateField('bankSectionTitle', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-bold"
                  />
                </div>
              )}
            </div>

            {/* Dynamic UPI QR Code generator */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-400 text-xs block flex items-center space-x-1.5">
                    <QrCode className="h-4 w-4" />
                    <span>Dynamic Scan-to-Pay UPI QR Code</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Generates a real-time scannable UPI QR code on the invoice with the exact bill amount encoded.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showUpiQr}
                  onChange={(e) => updateField('showUpiQr', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 h-4 w-4"
                />
              </div>

              {customization.showUpiQr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">UPI Virtual Payment Address (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. logitrack@hdfcbank"
                      value={customization.upiId || ''}
                      onChange={(e) => updateField('upiId', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Payee Name on UPI</label>
                    <input
                      type="text"
                      placeholder="e.g. LogiTrack Freight Solutions"
                      value={customization.upiPayeeName || ''}
                      onChange={(e) => updateField('upiPayeeName', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Special Payment Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Please quote Invoice No in NEFT remarks"
                      value={customization.paymentInstructions || ''}
                      onChange={(e) => updateField('paymentInstructions', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 8: TERMS & SIGNATURE ================= */}
        {activeTab === 'terms' && (
          <div className="space-y-4">
            {/* Terms and Conditions Editor */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs block">
                  Terms & Conditions Editor
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">Quick Preset:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleApplyTermsPreset(parseInt(e.target.value, 10));
                    }}
                    defaultValue=""
                    className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-bold text-emerald-400"
                  >
                    <option value="" disabled>-- Load Preset Terms --</option>
                    {TERMS_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Terms Heading</label>
                <input
                  type="text"
                  value={customization.termsTitle}
                  onChange={(e) => updateField('termsTitle', e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Terms Body Text</label>
                <textarea
                  rows={4}
                  value={customization.termsText}
                  onChange={(e) => updateField('termsText', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Declaration & Signatures */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Legal Declaration Text</label>
                <input
                  type="text"
                  value={customization.declarationText}
                  onChange={(e) => updateField('declarationText', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                {/* Left Signature */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-300 text-xs block">Left Signature Block</span>
                  <input
                    type="text"
                    placeholder="Title: Prepared By / Supervisor"
                    value={customization.signatureLeftTitle}
                    onChange={(e) => updateField('signatureLeftTitle', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Name: Billing Officer"
                    value={customization.signatureLeftName}
                    onChange={(e) => updateField('signatureLeftName', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                  />
                </div>

                {/* Right Signature */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-300 text-xs block">Right Signatory Block</span>
                  <input
                    type="text"
                    placeholder="Title: Authorized Signatory"
                    value={customization.signatureRightTitle}
                    onChange={(e) => updateField('signatureRightTitle', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="For [Company Name]"
                    value={customization.signatureRightCompany}
                    onChange={(e) => updateField('signatureRightCompany', e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-bold"
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer border border-slate-700">
                      <Upload className="h-3 w-3" />
                      <span>Upload Digital Stamp / Signature</span>
                      <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                    </label>
                    {customization.signatureStampUrl && (
                      <button
                        type="button"
                        onClick={() => updateField('signatureStampUrl', '')}
                        className="p-1 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded"
                        title="Remove Stamp"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Footer Note / Disclaimer</label>
                <input
                  type="text"
                  value={customization.footerNote || ''}
                  onChange={(e) => updateField('footerNote', e.target.value)}
                  placeholder="e.g. This is a computer generated invoice and requires no physical stamp."
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
