import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Initialize GoogleGenAI server client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. API: Route & Transit Analysis with Google Maps Grounding
  app.post('/api/gemini/route-maps', async (req: Request, res: Response) => {
    try {
      const { origin, destination, vehicleType, cargoWeight, userLocation } = req.body;

      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required.' });
      }

      const prompt = `Analyze the road transport route between "${origin}" and "${destination}" for a commercial logistics vehicle (${vehicleType || 'Commercial Truck / Multi-Axle'}${cargoWeight ? `, carrying ${cargoWeight} MT cargo` : ''}).
Provide accurate real-world geographical information:
1. Driving distance (in kilometers).
2. Estimated driving transit duration for commercial freight.
3. Primary national highways / expressways corridor (e.g. NH-44, NH-48, Golden Quadrilateral).
4. Major transit checkpoints, toll plazas, or intermediate hub cities along the route.
5. Key road conditions, terrain challenges (ghat sections, diversions), or state border check norms.
6. Recommended market freight rate guideline (approximate ₹ per MT or per trip for this specific corridor).`;

      // Configure Maps Grounding
      const toolConfig: any = {};
      if (userLocation?.latitude && userLocation?.longitude) {
        toolConfig.retrievalConfig = {
          latLng: {
            latitude: Number(userLocation.latitude),
            longitude: Number(userLocation.longitude),
          },
        };
      }

      // Maps grounding requires gemini-2.5-flash or gemini-3.8-flash, without responseMimeType/responseSchema
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          ...(Object.keys(toolConfig).length > 0 ? { toolConfig } : {}),
        },
      });

      const text = response.text || '';

      // Extract Grounding Chunks (Google Maps places, URLs, snippets) as mandated by skill
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks: Array<{ title: string; uri: string }> = [];

      for (const chunk of rawChunks as any[]) {
        if (chunk.maps?.uri) {
          mapsLinks.push({
            title: chunk.maps.title || 'Google Maps Location',
            uri: chunk.maps.uri,
          });
        }
        if (chunk.web?.uri) {
          mapsLinks.push({
            title: chunk.web.title || 'Web Reference',
            uri: chunk.web.uri,
          });
        }
      }

      // Quick heuristic extraction for structured numbers if present in text
      const distanceMatch = text.match(/(\d[\d,.]*)\s*(?:km|kilometers|kms)/i);
      const estDistanceKm = distanceMatch ? parseFloat(distanceMatch[1].replace(/,/g, '')) : null;

      res.json({
        report: text,
        estDistanceKm,
        mapsLinks,
      });
    } catch (err: any) {
      console.error('Error in /api/gemini/route-maps:', err);
      res.status(500).json({
        error: err?.message || 'Failed to retrieve route information via Google Maps Grounding.',
      });
    }
  });

  // 2. API: Market Lorry Hire Rate Advisory (AI rate benchmarking)
  app.post('/api/gemini/market-rate', async (req: Request, res: Response) => {
    try {
      const { origin, destination, weightMT, cargoType, billingRate } = req.body;

      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required.' });
      }

      const prompt = `As a senior Indian freight market rate consultant, provide a competitive market vehicle hire benchmark for:
Origin: ${origin}
Destination: ${destination}
Cargo: ${cargoType || 'General Industrial Cargo / Steel / Cement'}
Cargo Weight: ${weightMT || 20} MT
Client Billing Rate: ${billingRate ? `₹${billingRate} per MT` : 'Not specified'}

Provide realistic market hire rates, brokerage commissions, and advance standards in structured JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedMarketRatePerMT: {
                type: Type.NUMBER,
                description: 'Recommended lorry hire rate per MT in INR (e.g. 2400)',
              },
              marketRateRangeMin: {
                type: Type.NUMBER,
                description: 'Minimum expected market rate per MT',
              },
              marketRateRangeMax: {
                type: Type.NUMBER,
                description: 'Maximum expected market rate per MT',
              },
              estimatedTripDistanceKm: {
                type: Type.NUMBER,
                description: 'Estimated corridor driving distance in km',
              },
              recommendedCommission: {
                type: Type.NUMBER,
                description: 'Standard broker commission in INR (e.g. 500 or 1000)',
              },
              recommendedAdvancePercent: {
                type: Type.NUMBER,
                description: 'Standard driver cash/fuel advance percentage (e.g. 70 or 80)',
              },
              expectedTransitDays: {
                type: Type.NUMBER,
                description: 'Typical delivery transit duration in days',
              },
              keyHighways: {
                type: Type.STRING,
                description: 'Corridor highways (e.g. NH-48 / NH-44)',
              },
              negotiationTips: {
                type: Type.STRING,
                description: 'Actionable tips for the dispatcher when negotiating with the truck owner or broker',
              },
            },
            required: [
              'recommendedMarketRatePerMT',
              'marketRateRangeMin',
              'marketRateRangeMax',
              'estimatedTripDistanceKm',
              'recommendedCommission',
              'recommendedAdvancePercent',
              'expectedTransitDays',
              'negotiationTips',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Error in /api/gemini/market-rate:', err);
      res.status(500).json({
        error: err?.message || 'Failed to benchmark market lorry rate.',
      });
    }
  });

  // 3. API: Smart Consignment & LR Document Scanner / Text Extractor
  app.post('/api/gemini/extract-dispatch', async (req: Request, res: Response) => {
    try {
      const { rawText } = req.body;

      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: 'Raw text or message content is required.' });
      }

      const prompt = `You are a logistics data entry parser for Indian transport management.
Extract all dispatch particulars and individual LR items from the following unformatted message/text/invoice note:
"""
${rawText}
"""

Extract structured data strictly matching this schema. If a field is not mentioned, provide realistic defaults or blank strings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: 'Dispatch date in YYYY-MM-DD format' },
              vehicleNumber: { type: Type.STRING, description: 'Vehicle registration number (e.g. MH 12 RN 4589)' },
              placement: { type: Type.STRING, description: '"Market" or "Own"' },
              transporterName: { type: Type.STRING, description: 'Transporter or fleet division name' },
              fromParty: { type: Type.STRING, description: 'Origin or billing entity' },
              toParty: { type: Type.STRING, description: 'Destination or receiving entity' },
              driverName: { type: Type.STRING, description: 'Driver name if present' },
              driverPhone: { type: Type.STRING, description: 'Driver phone if present' },
              notes: { type: Type.STRING, description: 'Any special instructions or cargo remarks' },
              lrs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lrNumber: { type: Type.STRING, description: 'Consignment note or LR number' },
                    consignorName: { type: Type.STRING },
                    consignorCity: { type: Type.STRING },
                    consigneeName: { type: Type.STRING },
                    consigneeCity: { type: Type.STRING },
                    invoiceNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    ewaybillNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weight: { type: Type.NUMBER, description: 'Cargo weight in MT' },
                    rate: { type: Type.NUMBER, description: 'Rate per MT in INR' },
                    marketRate: { type: Type.NUMBER, description: 'Market lorry hire rate if market placement' },
                    remarks: { type: Type.STRING },
                  },
                  required: ['lrNumber', 'consignorName', 'consigneeName', 'weight', 'rate'],
                },
              },
            },
            required: ['vehicleNumber', 'fromParty', 'toParty', 'lrs'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Error in /api/gemini/extract-dispatch:', err);
      res.status(500).json({
        error: err?.message || 'Failed to extract structured dispatch details.',
      });
    }
  });

  // 4. API: Fleet Health & Anomaly Auditor
  app.post('/api/gemini/audit-health', async (req: Request, res: Response) => {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Records array is required for health audit.' });
      }

      // Create an abbreviated summary to send to Gemini
      const sampleSlice = records.slice(0, 30).map((r) => ({
        id: r.id,
        date: r.date,
        vehicleNumber: r.vehicleNumber,
        placement: r.placement,
        transporter: r.transporterName,
        from: r.fromParty,
        to: r.toParty,
        totalWeightMT: r.totalWeight,
        totalFreight: r.totalFreightAmount,
        grossMarketFreight: r.totalGrossMarketFreight,
        marketMargin: r.marketMargin,
        lrCount: r.totalLrsCount || r.lrs?.length,
        hasEwaybills: r.lrs?.some((l: any) => l.ewaybillNumbers?.length > 0),
        hasInvoices: r.lrs?.some((l: any) => l.invoiceNumbers?.length > 0),
      }));

      const prompt = `Analyze this dataset of ${records.length} logistics transport dispatch records:
${JSON.stringify(sampleSlice, null, 2)}

Provide an operational audit report:
1. Operational Risk Assessment (Low, Medium, or High).
2. Profit Margin & Market Rate Leakage: Identify trips where Market Vehicle Hire exceeded or shrank margins dangerously.
3. Statutory & Compliance check: Identify missing e-waybill or invoice attachments.
4. Carrier & Placement Optimization: Recommendations for carrier allocation (e.g. shifting specific high-volume corridors from Market to Own Fleet).
5. 3 Actionable Cost-Saving Steps.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({
        auditReport: response.text || '',
        recordsAuditedCount: records.length,
      });
    } catch (err: any) {
      console.error('Error in /api/gemini/audit-health:', err);
      res.status(500).json({
        error: err?.message || 'Failed to complete logistics fleet health audit.',
      });
    }
  });

  // 5. API: AI Logistics Copilot Assistant (with fleet context)
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, context, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const systemInstruction = `You are LogiTrack AI Copilot, a senior transportation dispatch and fleet operations intelligence expert.
You help dispatchers, fleet owners, and logistics managers with:
- Checking vehicle trip records, route distances, transit corridors, and Google Maps geographical routing.
- Advising on market lorry hire rates, vehicle placement economics (Market vs Own), broker commissions, and diesel advances.
- Verifying GST e-waybill and LR compliance rules in India.
- Calculating weights, freight rates, and net balances.

Current App Context:
${context ? JSON.stringify(context, null, 2) : 'No live context provided.'}

Be concise, practical, professional, and directly actionable. Use bullet points and bold figures where helpful.`;

      const contents: any[] = [];
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }],
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
        },
      });

      res.json({
        reply: response.text || '',
      });
    } catch (err: any) {
      console.error('Error in /api/gemini/chat:', err);
      res.status(500).json({
        error: err?.message || 'Failed to generate copilot response.',
      });
    }
  });

  // Mount Vite middleware in development or static serve in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (isProduction: ${isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
