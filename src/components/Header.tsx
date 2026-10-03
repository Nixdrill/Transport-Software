import React from 'react';
import { 
  Truck, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  LogIn, 
  LogOut, 
  FileText, 
  PlusCircle, 
  ListFilter, 
  Search, 
  CheckCircle2, 
  CloudUpload, 
  BarChart3, 
  User as UserIcon, 
  Shield, 
  Settings,
  Sparkles,
  Layers,
  Receipt
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../lib/authService';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'lookup' | 'dashboard' | 'masters' | 'billing' | 'settings';
  setActiveTab: (tab: 'form' | 'list' | 'lookup' | 'dashboard' | 'masters' | 'billing' | 'settings') => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  user: User | null;
  appUser: AppUser | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onNewEntry: () => void;
  lastSynced: Date | null;
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  isSyncing,
  pendingCount,
  user,
  appUser,
  onOpenAuthModal,
  onSignOut,
  onSyncNow,
  onNewEntry,
  lastSynced,
  onOpenCopilot,
}) => {
  const currentDisplayName = appUser?.displayName || user?.displayName || appUser?.username || user?.email?.split('@')[0];
  const currentRole = appUser?.role || 'dispatcher';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('list')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#00E676] to-[#00c864] flex items-center justify-center shadow-xs border border-emerald-400">
              <Truck className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-slate-950">
                  LogiTrack
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                  LR Logistics
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Data Entry, Advanced Search & Analytics
              </p>
            </div>
          </div>

          {/* Sync & Connectivity Center */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Online / Offline Status Badge */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
              }`}
              title={isOnline ? 'Connected to cloud database' : 'Working offline. Records saved to local storage.'}
            >
              {isOnline ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00E676] ring-2 ring-emerald-300 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Sync Status Button */}
            <button
              onClick={onSyncNow}
              disabled={isSyncing || (!isOnline && pendingCount === 0)}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-xl border font-bold transition-all shadow-xs ${
                pendingCount > 0
                  ? 'bg-[#FFB700] hover:bg-[#e6a500] text-stone-950 border-amber-400'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title={
                pendingCount > 0
                  ? `${pendingCount} record(s) pending sync to cloud database`
                  : 'Database in sync'
              }
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isSyncing ? 'animate-spin text-slate-900' : pendingCount > 0 ? 'text-stone-950' : 'text-slate-500'
                }`}
              />
              <span>
                {isSyncing
                  ? 'Syncing...'
                  : pendingCount > 0
                  ? `Sync (${pendingCount})`
                  : 'Synced'}
              </span>
            </button>

            {/* User Auth Info */}
            {(user || appUser) ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                    {currentDisplayName}
                  </div>
                  <div className="text-[10px] text-emerald-800 flex items-center justify-end space-x-1 uppercase font-bold">
                    <Shield className="h-2.5 w-2.5 text-emerald-600" />
                    <span>{currentRole}</span>
                  </div>
                </div>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="h-8 w-8 rounded-full border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                    {(currentDisplayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 text-xs bg-[#00E676] hover:bg-[#00c864] text-slate-950 px-3.5 py-1.5 rounded-xl font-black shadow-xs border border-emerald-400 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5 text-slate-950" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-[#F4F6F9] border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto py-2">
          <nav className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ListFilter className="h-4 w-4 text-[#0096C7]" />
              <span>Dispatches & Records</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="h-4 w-4 text-[#059669]" />
              <span>Analytics & Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeTab === 'form'
                  ? 'bg-[#00E676] text-slate-950 shadow-xs border border-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Data Entry (New LR)</span>
            </button>

            <button
              onClick={() => setActiveTab('lookup')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'lookup'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Search className="h-4 w-4 text-[#E65100]" />
              <span>LR & E-Waybill Finder</span>
            </button>

            <button
              onClick={() => setActiveTab('masters')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeTab === 'masters'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="h-4 w-4 text-[#00E676]" />
              <span>Masters</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeTab === 'billing'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>Invoices & Billing</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Settings className="h-4 w-4 text-[#7C3AED]" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-2">
            {activeTab !== 'form' && (
              <button
                onClick={onNewEntry}
                className="flex items-center space-x-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs px-3.5 py-1.5 rounded-lg font-black shadow-xs border border-emerald-400 transition-all"
              >
                <PlusCircle className="h-3.5 w-3.5 text-slate-950" />
                <span className="hidden sm:inline">Add New LR Trip</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
