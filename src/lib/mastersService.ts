import { 
  PartyMaster, 
  VehicleMaster, 
  TransporterMaster, 
  RouteMaster, 
  DriverMaster, 
  CommodityMaster, 
  AllMasters 
} from '../types/masters';
import { DispatchRecord } from '../types/dispatch';
import { generateSafeId } from './calculations';

const MASTERS_STORAGE_KEY = 'logitrack_masters_v1';

export const DEFAULT_MASTERS: AllMasters = {
  lastUpdated: new Date().toISOString(),
  parties: [
    {
      id: 'pty-1',
      name: 'Tata Steel Processing Ltd',
      type: 'Consignor',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      pincode: '831001',
      gstin: '20AAACT2727Q1ZS',
      panNumber: 'AAACT2727Q',
      address: 'Plot No. 14, Industrial Growth Centre, Phase 2, Adityapur Industrial Area',
      contactPerson: 'Arunav Mukherjee',
      phone: '+91 98321 00412',
      email: 'logistics@tatasteel.com',
      defaultPaymentTerms: '30 Days Net',
      bankName: 'State Bank of India',
      bankAccountNumber: '38192019284',
      bankIfsc: 'SBIN0001827',
      bankBranch: 'Bistupur Commercial Branch, Jamshedpur',
      accountHolderName: 'Tata Steel Processing Ltd',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-2',
      name: 'Larsen & Toubro Infra Projects',
      type: 'Consignee',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400065',
      gstin: '27AAACL0140P1ZM',
      panNumber: 'AAACL0140P',
      address: 'Gate 5, Metro Casting Yard, Aarey Milk Colony, Western Express Highway, Goregaon East',
      contactPerson: 'Sunil Deshmukh',
      phone: '+91 98200 45190',
      email: 'stores.mumbai@lntecc.com',
      defaultPaymentTerms: '15 Days / To Pay',
      bankName: 'HDFC Bank Ltd',
      bankAccountNumber: '50200029104812',
      bankIfsc: 'HDFC0000060',
      bankBranch: 'Fort Commercial Branch, Mumbai',
      accountHolderName: 'Larsen & Toubro Infra Projects',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-3',
      name: 'UltraTech Cement Works',
      type: 'Consignor',
      city: 'Nagpur',
      state: 'Maharashtra',
      pincode: '441108',
      gstin: '27AAACU0305R1ZK',
      panNumber: 'AAACU0305R',
      address: 'Plot B-45, MIDC Butibori Industrial Area, Wardha Road',
      contactPerson: 'Rajesh Agrawal',
      phone: '+91 94221 88390',
      email: 'dispatch.nagpur@ultratech.com',
      defaultPaymentTerms: 'Advance / Immediate',
      bankName: 'ICICI Bank Ltd',
      bankAccountNumber: '003505018271',
      bankIfsc: 'ICIC0000035',
      bankBranch: 'Civil Lines, Nagpur',
      accountHolderName: 'UltraTech Cement Works',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-4',
      name: 'Reliance Retail Logistics Hub',
      type: 'Both',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382170',
      gstin: '24AAACR5055K1Z8',
      panNumber: 'AAACR5055K',
      address: 'Warehouse Block C, Sanand Logistic Park, Sarkhej-Bavla National Highway',
      contactPerson: 'Ketan Shah',
      phone: '+91 99099 22100',
      email: 'inbound.sanand@ril.com',
      defaultPaymentTerms: '45 Days Corporate',
      bankName: 'Axis Bank Ltd',
      bankAccountNumber: '914020019283741',
      bankIfsc: 'UTIB0000022',
      bankBranch: 'SG Highway Branch, Ahmedabad',
      accountHolderName: 'Reliance Retail Logistics Hub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-5',
      name: 'Jindal Steel & Power Ltd',
      type: 'Consignor',
      city: 'Raigarh',
      state: 'Chhattisgarh',
      pincode: '496001',
      gstin: '22AAACJ1408M1Z7',
      panNumber: 'AAACJ1408M',
      address: 'OP Jindal Industrial Park, Punjipathra, Raigarh-Tamnar Corridor',
      contactPerson: 'Vikas Sharma',
      phone: '+91 97555 33020',
      email: 'dispatch@raigarh.jspl.com',
      defaultPaymentTerms: '30 Days Net',
      bankName: 'Punjab National Bank',
      bankAccountNumber: '1849002100049281',
      bankIfsc: 'PUNB0184900',
      bankBranch: 'Main Road Raigarh',
      accountHolderName: 'Jindal Steel & Power Ltd',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-6',
      name: 'Adani Ports & SEZ Terminal',
      type: 'Consignee',
      city: 'Mundra',
      state: 'Gujarat',
      pincode: '370421',
      gstin: '24AAACA2804K1ZV',
      panNumber: 'AAACA2804K',
      address: 'West Port Gate No. 3, Container Freight Station, Mundra Port Complex',
      contactPerson: 'Bhavesh Patel',
      phone: '+91 98250 11988',
      email: 'cargo.gate@adani.com',
      defaultPaymentTerms: 'Immediate Port Clearance',
      bankName: 'Kotak Mahindra Bank',
      bankAccountNumber: '7412948201',
      bankIfsc: 'KKBK0000812',
      bankBranch: 'Mundra Port Complex',
      accountHolderName: 'Adani Ports & SEZ Terminal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  vehicles: [
    {
      id: 'veh-1',
      vehicleNumber: 'MH 12 RN 4589',
      vehicleType: '14 Wheeler Multi-Axle (25 MT)',
      placement: 'Market',
      capacityMT: 25.0,
      transporterName: 'Patel Roadways Logistics Ltd',
      driverName: 'Ramesh Singh',
      driverPhone: '+91 98234 11204',
      status: 'Active',
      rcExpiry: '2028-11-15',
      insuranceExpiry: '2026-12-31',
      fitnessExpiry: '2027-05-20',
      pucExpiry: '2026-10-30',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'veh-2',
      vehicleNumber: 'GJ 06 TT 9021',
      vehicleType: '32 Ft MXL Container (18 MT)',
      placement: 'Own',
      capacityMT: 18.5,
      transporterName: 'Own Fleet Division #1',
      driverName: 'Vikram Gurjar',
      driverPhone: '+91 97123 44556',
      status: 'Active',
      rcExpiry: '2029-03-10',
      insuranceExpiry: '2027-01-15',
      fitnessExpiry: '2027-08-12',
      pucExpiry: '2026-11-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'veh-3',
      vehicleNumber: 'DL 01 AB 8844',
      vehicleType: '20 Ft Taurus (16 MT)',
      placement: 'Market',
      capacityMT: 16.0,
      transporterName: 'VRL Logistics Carrier Ltd',
      driverName: 'Sanjay Yadav',
      driverPhone: '+91 98112 00987',
      status: 'Active',
      rcExpiry: '2027-09-05',
      insuranceExpiry: '2026-11-20',
      fitnessExpiry: '2027-04-18',
      pucExpiry: '2026-12-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'veh-4',
      vehicleNumber: 'KA 01 MG 3390',
      vehicleType: '40 Ft High-Bed Trailer (35 MT)',
      placement: 'Market',
      capacityMT: 35.0,
      transporterName: 'AllCargo Fleet Services',
      driverName: 'Manjunath Reddy',
      driverPhone: '+91 99801 22340',
      status: 'Active',
      rcExpiry: '2028-06-25',
      insuranceExpiry: '2027-02-28',
      fitnessExpiry: '2027-07-30',
      pucExpiry: '2026-10-25',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'veh-5',
      vehicleNumber: 'MH 04 KF 7712',
      vehicleType: '10 Wheeler Truck (16 MT)',
      placement: 'Own',
      capacityMT: 16.0,
      transporterName: 'Own Fleet Division #1',
      driverName: 'Deepak More',
      driverPhone: '+91 98210 55432',
      status: 'Active',
      rcExpiry: '2030-01-18',
      insuranceExpiry: '2027-04-10',
      fitnessExpiry: '2028-02-15',
      pucExpiry: '2026-11-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  transporters: [
    {
      id: 'trn-1',
      name: 'Patel Roadways Logistics Ltd',
      panNumber: 'AAACP1234K',
      gstin: '27AAACP1234K1Z9',
      contactPerson: 'Mahesh Patel',
      phone: '+91 98201 11223',
      email: 'booking@patelroadways.com',
      city: 'Mumbai',
      tdsDeclaration: true,
      defaultCommission: 500,
      defaultAdvancePercent: 70,
      bankName: 'HDFC Bank',
      bankAccountNumber: '50200012345678',
      bankIfsc: 'HDFC0000123',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'trn-2',
      name: 'AllCargo Fleet Services',
      panNumber: 'AABCA9876L',
      gstin: '24AABCA9876L1Z4',
      contactPerson: 'Suresh Nair',
      phone: '+91 98450 77889',
      email: 'fleet@allcargo.com',
      city: 'Ahmedabad',
      tdsDeclaration: false,
      defaultCommission: 800,
      defaultAdvancePercent: 75,
      bankName: 'State Bank of India',
      bankAccountNumber: '30498761234',
      bankIfsc: 'SBIN0001245',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'trn-3',
      name: 'VRL Logistics Carrier Ltd',
      panNumber: 'AAACV4455P',
      gstin: '29AAACV4455P1Z3',
      contactPerson: 'Anand Kulkarni',
      phone: '+91 98860 33445',
      email: 'operations@vrl.in',
      city: 'Hubli',
      tdsDeclaration: true,
      defaultCommission: 500,
      defaultAdvancePercent: 80,
      bankName: 'ICICI Bank',
      bankAccountNumber: '001205009876',
      bankIfsc: 'ICIC0000012',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'trn-4',
      name: 'Own Fleet Division #1',
      panNumber: 'AAACF9900M',
      gstin: '27AAACF9900M1Z2',
      contactPerson: 'Fleet Manager (Internal)',
      phone: '+91 98200 99000',
      email: 'fleet@logitrack.com',
      city: 'Pune',
      tdsDeclaration: false,
      defaultCommission: 0,
      defaultAdvancePercent: 50,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  routes: [
    {
      id: 'rt-1',
      origin: 'Mumbai',
      destination: 'Ahmedabad',
      distanceKm: 530,
      transitDays: 2,
      primaryHighways: 'NH-48 (Western Corridor)',
      benchmarkRatePerMT: 1850,
      standardCommission: 500,
      defaultAdvancePercent: 75,
      tollChargesApprox: 2450,
      notes: 'Heavy traffic near Manor and Surat bypass during daytime.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rt-2',
      origin: 'Jamshedpur',
      destination: 'Mumbai',
      distanceKm: 1680,
      transitDays: 4,
      primaryHighways: 'NH-49 & NH-53',
      benchmarkRatePerMT: 3100,
      standardCommission: 1000,
      defaultAdvancePercent: 70,
      tollChargesApprox: 7800,
      notes: 'Steel heavy corridor. Weighbridge verification at state border.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rt-3',
      origin: 'Nagpur',
      destination: 'Pune',
      distanceKm: 710,
      transitDays: 2,
      primaryHighways: 'Samruddhi Mahamarg / NH-753',
      benchmarkRatePerMT: 2100,
      standardCommission: 500,
      defaultAdvancePercent: 75,
      tollChargesApprox: 3100,
      notes: 'Samruddhi expressway route reduces transit by 6 hours.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rt-4',
      origin: 'Delhi',
      destination: 'Mumbai',
      distanceKm: 1420,
      transitDays: 3,
      primaryHighways: 'Delhi-Mumbai Expressway (NE-4 / NH-48)',
      benchmarkRatePerMT: 2750,
      standardCommission: 800,
      defaultAdvancePercent: 70,
      tollChargesApprox: 6200,
      notes: 'High-speed corridor with automated FASTag tolling.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  drivers: [
    {
      id: 'drv-1',
      name: 'Ramesh Singh',
      phone: '+91 98234 11204',
      licenseNumber: 'MH12 20140029811',
      licenseExpiry: '2029-08-20',
      aadhaarNumber: 'XXXX-XXXX-4819',
      associatedVehicle: 'MH 12 RN 4589',
      emergencyContact: '+91 98234 99011 (Brother)',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'drv-2',
      name: 'Vikram Gurjar',
      phone: '+91 97123 44556',
      licenseNumber: 'GJ06 20160081234',
      licenseExpiry: '2031-03-15',
      aadhaarNumber: 'XXXX-XXXX-9012',
      associatedVehicle: 'GJ 06 TT 9021',
      emergencyContact: '+91 97123 88123 (Father)',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'drv-3',
      name: 'Sanjay Yadav',
      phone: '+91 98112 00987',
      licenseNumber: 'DL01 20120011928',
      licenseExpiry: '2028-10-12',
      aadhaarNumber: 'XXXX-XXXX-3341',
      associatedVehicle: 'DL 01 AB 8844',
      emergencyContact: '+91 98112 88765 (Spouse)',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'drv-4',
      name: 'Deepak More',
      phone: '+91 98210 55432',
      licenseNumber: 'MH04 20180044551',
      licenseExpiry: '2033-05-18',
      aadhaarNumber: 'XXXX-XXXX-6621',
      associatedVehicle: 'MH 04 KF 7712',
      emergencyContact: '+91 98210 99887 (Brother)',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  commodities: [
    {
      id: 'cmd-1',
      name: 'HR Steel Coils / TMT Rebars',
      hsnCode: '7214',
      defaultWeightUnit: 'MT',
      defaultRateType: 'per_mt',
      packagingType: 'Bundles / Heavy Coils',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cmd-2',
      name: 'Portland Cement (50kg Bags)',
      hsnCode: '2523',
      defaultWeightUnit: 'MT',
      defaultRateType: 'per_mt',
      packagingType: 'HDPE Bags / Palletized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cmd-3',
      name: 'Automotive Engine Components',
      hsnCode: '8708',
      defaultWeightUnit: 'Kg',
      defaultRateType: 'per_kg',
      packagingType: 'Wooden Crates / Steel Bins',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cmd-4',
      name: 'FMCG Packaged Goods',
      hsnCode: '3401',
      defaultWeightUnit: 'MT',
      defaultRateType: 'per_mt',
      packagingType: 'Corrugated Master Cartons',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

// ================= STORAGE API =================

export function getMasters(): AllMasters {
  try {
    const raw = localStorage.getItem(MASTERS_STORAGE_KEY);
    if (!raw) {
      saveMasters(DEFAULT_MASTERS);
      return DEFAULT_MASTERS;
    }
    const parsed = JSON.parse(raw);
    return {
      parties: Array.isArray(parsed.parties) ? parsed.parties : DEFAULT_MASTERS.parties,
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : DEFAULT_MASTERS.vehicles,
      transporters: Array.isArray(parsed.transporters) ? parsed.transporters : DEFAULT_MASTERS.transporters,
      routes: Array.isArray(parsed.routes) ? parsed.routes : DEFAULT_MASTERS.routes,
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers : DEFAULT_MASTERS.drivers,
      commodities: Array.isArray(parsed.commodities) ? parsed.commodities : DEFAULT_MASTERS.commodities,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (e) {
    console.warn('Error reading masters from storage, restoring default:', e);
    return DEFAULT_MASTERS;
  }
}

export function saveMasters(masters: AllMasters): void {
  try {
    const payload = {
      ...masters,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to persist masters in localStorage:', e);
  }
}

export function resetMastersToDefaults(): AllMasters {
  saveMasters(DEFAULT_MASTERS);
  return DEFAULT_MASTERS;
}

export function clearAllMasters(): AllMasters {
  const emptyMasters: AllMasters = {
    parties: [],
    vehicles: [],
    transporters: [],
    routes: [],
    drivers: [],
    commodities: [],
    lastUpdated: new Date().toISOString(),
  };
  saveMasters(emptyMasters);
  return emptyMasters;
}

export function clearMasterCategory(category: keyof Omit<AllMasters, 'lastUpdated'>): AllMasters {
  const current = getMasters();
  const updated: AllMasters = {
    ...current,
    [category]: [],
    lastUpdated: new Date().toISOString(),
  };
  saveMasters(updated);
  return updated;
}

// ================= AUTO-FILL & LOOKUP AUTOMATIONS =================

/**
 * Normalizes vehicle number (strips spaces, dashes, uppercase) for fuzzy lookup
 */
export function normalizeVehicleNo(num: string): string {
  return num.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Searches Vehicle Master by registration number
 */
export function findVehicleMaster(vehicleNo: string): VehicleMaster | undefined {
  if (!vehicleNo || !vehicleNo.trim()) return undefined;
  const target = normalizeVehicleNo(vehicleNo);
  const masters = getMasters();
  return masters.vehicles.find((v) => normalizeVehicleNo(v.vehicleNumber) === target);
}

/**
 * Searches Party Master by company/party name
 */
export function findPartyMaster(partyName: string): PartyMaster | undefined {
  if (!partyName || !partyName.trim()) return undefined;
  const target = partyName.trim().toLowerCase();
  const masters = getMasters();
  return masters.parties.find(
    (p) => p.name.toLowerCase() === target || p.name.toLowerCase().includes(target)
  );
}

/**
 * Searches Route Master by Origin and Destination cities
 */
export function findRouteMaster(origin: string, destination: string): RouteMaster | undefined {
  if (!origin || !destination) return undefined;
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  const masters = getMasters();

  return masters.routes.find((r) => {
    const rO = r.origin.toLowerCase();
    const rD = r.destination.toLowerCase();
    return (
      (rO.includes(o) || o.includes(rO)) &&
      (rD.includes(d) || d.includes(rD))
    );
  });
}

/**
 * Suggests default consignees for a given consignor based on past routes or both-type parties
 */
export function suggestConsignees(consignorName: string): PartyMaster[] {
  const masters = getMasters();
  return masters.parties.filter(
    (p) => p.type === 'Consignee' || p.type === 'Both' || p.name !== consignorName
  );
}

// ================= GSTIN TO PAN EXTRACTION =================

/**
 * Automatically extracts the 10-character Indian PAN from a 15-character GSTIN.
 * GSTIN structure: 2 digits State Code + 10 characters PAN (chars 3 to 12) + 1 entity code + 'Z' + 1 check digit.
 * Example: 27AAACR5055K1Z8 -> AAACR5055K
 */
export function extractPanFromGstin(gstin?: string): string {
  if (!gstin) return '';
  const cleaned = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 12) {
    const candidate = cleaned.slice(2, 12);
    // Standard PAN format: 5 letters, 4 digits, 1 letter
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(candidate)) {
      return candidate;
    }
    if (candidate.length === 10) {
      return candidate;
    }
  }
  return '';
}

// ================= AUTOMATIC MASTER INGESTION =================

export interface AutoStoreResult {
  addedParties: number;
  addedVehicles: number;
  addedTransporters: number;
  addedRoutes: number;
  addedDrivers: number;
  addedCommodities: number;
  totalAdded: number;
  details: string[];
}

/**
 * Inspects a newly created or updated dispatch record, and automatically stores
 * any unrecognized Parties, Vehicles, Transporters, Drivers, Routes, and Commodities
 * directly into Masters so future entries auto-fill smoothly.
 */
export function autoStoreDispatchIntoMasters(dispatch: DispatchRecord): AutoStoreResult {
  const masters = getMasters();
  const updatedMasters: AllMasters = {
    ...masters,
    parties: [...masters.parties],
    vehicles: [...masters.vehicles],
    transporters: [...masters.transporters],
    routes: [...masters.routes],
    drivers: [...masters.drivers],
    commodities: [...masters.commodities],
  };

  const details: string[] = [];
  let addedParties = 0;
  let addedVehicles = 0;
  let addedTransporters = 0;
  let addedRoutes = 0;
  let addedDrivers = 0;
  let addedCommodities = 0;

  // 1. Process Parties: fromParty (Consignor), toParty (Consignee), and LR consignors/consignees
  const partyEntries: { name: string; type: 'Consignor' | 'Consignee'; city?: string }[] = [];

  if (dispatch.fromParty && dispatch.fromParty.trim()) {
    partyEntries.push({ 
      name: dispatch.fromParty.trim(), 
      type: 'Consignor', 
      city: dispatch.lrs?.[0]?.consignorCity || '' 
    });
  }
  if (dispatch.toParty && dispatch.toParty.trim()) {
    partyEntries.push({ 
      name: dispatch.toParty.trim(), 
      type: 'Consignee', 
      city: dispatch.lrs?.[0]?.consigneeCity || '' 
    });
  }

  for (const lr of dispatch.lrs || []) {
    if (lr.consignorName && lr.consignorName.trim()) {
      partyEntries.push({ 
        name: lr.consignorName.trim(), 
        type: 'Consignor', 
        city: lr.consignorCity || '' 
      });
    }
    if (lr.consigneeName && lr.consigneeName.trim()) {
      partyEntries.push({ 
        name: lr.consigneeName.trim(), 
        type: 'Consignee', 
        city: lr.consigneeCity || '' 
      });
    }
  }

  for (const entry of partyEntries) {
    const existingIndex = updatedMasters.parties.findIndex(
      (p) => p.name.toLowerCase().trim() === entry.name.toLowerCase().trim()
    );

    if (existingIndex === -1) {
      // Create new Party
      const newParty: PartyMaster = {
        id: generateSafeId('pty'),
        name: entry.name,
        type: entry.type,
        city: entry.city || 'Hub Location',
        state: 'India',
        defaultPaymentTerms: entry.type === 'Consignor' ? '30 Days Net' : '15 Days / To Pay',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedMasters.parties.unshift(newParty);
      addedParties++;
      details.push(`Party: ${entry.name} (${entry.type})`);
    } else {
      // If already exists but was Consignor and now also Consignee, upgrade to 'Both'
      const existing = updatedMasters.parties[existingIndex];
      if (existing.type !== 'Both' && existing.type !== entry.type) {
        updatedMasters.parties[existingIndex] = {
          ...existing,
          type: 'Both',
          city: existing.city || entry.city || '',
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // 2. Process Vehicle
  if (dispatch.vehicleNumber && dispatch.vehicleNumber.trim()) {
    const cleanVeh = dispatch.vehicleNumber.trim().toUpperCase();
    const existingVeh = updatedMasters.vehicles.find(
      (v) => normalizeVehicleNo(v.vehicleNumber) === normalizeVehicleNo(cleanVeh)
    );

    if (!existingVeh) {
      const tonnage = dispatch.totalWeight > 0 ? Math.ceil(dispatch.totalWeight) : 25;
      const newVehicle: VehicleMaster = {
        id: generateSafeId('veh'),
        vehicleNumber: cleanVeh,
        placement: dispatch.placement || 'Market',
        capacityMT: tonnage,
        vehicleType: tonnage >= 24 ? '14 Wheeler Multi-Axle (25 MT)' : tonnage >= 16 ? '32 Ft MXL Container (18 MT)' : 'Taurus 20 Ft (16 MT)',
        transporterName: dispatch.transporterName?.trim() || '',
        driverName: dispatch.driverName?.trim() || '',
        driverPhone: dispatch.driverPhone?.trim() || '',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedMasters.vehicles.unshift(newVehicle);
      addedVehicles++;
      details.push(`Vehicle: ${cleanVeh}`);
    }
  }

  // 3. Process Transporter
  if (dispatch.transporterName && dispatch.transporterName.trim()) {
    const cleanTrn = dispatch.transporterName.trim();
    const existingTrn = updatedMasters.transporters.find(
      (t) => t.name.toLowerCase().trim() === cleanTrn.toLowerCase().trim()
    );

    if (!existingTrn) {
      const avgCommission = dispatch.totalMarketCommission 
        ? Math.round(dispatch.totalMarketCommission / Math.max(dispatch.lrs?.length || 1, 1))
        : 500;

      const newTransporter: TransporterMaster = {
        id: generateSafeId('trn'),
        name: cleanTrn,
        status: 'Active',
        defaultCommission: avgCommission,
        defaultAdvancePercent: 70,
        tdsDeclaration: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedMasters.transporters.unshift(newTransporter);
      addedTransporters++;
      details.push(`Transporter: ${cleanTrn}`);
    }
  }

  // 4. Process Driver
  if (dispatch.driverName && dispatch.driverName.trim()) {
    const cleanDrv = dispatch.driverName.trim();
    const existingDrv = updatedMasters.drivers.find(
      (d) => d.name.toLowerCase().trim() === cleanDrv.toLowerCase().trim()
    );

    if (!existingDrv) {
      const newDriver: DriverMaster = {
        id: generateSafeId('drv'),
        name: cleanDrv,
        phone: dispatch.driverPhone?.trim() || '',
        associatedVehicle: dispatch.vehicleNumber?.trim() || '',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedMasters.drivers.unshift(newDriver);
      addedDrivers++;
      details.push(`Driver: ${cleanDrv}`);
    }
  }

  // 5. Process Corridor / Route
  const originCity = dispatch.lrs?.[0]?.consignorCity || dispatch.fromParty?.trim();
  const destCity = dispatch.lrs?.[0]?.consigneeCity || dispatch.toParty?.trim();

  if (originCity && destCity && originCity.toLowerCase() !== destCity.toLowerCase()) {
    const existingRoute = updatedMasters.routes.find((r) => {
      const o1 = r.origin.toLowerCase().trim();
      const d1 = r.destination.toLowerCase().trim();
      const o2 = originCity.toLowerCase().trim();
      const d2 = destCity.toLowerCase().trim();
      return (o1 === o2 || o1.includes(o2) || o2.includes(o1)) &&
             (d1 === d2 || d1.includes(d2) || d2.includes(d1));
    });

    if (!existingRoute) {
      const avgRate = dispatch.lrs?.[0]?.rate || 2400;
      const newRoute: RouteMaster = {
        id: generateSafeId('rt'),
        origin: originCity,
        destination: destCity,
        distanceKm: 500,
        transitDays: 2,
        benchmarkRatePerMT: avgRate > 0 ? Math.round(avgRate) : 2400,
        primaryHighways: 'National Corridor',
        standardCommission: 500,
        defaultAdvancePercent: 70,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedMasters.routes.unshift(newRoute);
      addedRoutes++;
      details.push(`Corridor: ${originCity} ➔ ${destCity}`);
    }
  }

  // 6. Process Commodities from LR remarks
  for (const lr of dispatch.lrs || []) {
    if (lr.remarks && lr.remarks.trim().length >= 3) {
      const cargo = lr.remarks.trim();
      // Skip if looks like a standard note
      if (!cargo.toLowerCase().includes('freight') && !cargo.toLowerCase().includes('payment')) {
        const existingCmd = updatedMasters.commodities.find(
          (c) => c.name.toLowerCase().trim() === cargo.toLowerCase().trim()
        );
        if (!existingCmd) {
          const newCmd: CommodityMaster = {
            id: generateSafeId('cmd'),
            name: cargo,
            defaultWeightUnit: lr.weightUnit || 'MT',
            defaultRateType: lr.rateType || 'per_mt',
            packagingType: 'Commercial Transport',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedMasters.commodities.unshift(newCmd);
          addedCommodities++;
          details.push(`Commodity: ${cargo}`);
        }
      }
    }
  }

  const totalAdded = addedParties + addedVehicles + addedTransporters + addedRoutes + addedDrivers + addedCommodities;

  if (totalAdded > 0) {
    saveMasters(updatedMasters);
  }

  return {
    addedParties,
    addedVehicles,
    addedTransporters,
    addedRoutes,
    addedDrivers,
    addedCommodities,
    totalAdded,
    details,
  };
}

/**
 * Scans an entire list of dispatches and automatically synchronizes
 * any missing parties, vehicles, transporters, routes, and commodities to Masters.
 */
export function batchSyncDispatchesToMasters(dispatches: DispatchRecord[]): AutoStoreResult {
  let addedParties = 0;
  let addedVehicles = 0;
  let addedTransporters = 0;
  let addedRoutes = 0;
  let addedDrivers = 0;
  let addedCommodities = 0;
  const allDetails: string[] = [];

  for (const d of dispatches) {
    const res = autoStoreDispatchIntoMasters(d);
    addedParties += res.addedParties;
    addedVehicles += res.addedVehicles;
    addedTransporters += res.addedTransporters;
    addedRoutes += res.addedRoutes;
    addedDrivers += res.addedDrivers;
    addedCommodities += res.addedCommodities;
    allDetails.push(...res.details);
  }

  return {
    addedParties,
    addedVehicles,
    addedTransporters,
    addedRoutes,
    addedDrivers,
    addedCommodities,
    totalAdded: addedParties + addedVehicles + addedTransporters + addedRoutes + addedDrivers + addedCommodities,
    details: allDetails,
  };
}

// ================= BACKUP & RESTORE WITH OVERWRITE / MERGE =================

/**
 * Restores Masters dataset from backup with either full Overwrite or Merge mode.
 * @param newMasters The imported Masters dataset
 * @param mode 'overwrite' will completely replace current Masters; 'merge' updates or appends records.
 */
export function restoreMasters(
  newMasters: AllMasters,
  mode: 'overwrite' | 'merge' = 'overwrite'
): AllMasters {
  if (mode === 'overwrite') {
    saveMasters(newMasters);
    return newMasters;
  }

  // Merge Mode
  const current = getMasters();

  // Merge Parties by normalized name
  const partyMap = new Map<string, PartyMaster>();
  for (const p of current.parties) partyMap.set(p.name.toLowerCase().trim(), p);
  for (const p of newMasters.parties || []) {
    const key = p.name.toLowerCase().trim();
    if (partyMap.has(key)) {
      partyMap.set(key, { ...partyMap.get(key)!, ...p, updatedAt: new Date().toISOString() });
    } else {
      partyMap.set(key, p);
    }
  }

  // Merge Vehicles by normalized registration
  const vehMap = new Map<string, VehicleMaster>();
  for (const v of current.vehicles) vehMap.set(normalizeVehicleNo(v.vehicleNumber), v);
  for (const v of newMasters.vehicles || []) {
    const key = normalizeVehicleNo(v.vehicleNumber);
    if (vehMap.has(key)) {
      vehMap.set(key, { ...vehMap.get(key)!, ...v, updatedAt: new Date().toISOString() });
    } else {
      vehMap.set(key, v);
    }
  }

  // Merge Transporters by name
  const trnMap = new Map<string, TransporterMaster>();
  for (const t of current.transporters) trnMap.set(t.name.toLowerCase().trim(), t);
  for (const t of newMasters.transporters || []) {
    const key = t.name.toLowerCase().trim();
    if (trnMap.has(key)) {
      trnMap.set(key, { ...trnMap.get(key)!, ...t, updatedAt: new Date().toISOString() });
    } else {
      trnMap.set(key, t);
    }
  }

  // Merge Routes by Origin + Destination
  const routeMap = new Map<string, RouteMaster>();
  for (const r of current.routes) routeMap.set(`${r.origin.toLowerCase().trim()}::${r.destination.toLowerCase().trim()}`, r);
  for (const r of newMasters.routes || []) {
    const key = `${r.origin.toLowerCase().trim()}::${r.destination.toLowerCase().trim()}`;
    if (routeMap.has(key)) {
      routeMap.set(key, { ...routeMap.get(key)!, ...r, updatedAt: new Date().toISOString() });
    } else {
      routeMap.set(key, r);
    }
  }

  // Merge Drivers by name
  const drvMap = new Map<string, DriverMaster>();
  for (const d of current.drivers) drvMap.set(d.name.toLowerCase().trim(), d);
  for (const d of newMasters.drivers || []) {
    const key = d.name.toLowerCase().trim();
    if (drvMap.has(key)) {
      drvMap.set(key, { ...drvMap.get(key)!, ...d, updatedAt: new Date().toISOString() });
    } else {
      drvMap.set(key, d);
    }
  }

  // Merge Commodities by name
  const cmdMap = new Map<string, CommodityMaster>();
  for (const c of current.commodities) cmdMap.set(c.name.toLowerCase().trim(), c);
  for (const c of newMasters.commodities || []) {
    const key = c.name.toLowerCase().trim();
    if (cmdMap.has(key)) {
      cmdMap.set(key, { ...cmdMap.get(key)!, ...c, updatedAt: new Date().toISOString() });
    } else {
      cmdMap.set(key, c);
    }
  }

  const merged: AllMasters = {
    parties: Array.from(partyMap.values()),
    vehicles: Array.from(vehMap.values()),
    transporters: Array.from(trnMap.values()),
    routes: Array.from(routeMap.values()),
    drivers: Array.from(drvMap.values()),
    commodities: Array.from(cmdMap.values()),
    lastUpdated: new Date().toISOString(),
  };

  saveMasters(merged);
  return merged;
}
