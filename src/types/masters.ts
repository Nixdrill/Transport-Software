export type PartyType = 'Consignor' | 'Consignee' | 'Both' | 'Billing Party (Issuer)';

export interface PartyMaster {
  id: string;
  name: string;
  type: PartyType;
  city: string;
  state: string;
  pincode?: string;
  gstin?: string;
  panNumber?: string; // Auto-derived from GSTIN (chars 3 to 12) or manually entered
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  defaultPaymentTerms?: string;
  
  // Billing Party (Issuer) & Branding Details
  logoUrl?: string; // Base64 Data URL or Image URL
  tagline?: string;
  cinNumber?: string; // CIN / MSME Udyam Registration No.
  website?: string;
  upiId?: string;
  isBillingParty?: boolean;

  // Optional Bank Account Details
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  accountHolderName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaster {
  id: string;
  vehicleNumber: string;
  vehicleType: string; // e.g. "32 Ft MXL Container", "20 Ft Taurus", "Trailer 40 Ft", "14 Wheeler 25 MT"
  placement: 'Market' | 'Own';
  capacityMT: number;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'Active' | 'Under Maintenance' | 'Inactive';
  rcExpiry?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  pucExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransporterMaster {
  id: string;
  name: string;
  panNumber?: string;
  gstin?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  tdsDeclaration?: boolean; // Form 194C Nil deduction for <= 10 vehicles
  defaultCommission?: number; // e.g. 500 or 1000
  defaultAdvancePercent?: number; // e.g. 70 or 80
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface RouteMaster {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  transitDays: number;
  primaryHighways?: string; // e.g. NH-48 / NH-44
  benchmarkRatePerMT: number; // e.g. 2400
  standardCommission?: number;
  defaultAdvancePercent?: number;
  tollChargesApprox?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverMaster {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  aadhaarNumber?: string;
  associatedVehicle?: string;
  emergencyContact?: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CommodityMaster {
  id: string;
  name: string;
  hsnCode?: string;
  defaultWeightUnit: 'MT' | 'Kg' | 'Quintal';
  defaultRateType: 'per_mt' | 'per_kg' | 'per_quintal' | 'fixed';
  packagingType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllMasters {
  parties: PartyMaster[];
  vehicles: VehicleMaster[];
  transporters: TransporterMaster[];
  routes: RouteMaster[];
  drivers: DriverMaster[];
  commodities: CommodityMaster[];
  lastUpdated: string;
}
