import * as XLSX from 'xlsx';
import { DispatchRecord, LRItem, PlacementType, RateType, WeightUnit } from '../types/dispatch';
import { 
  calculateLRFreight, 
  calculateGrossMarketFreight, 
  calculateNetMarketFreight, 
  recalculateDispatchTotals, 
  generateSafeId,
  formatVehicleNumber 
} from './calculations';

export interface ExcelImportRow {
  dispatchDate: string;
  vehicleNumber: string;
  placement: string;
  transporterName: string;
  fromParty: string;
  toParty: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber: string;
  lrDate?: string;
  consignorName: string;
  consignorCity: string;
  consigneeName: string;
  consigneeCity: string;
  invoiceNumbers?: string;
  ewaybillNumbers?: string;
  weight: number;
  weightUnit?: string;
  rate: number;
  rateType?: string;
  freightAmount?: number;
  advanceAmount?: number;
  extraCharges?: number;
  marketWeight?: number;
  marketRate?: number;
  grossMarketFreight?: number;
  marketCommission?: number;
  marketAdvance?: number;
  netMarketFreight?: number;
  remarks?: string;
  notes?: string;
  status?: string;
}

export interface DuplicateConflict {
  lrNumber: string;
  vehicleNumber: string;
  date: string;
  reason: 'already_exists_in_database' | 'duplicate_within_import_file';
  existingRecordInfo?: string;
}

export interface InvalidRowInfo {
  rowIndex: number;
  lrNumber?: string;
  vehicleNumber?: string;
  reason: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validDispatches: DispatchRecord[];
  validLRCount: number;
  duplicates: DuplicateConflict[];
  invalidRows: InvalidRowInfo[];
  canImport: boolean;
}

/**
 * Downloads a pre-formatted Excel template (.xlsx) with sample data and instructions.
 */
