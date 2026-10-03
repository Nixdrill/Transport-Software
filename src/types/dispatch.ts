export type PlacementType = 'Market' | 'Own';

export type WeightUnit = 'MT' | 'Kg' | 'Quintal';

export type RateType = 'per_mt' | 'per_kg' | 'per_quintal' | 'fixed';

export type DispatchStatus = 'Draft' | 'Confirmed' | 'In Transit' | 'Delivered';

export type SyncStatus = 'synced' | 'pending' | 'offline_created' | 'error';

export interface LRItem {
  id: string;
  lrNumber: string;
  lrDate?: string;
  consignorName: string;
  consignorCity: string;
  consigneeName: string;
  consigneeCity: string;
  invoiceNumbers: string[];
  ewaybillNumbers: string[];
  weight: number;
  weightUnit: WeightUnit;
  rate: number;
  rateType: RateType;
  freightAmount: number;
  advanceAmount: number;
  extraCharges: number;
  remarks?: string;
  // Market Vehicle Placement Data Scheme
  marketWeight?: number;
  marketRate?: number;
  grossMarketFreight?: number;
  marketCommission?: number; // Deduction: Commission / Brokerage
  marketAdvance?: number; // Deduction: Advance paid to transporter
  netMarketFreight?: number; // Gross Market Freight - (Commission + Advance)
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface DispatchRecord {
  id: string;
  date: string; // YYYY-MM-DD
  fromParty: string;
  toParty: string;
  placement: PlacementType;
  transporterName: string;
  vehicleNumber: string;
  lrNumbers: string[]; // List of LR numbers for easy indexing
  lrs: LRItem[]; // Nested multiple LRs
  totalWeight: number; // Aggregate
  totalFreightAmount: number; // Aggregate
  totalAdvance: number;
  totalExtraCharges: number;
  netPayable: number;
  totalLrsCount: number;
  // Market Vehicle Aggregates (when placement === 'Market')
  totalGrossMarketFreight?: number;
  totalMarketCommission?: number;
  totalMarketAdvance?: number;
  totalNetMarketFreight?: number;
  marketMargin?: number; // Total Client Freight - Gross Market Freight
  status: DispatchStatus;
  notes?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
