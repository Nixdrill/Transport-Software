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
  Settings
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../lib/authService';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'lookup' | 'dashboard' | 'settings';
  setActiveTab: (tab: 'form' | 'list' | 'lookup' | 'dashboard' | 'settings') => void;
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
}) => {
  const currentDisplayName = appUser?.displayName || user?.displayName || appUser?.username || user?.email?.split('@')[0];
  const currentRole = appUser?.role || 'dispatcher';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('list')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  LogiTrack
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  LR Logistics
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Data Entry, Advanced Search & Analytics
              </p>
            </div>
          </div>

          {/* Sync & Connectivity Center */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Online / Offline Status Badge */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
              title={isOnline ? 'Connected to cloud database' : 'Working offline. Records saved to local storage.'}
            >
              {isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Sync Status Button */}
            <button
              onClick={onSyncNow}
              disabled={isSyncing || (!isOnline && pendingCount === 0)}
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                pendingCount > 0
                  ? 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title={
                pendingCount > 0
                  ? `${pendingCount} record(s) pending sync to cloud database`
                  : 'Database in sync'
              }
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isSyncing ? 'animate-spin text-indigo-400' : pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'
                }`}
              />
              <span className="font-medium">
                {isSyncing
                  ? 'Syncing...'
                  : pendingCount > 0
                  ? `Sync (${pendingCount})`
                  : 'Synced'}
              </span>
            </button>

            {/* User Auth Info */}
            {(user || appUser) ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                    {currentDisplayName}
                  </div>
                  <div className="text-[10px] text-indigo-400 flex items-center justify-end space-x-1 uppercase font-semibold">
                    <Shield className="h-2.5 w-2.5" />
                    <span>{currentRole}</span>
                  </div>
                </div>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="h-8 w-8 rounded-full border border-indigo-400/50"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-xs font-bold text-white shadow-sm border border-indigo-500/40">
                    {(currentDisplayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto py-2">
          <nav className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-slate-800 text-white shadow-inner border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ListFilter className="h-4 w-4 text-indigo-400" />
              <span>Dispatches & Records</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-inner border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>Analytics & Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Data Entry (New LR)</span>
            </button>

            <button
              onClick={() => setActiveTab('lookup')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'lookup'
                  ? 'bg-slate-800 text-white shadow-inner border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Search className="h-4 w-4 text-amber-400" />
              <span>LR & E-Waybill Finder</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-800 text-white shadow-inner border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Settings className="h-4 w-4 text-purple-400" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Quick Action Button */}
          {activeTab !== 'form' && (
            <button
              onClick={onNewEntry}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add New LR Trip</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