export function downloadExcelTemplate(): void {
  const templateHeaders = [
    'Dispatch Date (YYYY-MM-DD)*',
    'Vehicle Number*',
    'Placement (Market/Own)*',
    'Transporter Name*',
    'From Party (Origin)*',
    'To Party (Destination)*',
    'Driver Name',
    'Driver Phone',
    'LR Number*',
    'LR Date (YYYY-MM-DD)',
    'Consignor Name*',
    'Consignor City*',
    'Consignee Name*',
    'Consignee City*',
    'Invoice Numbers (Comma Separated)',
    'E-Waybill Numbers (Comma Separated)',
    'Cargo Weight*',
    'Weight Unit (MT/Kg/Quintal)',
    'Freight Rate*',
    'Rate Basis (per_mt/per_kg/per_quintal/fixed)',
    'Freight Amount (Optional - Auto calculated)',
    'Client Advance Amount',
    'Extra Charges',
    'Market Weight (For Market Placement)',
    'Market Rate (For Market Placement)',
    'Gross Market Freight',
    'Deduction: Commission (Brokerage)',
    'Deduction: Vehicle Advance',
    'Net Market Freight (Auto calculated)',
    'LR Remarks',
    'Trip Notes',
    'Status (Confirmed/In Transit/Delivered/Draft)',
  ];

  const sampleRows = [
    [
      new Date().toISOString().split('T')[0],
      'MH 12 RN 4589',
      'Market',
      'Patel Roadways Logistics Ltd',
      'Tata Steel Processing Ltd',
      'Larsen & Toubro Infra Projects',
      'Ramesh Singh',
      '+91 98234 11204',
      'LR-EXP-9001',
      new Date().toISOString().split('T')[0],
      'Tata Steel Jamshedpur Works',
      'Jamshedpur',
      'L&T Metro Construction Yard',
      'Mumbai',
      'INV-TS-2026-101, INV-TS-2026-102',
      '121899014521, 121899014522',
      24.5,
      'MT',
      3200,
      'per_mt',
      78400,
      25000,
      1500,
      24.5,
      2800,
      68600,
      1000,
      20000,
      47600,
      'HR Steel Coils with weatherproof strapping',
      'Direct gate entry at Yard 4',
      'Confirmed',
    ],
    [
      new Date().toISOString().split('T')[0],
      'MH 12 RN 4589',
      'Market',
      'Patel Roadways Logistics Ltd',
      'Tata Steel Processing Ltd',
      'Larsen & Toubro Infra Projects',
      'Ramesh Singh',
      '+91 98234 11204',
      'LR-EXP-9002',
      new Date().toISOString().split('T')[0],
      'Tata Tubes Division',
      'Jamshedpur',
      'L&T Structural Depot',
      'Navi Mumbai',
      'INV-TT-5510',
      '181923091102',
      8.0,
      'MT',
      3300,
      'per_mt',
      26400,
      10000,
      500,
      8.0,
      2900,
      23200,
      500,
      8000,
      14700,
      'Structural hollow steel pipes',
      'Handle with crane only',
      'Confirmed',
    ],
    [
      new Date(Date.now() - 86400000).toISOString().split('T')[0],
      'GJ 01 BV 8912',
      'Own',
      'Own Company Fleet #12',
      'UltraTech Cement Corporation',
      'Adani Infrastructure Terminal',
      'Suresh Parmar',
      '+91 97241 55901',
      'LR-EXP-9003',
      new Date(Date.now() - 86400000).toISOString().split('T')[0],
      'UltraTech Cement Gujarat Plant',
      'Kovaya',
      'Adani Terminal Yard',
      'Mundra',
      'INV-UTC-8812',
      '241890048123',
      28.0,
      'MT',
      1500,
      'per_mt',
      42000,
      15000,
      0,
      '',
      '',
      '',
      '',
      '',
      '',
      'Palletized PPC cement bags',
      'GPS tracked vehicle',
      'Confirmed',
    ],
  ];

  const guidelines = [
    ['LOGITRACK EXCEL IMPORT GUIDELINES & SPECIFICATIONS'],
    [''],
    ['1. DUPLICATE PROTECTION: Every LR Number must be strictly unique. If an LR Number already exists in the system or appears twice in the file, it will be flagged to prevent duplicate entries.'],
    ['2. MULTIPLE LRS PER VEHICLE: Rows with the same Dispatch Date, Vehicle Number, and Transporter will be automatically grouped into a single multi-LR trip.'],
    ['3. MULTIPLE INVOICES & E-WAYBILLS: Enter multiple values separated by commas (e.g. "INV-001, INV-002").'],
    ['4. PLACEMENT: Allowed values are "Market" or "Own". When "Market" is chosen, market weight, rate, deductions, and gross freight will be processed.'],
    ['5. WEIGHT UNITS: Allowed values are "MT" (Metric Tons), "Kg", or "Quintal". Defaults to MT.'],
    ['6. RATE BASIS: Allowed values are "per_mt", "per_kg", "per_quintal", or "fixed". Defaults to per_mt.'],
    ['7. MANDATORY COLUMNS: Marked with an asterisk (*). Rows missing mandatory fields will be marked invalid.'],
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Data Entry Template
  const wsData = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);

  // Set column widths
  wsData['!cols'] = templateHeaders.map(() => ({ wch: 22 }));

  // Sheet 2: Guidelines
  const wsGuide = XLSX.utils.aoa_to_sheet(guidelines);
  wsGuide['!cols'] = [{ wch: 100 }];

  XLSX.utils.book_append_sheet(wb, wsData, 'LR_Import_Template');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guidelines');

  XLSX.writeFile(wb, `LogiTrack_LR_Import_Template.xlsx`);
}

/**
 * Exports all dispatches and detailed LRs to an Excel (.xlsx) workbook.
 */
