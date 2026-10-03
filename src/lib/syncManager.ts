import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { DispatchRecord, LRItem, SyncStatus } from '../types/dispatch';

const LOCAL_STORAGE_KEY = 'logitrack_dispatches_v1';
const SYNC_QUEUE_KEY = 'logitrack_sync_queue_v1';

export interface SyncQueueItem {
  id: string;
  type: 'SAVE' | 'DELETE';
  record?: DispatchRecord;
  timestamp: number;
}

export interface NetworkSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  errorMessage: string | null;
}

// Read local records
export function getLocalDispatches(): DispatchRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local dispatches:', e);
    return [];
  }
}

// Write local records
export function saveLocalDispatches(records: DispatchRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving local dispatches:', e);
  }
}

// Read sync queue
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading sync queue:', e);
    return [];
  }
}

// Write sync queue
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving sync queue:', e);
  }
}

// Queue an action for synchronization
export function enqueueSyncAction(item: SyncQueueItem): void {
  const currentQueue = getSyncQueue();
  // Filter out any older action for the same ID to prevent redundant work
  const filtered = currentQueue.filter((q) => q.id !== item.id);
  filtered.push(item);
  saveSyncQueue(filtered);
}

/**
 * Save or update a dispatch record locally first, then attempt cloud sync.
 */
export async function persistDispatch(
  record: DispatchRecord,
  isOnline: boolean
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const all = getLocalDispatches();
  const existingIdx = all.findIndex((r) => r.id === record.id);

  const updatedRecord: DispatchRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    syncStatus: isOnline && auth.currentUser ? 'synced' : 'pending',
  };

  if (existingIdx >= 0) {
    all[existingIdx] = updatedRecord;
  } else {
    all.unshift(updatedRecord);
  }
  saveLocalDispatches(all);

  // Queue for cloud sync
  enqueueSyncAction({
    id: record.id,
    type: 'SAVE',
    record: updatedRecord,
    timestamp: Date.now(),
  });

  // If online and authenticated, push to Firestore immediately
  if (isOnline && auth.currentUser) {
    try {
      await pushDispatchToFirestore(updatedRecord);
      // Remove from queue on success
      const q = getSyncQueue().filter((item) => item.id !== record.id);
      saveSyncQueue(q);

      // Mark as synced locally
      updatedRecord.syncStatus = 'synced';
      updatedRecord.lastSyncedAt = new Date().toISOString();
      const updatedList = getLocalDispatches().map((r) =>
        r.id === record.id ? updatedRecord : r
      );
      saveLocalDispatches(updatedList);

      return { success: true, synced: true };
    } catch (err) {
      console.warn('Sync to firestore delayed, kept in offline queue:', err);
      return { success: true, synced: false, error: 'Saved locally. Will sync when cloud is reachable.' };
    }
  }

  return { success: true, synced: false };
}

/**
 * Delete a dispatch record locally and queue for cloud deletion.
 */
export async function removeDispatch(
  dispatchId: string,
  isOnline: boolean
): Promise<{ success: boolean; synced: boolean }> {
  const all = getLocalDispatches().filter((r) => r.id !== dispatchId);
  saveLocalDispatches(all);

  enqueueSyncAction({
    id: dispatchId,
    type: 'DELETE',
    timestamp: Date.now(),
  });

  if (isOnline && auth.currentUser) {
    try {
      await deleteDispatchFromFirestore(dispatchId);
      const q = getSyncQueue().filter((item) => item.id !== dispatchId);
      saveSyncQueue(q);
      return { success: true, synced: true };
    } catch (err) {
      console.warn('Delete sync queued:', err);
      return { success: true, synced: false };
    }
  }

  return { success: true, synced: false };
}

/**
 * Push single record and its subcollection LRs to Firestore.
 */
