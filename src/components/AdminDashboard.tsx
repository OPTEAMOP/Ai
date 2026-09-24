import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Activity, 
  Ban, 
  CheckCircle, 
  XCircle, 
  Search, 
  MoreVertical, 
  ArrowLeft,
  Settings,
  Trash2,
  Lock,
  Unlock,
  Eye,
  UserPlus,
  RefreshCw,
  LogOut,
  Download,
  TrendingUp,
  X,
  History,
  ExternalLink,
  MessageSquare,
  Flame,
  Image as ImageIcon,
  Sparkles,
  UserCheck,
  Globe,
  Tag,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { UserProfile, ActivityLog, UserRole, UserStatus } from '../types';
import { getUserAvatar, getUserDisplayName } from '../utils/userUtils';
import { safeJsonParse } from '../utils/storageUtils';
import { 
  getAdminAnalytics, 
  getAllUsers, 
  getActivityLogs, 
  updateUserStatus, 
  updateUserRole,
  getRegistrationStats,
  getUserActivityLogs
} from '../lib/firestoreUtils';

interface AdminDashboardProps {
  onClose: () => void;
  currentUser: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'analytics'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [regStats, setRegStats] = useState<{ date: string; count: number }[]>([]);
  const [analytics, setAnalytics] = useState<{ totalUsers: number; activeToday: number; totalSessions: number; totalImages: number }>({ 
    totalUsers: 0, 
    activeToday: 0,
    totalSessions: 0,
    totalImages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'email' | 'guest'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserProfile | null>(null);
  const [userLogs, setUserLogs] = useState<ActivityLog[]>([]);
  const [fetchingUserLogs, setFetchingUserLogs] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userData, logData, analyticsData, statsData] = await Promise.all([
        getAllUsers(),
        getActivityLogs(100),
        getAdminAnalytics(),
        getRegistrationStats()
      ]);
      
      // Historical Data Recovery Logic
      let localSessionsCount = 0;
      const localSessions = safeJsonParse(localStorage.getItem('omnisym_sessions_v1'), []);
      localSessionsCount = Array.isArray(localSessions) ? localSessions.length : 0;

      setUsers(userData);
      setLogs(logData);
      setRegStats(statsData);
      setAnalytics({
        ...analyticsData,
        totalSessions: Math.max(analyticsData.totalSessions, localSessionsCount)
      });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenUserDrawer = async (user: UserProfile) => {
    setSelectedUserDetails(user);
    setFetchingUserLogs(true);
    try {
      const logs = await getUserActivityLogs(user.id);
      setUserLogs(logs || []);
    } catch (err) {
      console.error('Failed to fetch user logs:', err);
    } finally {
      setFetchingUserLogs(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleUpdateStatus = async (userId: string, currentStatus: UserStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    const confirmMsg = newStatus === 'banned' 
      ? 'Are you sure you want to BAN this user? They will be logged out and unable to access the app.' 
      : 'Unban this user?';
    
    if (window.confirm(confirmMsg)) {
      try {
        await updateUserStatus(userId, newStatus);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      } catch (err) {
        alert('Failed to update user status.');
      }
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (window.confirm(`Change role to ${newRole}?`)) {
      try {
        await updateUserRole(userId, newRole);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (err) {
        alert('Failed to update user role.');
      }
    }
  };

  const handleBulkBan = async () => {
    if (selectedUserIds.size === 0) return;
    
    if (window.confirm(`Are you sure you want to BAN ${selectedUserIds.size} selected users?`)) {
      setLoading(true);
      try {
        await Promise.all(
          Array.from(selectedUserIds).map(userId => updateUserStatus(userId, 'banned'))
        );
        setUsers(prev => prev.map(u => selectedUserIds.has(u.id) ? { ...u, status: 'banned' } : u));
        setSelectedUserIds(new Set());
        alert('Selected users have been banned.');
      } catch (err) {
        alert('Failed to apply bulk ban. Some users might not have been updated.');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.filter(u => u.email !== 'apar123445@gmail.com').length) {
      setSelectedUserIds(new Set());
    } else {
      const allIds = filteredUsers
        .filter(u => u.email !== 'apar123445@gmail.com')
        .map(u => u.id);
      setSelectedUserIds(new Set(allIds));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLogGuest = (log: ActivityLog) => {
    if (log.isGuest !== undefined) return log.isGuest;
    const email = (log.email || '').toLowerCase();
    return email.includes('guest') || email.endsWith('.local') || log.userId?.startsWith('guest_');
  };

  const filteredLogs = logs.filter(log => {
    const isGuest = isLogGuest(log);
    if (logFilter === 'email' && isGuest) return false;
    if (logFilter === 'guest' && !isGuest) return false;

    if (!logSearchTerm.trim()) return true;
    const term = logSearchTerm.toLowerCase();
    return (
      log.email?.toLowerCase().includes(term) ||
      log.userName?.toLowerCase().includes(term) ||
      log.type?.toLowerCase().includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.userId?.toLowerCase().includes(term)
    );
  });

  const guestLogsCount = logs.filter(l => isLogGuest(l)).length;
  const emailLogsCount = logs.filter(l => !isLogGuest(l)).length;

  const downloadLogsCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['User Type', 'Name', 'Email/Session', 'Event Type', 'Details', 'User ID', 'Date', 'Time'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const isGuest = isLogGuest(log);
        const date = new Date(log.timestamp);
        const escapeCSV = (val: string = '') => `"${val.replace(/"/g, '""')}"`;
        return [
          isGuest ? 'Guest' : 'Registered User',
          escapeCSV(log.userName || (isGuest ? 'Guest' : 'User')),
          escapeCSV(log.email),
          escapeCSV(log.type),
          escapeCSV(log.details || ''),
          escapeCSV(log.userId),
          escapeCSV(date.toLocaleDateString()),
          escapeCSV(date.toLocaleTimeString())
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `omnisym_activity_logs_${logFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col min-h-screen w-full overflow-y-auto pb-20"
    >
      {/* Header - Compact & Minimalist */}
      <header className="p-3 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight whitespace-nowrap uppercase">Omnisym Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-all ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-4 w-px bg-gray-100 mx-1" />
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
            <img 
              src={currentUser.avatar} 
              className="w-4 h-4 rounded-full" 
              alt="Admin"
            />
            <span className="text-[10px] font-bold text-gray-700">{currentUser.name}</span>
          </div>
        </div>
      </header>

      {/* Analytics Overview - Sleek Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
          <Users className="w-4 h-4 text-gray-300 absolute top-3 right-3" />
          <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{analytics.totalUsers}</h3>
          <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Total Users</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
          <Activity className="w-4 h-4 text-gray-300 absolute top-3 right-3" />
          <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{analytics.activeToday}</h3>
          <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Active Today</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
          <LogOut className="w-4 h-4 text-gray-300 absolute top-3 right-3 rotate-180" />
          <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{analytics.totalSessions}</h3>
          <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Total Sessions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
          <Eye className="w-4 h-4 text-gray-300 absolute top-3 right-3" />
          <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{analytics.totalImages}</h3>
          <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Saved Images</p>
        </div>
      </div>

      {/* Registration Chart - Premium Style */}
      <div className="px-4 pb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-900" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Growth Analytics</h3>
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-1">User registrations over the last 7 days</p>
            </div>
          </div>
          
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={regStats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: '700'
                  }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#111827" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs - Minimalist */}
      <div className="flex items-center gap-1 px-4 border-b border-gray-100 bg-white sticky top-[53px] z-20">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-[11px] font-bold transition-all border-b-2 relative ${activeTab === 'users' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 text-[11px] font-bold transition-all border-b-2 relative ${activeTab === 'logs' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
        >
          Activity Logs
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'users' ? (
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-1.5 text-[11px] bg-gray-50 border border-gray-100 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all font-medium"
                  />
                </div>

                <AnimatePresence>
                  {selectedUserIds.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedUserIds.size} Selected</span>
                      <button
                        onClick={handleBulkBan}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-all uppercase tracking-widest"
                      >
                        <Ban className="w-3 h-3" />
                        Bulk Ban
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox"
                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.filter(u => u.email !== 'apar123445@gmail.com').length}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((user, uIdx) => (
                        <tr 
                          key={`${user.id || 'usr'}_${uIdx}`} 
                          onClick={() => handleOpenUserDrawer(user)}
                          className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${selectedUserIds.has(user.id) ? 'bg-gray-50' : ''}`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {user.email !== 'apar123445@gmail.com' && (
                              <input 
                                type="checkbox"
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                checked={selectedUserIds.has(user.id)}
                                onChange={() => toggleSelectUser(user.id)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <img src={getUserAvatar(user)} className="w-7 h-7 rounded-full border border-gray-100" alt="" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-900 truncate max-w-[120px]">{getUserDisplayName(user)}</p>
                                <p className="text-[9px] text-gray-400 truncate max-w-[120px]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              user.role === 'admin' ? 'text-indigo-600' : 
                              user.role === 'moderator' ? 'text-emerald-600' : 
                              'text-gray-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              user.status === 'banned' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {user.status === 'banned' ? <Ban className="w-2 h-2" /> : <CheckCircle className="w-2 h-2" />}
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {user.email !== 'apar123445@gmail.com' && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleUpdateStatus(user.id, user.status || 'active')}
                                  className={`p-1.5 rounded-md transition-all ${
                                    user.status === 'banned' 
                                      ? 'text-emerald-600 hover:bg-emerald-50' 
                                      : 'text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  {user.status === 'banned' ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logs-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Header Controls: Filters & Search & Export */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      logFilter === 'all'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
                    }`}
                  >
                    <span>All Logs</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${logFilter === 'all' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                      {logs.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setLogFilter('guest')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      logFilter === 'guest'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-700 hover:bg-amber-50/50 border border-amber-200/60'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Guest Logs</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${logFilter === 'guest' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
                      {guestLogsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setLogFilter('email')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      logFilter === 'email'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-700 hover:bg-indigo-50/50 border border-indigo-200/60'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Email Users</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${logFilter === 'email' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>
                      {emailLogsCount}
                    </span>
                  </button>
                </div>

                {/* Search & Download */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={logSearchTerm}
                      onChange={(e) => setLogSearchTerm(e.target.value)}
                      placeholder="Search email, guest, event, prompt..."
                      className="w-full pl-9 pr-4 py-1.5 text-[11px] bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all font-medium"
                    />
                  </div>

                  <button
                    onClick={downloadLogsCSV}
                    disabled={filteredLogs.length === 0}
                    title="Export Logs as CSV"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider whitespace-nowrap shadow-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Logs List */}
              {filteredLogs.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">No Logs Found</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {logFilter === 'guest' ? 'No guest activity recorded yet.' : 'Try changing your search or filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log, lIdx) => {
                    const isGuest = isLogGuest(log);
                    const logType = (log.type || '').toLowerCase();
                    const isImage = logType.includes('image');
                    const isRoast = logType.includes('roast');
                    const isChat = logType.includes('chat');
                    const isLogin = logType.includes('login') || logType.includes('visit') || logType.includes('active');

                    return (
                      <div 
                        key={`${log.id || 'log'}_${lIdx}`} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all ${
                          isGuest 
                            ? 'bg-amber-50/20 border-amber-100 hover:border-amber-200' 
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          {/* Event Icon */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            isImage 
                              ? 'bg-violet-50 border-violet-200 text-violet-600'
                              : isRoast
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : isChat
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : isLogin
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}>
                            {isImage ? (
                              <ImageIcon className="w-3.5 h-3.5" />
                            ) : isRoast ? (
                              <Flame className="w-3.5 h-3.5" />
                            ) : isChat ? (
                              <MessageSquare className="w-3.5 h-3.5" />
                            ) : isLogin ? (
                              <UserPlus className="w-3.5 h-3.5" />
                            ) : (
                              <Activity className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Identity & Details */}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-gray-900">
                                {log.userName || (isGuest ? 'Guest User' : log.email)}
                              </span>

                              {isGuest ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                                  <Globe className="w-2.5 h-2.5" />
                                  Guest
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase tracking-wider">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  Verified
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[9px] font-bold uppercase tracking-widest font-mono">
                                {log.type}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-gray-500">{log.email}</span>
                              {log.details && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-[10px] text-gray-700 italic max-w-xs truncate" title={log.details}>
                                    "{log.details}"
                                  </span>
                                </>
                              )}
                              <span className="text-gray-300">•</span>
                              <span className="text-[9px] text-gray-400 font-mono">ID: {log.userId?.substring(0, 14)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="mt-2 sm:mt-0 text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-1 sm:pt-0 border-gray-100">
                          <p className="text-[10px] font-bold text-gray-900">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                          <p className="text-[9px] text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t border-gray-100 text-center sticky bottom-0">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em]">
          Omnisym Control Interface
        </p>
      </footer>

      {/* User Details Side Drawer */}
      <AnimatePresence>
        {selectedUserDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserDetails(null)}
              className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white z-[80] shadow-2xl flex flex-col border-l border-gray-100"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">User Intelligence</h2>
                    <p className="text-[9px] text-gray-400 font-medium">Granular activity and profile data</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserDetails(null)}
                  className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* User Header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <img 
                    src={selectedUserDetails.photoURL || selectedUserDetails.avatar} 
                    className="w-16 h-16 rounded-2xl border-4 border-gray-50 shadow-sm mb-3" 
                    alt="" 
                  />
                  <h3 className="text-sm font-bold text-gray-900">{selectedUserDetails.displayName || selectedUserDetails.name}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">{selectedUserDetails.email}</p>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      selectedUserDetails.status === 'banned' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {selectedUserDetails.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold uppercase tracking-wider">
                      {selectedUserDetails.role}
                    </span>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Joined</p>
                    <p className="text-[10px] font-bold text-gray-900">
                      {selectedUserDetails.createdAt ? new Date(selectedUserDetails.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Seen</p>
                    <p className="text-[10px] font-bold text-gray-900">
                      {selectedUserDetails.lastLogin ? new Date(selectedUserDetails.lastLogin).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Granular Activity Logs */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-3.5 h-3.5 text-gray-900" />
                    <h4 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Recent Activity</h4>
                  </div>

                  {fetchingUserLogs ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-gray-200 animate-spin" />
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Fetching Logs...</p>
                    </div>
                  ) : userLogs.length > 0 ? (
                    <div className="space-y-2">
                      {userLogs.map((log, ulIdx) => (
                        <div key={`${log.id || 'ulog'}_${ulIdx}`} className="p-3 rounded-xl border border-gray-50 bg-gray-50/50 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">{log.type}</p>
                            <p className="text-[9px] text-gray-400 font-medium">
                              {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Activity Recorded</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={() => setSelectedUserDetails(null)}
                  className="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