export function exportToExcel(records: DispatchRecord[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Detailed Dispatches & LRs
  const lrHeaders = [
    'Dispatch Date',
    'Vehicle Number',
    'Placement',
    'Transporter Name',
    'From Party',
    'To Party',
    'Driver Name',
    'Driver Phone',
    'LR Number',
    'LR Date',
    'Consignor Name',
    'Consignor City',
    'Consignee Name',
    'Consignee City',
    'Invoice Numbers',
    'E-Waybill Numbers',
    'Weight',
    'Weight Unit',
    'Rate (INR)',
    'Rate Basis',
    'Billing Freight (INR)',
    'Client Advance (INR)',
    'Extra Charges (INR)',
    'Net Client Balance (INR)',
    'Market Weight (MT)',
    'Market Rate (INR)',
    'Gross Market Freight (INR)',
    'Market Commission (INR)',
    'Market Advance (INR)',
    'Net Market Freight (INR)',
    'Operating Margin (INR)',
    'Status',
    'Remarks',
    'Trip Notes',
  ];

  const lrRows: any[][] = [];

  for (const dsp of records) {
    if (dsp.lrs && dsp.lrs.length > 0) {
      for (const lr of dsp.lrs) {
        const netClient = (Number(lr.freightAmount) || 0) + (Number(lr.extraCharges) || 0) - (Number(lr.advanceAmount) || 0);
        const margin = (Number(lr.freightAmount) || 0) - (Number(lr.grossMarketFreight) || 0);

        lrRows.push([
          dsp.date,
          dsp.vehicleNumber,
          dsp.placement,
          dsp.transporterName,
          dsp.fromParty,
          dsp.toParty,
          dsp.driverName || '',
          dsp.driverPhone || '',
          lr.lrNumber,
          lr.lrDate || dsp.date,
          lr.consignorName,
          lr.consignorCity,
          lr.consigneeName,
          lr.consigneeCity,
          (lr.invoiceNumbers || []).join(', '),
          (lr.ewaybillNumbers || []).join(', '),
          lr.weight,
          lr.weightUnit,
          lr.rate,
          lr.rateType,
          lr.freightAmount,
          lr.advanceAmount || 0,
          lr.extraCharges || 0,
          netClient,
          lr.marketWeight || '',
          lr.marketRate || '',
          lr.grossMarketFreight || '',
          lr.marketCommission || '',
          lr.marketAdvance || '',
          lr.netMarketFreight || '',
          dsp.placement === 'Market' && lr.grossMarketFreight ? margin : '',
          dsp.status,
          lr.remarks || '',
          dsp.notes || '',
        ]);
      }
    }
  }

  const wsLRs = XLSX.utils.aoa_to_sheet([lrHeaders, ...lrRows]);
  wsLRs['!cols'] = lrHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsLRs, 'Dispatches_and_LRs');

  // Sheet 2: Trips Summary Ledger
  const tripHeaders = [
    'Date',
    'Vehicle Number',
    'Placement',
    'Transporter',
    'From Party',
    'To Party',
    'Total LRs',
    'Total Cargo Weight (MT)',
    'Total Billing Freight (INR)',
    'Gross Market Freight (INR)',
    'Net Market Payable (INR)',
    'Operating Margin (INR)',
    'Status',
    'LR Numbers',
  ];

  const tripRows = records.map((dsp) => [
    dsp.date,
    dsp.vehicleNumber,
    dsp.placement,
    dsp.transporterName,
    dsp.fromParty,
    dsp.toParty,
    dsp.totalLrsCount || dsp.lrs?.length || 0,
    dsp.totalWeight,
    dsp.totalFreightAmount,
    dsp.totalGrossMarketFreight || '',
    dsp.totalNetMarketFreight || '',
    dsp.placement === 'Market' ? dsp.marketMargin || (dsp.totalFreightAmount - (dsp.totalGrossMarketFreight || 0)) : '',
    dsp.status,
    (dsp.lrNumbers || []).join(', '),
  ]);

  const wsTrips = XLSX.utils.aoa_to_sheet([tripHeaders, ...tripRows]);
  wsTrips['!cols'] = tripHeaders.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsTrips, 'Trips_Summary');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `LogiTrack_Dispatches_${today}.xlsx`);
}