async function pushDispatchToFirestore(record: DispatchRecord): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const dispatchPath = `dispatches/${record.id}`;
  try {
    const dispatchDocRef = doc(db, 'dispatches', record.id);

    // Save top-level dispatch
    const payload = {
      date: record.date,
      fromParty: record.fromParty,
      toParty: record.toParty,
      placement: record.placement,
      transporterName: record.transporterName,
      vehicleNumber: record.vehicleNumber,
      lrNumbers: record.lrNumbers || [],
      totalWeight: Number(record.totalWeight) || 0,
      totalFreightAmount: Number(record.totalFreightAmount) || 0,
      totalAdvance: Number(record.totalAdvance) || 0,
      totalExtraCharges: Number(record.totalExtraCharges) || 0,
      totalGrossMarketFreight: Number(record.totalGrossMarketFreight) || 0,
      totalMarketCommission: Number(record.totalMarketCommission) || 0,
      totalMarketAdvance: Number(record.totalMarketAdvance) || 0,
      totalNetMarketFreight: Number(record.totalNetMarketFreight) || 0,
      marketMargin: Number(record.marketMargin) || 0,
      totalLrsCount: Number(record.totalLrsCount) || 0,
      status: record.status || 'Confirmed',
      notes: record.notes || '',
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: uid,
    };

    await setDoc(dispatchDocRef, payload);

    // Now save each LR in subcollection /dispatches/{dispatchId}/lrs/{lrId}
    if (record.lrs && record.lrs.length > 0) {
      for (const lr of record.lrs) {
        const lrDocRef = doc(db, 'dispatches', record.id, 'lrs', lr.id);
        const lrPayload = {
          lrNumber: lr.lrNumber,
          consignorName: lr.consignorName,
          consignorCity: lr.consignorCity,
          consigneeName: lr.consigneeName,
          consigneeCity: lr.consigneeCity,
          invoiceNumbers: lr.invoiceNumbers || [],
          ewaybillNumbers: lr.ewaybillNumbers || [],
          weight: Number(lr.weight) || 0,
          weightUnit: lr.weightUnit || 'MT',
          rate: Number(lr.rate) || 0,
          rateType: lr.rateType || 'per_mt',
          freightAmount: Number(lr.freightAmount) || 0,
          advanceAmount: Number(lr.advanceAmount) || 0,
          extraCharges: Number(lr.extraCharges) || 0,
          remarks: lr.remarks || '',
          marketWeight: Number(lr.marketWeight) || 0,
          marketRate: Number(lr.marketRate) || 0,
          grossMarketFreight: Number(lr.grossMarketFreight) || 0,
          marketCommission: Number(lr.marketCommission) || 0,
          marketAdvance: Number(lr.marketAdvance) || 0,
          netMarketFreight: Number(lr.netMarketFreight) || 0,
          createdAt: lr.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: uid,
        };
        await setDoc(lrDocRef, lrPayload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dispatchPath);
  }
}

/**
 * Delete dispatch from Firestore.
 */
async function deleteDispatchFromFirestore(dispatchId: string): Promise<void> {
  const dispatchPath = `dispatches/${dispatchId}`;
  try {
    const dispatchDocRef = doc(db, 'dispatches', dispatchId);
    await deleteDoc(dispatchDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, dispatchPath);
  }
}

/**
 * Process entire offline sync queue.
 */
export async function processSyncQueue(): Promise<{
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (!auth.currentUser || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, errors: ['Offline or not authenticated'] };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const remainingQueue: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'SAVE' && item.record) {
        await pushDispatchToFirestore(item.record);
        syncedCount++;

        // Update local status
        const all = getLocalDispatches();
        const updated = all.map((r) =>
          r.id === item.id
            ? { ...r, syncStatus: 'synced' as SyncStatus, lastSyncedAt: new Date().toISOString() }
            : r
        );
        saveLocalDispatches(updated);
      } else if (item.type === 'DELETE') {
        await deleteDispatchFromFirestore(item.id);
        syncedCount++;
      }
    } catch (e) {
      failedCount++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Record ${item.id}: ${msg}`);
      remainingQueue.push(item);
    }
  }

  saveSyncQueue(remainingQueue);
  return { syncedCount, failedCount, errors };
}

/**
 * Fetch all dispatches for current user from Firestore and merge with local.
 */
export async function pullDispatchesFromFirestore(): Promise<DispatchRecord[]> {
  const user = auth.currentUser;
  if (!user) return getLocalDispatches();

  const dispatchesPath = 'dispatches';
  try {
    const q = query(collection(db, 'dispatches'), where('ownerId', '==', user.uid));
    const snapshot = await getDocs(q);

    const remoteRecords: DispatchRecord[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      // Fetch subcollection LRs
      const lrsPath = `dispatches/${docSnap.id}/lrs`;
      const lrsSnapshot = await getDocs(collection(db, 'dispatches', docSnap.id, 'lrs'));
      const lrs: LRItem[] = lrsSnapshot.docs.map((lrSnap) => {
        const lrData = lrSnap.data();
        return {
          id: lrSnap.id,
          lrNumber: lrData.lrNumber || '',
          lrDate: lrData.lrDate || '',
          consignorName: lrData.consignorName || '',
          consignorCity: lrData.consignorCity || '',
          consigneeName: lrData.consigneeName || '',
          consigneeCity: lrData.consigneeCity || '',
          invoiceNumbers: lrData.invoiceNumbers || [],
          ewaybillNumbers: lrData.ewaybillNumbers || [],
          weight: lrData.weight || 0,
          weightUnit: lrData.weightUnit || 'MT',
          rate: lrData.rate || 0,
          rateType: lrData.rateType || 'per_mt',
          freightAmount: lrData.freightAmount || 0,
          advanceAmount: lrData.advanceAmount || 0,
          extraCharges: lrData.extraCharges || 0,
          remarks: lrData.remarks || '',
          marketWeight: lrData.marketWeight || 0,
          marketRate: lrData.marketRate || 0,
          grossMarketFreight: lrData.grossMarketFreight || 0,
          marketCommission: lrData.marketCommission || 0,
          marketAdvance: lrData.marketAdvance || 0,
          netMarketFreight: lrData.netMarketFreight || 0,
          createdAt: lrData.createdAt || '',
          updatedAt: lrData.updatedAt || '',
          ownerId: lrData.ownerId || user.uid,
        };
      });

      remoteRecords.push({
        id: docSnap.id,
        date: data.date,
        fromParty: data.fromParty,
        toParty: data.toParty,
        placement: data.placement,
        transporterName: data.transporterName,
        vehicleNumber: data.vehicleNumber,
        lrNumbers: data.lrNumbers || [],
        lrs,
        totalWeight: data.totalWeight || 0,
        totalFreightAmount: data.totalFreightAmount || 0,
        totalAdvance: data.totalAdvance || 0,
        totalExtraCharges: data.totalExtraCharges || 0,
        totalGrossMarketFreight: data.totalGrossMarketFreight || 0,
        totalMarketCommission: data.totalMarketCommission || 0,
        totalMarketAdvance: data.totalMarketAdvance || 0,
        totalNetMarketFreight: data.totalNetMarketFreight || 0,
        marketMargin: data.marketMargin || 0,
        netPayable: (data.totalFreightAmount || 0) - (data.totalAdvance || 0),
        totalLrsCount: lrs.length || (data.lrNumbers || []).length,
        status: data.status || 'Confirmed',
        notes: data.notes || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ownerId: data.ownerId,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      });
    }

    // Merge: keep local records that have pending sync changes
    const local = getLocalDispatches();
    const queue = getSyncQueue();
    const pendingIds = new Set(queue.map((q) => q.id));

    const mergedMap = new Map<string, DispatchRecord>();

    // Add remote
    for (const r of remoteRecords) {
      mergedMap.set(r.id, r);
    }

    // Overlay pending local
    for (const l of local) {
      if (pendingIds.has(l.id)) {
        mergedMap.set(l.id, l);
      }
    }

    const mergedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    saveLocalDispatches(mergedList);
    return mergedList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, dispatchesPath);
    return getLocalDispatches();
  }
}
