
import React, { useState, useEffect, useMemo, useRef, FC } from 'react';
import { 
  LayoutDashboard, Calendar as CalendarIcon, Users, ClipboardCheck, Plus, Clock, Menu, X, LogOut, Lock, Mail, Edit2, RefreshCw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Calendar, StickyNote, Zap, MousePointer2, BarChart3, Eye, Trash, BellRing, CheckCircle, Send, Euro, MapPin, Phone, MessageSquare, UserPlus, Save, Waves, Download, Camera, UserCheck, FileText, Trash2, MailQuestion, LucideIcon
} from 'lucide-react';
import { PROPERTIES, INITIAL_CLEANERS } from './constants';
import { Property, Cleaner, Mission, PropertyKey } from './types';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const ADMIN_PASSWORD = "bWInnRDFbs2R7XnfEv3g";
const LAUNDRY_COST_PER_MISSION = 14;

type AppTab = 'dashboard' | 'calendar' | 'unified-calendar' | 'missions' | 'staff' | 'finance' | 'agent-calendar' | 'emails' | 'agent-finance';

const LogoComponent: FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const isLarge = size === 'lg';
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${isLarge ? 'w-24 h-24 mb-6' : 'w-10 h-10'}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="logoGradient" x1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9A03F" />
              <stop offset="100%" stopColor="#F85C5C" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="35" r="22" fill="none" stroke="url(#logoGradient)" strokeWidth="4" />
          <path d="M43 38 L50 31 L57 38 L57 44 L43 44 Z" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
          <rect x="48" y="38" width="4" height="4" fill="url(#logoGradient)" />
          <path d="M50 57 L50 90 M50 75 L58 75 M50 82 L58 82" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      {isLarge && (
        <div className="text-center">
          <h1 className="text-3xl font-serif tracking-[0.1em] text-[#1A2D42] font-semibold uppercase">My Toul'House</h1>
          <p className="text-[#F9A03F] font-medium tracking-widest text-sm mt-2">mytoulhouse.com</p>
        </div>
      )}
    </div>
  );
};

