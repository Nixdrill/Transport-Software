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
import { SettingsView } from './components/SettingsView';
import { PrintDispatchModal } from './components/PrintDispatchModal';
import { AuthModal } from './components/AuthModal';
import { MastersView } from './components/MastersView';
import { CheckCircle2, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { generateSafeId } from './lib/calculations';
import { 
  getMasters, 
  autoStoreDispatchIntoMasters, 
  restoreMasters, 
  batchSyncDispatchesToMasters 
} from './lib/mastersService';
import { AllMasters } from './types/masters';

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
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'lookup' | 'dashboard' | 'masters' | 'settings'>('list');
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<DispatchRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<DispatchRecord | null>(null);
  const [placementFilter, setPlacementFilter] = useState<'All' | 'Market' | 'Own'>('All');
  const [targetTransporterFilter, setTargetTransporterFilter] = useState<string>('');

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

  // 2. Load records from local storage or seed initial sample
  useEffect(() => {
    const local = getLocalDispatches();
    if (local.length > 0) {
      setRecords(local);
    } else {
      const samples = getSampleDispatches();
      saveLocalDispatches(samples);
      setRecords(samples);
    }
    updatePendingCount();
  }, []);

  // 3. Network connectivity listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showNotification('Internet connection restored. Synchronizing data...', 'info');
      await syncWithCloud();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotification('Working offline. All changes safely stored locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, appUser]);

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

  // Load sample dataset
  const handleLoadSampleData = () => {
    const samples = getSampleDispatches();
    saveLocalDispatches(samples);
    setRecords(samples);
    showNotification('Sample transport & LR records loaded successfully.', 'success');
  };

  // Authentication Handlers
  const handleAuthSuccess = (loggedUser: AppUser) => {
    setAppUser(loggedUser);
    showNotification(`Signed in as ${loggedUser.displayName || loggedUser.username} (${loggedUser.role})`, 'success');
    syncWithCloud();
  };

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    setAppUser(null);
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
      dispatches: records,
      masters: currentMasters,
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
      `Complete JSON backup with ${records.length} dispatches and ${totalMastersCount} master records downloaded!`,
      'success'
    );
  };

  const handleRestoreData = async (
    restoredRecords: DispatchRecord[], 
    mode: 'replace' | 'merge',
    restoredMasters?: AllMasters
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

      // Also auto-sync restored dispatches into masters
      batchSyncDispatchesToMasters(restoredRecords);

      // Queue and sync to Firestore
      for (const rec of restoredRecords) {
        await persistDispatch(rec, isOnline);
      }

      showNotification(
        `Successfully restored ${restoredRecords.length} records${masterNote} via ${mode === 'replace' ? 'complete overwrite & replacement' : 'safe merge'}!`,
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
      updatePendingCount();
      const totalLRs = newDispatches.reduce((s, d) => s + (d.lrs?.length || 0), 0);
      showNotification(
        `Successfully imported ${newDispatches.length} dispatch trips (${totalLRs} LRs) from Excel with duplicate protection!`,
        'success'
      );
      if (isOnline) {
        syncWithCloud();
      }
    } catch (err: any) {
      showNotification(err?.message || 'Failed to import Excel records.', 'error');
    }
  };

  // Find theme styles
  const currentTheme = AVAILABLE_THEMES.find((t) => t.id === activeTheme) || AVAILABLE_THEMES[0];

  // Extract distinct parties & transporters for autocomplete
  const existingParties = Array.from(
    new Set(
      records.flatMap((r) => [
        r.fromParty,
        r.toParty,
        ...(r.lrs || []).flatMap((lr) => [lr.consignorName, lr.consigneeName]),
      ])
    )
  ).filter(Boolean);

  const existingTransporters = Array.from(
    new Set(records.map((r) => r.transporterName))
  ).filter(Boolean);

  return (
    <div className={`min-h-screen ${currentTheme.bgClass} flex flex-col font-sans antialiased transition-colors duration-300 selection:bg-[#00E676] selection:text-slate-950`}>
      {/* Header with Connectivity, Sync, & User Authentication */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'form' && activeTab !== 'form') {
            setEditingRecord(null);
          }
          setActiveTab(tab);
        }}
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

        {/* TAB 5: Masters Data Center (Auto-fill, Automations & Gemini AI Corridor Benchmark) */}
        {activeTab === 'masters' && (
          <MastersView
            dispatches={records}
            showNotification={showNotification}
          />
        )}

        {/* TAB 6: Settings, Data Backup, Restore, Delete & Theme Picker */}
        {activeTab === 'settings' && (
          <SettingsView
            records={records}
            activeTheme={activeTheme}
            onThemeChange={handleThemeChange}
            onBackupData={handleBackupData}
            onRestoreData={handleRestoreData}
            onDeleteAllData={handleDeleteAllData}
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
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LogiTrack Enterprise • Logistics, Multi-LR & Fleet Management</span>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Theme: <strong className="text-white capitalize">{currentTheme.name}</strong></span>
            <span>•</span>
            <span>Cloud Database Persistent Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
