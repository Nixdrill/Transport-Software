import { DispatchRecord } from '../types/dispatch';

export interface RouteAnalysisResult {
  report: string;
  estDistanceKm: number | null;
  mapsLinks: Array<{ title: string; uri: string }>;
}

export interface MarketRateRecommendation {
  recommendedMarketRatePerMT: number;
  marketRateRangeMin: number;
  marketRateRangeMax: number;
  estimatedTripDistanceKm: number;
  recommendedCommission: number;
  recommendedAdvancePercent: number;
  expectedTransitDays: number;
  keyHighways?: string;
  negotiationTips: string;
}

export interface ExtractedDispatch {
  date?: string;
  vehicleNumber?: string;
  placement?: 'Market' | 'Own';
  transporterName?: string;
  fromParty?: string;
  toParty?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  lrs: Array<{
    lrNumber: string;
    lrDate?: string;
    consignorName: string;
    consignorCity?: string;
    consigneeName: string;
    consigneeCity?: string;
    invoiceNumbers?: string[];
    ewaybillNumbers?: string[];
    weight: number;
    weightUnit?: 'MT' | 'Kg' | 'Quintal';
    rate: number;
    rateType?: 'per_mt' | 'per_kg' | 'per_quintal' | 'fixed';
    freightAmount?: number;
    advanceAmount?: number;
    extraCharges?: number;
    marketWeight?: number;
    marketRate?: number;
    marketCommission?: number;
    marketAdvance?: number;
    remarks?: string;
  }>;
}

export interface FleetHealthAudit {
  auditReport: string;
  recordsAuditedCount: number;
}

/**
 * 1. Analyze transport corridor & distance using Google Maps Grounding via server
 */
export async function analyzeRouteWithMaps(
  origin: string,
  destination: string,
  options?: {
    vehicleType?: string;
    cargoWeight?: number;
  }
): Promise<RouteAnalysisResult> {
  // Attempt to get user geolocation if permission is granted in browser
  let userLocation: { latitude: number; longitude: number } | undefined;
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 2500 }
        );
      });
      if (pos) {
        userLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }
    } catch {
      // Ignore location error
    }
  }

  const response = await fetch('/api/gemini/route-maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      vehicleType: options?.vehicleType,
      cargoWeight: options?.cargoWeight,
      userLocation,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch route analysis from Gemini Maps Grounding.');
  }

  return response.json();
}

/**
 * 2. Benchmark market hire rates based on corridor, distance, and weight
 */
export async function recommendMarketRate(
  origin: string,
  destination: string,
  weightMT: number,
  options?: {
    cargoType?: string;
    billingRate?: number;
  }
): Promise<MarketRateRecommendation> {
  const response = await fetch('/api/gemini/market-rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      weightMT,
      cargoType: options?.cargoType,
      billingRate: options?.billingRate,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to obtain AI market hire recommendation.');
  }

  return response.json();
}

/**
 * 3. Extract structured dispatch and LR data from unformatted text/notes
 */
export async function extractDispatchFromText(rawText: string): Promise<ExtractedDispatch> {
  const response = await fetch('/api/gemini/extract-dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to parse dispatch text with Gemini AI.');
  }

  return response.json();
}

/**
 * 4. Run automated operational audit on database dispatch records
 */
export async function auditFleetHealth(records: DispatchRecord[]): Promise<FleetHealthAudit> {
  const response = await fetch('/api/gemini/audit-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to complete AI fleet health audit.');
  }

  return response.json();
}

/**
 * 5. Send message to AI Logistics Copilot Assistant
 */
export async function chatWithCopilot(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  context?: any
): Promise<string> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      context,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to communicate with AI Copilot.');
  }

  const data = await response.json();
  return data.reply;
}