const Login: FC<{ onLogin: (user: 'admin' | Cleaner) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      onLogin('admin');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const response = await fetch('/api/cleaners');
      if (!response.ok) throw new Error('Could not fetch cleaners list');
      const allCleaners: Cleaner[] = await response.json();
      const agent = allCleaners.find(c => c.email === email && c.password === password);
      
      if (agent) {
        onLogin(agent);
      } else {
        setError('Identifiants incorrects. Veuillez réessayer.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
          <div className="flex flex-col items-center mb-10"><LogoComponent /></div>
          <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Identifiant Email</label>
                  <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-400 transition-all outline-none" placeholder="exemple@gmail.com" required disabled={isLoggingIn} />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
                  <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-400 transition-all outline-none" placeholder="••••••••" required disabled={isLoggingIn} />
                  </div>
              </div>
              {error && <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
              <button type="submit" className="w-full bg-[#1A2D42] text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] mt-4 tracking-widest uppercase text-sm disabled:opacity-50" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Connexion...' : 'Se connecter'}
              </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const App: FC = () => {
  const [currentUser, setCurrentUser] = useState<'admin' | Cleaner | null>(() => {
    const saved = localStorage.getItem('zenclean_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const savedUser = localStorage.getItem('zenclean_user');
    if (!savedUser) return 'dashboard';
    const user = JSON.parse(savedUser);
    return user === 'admin' ? 'dashboard' : 'missions';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingMission, setIsCreatingMission] = useState(false);
  const [editingNoteMission, setEditingNoteMission] = useState<Mission | null>(null);
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null | 'new'>(null);

  const isAdmin = currentUser === 'admin';
  const isAgent = currentUser && currentUser !== 'admin';

  useEffect(() => { 
    if (currentUser) loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [cleanersRes, missionsRes] = await Promise.all([
        fetch('/api/cleaners').then(res => res.json()),
        fetch('/api/missions').then(res => res.json())
      ]);
      setCleaners(Array.isArray(cleanersRes) && cleanersRes.length > 0 ? cleanersRes : INITIAL_CLEANERS);
      setMissions(Array.isArray(missionsRes) ? missionsRes : []);
    } catch (error) {
      console.error("Erreur critique:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/daily-cron?schedule=true');
      await loadInitialData();
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCleaner = async (cleaner: Cleaner, isNew: boolean) => {
    try {
      const response = await fetch('/api/cleaners', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaner)
      });
      if (response.ok) {
        setEditingCleaner(null);
        await loadInitialData();
      } else {
        alert("Erreur: Impossible d'enregistrer l'agent.");
        console.error('Failed to save cleaner on the server.');
      }
    } catch (e) {
      alert("Erreur: Impossible d'enregistrer l'agent.");
      console.error("Failed to save cleaner:", e);
    }
  };

 const handleDeleteCleaner = async (cleaner: Cleaner) => {
    const cleanerId = cleaner._id || cleaner.id;
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'agent ${cleaner.name} ? Cette action est irréversible.`)) {
      try {
        const response = await fetch(`/api/cleaners?id=${cleanerId}`, { method: 'DELETE' });
        if (response.ok) {
          setCleaners(prev => prev.filter(c => (c._id || c.id) !== cleanerId));
        } else {
          const data = await response.json();
          alert(data.message || "Impossible de supprimer l'agent.");
        }
      } catch (e) {
        console.error("Failed to delete cleaner:", e);
        alert('Une erreur est survenue lors de la suppression.');
      }
    }
  };

 const handleUpdateMission = async (mission: Mission) => {
    const missionId = mission._id || mission.id;
    
    if (mission.cleanerId && mission.status === 'pending') mission.status = 'assigned';
    if (!mission.cleanerId && mission.status === 'assigned') mission.status = 'pending';

    setMissions(prev => prev.map(m => ((m._id || m.id) === missionId ? mission : m)));
    
    try {
      await fetch('/api/missions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mission)
      });

    } catch (e) { console.error(e); }
  };
  
  const handleCreateMission = async (missionData: Partial<Mission>) => {
    const newMission: Partial<Mission> = { ...missionData, isManual: true, status: 'pending' };
    try {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });
      if(response.ok) {
        const createdMission = await response.json();
        setMissions(prev => [...prev, createdMission]);
        setIsCreatingMission(false);
      } else {
        console.error("Failed to create mission");
      }
    } catch (e) {
      console.error("Error creating mission:", e);
    }
  };

  const handleDeleteMission = async (mission: Mission) => {
    const missionId = mission._id || mission.id;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la mission pour ${mission.propertyId} le ${mission.date} ?`)) return;

    try {
      const response = await fetch(`/api/missions?id=${missionId}`, { method: 'DELETE' });
      if(response.ok) {
        setMissions(prev => prev.filter(m => (m._id || m.id) !== missionId));
      } else {
        const data = await response.json();
        alert(data.error || 'Impossible de supprimer la mission.');
      }
    } catch (e) {
      console.error("Error deleting mission:", e);
      alert('Une erreur est survenue.');
    }
  };

  const handleLogin = (user: 'admin' | Cleaner) => {
    setCurrentUser(user);
    localStorage.setItem('zenclean_user', JSON.stringify(user));
    setActiveTab(user === 'admin' ? 'dashboard' : 'missions');
  };

  if (!currentUser) return <Login onLogin={handleLogin} />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-orange-500" size={48} /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white border-r transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
                <LogoComponent size="sm" />
                <h1 className="text-lg font-black text-[#1A2D42] uppercase">My Toul'House</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-[#1A2D42]"><X size={20}/></button>
          </div>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {isAdmin && <SidebarItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="calendar" icon={CalendarIcon} label="Calendriers" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="unified-calendar" icon={Calendar} label="Calendrier Unifié" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAgent && <SidebarItem id="agent-calendar" icon={CalendarIcon} label="Mon Calendrier" activeTab={activeTab} setActiveTab={setActiveTab} />}
            <SidebarItem id="missions" icon={ClipboardCheck} label="Missions" activeTab={activeTab} setActiveTab={setActiveTab} />
            {isAgent && <SidebarItem id="agent-finance" icon={FileText} label="Mon Bilan" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="staff" icon={Users} label="Agents" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="finance" icon={BarChart3} label="Bilan Financier" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="emails" icon={Mail} label="Mails archivés" activeTab={activeTab} setActiveTab={setActiveTab} />}
          </nav>
          <div className="mt-auto pt-6 border-t">
            <button onClick={() => { setCurrentUser(null); localStorage.removeItem('zenclean_user'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-colors">
              <LogOut size={20} /> <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
      
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-50 lg:hidden" />} 

      <main className="flex-1 flex flex-col w-full">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-slate-900">{isAdmin ? "Administrateur" : (currentUser as Cleaner).name}</p>
               <p className="text-[10px] text-slate-400">En ligne</p>
             </div>
             {isAdmin ? (
                <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-slate-400"><Users size={18} /></div>
              ) : (
                <img src={(currentUser as Cleaner).avatar} className="w-8 h-8 rounded-full object-cover border" alt="Avatar" />
              )}
          </div>
        </header>

        <div className="p-2 sm:p-6 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView missions={missions} cleaners={cleaners} onUpdateMission={handleUpdateMission} />}
            {activeTab === 'calendar' && <CalendarsTabView onSync={handleManualSync} isSyncing={isSyncing} />}
            {activeTab === 'unified-calendar' && <UnifiedCalendarView missions={missions} />}
            {activeTab === 'agent-calendar' && isAgent && <AgentCalendarView missions={missions} currentCleaner={currentUser} onUpdateMission={handleUpdateMission} />}
            {activeTab === 'missions' && (
              <MissionsTableView 
                missions={missions} 
                cleaners={cleaners} 
                isAdmin={isAdmin}
                isAgent={isAgent}
                currentCleaner={isAgent ? currentUser : undefined} 
                onUpdateMission={handleUpdateMission} 
                onDeleteMission={handleDeleteMission}
                onCreateMission={() => setIsCreatingMission(true)}
                onEditNote={(m: Mission) => setEditingNoteMission(m)}
                onSync={handleManualSync} 
                isSyncing={isSyncing}
              />
            )}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-[#1A2D42]">Nos Agents</h2>
                  <button onClick={() => setEditingCleaner('new')} className="bg-[#1A2D42] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95">
                    <UserPlus size={18} /> Nouvel Agent
                  </button>
                </div>
                <StaffGridView cleaners={cleaners} onEdit={setEditingCleaner} onDelete={handleDeleteCleaner} />
              </div>
            )}
            {activeTab === 'finance' && <FinanceView missions={missions} cleaners={cleaners} />}
            {activeTab === 'agent-finance' && isAgent && <AgentFinanceView missions={missions} currentCleaner={currentUser} />}
            {activeTab === 'emails' && <EmailsArchiveView onSync={handleManualSync} isSyncing={isSyncing} />}
          </div>
        </div>
      </main>

      {isCreatingMission && <MissionCreatorModal onClose={() => setIsCreatingMission(false)} onSave={handleCreateMission} />}

      {editingNoteMission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <h3 className="font-black text-[#1A2D42] uppercase text-sm tracking-widest">Note de mission - {editingNoteMission.propertyId}</h3>
              <button onClick={() => setEditingNoteMission(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <div className="p-8">
              <textarea id="mission-note-input" className="w-full h-40 bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-medium text-slate-700" placeholder="Ajouter des instructions particulières ici..." defaultValue={editingNoteMission.notes || ""}></textarea>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingNoteMission(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
                <button onClick={() => { const note = (document.getElementById('mission-note-input') as HTMLTextAreaElement).value; handleUpdateMission({...editingNoteMission, notes: note}); setEditingNoteMission(null); }} className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCleaner && <CleanerModal cleaner={editingCleaner === 'new' ? null : editingCleaner} onClose={() => setEditingCleaner(null)} onSave={handleSaveCleaner} />}
    </div>
  );
};

// --- SUB-COMPONENTS ---

interface SidebarItemProps { id: AppTab; icon: LucideIcon; label: string; activeTab: AppTab; setActiveTab: (tab: AppTab) => void; }
const SidebarItem: FC<SidebarItemProps> = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-[#1A2D42] text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
    <Icon size={20} /> <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

interface CleanerModalProps { cleaner: Cleaner | null; onClose: () => void; onSave: (cleaner: Cleaner, isNew: boolean) => void; }
const CleanerModal: FC<CleanerModalProps> = ({ cleaner, onClose, onSave }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Cleaner>>(
    cleaner || {
      id: `c${Date.now()}`,
      name: '', email: '', password: '',
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
      assignedProperties: [],
      propertyRates: PROPERTIES.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {})
    }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData({ ...formData, avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-black text-[#1A2D42] uppercase text-sm tracking-widest">{cleaner ? 'Modifier l\'agent' : 'Nouvel agent'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={formData.avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-100 group-hover:ring-orange-200 transition-all shadow-lg" alt="Avatar" />
                  <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24} /></div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliquez pour changer l'avatar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nom Complet</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold" placeholder="Ex: Maria Dupont" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Email</label>
              <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold" placeholder="maria@exemple.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Mot de passe</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold" placeholder="••••••••" />
            </div>
          </div>
          <div className="border-t pt-6">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-4">Propriétés & Tarifs (€)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROPERTIES.map(p => {
                const isAssigned = formData.assignedProperties?.includes(p.id);
                return (
                  <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isAssigned ? 'border-orange-400 bg-orange-50/30' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <input type="checkbox" checked={!!isAssigned} onChange={e => {
                          const props = e.target.checked ? [...(formData.assignedProperties || []), p.id] : (formData.assignedProperties || []).filter(id => id !== p.id);
                          setFormData({...formData, assignedProperties: props});
                        }} className="w-5 h-5 rounded-md accent-orange-500" />
                      <span className="font-black text-xs uppercase tracking-tight">{p.name}</span>
                    </div>
                    {isAssigned && (
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="number" value={formData.propertyRates?.[p.id] || ''} onChange={e => setFormData({ ...formData, propertyRates: { ...formData.propertyRates, [p.id]: parseFloat(e.target.value) || 0 }})} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-400 outline-none font-bold text-sm" placeholder="Tarif" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
            <button onClick={() => onSave(formData as Cleaner, cleaner === null)} className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
              <Save size={18} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MissionCreatorModalProps { onClose: () => void; onSave: (data: Partial<Mission>) => void; }
const MissionCreatorModal: FC<MissionCreatorModalProps> = ({ onClose, onSave }) => {
  const [propertyId, setPropertyId] = useState<PropertyKey>(PROPERTIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b flex items-center justify-between"><h3 className="font-black text-[#1A2D42] uppercase text-sm tracking-widest">Créer une mission manuelle</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24}/></button></div>
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Propriété</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value as PropertyKey)} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold">
              {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
            <button onClick={() => onSave({ propertyId, date })} className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
              <Plus size={18} /> Créer la mission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DashboardViewProps { missions: Mission[]; cleaners: Cleaner[]; onUpdateMission: (mission: Mission) => void; }
const DashboardView: FC<DashboardViewProps> = ({ missions, cleaners, onUpdateMission }) => {
  const { priorityMissions, stats } = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysLater = new Date(); sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    const filtered = missions.filter(m => (m.status === 'pending' || (m.date >= todayStr && m.date <= sevenDaysLaterStr && m.status !== 'completed')))
                             .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      priorityMissions: filtered,
      stats: {
        pending: missions.filter(m => m.status === 'pending').length,
        today: missions.filter(m => m.date === todayStr).length,
        completed: missions.filter(m => m.status === 'completed').length,
        agents: cleaners.length
      }
    };
  }, [missions, cleaners]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Missions Libres" value={stats.pending} icon={AlertCircle} color="text-red-500" bg="bg-red-50" />
        <StatCard label="Missions Aujourd'hui" value={stats.today} icon={Clock} color="text-blue-500" bg="bg-blue-50" />
        <StatCard label="Total Traité" value={stats.completed} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-50" />
      </div>
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Missions Prioritaires (Libres ou J+7)</h3>
          <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Urgent</span>
        </div>
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {priorityMissions.length > 0 ? priorityMissions.map(m => (
            <div key={m._id || m.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-10 rounded-full ${PROPERTIES.find(p => p.id === m.propertyId)?.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm uppercase text-slate-800">{m.propertyId}</p>
                    {m.notes && <StickyNote size={14} className="text-orange-500 fill-orange-50" />}
                  </div>
                  <p className="text-xs text-slate-400 font-bold">{m.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={m.status} cleanerId={m.cleanerId} />
                <button onClick={() => onUpdateMission({...m, status: m.status === 'completed' ? (m.cleanerId ? 'assigned' : 'pending') : 'completed'})} className={`p-2 transition-colors ${m.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}><CheckCircle size={20} /></button>
              </div>
            </div>
          )) : <div className="px-6 py-10 text-center"><p className="text-sm font-bold text-slate-400">Aucune mission prioritaire à afficher.</p></div>}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps { label: string; value: string | number; icon: LucideIcon; color: string; bg: string; suffix?: string; }
const StatCard: FC<StatCardProps> = ({ label, value, icon: Icon, color, bg, suffix = "" }) => (
  <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center gap-5">
    <div className={`${bg} ${color} p-4 rounded-2xl`}><Icon size={24} /></div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}{suffix}</p>
    </div>
  </div>
);

// ─── Types for iCal events from MongoDB ───────────────────────────────────────
interface CalendarEvent {
  _id?: string;
  uid: string;
  propertyId: PropertyKey;
  summary: string;
  description?: string;
  startDate: string;
  startTime?: string | null;
  endDate: string;
  endTime?: string | null;
  isAllDay?: boolean;
  eventType: 'checkin' | 'checkout' | 'reservation' | 'blocked';
  source: 'ical';
}

// A rendered band: either a standalone reservation/mission, or a fused ical+mission
interface BandEvent {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  color: string;
  textColor: string;
  isMission?: boolean;
  eventType?: string;
  propertyId: PropertyKey;
  rawData: CalendarEvent | Mission;
  // If this ical band has a mission fused at its end:
  fusedMission?: Mission;
  fusedMissionDate?: string;
}

// ─── Timeline view for "all properties" ───────────────────────────────────────
const TimelineView: FC<{
  bands: BandEvent[];
  month: number;
  year: number;
  onSelect: (b: BandEvent) => void;
  selected: BandEvent | null;
}> = ({ bands, month, year, onSelect, selected }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
  const today = new Date().toISOString().split('T')[0];

  // Group bands by property
  const byProp = PROPERTIES.map(p => ({
    prop: p,
    bands: bands.filter(b => b.propertyId === p.id)
  }));

  const CELL_W = 36; // px per day
  const ROW_H = 48;
  const LABEL_W = 90;
  const totalW = LABEL_W + daysInMonth * CELL_W;

  // For each property row, stack bands into swim-lanes (no overlap)
  const getSwimLanes = (propBands: BandEvent[]) => {
    type Lane = { band: BandEvent; startIdx: number; endIdx: number }[];
    const lanes: Lane[] = [];
    for (const band of propBands) {
      const si = days.indexOf(band.startDate);
      const ei = days.indexOf(band.endDate);
      if (si === -1 && ei === -1) continue;
      const startIdx = si === -1 ? 0 : si;
      const endIdx = ei === -1 ? daysInMonth - 1 : ei;
      let lane = 0;
      while (lanes[lane] && lanes[lane].some(s => s.startIdx <= endIdx && s.endIdx >= startIdx)) lane++;
      if (!lanes[lane]) lanes[lane] = [];
      lanes[lane].push({ band, startIdx, endIdx });
    }
    return lanes;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <div style={{ minWidth: totalW, position: 'relative' }}>
        {/* Header: day numbers */}
        <div className="flex border-b sticky top-0 bg-white z-20" style={{ paddingLeft: LABEL_W }}>
          {days.map((ds, i) => {
            const d = i + 1;
            const isToday = ds === today;
            const dow = new Date(ds + 'T12:00:00').getDay();
            const isWE = dow === 0 || dow === 6;
            return (
              <div key={ds} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 border-r last:border-r-0 ${isToday ? 'bg-orange-50' : isWE ? 'bg-slate-50' : ''}`}
                style={{ width: CELL_W }}>
                <span className={`text-[9px] font-black leading-none ${isWE ? 'text-slate-400' : 'text-slate-300'}`}>
                  {['D','L','M','M','J','V','S'][dow]}
                </span>
                <span className={`text-[11px] font-black leading-tight ${isToday ? 'text-orange-500' : isWE ? 'text-slate-500' : 'text-slate-400'}`}>
                  {d}
                </span>
              </div>
            );
          })}
        </div>

        {/* Property rows */}
        {byProp.map(({ prop, bands: propBands }) => {
          const lanes = getSwimLanes(propBands);
          const rowHeight = Math.max(ROW_H, lanes.length * 24 + 12);
          return (
            <div key={prop.id} className="flex border-b last:border-b-0" style={{ minHeight: rowHeight }}>
              {/* Property label */}
              <div className="flex-shrink-0 flex items-center px-3 border-r bg-slate-50/80 z-10"
                style={{ width: LABEL_W, minHeight: rowHeight }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: prop.hexColor }} />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight leading-tight">{prop.name}</span>
                </div>
              </div>

              {/* Timeline cells */}
              <div className="relative flex-1" style={{ minHeight: rowHeight }}>
                {/* Day grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((ds, i) => {
                    const dow = new Date(ds + 'T12:00:00').getDay();
                    const isWE = dow === 0 || dow === 6;
                    const isToday = ds === today;
                    return (
                      <div key={i} className={`border-r last:border-r-0 h-full flex-shrink-0 ${isToday ? 'bg-orange-50/40' : isWE ? 'bg-slate-50/60' : ''}`}
                        style={{ width: CELL_W }} />
                    );
                  })}
                </div>

                {/* Bands */}
                {lanes.map((lane, li) =>
                  lane.map(({ band, startIdx, endIdx }) => {
                    const isSelected = selected?.id === band.id;
                    const left = startIdx * CELL_W;
                    const width = (endIdx - startIdx + 1) * CELL_W;
                    const top = 6 + li * 24;
                    const hasFused = !!band.fusedMission && band.fusedMissionDate;
                    const fusedIdx = hasFused ? days.indexOf(band.fusedMissionDate!) : -1;

                    return (
                      <div key={band.id} className="absolute cursor-pointer group"
                        style={{ left, top, width, height: 20, zIndex: 10 }}
                        onClick={() => onSelect(band)}
                        title={band.label}>

                        {/* Main band */}
                        <div className="absolute inset-0 rounded-full overflow-hidden flex items-center"
                          style={{
                            backgroundColor: band.color,
                            boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 3.5px ${band.color}` : '0 1px 3px rgba(0,0,0,0.15)',
                          }}>
                          {/* Fused mission zone at end */}
                          {hasFused && fusedIdx >= startIdx && (
                            <div className="absolute right-0 top-0 bottom-0 rounded-r-full"
                              style={{
                                width: CELL_W,
                                background: 'linear-gradient(90deg, transparent, #7C3AED)',
                              }} />
                          )}
                          <span className="px-2 text-[9px] font-bold truncate leading-none"
                            style={{ color: band.textColor, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                            {band.label}
                          </span>
                          {hasFused && (
                            <span className="absolute right-1 text-[9px] leading-none" style={{ color: '#fff' }}>🧹</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Unified Calendar View ─────────────────────────────────────────────────────
const UnifiedCalendarView: FC<{ missions: Mission[] }> = ({ missions }) => {
  const [activeProp, setActiveProp] = useState<PropertyKey | 'all'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedBand, setSelectedBand] = useState<BandEvent | null>(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => { loadCalendarEvents(); }, [month, year]);

  const loadCalendarEvents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month + 1), year: String(year) });
      const res = await fetch(`/api/calendar-events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/calendar-events', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus({ type: 'success', msg: `${data.synced} événements synchronisés` });
        await loadCalendarEvents();
      } else {
        setSyncStatus({ type: 'error', msg: data.error || 'Erreur' });
      }
    } catch { setSyncStatus({ type: 'error', msg: 'Erreur réseau' }); }
    finally { setIsSyncing(false); setTimeout(() => setSyncStatus(null), 4000); }
  };

  // Build BandEvents — fuse each ical reservation with its mission if the
  // mission date falls on the checkout day (end of the reservation band).
  const allBands = useMemo((): BandEvent[] => {
    const bands: BandEvent[] = [];
    const filteredEvents = activeProp === 'all' ? calendarEvents : calendarEvents.filter(e => e.propertyId === activeProp);
    const filteredMissions = activeProp === 'all' ? missions : missions.filter(m => m.propertyId === activeProp);

    // Track which missions have been fused so we don't duplicate them
    const fusedMissionIds = new Set<string>();

    for (const e of filteredEvents) {
      const prop = PROPERTIES.find(p => p.id === e.propertyId);
      const propColor = prop?.hexColor || '#888';
      const typeColors: Record<string, { color: string; text: string }> = {
        reservation: { color: propColor, text: '#fff' },
        checkin:     { color: '#059669', text: '#fff' },
        checkout:    { color: '#EA580C', text: '#fff' },
        blocked:     { color: '#94A3B8', text: '#fff' },
      };
      const style = typeColors[e.eventType] || typeColors.reservation;
      const typeLabels: Record<string, string> = { reservation: '📅', checkin: '🟢', checkout: '🔴', blocked: '🚫' };
      const prefix = typeLabels[e.eventType] || '📅';

      let startD = e.startDate;
      let endD = e.endDate || e.startDate;
      if (e.isAllDay && endD > startD) {
        const ed = new Date(endD + 'T12:00:00');
        ed.setDate(ed.getDate() - 1);
        endD = ed.toISOString().split('T')[0];
      }

      const timeHint = (() => {
        if (e.isAllDay) return '';
        if (e.eventType === 'checkin' && e.startTime) return ` · ${e.startTime}`;
        if (e.eventType === 'checkout' && e.endTime) return ` · ${e.endTime}`;
        if (e.startTime) return ` · ${e.startTime}`;
        return '';
      })();

      // Try to find a mission on the checkout day (endD) for the same property
      const fusedMission = filteredMissions.find(m =>
        m.propertyId === e.propertyId &&
        m.date === endD &&
        !fusedMissionIds.has(m._id || m.id)
      );

      if (fusedMission) {
        fusedMissionIds.add(fusedMission._id || fusedMission.id);
      }

      bands.push({
        id: e.uid,
        label: `${prefix} ${e.summary}${timeHint}`,
        startDate: startD,
        endDate: endD,
        color: style.color,
        textColor: style.text,
        eventType: e.eventType,
        propertyId: e.propertyId,
        rawData: e,
        fusedMission: fusedMission,
        fusedMissionDate: fusedMission ? endD : undefined,
      });
    }

    // Add missions that were NOT fused (no matching ical event on that day)
    for (const m of filteredMissions) {
      if (fusedMissionIds.has(m._id || m.id)) continue;
      const prop = PROPERTIES.find(p => p.id === m.propertyId);
      bands.push({
        id: m._id || m.id,
        label: `🧹 Ménage · ${prop?.name || m.propertyId}`,
        startDate: m.date,
        endDate: m.date,
        color: '#7C3AED',
        textColor: '#fff',
        isMission: true,
        propertyId: m.propertyId,
        rawData: m,
      });
    }
    return bands;
  }, [calendarEvents, missions, activeProp]);

  // Week grid (used for single-property view)
  const weeks = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const rows: (string | null)[][] = [];
    let row: (string | null)[] = Array(firstWeekDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      row.push(ds);
      if (row.length === 7) { rows.push(row); row = []; }
    }
    while (row.length < 7) row.push(null);
    if (row.some(x => x !== null)) rows.push(row);
    return rows;
  }, [month, year]);

  const weeksWithBands = useMemo(() => {
    return weeks.map(row => {
      const realDays = row.filter(Boolean) as string[];
      if (realDays.length === 0) return { row, segments: [] as any[] };
      const rowStart = realDays[0];
      const rowEnd = realDays[realDays.length - 1];

      type Seg = { band: BandEvent; colStart: number; colSpan: number; lane: number; isStart: boolean; isEnd: boolean };
      const segments: Seg[] = [];

      for (const band of allBands) {
        if (band.startDate > rowEnd || band.endDate < rowStart) continue;
        const clippedStart = band.startDate < rowStart ? rowStart : band.startDate;
        const clippedEnd = band.endDate > rowEnd ? rowEnd : band.endDate;
        const colStart = row.findIndex(d => d === clippedStart);
        const colEnd = row.findIndex(d => d === clippedEnd);
        if (colStart === -1 || colEnd === -1) continue;
        const colSpan = colEnd - colStart + 1;
        let lane = 0;
        while (segments.some(s => s.lane === lane && s.colStart < colStart + colSpan && s.colStart + s.colSpan > colStart)) lane++;
        segments.push({ band, colStart, colSpan, lane, isStart: clippedStart === band.startDate, isEnd: clippedEnd === band.endDate });
      }
      segments.sort((a, b) => a.lane - b.lane || a.colStart - b.colStart);
      return { row, segments };
    });
  }, [weeks, allBands]);

  const maxLanes = useMemo(() => Math.max(1, ...weeksWithBands.map(w => w.segments.reduce((m: number, s: any) => Math.max(m, s.lane + 1), 0))), [weeksWithBands]);
  const ROW_HEIGHT = 30 + maxLanes * 22 + 4;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#1A2D42] uppercase tracking-tight">Calendrier Unifié</h2>
          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold ${syncStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {syncStatus.msg}
              </span>
            )}
            <button onClick={handleSync} disabled={isSyncing}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 transition-all disabled:opacity-50">
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Synchronisation...' : 'Sync iCal → MongoDB'}
            </button>
          </div>
        </div>

        {/* ── Property Filter Buttons ── */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveProp('all')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 ${activeProp === 'all' ? 'bg-[#1A2D42] text-white border-[#1A2D42] shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            Tous les apparts
          </button>
          {PROPERTIES.map(p => (
            <button key={p.id} onClick={() => setActiveProp(p.id)}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 flex items-center gap-2 ${activeProp === p.id ? 'text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              style={activeProp === p.id ? { backgroundColor: p.hexColor, borderColor: p.hexColor } : { borderColor: p.hexColor + '55' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.hexColor }} />
              {p.name}
            </button>
          ))}
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 bg-white rounded-2xl border px-4 py-3 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            {PROPERTIES.map(p => (
              <div key={p.id} className="flex items-center gap-1.5">
                <span className="w-5 h-3 rounded-sm inline-block" style={{ backgroundColor: p.hexColor }} />
                {p.name}
              </div>
            ))}
            <div className="flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm inline-block bg-emerald-600" /> Arrivée</div>
            <div className="flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm inline-block bg-orange-600" /> Départ</div>
            <div className="flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm inline-block bg-slate-400" /> Indisponible</div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(90deg, #3B82F6 60%, #7C3AED)' }} />
              Résa + 🧹 intégré
            </div>
          </div>
          <div className="flex gap-3 text-[11px] font-bold">
            <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600">📅 {calendarEvents.length} événements</span>
            <span className="px-2 py-1 bg-violet-50 rounded-lg text-violet-600">🧹 {(activeProp === 'all' ? missions : missions.filter(m => m.propertyId === activeProp)).length} missions</span>
          </div>
        </div>
      </div>

      {/* ── Month navigation ── */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-[#1A2D42] capitalize">
          {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}
        </h3>
        <div className="flex items-center bg-white p-1 rounded-2xl border shadow-sm">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#1A2D42]">Aujourd'hui</button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* ── Calendar / Timeline ── */}
      {isLoading ? (
        <div className="h-[300px] bg-white rounded-[32px] border flex items-center justify-center text-slate-400">
          <RefreshCw size={28} className="animate-spin" />
        </div>
      ) : activeProp === 'all' ? (
        /* ── TIMELINE VIEW for all properties ── */
        <TimelineView
          bands={allBands}
          month={month}
          year={year}
          onSelect={b => setSelectedBand(selectedBand?.id === b.id ? null : b)}
          selected={selectedBand}
        />
      ) : (
        /* ── WEEK GRID VIEW for single property ── */
        <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 700 }}>
              <div className="grid grid-cols-7 border-b text-[10px] font-black uppercase tracking-widest text-slate-400 text-center bg-slate-50/50">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} className="py-3 border-r last:border-r-0">{d}</div>
                ))}
              </div>

              {weeksWithBands.map((weekData, wi) => (
                <div key={wi} className="relative border-b last:border-b-0" style={{ height: ROW_HEIGHT }}>
                  <div className="absolute inset-0 grid grid-cols-7">
                    {weekData.row.map((ds, ci) => {
                      const isToday = ds === today;
                      const isWE = ci >= 5;
                      return (
                        <div key={ci} className={`border-r last:border-r-0 pt-1.5 px-2 ${isToday ? 'bg-orange-50/60' : isWE ? 'bg-slate-50/70' : ''}`}>
                          {ds && (
                            <span className={`text-[11px] font-black leading-none select-none ${isToday ? 'text-orange-500' : 'text-slate-300'}`}>
                              {parseInt(ds.split('-')[2])}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {weekData.segments.map((seg: any, si: number) => {
                    const CELL_PCT = 100 / 7;
                    const BAND_H = 19;
                    const BAND_GAP = 2;
                    const TOP_OFFSET = 24;
                    const INSET = 3;
                    const left = seg.colStart * CELL_PCT;
                    const width = seg.colSpan * CELL_PCT;
                    const top = TOP_OFFSET + seg.lane * (BAND_H + BAND_GAP);
                    const isSelected = selectedBand?.id === seg.band.id;
                    const hasFused = !!seg.band.fusedMission && seg.isEnd;

                    return (
                      <div key={si}
                        onClick={() => setSelectedBand(isSelected ? null : seg.band)}
                        title={`${seg.band.label} · ${seg.band.startDate} → ${seg.band.endDate}`}
                        className="absolute cursor-pointer transition-all hover:opacity-90 hover:shadow-md"
                        style={{
                          left: `calc(${left}% + ${seg.isStart ? INSET : 0}px)`,
                          width: `calc(${width}% - ${(seg.isStart ? INSET : 0) + (seg.isEnd ? INSET : 0)}px)`,
                          top,
                          height: BAND_H,
                          borderRadius: `${seg.isStart ? 5 : 0}px ${seg.isEnd ? 5 : 0}px ${seg.isEnd ? 5 : 0}px ${seg.isStart ? 5 : 0}px`,
                          outline: isSelected ? `2px solid ${seg.band.color}` : 'none',
                          outlineOffset: 2,
                          zIndex: 10,
                          overflow: 'hidden',
                          boxShadow: isSelected ? `0 2px 8px ${seg.band.color}66` : 'none',
                          // Gradient to violet if mission fused at end
                          background: hasFused
                            ? `linear-gradient(90deg, ${seg.band.color} 70%, #7C3AED)`
                            : seg.band.color,
                        }}>
                        <div className="flex items-center justify-between h-full px-2 overflow-hidden" style={{ color: seg.band.textColor }}>
                          {seg.isStart && (
                            <span className="text-[10px] font-bold leading-none truncate whitespace-nowrap opacity-95">
                              {seg.band.label}
                            </span>
                          )}
                          {hasFused && (
                            <span className="text-[10px] leading-none flex-shrink-0 ml-1">🧹</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Panel ── */}
      {selectedBand && (
        <div className="bg-white rounded-[32px] border shadow-sm p-6">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: selectedBand.color }} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: selectedBand.color }}>
                  {PROPERTIES.find(p => p.id === selectedBand.propertyId)?.name}
                  {selectedBand.eventType && ` · ${selectedBand.eventType}`}
                </p>
                <h3 className="font-black text-[#1A2D42] text-lg">{selectedBand.label}</h3>
              </div>
            </div>
            <button onClick={() => setSelectedBand(null)} className="p-2 hover:bg-slate-100 rounded-xl flex-shrink-0"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Début</p>
              <p className="font-bold text-slate-700 capitalize text-sm">
                {new Date(selectedBand.startDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fin</p>
              <p className="font-bold text-slate-700 capitalize text-sm">
                {new Date(selectedBand.endDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {selectedBand.isMission && (() => {
            const m = selectedBand.rawData as Mission;
            const labels: Record<string, string> = { pending: '⏳ En attente', assigned: '✅ Assignée', completed: '✔ Terminée', cancelled: '❌ Annulée' };
            return (
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-bold">Statut :</span> {labels[m.status]}</p>
                {m.startTime && <p><span className="font-bold">Horaire :</span> {m.startTime} — {m.endTime}</p>}
                {m.notes && <p className="italic text-slate-400">{m.notes}</p>}
              </div>
            );
          })()}

          {!selectedBand.isMission && (() => {
            const e = selectedBand.rawData as CalendarEvent;
            return (
              <div className="space-y-3">
                {!e.isAllDay && (e.startTime || e.endTime) && (
                  <div className="flex gap-3">
                    {e.startTime && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex-1">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Arrivée</p>
                        <p className="font-bold text-slate-700 text-sm">🕐 {e.startTime}</p>
                      </div>
                    )}
                    {e.endTime && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex-1">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Départ</p>
                        <p className="font-bold text-slate-700 text-sm">🕐 {e.endTime}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedBand.fusedMission && (() => {
                  const m = selectedBand.fusedMission!;
                  const labels: Record<string, string> = { pending: '⏳ En attente', assigned: '✅ Assignée', completed: '✔ Terminée', cancelled: '❌ Annulée' };
                  return (
                    <div className="border border-violet-100 bg-violet-50/50 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="text-xl">🧹</span>
                      <div>
                        <p className="text-xs font-black text-violet-600 uppercase tracking-widest">Mission ménage incluse</p>
                        <p className="text-sm text-slate-600 font-medium">{labels[m.status]}{m.startTime ? ` · ${m.startTime}—${m.endTime}` : ''}</p>
                      </div>
                    </div>
                  );
                })()}
                {e.description && <p className="text-sm text-slate-500 italic">{e.description}</p>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const CalendarsTabView: FC<{ onSync: () => void; isSyncing: boolean }> = ({ onSync, isSyncing }) => {
  const [activeProp, setActiveProp] = useState<PropertyKey | 'all'>('all');

  const getCalendarUrl = () => {
    const baseParams = "&ctz=Europe%2FParis&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA";
    if (activeProp === 'all') {
      const srcParams = PROPERTIES.map(p => `src=${encodeURIComponent(p.calendarId)}&color=${encodeURIComponent(p.hexColor)}`).join('&');
      return `https://calendar.google.com/calendar/embed?${srcParams}${baseParams}`;
    }
    const prop = PROPERTIES.find(p => p.id === activeProp);
    if (!prop) return "";
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(prop.calendarId)}&color=${encodeURIComponent(prop.hexColor)}${baseParams}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveProp('all')} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeProp === 'all' ? 'bg-[#1A2D42] text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
            Vue d'ensemble
          </button>
          {PROPERTIES.map(p => (
            <button key={p.id} onClick={() => setActiveProp(p.id)} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeProp === p.id ? 'bg-[#1A2D42] text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
              {p.name}
            </button>
          ))}
        </div>
        <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 transition-all disabled:opacity-50">
          {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
        </button>
      </div>
      <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden h-[750px] relative">
        <iframe src={getCalendarUrl()} className="w-full h-full border-none" key={activeProp} style={{ marginBottom: '-30px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-white pointer-events-none" />
      </div>
    </div>
  );
};

const AgentCalendarView: FC<{ missions: Mission[]; currentCleaner: Cleaner; onUpdateMission: (mission: Mission) => void; }> = ({ missions, currentCleaner, onUpdateMission }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const missionsForDay = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return missions.filter(m => m.date === dayStr && (m.cleanerId === currentCleaner.id || (!m.cleanerId && currentCleaner.assignedProperties.includes(m.propertyId))));
  };

  const gridDays = useMemo(() => {
    const days = [];
    const startDay = (new Date(year, month, 1).getDay() + 6) % 7; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [month, year]);

  const missionsForMonth = useMemo(() => {
    return missions
      .filter(m => {
        const missionDate = new Date(m.date + "T00:00:00");
        return missionDate.getFullYear() === year && missionDate.getMonth() === month;
      })
      .filter(m => m.cleanerId === currentCleaner.id || (!m.cleanerId && currentCleaner.assignedProperties.includes(m.propertyId)))
      .sort((a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime());
  }, [missions, currentCleaner, month, year]);

  const groupedMissions = useMemo(() => {
    return missionsForMonth.reduce((acc, mission) => {
      const date = mission.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(mission);
      return acc;
    }, {} as Record<string, Mission[]>);
  }, [missionsForMonth]);

  return (
    <div className="bg-white rounded-[40px] border shadow-xl shadow-slate-200/50">
      <div className="p-6 md:p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-[#1A2D42] uppercase tracking-tight capitalize">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}</h2>
        <div className="flex items-center bg-white p-1 rounded-2xl border shadow-sm">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#1A2D42] transition-colors">Aujourd'hui</button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {Object.keys(groupedMissions).length > 0 ? (
          (Object.entries(groupedMissions) as [string, Mission[]][]).map(([date, dayMissions]) => (
            <div key={date} className="p-4">
              <div className="font-bold text-base mb-3 text-slate-600">
                {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
              </div>
              <div className="space-y-3">
                {dayMissions.map(m => {
                  const prop = PROPERTIES.find(p => p.id === m.propertyId);
                  const isMine = m.cleanerId === currentCleaner.id;
                  return (
                    <div key={m._id || m.id} className={`p-3 rounded-xl flex items-center gap-3 border ${isMine ? 'bg-white' : 'bg-orange-50 border-orange-200'}`}>
                      <div className={`w-2.5 h-10 rounded-lg flex-shrink-0 ${prop?.color}`} />
                      <div className="flex-grow">
                        <p className="font-black text-sm uppercase text-slate-800">{m.propertyId}</p>
                        <p className={`text-xs font-bold ${isMine ? 'text-slate-500' : 'text-orange-600'}`}>{isMine ? "Mission assignée" : "Disponible"}</p>
                      </div>
                      {!isMine && (
                        <button
                          onClick={() => onUpdateMission({ ...m, cleanerId: currentCleaner.id, status: 'assigned' })}
                          className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm whitespace-nowrap"
                        >
                          Prendre
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 font-bold">
            Aucune mission pour ce mois.
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-7 border-b text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => <div key={d} className="py-4">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 auto-rows-[160px]">
              {gridDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="bg-slate-50/30 border-r border-b" />;
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <div key={day} className={`p-2 border-r border-b relative group hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-orange-50/20' : ''}`}>
                    <span className={`text-xs font-black ${isToday ? 'bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md shadow-orange-200' : 'text-slate-400'}`}>{day}</span>
                    <div className="mt-2 space-y-2 overflow-y-auto max-h-[120px]">
                      {missionsForDay(day).map(m => {
                        const prop = PROPERTIES.find(p => p.id === m.propertyId);
                        const isMine = m.cleanerId === currentCleaner.id;
                        return (
                          <div key={m._id || m.id} className={`p-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 border ${isMine ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-orange-50 border-orange-100 text-orange-600'}`} title={`${m.propertyId} - ${m.status}`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prop?.color}`} />
                            <span className="truncate">{m.propertyId}</span>
                            {!isMine && <Zap size={12} className="text-orange-500 fill-orange-500 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MissionsTableProps {
  missions: Mission[];
  cleaners: Cleaner[];
  isAdmin: boolean;
  isAgent: boolean;
  currentCleaner?: Cleaner;
  onUpdateMission: (mission: Mission) => void;
  onEditNote: (mission: Mission) => void;
  onSync: () => void;
  isSyncing: boolean;
  onCreateMission: () => void;
  onDeleteMission: (mission: Mission) => void;
}

const MissionsTableView: FC<MissionsTableProps> = ({ missions, cleaners, isAdmin, isAgent, currentCleaner, onUpdateMission, onEditNote, onSync, isSyncing, onCreateMission, onDeleteMission }) => {
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const filteredMissions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let base = missions;
    if (isAgent && currentCleaner) {
      base = missions.filter(m => {
        const isMyMission = m.cleanerId === currentCleaner.id || (!m.cleanerId && currentCleaner.assignedProperties.includes(m.propertyId));
        if (m.status === 'completed' && new Date(m.date) < today) {
          return false;
        }
        return isMyMission;
      });
    }
    return [...base].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [missions, isAgent, currentCleaner]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">{isAdmin ? "Toutes les missions" : "Missions disponibles & assignées"}</h3>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">
                  {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} Rafraîchir
              </button>
              <button onClick={onCreateMission} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-orange-100 transition-all active:scale-95">
                <Plus size={16}/> Créer une mission
              </button>
            </>
          ) : (
             <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} {isSyncing ? "Sync..." : "Synchroniser"}
             </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-3xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4">Propriété</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Agent</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredMissions.map(m => {
              const missionId = m._id || m.id;
              const cleaner = m.cleanerId ? cleaners.find(c => c.id === m.cleanerId) : undefined;
              const isMyMission = isAgent && m.cleanerId === currentCleaner?.id;

              return (
              <tr key={missionId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PROPERTIES.find(p => p.id === m.propertyId)?.color}`} />
                    <span className="font-bold uppercase tracking-tight">{m.propertyId}</span>
                    {m.isManual && <MousePointer2 size={12} className="text-orange-500" />}
                    {m.notes && <div className="group relative"><StickyNote size={14} className="text-orange-500 cursor-help" /><div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded-lg w-48 shadow-xl z-50">{m.notes}</div></div>}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">{m.date}</td>
                <td className="px-6 py-4 relative whitespace-nowrap">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActivePicker(activePicker === missionId ? null : missionId)} className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl hover:shadow-md transition-all group">
                        {cleaner ? <><img src={cleaner.avatar} className="w-6 h-6 rounded-lg object-cover" alt="" /><span className="font-bold text-xs truncate max-w-[80px]">{cleaner.name}</span></> : <><UserPlus size={14} className="text-orange-500"/> <span className="text-orange-500 font-black text-[10px] uppercase">Assigner</span></>}
                      </button>
                      {activePicker === missionId && (
                        <div className="absolute left-6 top-full mt-2 bg-white border shadow-2xl rounded-2xl p-2 z-[60] w-64 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center px-2 py-1 mb-2 border-b"><span className="text-[10px] font-black text-slate-400 uppercase">Choisir l'agent</span><button onClick={() => setActivePicker(null)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button></div>
                          <div className="grid grid-cols-1 gap-1">
                            <button onClick={() => { onUpdateMission({...m, cleanerId: null}); setActivePicker(null); }} className="flex items-center gap-3 p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors text-left">
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><X size={16}/></div><span className="font-bold text-xs">Retirer l'agent</span>
                            </button>
                            {cleaners.filter(c => c.assignedProperties.includes(m.propertyId)).map(c => (
                              <button key={c.id} onClick={() => { onUpdateMission({...m, cleanerId: c.id}); setActivePicker(null); }} className={`flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${m.cleanerId === c.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                                <img src={c.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <span className={`font-bold text-xs ${m.cleanerId === c.id ? 'text-orange-600' : 'text-slate-700'}`}>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : <span className="font-bold text-slate-800">{cleaner?.name || "-"}</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={m.status} cleanerId={m.cleanerId} /></td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex justify-end items-center gap-1">
                    {isAdmin && m.isManual && (
                      <button onClick={() => onDeleteMission(m)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Supprimer">
                        <Trash2 size={18} />
                      </button>
                    )}
                    {(isAdmin || isMyMission) && (
                      <button onClick={() => onEditNote(m)} className="p-2 text-slate-400 hover:text-[#1A2D42] transition-colors" title="Note">
                        <MessageSquare size={18} />
                      </button>
                    )}
                    {isAgent && !m.cleanerId && currentCleaner && (
                      <button onClick={() => onUpdateMission({ ...m, cleanerId: currentCleaner.id, status: 'assigned' })} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm">
                        Prendre
                      </button>
                    )}
                    {(isAdmin || isMyMission) && (
                      <button onClick={() => onUpdateMission({ ...m, status: m.status === 'completed' ? 'assigned' : 'completed' })} className={`p-2 transition-colors ${m.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}>
                        <CheckCircle size={20} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}</tbody>
        </table>
      </div>
    </div>
  );
};

interface StaffGridViewProps { cleaners: Cleaner[]; onEdit: (cleaner: Cleaner) => void; onDelete: (cleaner: Cleaner) => void; }
const StaffGridView: FC<StaffGridViewProps> = ({ cleaners, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cleaners.map(c => (
        <div key={c._id || c.id} className="bg-white rounded-[32px] border p-6 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                  <div className="relative">
                      <img src={c.avatar} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-50 group-hover:ring-orange-100 transition-all" alt="" />
                      <div className="absolute -bottom-2 -right-2 flex items-center gap-1">
                          <button onClick={() => onEdit(c)} className="bg-white p-1.5 rounded-lg border shadow-sm text-[#1A2D42] hover:bg-slate-50"><Edit2 size={14} /></button>
                          <button onClick={() => onDelete(c)} className="bg-white p-1.5 rounded-lg border shadow-sm text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-black text-slate-900 uppercase text-sm leading-tight">{c.name}</h4>
                      <p className="text-xs text-slate-400 font-bold">{c.email}</p>
                  </div>
              </div>
          </div>
          <div className="space-y-3 pt-4 border-t">
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-2">Propriétés assignées</p>
            <div className="flex flex-wrap gap-1">
              {c.assignedProperties.map(p => <span key={p} className="bg-slate-50 border text-slate-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase">{p}</span>)}
              {c.assignedProperties.length === 0 && <span className="text-[9px] text-slate-300 italic">Aucune propriété</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface FinanceViewProps { missions: Mission[]; cleaners: Cleaner[]; }
const FinanceView: FC<FinanceViewProps> = ({ missions, cleaners }) => {
  const { monthStats, agentReports } = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const completedMissions = missions.filter(m => m.status === 'completed' && m.date >= firstDayOfMonth);
    const totalMissions = completedMissions.length;
    const laundryCost = totalMissions * LAUNDRY_COST_PER_MISSION;
    const serviceCost = completedMissions.reduce((acc, m) => {
      const cleaner = cleaners.find(c => c.id === m.cleanerId);
      return acc + (cleaner?.propertyRates[m.propertyId] || 0);
    }, 0);

    const reports = cleaners.map(c => {
      const cMissions = missions.filter(m => m.cleanerId === c.id && m.status === 'completed' && m.date >= firstDayOfMonth);
      const totalEarned = cMissions.reduce((acc, m) => acc + (c.propertyRates?.[m.propertyId] || 0), 0);
      return { ...c, totalEarned, missionCount: cMissions.length };
    });

    return {
      agentReports: reports,
      monthStats: { totalMissions, laundryCost, totalCost: serviceCost + laundryCost }
    };
  }, [missions, cleaners]);

  const handleExportCSV = () => {
    const now = new Date();
    const filename = `Bilan_Mensuel_Admin_${now.getMonth() + 1}_${now.getFullYear()}.csv`;
    let csvContent = "Agent;Missions;Blanchisserie (EUR);Net à payer (EUR)\n";
    agentReports.forEach(r => {
      const laundry = r.missionCount * LAUNDRY_COST_PER_MISSION;
      csvContent += `${r.name};${r.missionCount};-${laundry};${r.totalEarned}\n`;
    });
    csvContent += `\nTOTAL MENSUEL;${monthStats.totalMissions};-${monthStats.laundryCost};${monthStats.totalCost - monthStats.laundryCost}\n`;
    csvContent += `COÛT TOTAL PRESTATIONS (Ménages + Blanchisserie);;;${monthStats.totalCost}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1A2D42]">Bilan Financier Global</h2>
        <button onClick={handleExportCSV} className="bg-[#1A2D42] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-slate-200 text-sm">
          <Download size={18} /> Exporter le bilan (.csv)
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Ménages effectués (ce mois)" value={monthStats.totalMissions} icon={ClipboardCheck} color="text-blue-500" bg="bg-blue-50" />
        <StatCard label="Coût Blanchisserie (ce mois)" value={monthStats.laundryCost} icon={Waves} color="text-indigo-500" bg="bg-indigo-50" suffix=" €" />
        <StatCard label="Coût Total (ce mois)" value={monthStats.totalCost} icon={Euro} color="text-emerald-500" bg="bg-emerald-50" suffix=" €" />
      </div>
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50"><h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Détail des paiements par agent (Mois en cours)</h3></div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
            <tr><th className="px-6 py-4">Agent</th><th className="px-6 py-4">Missions</th><th className="px-6 py-4">Frais Blanchisserie</th><th className="px-6 py-4 text-right">Montant dû</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {agentReports.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4"><div className="flex items-center gap-3"><img src={r.avatar} className="w-8 h-8 rounded-lg" alt="" /><span className="font-bold">{r.name}</span></div></td>
                <td className="px-6 py-4">{r.missionCount}</td>
                <td className="px-6 py-4 text-slate-400 font-bold">-{r.missionCount * LAUNDRY_COST_PER_MISSION} €</td>
                <td className="px-6 py-4 text-right font-black text-emerald-600">{r.totalEarned} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AgentFinanceView: FC<{ missions: Mission[]; currentCleaner: Cleaner }> = ({ missions, currentCleaner }) => {
  const monthData = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const myMissions = missions.filter(m => m.cleanerId === currentCleaner.id && m.status === 'completed' && m.date >= firstDayOfMonth).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalEarned = myMissions.reduce((acc, m) => acc + (currentCleaner.propertyRates[m.propertyId] || 0), 0);
    return { missions: myMissions, count: myMissions.length, total: totalEarned };
  }, [missions, currentCleaner]);

  const handleExportCSV = () => {
    const now = new Date();
    const filename = `Mon_Bilan_MyToulHouse_${now.getMonth() + 1}_${now.getFullYear()}.csv`;
    let csvContent = "Date;Propriété;Montant (EUR)\n";
    monthData.missions.forEach(m => { csvContent += `${m.date};${m.propertyId.toUpperCase()};${currentCleaner.propertyRates[m.propertyId] || 0}\n`; });
    csvContent += `\nTOTAL MENSUEL;;${monthData.total}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url); link.setAttribute("download", filename);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1A2D42]">Mon Bilan du Mois</h2>
        <button onClick={handleExportCSV} className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-100 text-sm"><Download size={18} /> Télécharger mon bilan (.csv)</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label="Missions Accomplies" value={monthData.count} icon={ClipboardCheck} color="text-blue-500" bg="bg-blue-50" />
        <StatCard label="Total à percevoir" value={`${monthData.total} €`} icon={Euro} color="text-emerald-500" bg="bg-emerald-50" />
      </div>
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50"><h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Détail de mes missions (Ce mois)</h3></div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Propriété</th><th className="px-6 py-4 text-right">Tarif Prestation</th></tr></thead>
          <tbody className="divide-y text-sm">
            {monthData.missions.map(m => (
              <tr key={m._id || m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-600">{m.date}</td>
                <td className="px-6 py-4"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${PROPERTIES.find(p => p.id === m.propertyId)?.color}`} /><span className="font-bold uppercase">{m.propertyId}</span></div></td>
                <td className="px-6 py-4 text-right font-black text-emerald-600">{currentCleaner.propertyRates[m.propertyId] || 0} €</td>
              </tr>
            ))}
            {monthData.missions.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold italic">Aucune mission traitée ce mois-ci.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmailsArchiveView: FC<{onSync: () => void, isSyncing: boolean}> = ({ onSync, isSyncing }) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isActionRunning, setIsActionRunning] = useState(false);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      setEmails(Array.isArray(data) ? data : []);
    } catch (e) { 
        console.error(e);
        setEmails([]);
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadEmails(); }, []);

  const performAction = async (actionFn: () => Promise<any>, reload = true) => {
    if (isActionRunning) return;
    setIsActionRunning(true);
    setActionStatus(null);
    try {
      const response = await actionFn();
      const resData = await response.json();
      if (response.ok) {
        setActionStatus({ type: 'success', message: resData.message });
      } else {
        setActionStatus({ type: 'error', message: resData.error || 'Une erreur est survenue.' });
      }
    } catch (error) {
      setActionStatus({ type: 'error', message: 'Impossible de joindre l\'API.' });
    }
    if (reload) await loadEmails();
    setIsActionRunning(false);
  };

  const handleSyncAndRefresh = async () => {
      await performAction(async () => {
          const response = await fetch('/api/daily-cron?schedule=true');
          return response;
      });
  }

  const handlePurge = () => {
    if (confirm("Voulez-vous vraiment purger les anciens emails?")) {
      performAction(() => fetch('/api/emails?action=cleanup', { method: 'POST' }));
    }
  };
  
  const handleTestEmail = () => performAction(() => fetch('/api/emails?action=test', { method: 'POST' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-[#1A2D42]">Zone Technique & Emails</h2>
        <div className="flex flex-wrap items-center gap-3">
           <button onClick={handleSyncAndRefresh} disabled={isActionRunning} className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm disabled:opacity-50"><RefreshCw className={`size-4 ${isSyncing || isActionRunning ? 'animate-spin':''}`} /> Màj & Notifs</button>
           <button onClick={handleTestEmail} disabled={isActionRunning} className="bg-slate-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm disabled:opacity-50"><MailQuestion className={`size-4 ${isActionRunning ? 'animate-spin':''}`} /> Test Mail</button>
           <button onClick={handlePurge} disabled={isActionRunning} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm disabled:opacity-50"><Trash2 className={`size-4 ${isActionRunning ? 'animate-spin':''}`} /> Purger</button>
        </div>
      </div>
      {actionStatus && <div className={`p-4 rounded-2xl border font-bold text-sm ${actionStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{actionStatus.message}</div>}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50"><h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Emails Récemment Archivés</h3></div>
        {loading ? <div className="p-12 text-center text-slate-400">Chargement...</div> : (
          emails && emails.length > 0 ? (
            <table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Destinataire</th><th className="px-6 py-4">Mission</th><th className="px-6 py-4">Sujet</th></tr></thead>
            <tbody className="divide-y">{emails.map(e => <tr key={e._id} className="text-xs hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">{new Date(e.sentAt).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 font-medium">{e.to}</td>
                <td className="px-6 py-4 uppercase font-bold text-slate-400">{e.propertyId}</td>
                <td className="px-6 py-4 truncate max-w-xs text-slate-600">{e.subject}</td>
            </tr>)}</tbody></table>
          ) : (
            <div className="p-12 text-center text-slate-400">Aucun email archivé à afficher.</div>
          )
        )}
      </div>
    </div>
  );
};

const StatusBadge: FC<{ status: Mission['status']; cleanerId?: string | null }> = ({ status, cleanerId }) => {
  if (status === 'completed') return <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg">Traité</span>;
  if (!cleanerId) return <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 px-2 py-1 rounded-lg">Libre</span>;
  return <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">Assigné</span>;
};

export default App;
