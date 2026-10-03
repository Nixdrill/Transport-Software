import { 
  PartyMaster, 
  VehicleMaster, 
  TransporterMaster, 
  RouteMaster, 
  DriverMaster, 
  CommodityMaster, 
  AllMasters 
} from '../types/masters';
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
      gstin: '20AAACT2727Q1ZS',
      address: 'Industrial Growth Centre, Phase 2',
      contactPerson: 'Arunav Mukherjee',
      phone: '+91 98321 00412',
      email: 'logistics@tatasteel.com',
      defaultPaymentTerms: '30 Days Net',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-2',
      name: 'Larsen & Toubro Infra Projects',
      type: 'Consignee',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAACL0140P1ZM',
      address: 'Gate 5, Metro Casting Yard, Aarey Colony',
      contactPerson: 'Sunil Deshmukh',
      phone: '+91 98200 45190',
      email: 'stores.mumbai@lntecc.com',
      defaultPaymentTerms: '15 Days / To Pay',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-3',
      name: 'UltraTech Cement Works',
      type: 'Consignor',
      city: 'Nagpur',
      state: 'Maharashtra',
      gstin: '27AAACU0305R1ZK',
      address: 'MIDC Butibori Industrial Area',
      contactPerson: 'Rajesh Agrawal',
      phone: '+91 94221 88390',
      email: 'dispatch.nagpur@ultratech.com',
      defaultPaymentTerms: 'Advance / Immediate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-4',
      name: 'Reliance Retail Logistics Hub',
      type: 'Both',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstin: '24AAACR5055K1Z8',
      address: 'Sanand Logistic Park, Sarkhej-Bavla Road',
      contactPerson: 'Ketan Shah',
      phone: '+91 99099 22100',
      email: 'inbound.sanand@ril.com',
      defaultPaymentTerms: '45 Days Corporate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-5',
      name: 'Jindal Steel & Power Ltd',
      type: 'Consignor',
      city: 'Raigarh',
      state: 'Chhattisgarh',
      gstin: '22AAACJ1408M1Z7',
      address: 'OP Jindal Industrial Park, Punjipathra',
      contactPerson: 'Vikas Sharma',
      phone: '+91 97555 33020',
      email: 'dispatch@raigarh.jspl.com',
      defaultPaymentTerms: '30 Days Net',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pty-6',
      name: 'Adani Ports & SEZ Terminal',
      type: 'Consignee',
      city: 'Mundra',
      state: 'Gujarat',
      gstin: '24AAACA2804K1ZV',
      address: 'West Port Gate, Mundra Port Complex',
      contactPerson: 'Bhavesh Patel',
      phone: '+91 98250 11988',
      email: 'cargo.gate@adani.com',
      defaultPaymentTerms: 'Immediate Port Clearance',
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