/**
 * Parses an uploaded .xlsx file, checks for duplicates, and groups into Dispatch records.
 */
export async function parseAndValidateExcel(
  file: File,
  existingRecords: DispatchRecord[]
): Promise<ImportValidationResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Use first sheet
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length < 2) {
    throw new Error('The Excel sheet appears to be empty or missing data rows.');
  }

  // Row 0 is headers
  const headers: string[] = (rawRows[0] || []).map((h: any) =>
    String(h || '').trim().toLowerCase()
  );

  // Helper to find column index by keyword
  const findCol = (...keywords: string[]): number => {
    return headers.findIndex((h) =>
      keywords.some((kw) => h.includes(kw.toLowerCase()))
    );
  };

  const colDate = findCol('dispatch date', 'date');
  const colVehicle = findCol('vehicle number', 'vehicle', 'truck');
  const colPlacement = findCol('placement');
  const colTransporter = findCol('transporter');
  const colFromParty = findCol('from party', 'from');
  const colToParty = findCol('to party', 'to');
  const colDriverName = findCol('driver name', 'driver');
  const colDriverPhone = findCol('driver phone', 'mobile');
  const colLRNum = findCol('lr number', 'lr no');
  const colLRDate = findCol('lr date');
  const colConsignorName = findCol('consignor name', 'consignor');
  const colConsignorCity = findCol('consignor city');
  const colConsigneeName = findCol('consignee name', 'consignee');
  const colConsigneeCity = findCol('consignee city');
  const colInvoices = findCol('invoice numbers', 'invoice');
  const colEwaybills = findCol('e-waybill numbers', 'ewaybill', 'ewb');
  const colWeight = findCol('cargo weight', 'weight');
  const colWeightUnit = findCol('weight unit');
  const colRate = findCol('freight rate', 'rate');
  const colRateType = findCol('rate basis', 'rate type');
  const colFreightAmount = findCol('freight amount');
  const colAdvance = findCol('client advance', 'advance amount', 'advance');
  const colExtra = findCol('extra charges');
  const colMktWeight = findCol('market weight');
  const colMktRate = findCol('market rate');
  const colMktGross = findCol('gross market');
  const colMktComm = findCol('commission', 'brokerage');
  const colMktAdv = findCol('vehicle advance', 'market advance');
  const colMktNet = findCol('net market');
  const colRemarks = findCol('remarks');
  const colNotes = findCol('trip notes', 'notes');
  const colStatus = findCol('status');

  // Build index of existing LR numbers for duplicate detection
  const existingLRMap = new Map<string, { vehicle: string; date: string }>();
  for (const rec of existingRecords) {
    for (const lr of rec.lrs || []) {
      const cleanLR = (lr.lrNumber || '').trim().toUpperCase();
      if (cleanLR) {
        existingLRMap.set(cleanLR, { vehicle: rec.vehicleNumber, date: rec.date });
      }
    }
  }

  const seenInFileLRs = new Map<string, number>(); // LR -> row index
  const duplicates: DuplicateConflict[] = [];
  const invalidRows: InvalidRowInfo[] = [];

  // Group valid rows by Trip Key (Date + Vehicle + Transporter)
  const tripGroups = new Map<
    string,
    {
      date: string;
      vehicleNumber: string;
      placement: PlacementType;
      transporterName: string;
      fromParty: string;
      toParty: string;
      driverName?: string;
      driverPhone?: string;
      notes?: string;
      status?: string;
      lrs: LRItem[];
    }
  >();

  let dataRowCount = 0;

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || c === '')) {
      continue; // Skip empty rows
    }
    dataRowCount++;

    // Extract values
    const getVal = (colIdx: number): string =>
      colIdx >= 0 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
    const getNum = (colIdx: number): number => {
      if (colIdx < 0 || row[colIdx] === undefined) return 0;
      const parsed = parseFloat(String(row[colIdx]).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const rawDate = getVal(colDate);
    const vehicleNumber = formatVehicleNumber(getVal(colVehicle));
    const lrNumber = getVal(colLRNum).toUpperCase();
    const fromParty = getVal(colFromParty);
    const toParty = getVal(colToParty);
    const transporterName = getVal(colTransporter);
    const consignorName = getVal(colConsignorName);
    const consignorCity = getVal(colConsignorCity);
    const consigneeName = getVal(colConsigneeName);
    const consigneeCity = getVal(colConsigneeCity);
    const weight = getNum(colWeight);
    const rate = getNum(colRate);

    // Validate Required Fields
    if (!lrNumber) {
      invalidRows.push({ rowIndex: rowIndex + 1, reason: 'Missing mandatory LR Number' });
      continue;
    }
    if (!vehicleNumber) {
      invalidRows.push({ rowIndex: rowIndex + 1, lrNumber, reason: 'Missing Vehicle Number' });
      continue;
    }
    if (!consignorName || !consignorCity) {
      invalidRows.push({ rowIndex: rowIndex + 1, lrNumber, reason: 'Missing Consignor Name or City' });
      continue;
    }
    if (!consigneeName || !consigneeCity) {
      invalidRows.push({ rowIndex: rowIndex + 1, lrNumber, reason: 'Missing Consignee Name or City' });
      continue;
    }
    if (weight <= 0) {
      invalidRows.push({ rowIndex: rowIndex + 1, lrNumber, reason: 'Invalid or missing Weight' });
      continue;
    }

    // Date formatting (handle Excel serial date numbers or string)
    let formattedDate = rawDate;
    if (typeof row[colDate] === 'number') {
      const parsedDate = new Date((row[colDate] - 25569) * 86400 * 1000);
      formattedDate = parsedDate.toISOString().split('T')[0];
    } else if (!formattedDate) {
      formattedDate = new Date().toISOString().split('T')[0];
    }

    // STRICT DUPLICATE CHECK 1: Check if LR Number already exists in database
    if (existingLRMap.has(lrNumber)) {
      const conflict = existingLRMap.get(lrNumber)!;
      duplicates.push({
        lrNumber,
        vehicleNumber,
        date: formattedDate,
        reason: 'already_exists_in_database',
        existingRecordInfo: `Already recorded in vehicle ${conflict.vehicle} on ${conflict.date}`,
      });
      continue;
    }

    // STRICT DUPLICATE CHECK 2: Check if LR Number is duplicated within this file
    if (seenInFileLRs.has(lrNumber)) {
      duplicates.push({
        lrNumber,
        vehicleNumber,
        date: formattedDate,
        reason: 'duplicate_within_import_file',
        existingRecordInfo: `Repeated at Excel Row #${seenInFileLRs.get(lrNumber)} and Row #${rowIndex + 1}`,
      });
      continue;
    }

    seenInFileLRs.set(lrNumber, rowIndex + 1);

    // Placement
    const rawPlacement = getVal(colPlacement).toLowerCase();
    const placement: PlacementType = rawPlacement.includes('own') ? 'Own' : 'Market';

    // Weight Unit & Rate Type
    const rawUnit = getVal(colWeightUnit).toUpperCase();
    const weightUnit: WeightUnit = rawUnit.includes('KG') ? 'Kg' : rawUnit.includes('Q') ? 'Quintal' : 'MT';

    const rawRateType = getVal(colRateType).toLowerCase();
    const rateType: RateType = rawRateType.includes('fix')
      ? 'fixed'
      : rawRateType.includes('kg')
      ? 'per_kg'
      : rawRateType.includes('q')
      ? 'per_quintal'
      : 'per_mt';

    // Parse Invoices (comma or semicolon separated)
    const invoiceNumbers = getVal(colInvoices)
      .split(/[,;\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Parse E-Waybills
    const ewaybillNumbers = getVal(colEwaybills)
      .split(/[,;\n]+/)
      .map((s) => s.trim().replace(/\s+/g, ''))
      .filter(Boolean);

    // Freight calculation
    let freightAmount = getNum(colFreightAmount);
    if (!freightAmount || freightAmount <= 0) {
      freightAmount = calculateLRFreight(weight, weightUnit, rate, rateType);
    }

    const advanceAmount = getNum(colAdvance);
    const extraCharges = getNum(colExtra);

    // Market hire fields (if Market)
    let marketWeight = getNum(colMktWeight);
    let marketRate = getNum(colMktRate);
    let grossMarketFreight = getNum(colMktGross);
    let marketCommission = getNum(colMktComm);
    let marketAdvance = getNum(colMktAdv);
    let netMarketFreight = getNum(colMktNet);

    if (placement === 'Market') {
      if (!marketWeight) marketWeight = weight;
      if (!marketRate) marketRate = rate;
      if (!grossMarketFreight) {
        grossMarketFreight = calculateGrossMarketFreight(marketWeight, marketRate);
      }
      if (!netMarketFreight) {
        netMarketFreight = calculateNetMarketFreight(grossMarketFreight, marketCommission, marketAdvance);
      }
    }

    const lrItem: LRItem = {
      id: generateSafeId('lr'),
      lrNumber,
      lrDate: getVal(colLRDate) || formattedDate,
      consignorName,
      consignorCity,
      consigneeName,
      consigneeCity,
      invoiceNumbers,
      ewaybillNumbers,
      weight,
      weightUnit,
      rate,
      rateType,
      freightAmount,
      advanceAmount,
      extraCharges,
      marketWeight: placement === 'Market' ? marketWeight : undefined,
      marketRate: placement === 'Market' ? marketRate : undefined,
      grossMarketFreight: placement === 'Market' ? grossMarketFreight : undefined,
      marketCommission: placement === 'Market' ? marketCommission : undefined,
      marketAdvance: placement === 'Market' ? marketAdvance : undefined,
      netMarketFreight: placement === 'Market' ? netMarketFreight : undefined,
      remarks: getVal(colRemarks),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: '',
    };

    // Group by Trip
    const tripKey = `${formattedDate}_${vehicleNumber}_${transporterName || 'Default'}`.toUpperCase();
    const existingTrip = tripGroups.get(tripKey);

    if (existingTrip) {
      existingTrip.lrs.push(lrItem);
    } else {
      tripGroups.set(tripKey, {
        date: formattedDate,
        vehicleNumber,
        placement,
        transporterName: transporterName || 'Market Transporter',
        fromParty: fromParty || consignorName,
        toParty: toParty || consigneeName,
        driverName: getVal(colDriverName),
        driverPhone: getVal(colDriverPhone),
        notes: getVal(colNotes),
        status: getVal(colStatus) || 'Confirmed',
        lrs: [lrItem],
      });
    }
  }

  // Convert grouped trips to full DispatchRecords with auto-calculated aggregates
  const validDispatches: DispatchRecord[] = [];
  let validLRCount = 0;

  for (const trip of tripGroups.values()) {
    const totals = recalculateDispatchTotals(trip.lrs, trip.placement);
    validLRCount += trip.lrs.length;

    validDispatches.push({
      id: generateSafeId('dsp'),
      date: trip.date,
      fromParty: trip.fromParty,
      toParty: trip.toParty,
      placement: trip.placement,
      transporterName: trip.transporterName,
      vehicleNumber: trip.vehicleNumber,
      driverName: trip.driverName,
      driverPhone: trip.driverPhone,
      lrNumbers: totals.lrNumbers,
      lrs: trip.lrs,
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
      status: (trip.status as any) || 'Confirmed',
      notes: trip.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: '',
      syncStatus: 'pending',
    });
  }

  return {
    totalRows: dataRowCount,
    validDispatches,
    validLRCount,
    duplicates,
    invalidRows,
    canImport: validDispatches.length > 0,
  };
}
