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
  parties: [],
  vehicles: [],
  transporters: [],
  routes: [],
  drivers: [],
  commodities: [],
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
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      transporters: Array.isArray(parsed.transporters) ? parsed.transporters : [],
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers : [],
      commodities: Array.isArray(parsed.commodities) ? parsed.commodities : [],
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

/**
 * Returns all Parties configured as Billing Entities / Issuers
 */
export function getBillingParties(): PartyMaster[] {
  const masters = getMasters();
  const billingParties = masters.parties.filter(
    (p) => p.type === 'Billing Party (Issuer)' || p.isBillingParty === true
  );

  if (billingParties.length === 0) {
    return masters.parties;
  }
  return billingParties;
}

/**
 * Finds a billing party by name or ID
 */
export function findBillingPartyMaster(identifier?: string): PartyMaster | undefined {
  if (!identifier) return undefined;
  const masters = getMasters();
  const clean = identifier.trim().toLowerCase();
  return masters.parties.find(
    (p) =>
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase().trim() === clean ||
      p.name.toLowerCase().includes(clean)
  );
}
