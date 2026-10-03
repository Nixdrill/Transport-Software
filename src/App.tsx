import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signOutUser, testConnection } from './lib/firebase';
import { 
  getLocalDispatches, 
  saveLocalDispatches, 
  persistDispatch, 
  removeDispatch, 
  processSyncQueue, 
  pullDispatchesFromFirestore, 
  getSyncQueue 
} from './lib/syncManager';
import { 
  AppUser, 
  getCurrentLocalSession, 
  setCurrentLocalSession, 
  seedDemoUserIfNeeded,
  logoutUser 
} from './lib/authService';
import { AVAILABLE_THEMES, getSavedTheme, saveTheme } from './lib/theme';
import { getSampleDispatches } from './lib/sampleData';
import { DispatchRecord } from './types/dispatch';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DispatchForm } from './components/DispatchForm';
import { DispatchesList } from './components/DispatchesList';
import { LRLookupModal } from './components/LRLookupModal';
import { DashboardView } from './components/DashboardView';
import { MastersView } from './components/MastersView';
import { BillingView } from './components/BillingView';
import { MisAndLedgersView } from './components/MisAndLedgersView';
import { SettingsView } from './components/SettingsView';
import { PrintDispatchModal } from './components/PrintDispatchModal';
import { InvoiceBuilderModal } from './components/InvoiceBuilderModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { AuthModal } from './components/AuthModal';
import { CheckCircle2, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { generateSafeId } from './lib/calculations';
import { 
  getMasters, 
  saveMasters,
  autoStoreDispatchIntoMasters, 
  restoreMasters, 
  batchSyncDispatchesToMasters,
  clearAllMasters,
  resetMastersToDefaults
} from './lib/mastersService';
import { 
  getInvoices, 
  saveInvoices, 
  saveInvoice 
} from './lib/invoiceService';
import { AllMasters } from './types/masters';
import { FreightInvoice } from './types/invoice';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>(getSavedTheme());
  
  // Navigation & View
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'lookup' | 'dashboard' | 'masters' | 'billing' | 'mis_ledgers' | 'settings'>('list');
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<DispatchRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<DispatchRecord | null>(null);
  const [placementFilter, setPlacementFilter] = useState<'All' | 'Market' | 'Own'>('All');
  const [targetTransporterFilter, setTargetTransporterFilter] = useState<string>('');

  // Invoice Creation from Dispatch Modal State
  const [invoiceBuilderDispatch, setInvoiceBuilderDispatch] = useState<DispatchRecord | null>(null);
  const [isDirectInvoiceBuilderOpen, setIsDirectInvoiceBuilderOpen] = useState<boolean>(false);
  const [quickPrintInvoice, setQuickPrintInvoice] = useState<FreightInvoice | null>(null);

  // Flash Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // 1. Initial boot: Test connection, load local session, seed demo user
  useEffect(() => {
    testConnection();
    seedDemoUserIfNeeded();

    // Load active local session if any
    const existingSession = getCurrentLocalSession();
    if (existingSession) {
      setAppUser(existingSession);
    }

    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (!existingSession) {
          const syncedAppUser: AppUser = {
            uid: currentUser.uid,
            username: currentUser.displayName?.toLowerCase().replace(/\s+/g, '_') || currentUser.email?.split('@')[0] || 'user',
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            role: 'dispatcher',
            createdAt: new Date().toISOString(),
          };
          setAppUser(syncedAppUser);
          setCurrentLocalSession(syncedAppUser);
        }
        showNotification(`Welcome back, ${currentUser.displayName || currentUser.email}`, 'info');
        await syncWithCloud();
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load records from local storage and ensure all sample entries are cleaned
  useEffect(() => {
    // Clean sample dispatches from storage if present
    const rawDispatches = getLocalDispatches();
    const cleanDispatches = rawDispatches.filter(
      (d) => !d.id.startsWith('dsp_sample') && d.ownerId !== 'sample-user'
    );
    if (cleanDispatches.length !== rawDispatches.length) {
      saveLocalDispatches(cleanDispatches);
    }
    setRecords(cleanDispatches);

    // Clean sample invoices from storage if present
    const rawInvoices = getInvoices();
    const cleanInvoices = rawInvoices.filter(
      (inv) => !inv.id.startsWith('inv-sample') && inv.invoiceNumber !== 'INV/2026-27/001' && inv.invoiceNumber !== 'INV/2026-27/002'
    );
    if (cleanInvoices.length !== rawInvoices.length) {
      saveInvoices(cleanInvoices);
    }

    // Clean sample masters if legacy default sample masters were loaded
    const rawMasters = getMasters();
    const samplePartyIds = new Set(['pty-0', 'pty-0b', 'pty-1', 'pty-2', 'pty-3', 'pty-4', 'pty-5']);
    const cleanParties = rawMasters.parties.filter((p) => !samplePartyIds.has(p.id));
    const sampleVehIds = new Set(['veh-1', 'veh-2', 'veh-3', 'veh-4', 'veh-5']);
    const cleanVehicles = rawMasters.vehicles.filter((v) => !sampleVehIds.has(v.id));
    const sampleTrnIds = new Set(['trn-1', 'trn-2', 'trn-3', 'trn-4']);
    const cleanTransporters = rawMasters.transporters.filter((t) => !sampleTrnIds.has(t.id));
    const sampleRtIds = new Set(['rt-1', 'rt-2', 'rt-3', 'rt-4']);
    const cleanRoutes = rawMasters.routes.filter((r) => !sampleRtIds.has(r.id));
    const sampleDrvIds = new Set(['drv-1', 'drv-2', 'drv-3', 'drv-4']);
    const cleanDrivers = rawMasters.drivers.filter((d) => !sampleDrvIds.has(d.id));
    const sampleCmdIds = new Set(['cmd-1', 'cmd-2', 'cmd-3', 'cmd-4']);
    const cleanCommodities = rawMasters.commodities.filter((c) => !sampleCmdIds.has(c.id));

    if (
      cleanParties.length !== rawMasters.parties.length ||
      cleanVehicles.length !== rawMasters.vehicles.length ||
      cleanTransporters.length !== rawMasters.transporters.length ||
      cleanRoutes.length !== rawMasters.routes.length ||
      cleanDrivers.length !== rawMasters.drivers.length ||
      cleanCommodities.length !== rawMasters.commodities.length
    ) {
      saveMasters({
        parties: cleanParties,
        vehicles: cleanVehicles,
        transporters: cleanTransporters,
        routes: cleanRoutes,
        drivers: cleanDrivers,
        commodities: cleanCommodities,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Update pending queue count
    updatePendingCount();

    // Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('Network connected! Online mode enabled.', 'info');
      syncWithCloud();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('Working offline. Records will be saved locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update offline sync queue count
  const updatePendingCount = () => {
    const queue = getSyncQueue();
    setPendingCount(queue.length);
  };

  // Cloud synchronization function
  const syncWithCloud = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      if (user || appUser) {
        const { syncedCount, errors } = await processSyncQueue();
        const merged = await pullDispatchesFromFirestore();
        setRecords(merged);
        setLastSynced(new Date());
        updatePendingCount();

        if (syncedCount > 0) {
          showNotification(`Successfully synchronized ${syncedCount} record(s) to cloud database!`, 'success');
        } else if (errors.length > 0) {
          showNotification(`Sync note: ${errors[0]}`, 'info');
        }
      } else {
        updatePendingCount();
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save / Update Dispatch
  const handleSaveDispatch = async (record: DispatchRecord) => {
    try {
      const result = await persistDispatch(record, isOnline);
      const all = getLocalDispatches();
      setRecords(all);
      updatePendingCount();

      // AUTOMATICALLY STORE NEW ENTRIES IN MASTERS
      const autoStoreRes = autoStoreDispatchIntoMasters(record);

      setEditingRecord(null);
      setActiveTab('list');

      let masterMsg = '';
      if (autoStoreRes.totalAdded > 0) {
        masterMsg = ` (${autoStoreRes.totalAdded} new item(s) auto-stored in Masters)`;
      }

      if (result.synced) {
        showNotification(`Vehicle dispatch ${record.vehicleNumber} saved and synced to database!${masterMsg}`, 'success');
      } else {
        showNotification(
          `Vehicle dispatch ${record.vehicleNumber} saved locally! It will sync when connected.${masterMsg}`,
          'info'
        );
      }
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Failed to save dispatch.', 'error');
    }
  };

  // Delete Dispatch
  const handleDeleteDispatch = async (id: string) => {
    const target = records.find((r) => r.id === id);
    if (!confirm(`Are you sure you want to delete dispatch for vehicle ${target?.vehicleNumber || id}?`)) {
      return;
    }

    try {
      await removeDispatch(id, isOnline);
      const all = getLocalDispatches();
      setRecords(all);
      updatePendingCount();
      showNotification('Dispatch record removed.', 'info');
    } catch (e) {
      showNotification('Failed to remove record.', 'error');
    }
  };

  // Duplicate Dispatch
  const handleDuplicateDispatch = (source: DispatchRecord) => {
    const duplicated: DispatchRecord = {
      ...source,
      id: generateSafeId('dsp'),
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      lrs: (source.lrs || []).map((lr) => ({
        ...lr,
        id: generateSafeId('lr'),
        lrNumber: lr.lrNumber ? `${lr.lrNumber}-COPY` : '',
      })),
    };
    setEditingRecord(duplicated);
    setActiveTab('form');
    showNotification('Duplicated dispatch loaded into entry form.', 'info');
  };

  // Quick Generate Invoice from Dispatch
  const handleGenerateInvoiceForDispatch = (dsp: DispatchRecord) => {
    setInvoiceBuilderDispatch(dsp);
    setIsDirectInvoiceBuilderOpen(true);
  };

  const handleSaveDirectInvoice = (inv: FreightInvoice, autoPrint: boolean = false) => {
    saveInvoice(inv);
    setIsDirectInvoiceBuilderOpen(false);
    setInvoiceBuilderDispatch(null);
    showNotification(`Freight Invoice ${inv.invoiceNumber} created and saved to Billing!`, 'success');

    if (autoPrint) {
      setQuickPrintInvoice(inv);
    } else {
      setActiveTab('billing');
    }
  };

  // Load sample dataset
  const handleLoadSampleData = () => {
    const samples = getSampleDispatches();
    saveLocalDispatches(samples);
    setRecords(samples);
    batchSyncDispatchesToMasters(samples);
    updatePendingCount();
    showNotification('Sample demo fleet dispatches and multiple LRs loaded!', 'success');
  };

  // Auth Modal handlers
  const handleAuthSuccess = (authenticatedUser: AppUser) => {
    setAppUser(authenticatedUser);
    showNotification(`Signed in as ${authenticatedUser.displayName} (${authenticatedUser.role})`, 'success');
    syncWithCloud();
  };

  const handleSignOut = async () => {
    logoutUser();
    await signOutUser();
    setAppUser(null);
    setUser(null);
    showNotification('Signed out successfully.', 'info');
  };

  // SETTINGS HANDLERS: Backup, Restore, Delete, Theme
  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    saveTheme(themeId);
    const themeName = AVAILABLE_THEMES.find((t) => t.id === themeId)?.name || themeId;
    showNotification(`Theme changed to ${themeName}`, 'success');
  };

  const handleBackupData = () => {
    const currentMasters = getMasters();
    const currentInvoices = getInvoices();
    const totalMastersCount =
      currentMasters.parties.length +
      currentMasters.vehicles.length +
      currentMasters.transporters.length +
      currentMasters.routes.length +
      currentMasters.drivers.length +
      currentMasters.commodities.length;

    const backupPayload = {
      app: 'LogiTrack - Transport & LR Management',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      exportedBy: appUser?.username || user?.email || 'operator',
      totalDispatchesCount: records.length,
      totalMastersCount,
      totalInvoicesCount: currentInvoices.length,
      dispatches: records,
      masters: currentMasters,
      invoices: currentInvoices,
      settings: {
        activeTheme,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    showNotification(
      `Complete JSON backup with ${records.length} dispatches, ${totalMastersCount} master records, and ${currentInvoices.length} invoices downloaded!`,
      'success'
    );
  };

  const handleRestoreData = async (
    restoredRecords: DispatchRecord[], 
    mode: 'replace' | 'merge',
    restoredMasters?: AllMasters,
    restoredInvoices?: FreightInvoice[]
  ) => {
    try {
      let finalRecords: DispatchRecord[] = [];

      if (mode === 'replace') {
        finalRecords = restoredRecords;
      } else {
        // Merge mode: keep existing, overlay/append restored
        const existingMap = new Map<string, DispatchRecord>();
        for (const r of records) existingMap.set(r.id, r);
        for (const r of restoredRecords) existingMap.set(r.id, r);
        finalRecords = Array.from(existingMap.values());
      }

      saveLocalDispatches(finalRecords);
      setRecords(finalRecords);
      updatePendingCount();

      // If backup includes masters, restore masters with the same mode (overwrite/replace vs merge)
      let masterNote = '';
      if (restoredMasters) {
        const updatedMasters = restoreMasters(restoredMasters, mode === 'replace' ? 'overwrite' : 'merge');
        const count = 
          updatedMasters.parties.length +
          updatedMasters.vehicles.length +
          updatedMasters.transporters.length +
          updatedMasters.routes.length +
          updatedMasters.drivers.length +
          updatedMasters.commodities.length;
        masterNote = ` and ${count} Master records`;
      }

      // If backup includes invoices, restore invoices
      let invoiceNote = '';
      if (restoredInvoices && restoredInvoices.length > 0) {
        if (mode === 'replace') {
          saveInvoices(restoredInvoices);
        } else {
          const existingInv = getInvoices();
          const invMap = new Map<string, FreightInvoice>();
          for (const inv of existingInv) invMap.set(inv.id, inv);
          for (const inv of restoredInvoices) invMap.set(inv.id, inv);
          saveInvoices(Array.from(invMap.values()));
        }
        invoiceNote = ` and ${restoredInvoices.length} Invoices`;
      }

      // Also auto-sync restored dispatches into masters
      batchSyncDispatchesToMasters(restoredRecords);

      // Queue and sync to Firestore
      for (const rec of restoredRecords) {
        await persistDispatch(rec, isOnline);
      }

      showNotification(
        `Successfully restored ${restoredRecords.length} records${masterNote}${invoiceNote} via ${mode === 'replace' ? 'complete overwrite & replacement' : 'safe merge'}!`,
        'success'
      );
    } catch (err: any) {
      showNotification(err?.message || 'Restore failed.', 'error');
    }
  };

  const handleDeleteAllData = async () => {
    try {
      // Clear Firestore records if online
      if (isOnline && (user || appUser)) {
        for (const rec of records) {
          try {
            await removeDispatch(rec.id, isOnline);
          } catch {
            // Continue
          }
        }
      }

      saveLocalDispatches([]);
      setRecords([]);
      updatePendingCount();
      showNotification('All dispatch records have been permanently deleted from database.', 'info');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to delete all data.', 'error');
    }
  };

  const handleClearMastersData = () => {
    clearAllMasters();
    showNotification('All Master records (Parties, Vehicles, Transporters, Corridors) have been cleared.', 'info');
  };

  const handleResetMastersData = () => {
    resetMastersToDefaults();
    showNotification('Masters data reset to Indian Logistics default dataset.', 'success');
  };

  const handleBackupMastersOnly = () => {
    const masters = getMasters();
    const payload = {
      app: 'LogiTrack Transport Masters',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      masters,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Masters_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification('Masters dataset backup exported to JSON.', 'success');
  };

  const handleDeleteAllWithMasters = async () => {
    await handleDeleteAllData();
    clearAllMasters();
    saveInvoices([]);
    showNotification('Total Factory Reset completed: All Dispatches, Masters, and Invoices purged.', 'info');
  };

  const handleClearLocalCache = () => {
    localStorage.removeItem('logitrack_dispatches_v1');
    localStorage.removeItem('logitrack_sync_queue_v1');
    setRecords([]);
    updatePendingCount();
    showNotification('Local browser cache cleared.', 'info');
    // If online & user authenticated, pull fresh
    if (isOnline && (user || appUser)) {
      syncWithCloud();
    }
  };

  const handleImportExcelRecords = async (newDispatches: DispatchRecord[]) => {
    try {
      let updated = [...records];
      for (const dsp of newDispatches) {
        const existingIndex = updated.findIndex((r) => r.id === dsp.id);
        if (existingIndex >= 0) {
          updated[existingIndex] = dsp;
        } else {
          updated.unshift(dsp);
        }
        await persistDispatch(dsp, isOnline);
      }
      saveLocalDispatches(updated);
      setRecords(updated);
      batchSyncDispatchesToMasters(newDispatches);
      updatePendingCount();
      showNotification(`Imported ${newDispatches.length} dispatch records from Excel!`, 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to import Excel data.', 'error');
    }
  };

  // Lookups for Autocomplete in Form
  const existingParties = Array.from(new Set(records.map((r) => r.fromParty).concat(records.map((r) => r.toParty)).filter(Boolean)));
  const existingTransporters = Array.from(new Set(records.map((r) => r.transporterName).filter(Boolean)));

  const currentTheme = AVAILABLE_THEMES.find((t) => t.id === activeTheme) || AVAILABLE_THEMES[0];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${currentTheme.bgClass}`}>
      {/* Universal Top Header with Sync, Connectivity & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        user={user}
        appUser={appUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onSyncNow={syncWithCloud}
        onNewEntry={() => {
          setEditingRecord(null);
          setActiveTab('form');
        }}
        lastSynced={lastSynced}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Floating Notification Banner */}
        {notification && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between shadow-xs text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                : 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-700 flex-shrink-0" />
              ) : (
                <RefreshCw className="h-4 w-4 text-sky-700 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-70 text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Global Summary Statistics Cards (shown in list or dashboard) */}
        {(activeTab === 'list' || activeTab === 'dashboard') && (
          <StatsCards
            records={records}
            activePlacementFilter={placementFilter}
            onFilterPlacement={(p) => setPlacementFilter(p)}
          />
        )}

        {/* TAB 1: Visual Analytics & Performance Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            records={records}
            onSelectTransporterFilter={(transporter) => {
              setTargetTransporterFilter(transporter);
              setActiveTab('list');
            }}
            onSelectPlacementFilter={(placement) => {
              setPlacementFilter(placement);
              setActiveTab('list');
            }}
          />
        )}

        {/* TAB 2: Dispatches & Records Ledger with Advanced Search & Filter */}
        {activeTab === 'list' && (
          <DispatchesList
            records={
              placementFilter === 'All'
                ? records
                : records.filter((r) => r.placement === placementFilter)
            }
            onEdit={(rec) => {
              setEditingRecord(rec);
              setActiveTab('form');
            }}
            onDelete={handleDeleteDispatch}
            onDuplicate={handleDuplicateDispatch}
            onPrint={(rec) => setPrintRecord(rec)}
            onGenerateInvoice={handleGenerateInvoiceForDispatch}
            onNewEntry={() => {
              setEditingRecord(null);
              setActiveTab('form');
            }}
            onLoadSampleData={handleLoadSampleData}
            onImportExcel={handleImportExcelRecords}
            initialTransporterFilter={targetTransporterFilter}
            initialPlacementFilter={placementFilter}
            onGoToDashboardAudit={() => setActiveTab('dashboard')}
          />
        )}

        {/* TAB 3: Data Entry Form */}
        {activeTab === 'form' && (
          <DispatchForm
            initialRecord={editingRecord}
            onSave={handleSaveDispatch}
            onCancel={() => {
              setEditingRecord(null);
              setActiveTab('list');
            }}
            isOnline={isOnline}
            existingParties={existingParties}
            existingTransporters={existingTransporters}
          />
        )}

        {/* TAB 4: Dedicated LR, Invoice & E-Waybill Finder */}
        {activeTab === 'lookup' && (
          <LRLookupModal
            records={records}
            onOpenDispatch={(rec) => {
              setEditingRecord(rec);
              setActiveTab('form');
            }}
            onPrintDispatch={(rec) => setPrintRecord(rec)}
          />
        )}

        {/* TAB 5: Masters Data Center */}
        {activeTab === 'masters' && (
          <MastersView
            dispatches={records}
            showNotification={showNotification}
          />
        )}

        {/* TAB 6: Invoices & Billing Management Center */}
        {activeTab === 'billing' && (
          <BillingView
            dispatches={records}
            showNotification={showNotification}
            onNavigateToDispatches={() => setActiveTab('list')}
          />
        )}

        {/* TAB 7: MIS, Ledgers, Statement of Accounts & Multi-Bill Reconciliation */}
        {activeTab === 'mis_ledgers' && (
          <MisAndLedgersView
            onOpenInvoicePrint={(inv) => setQuickPrintInvoice(inv)}
            onNavigateToBilling={() => setActiveTab('billing')}
            showNotification={showNotification}
          />
        )}

        {/* TAB 8: Settings, Data Backup, Restore, Delete & Theme Picker */}
        {activeTab === 'settings' && (
          <SettingsView
            records={records}
            activeTheme={activeTheme}
            onThemeChange={handleThemeChange}
            onBackupData={handleBackupData}
            onBackupMastersOnly={handleBackupMastersOnly}
            onRestoreData={handleRestoreData}
            onDeleteAllData={handleDeleteAllData}
            onClearMastersData={handleClearMastersData}
            onResetMastersData={handleResetMastersData}
            onDeleteAllWithMasters={handleDeleteAllWithMasters}
            onResetSampleData={handleLoadSampleData}
            onClearLocalCache={handleClearLocalCache}
            onImportExcel={handleImportExcelRecords}
          />
        )}
      </main>

      {/* User Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Printable LR / Consignment Challan Modal */}
      {printRecord && (
        <PrintDispatchModal
          record={printRecord}
          onClose={() => setPrintRecord(null)}
          onGenerateInvoice={handleGenerateInvoiceForDispatch}
        />
      )}

      {/* Quick Direct Invoice Builder Modal (triggered from Dispatches list / Print Slip) */}
      <InvoiceBuilderModal
        isOpen={isDirectInvoiceBuilderOpen}
        onClose={() => {
          setIsDirectInvoiceBuilderOpen(false);
          setInvoiceBuilderDispatch(null);
        }}
        onSave={handleSaveDirectInvoice}
        initialDispatch={invoiceBuilderDispatch}
        allDispatches={records}
      />

      {/* Quick Print Modal for freshly generated invoice */}
      <InvoicePrintModal
        invoice={quickPrintInvoice}
        onClose={() => setQuickPrintInvoice(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LogiTrack Enterprise • Logistics, Multi-LR, Fleet Billing & Invoicing</span>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Theme: <strong className="text-white capitalize">{currentTheme.name}</strong></span>
            <span>•</span>
            <span>GST SAC 996511 Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
