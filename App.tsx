
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  ClipboardCheck, 
  Plus, 
  Clock, 
  Menu,
  X,
  LogOut,
  Lock,
  Mail,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  StickyNote,
  Zap,
  MousePointer2,
  BarChart3,
  UserSearch,
  Eye,
  Trash,
  BellRing,
  CheckCircle,
  Send,
  Euro,
  MapPin,
  Phone,
  MessageSquare,
  UserPlus,
  Save,
  Waves,
  Download,
  Camera,
  Image as ImageIcon,
  UserCheck,
  FileText,
  Trash2
} from 'lucide-react';
import { PROPERTIES, INITIAL_CLEANERS } from './constants.ts';
import { Property, Cleaner, Mission, PropertyKey } from './types.ts';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const ADMIN_PASSWORD = "bWInnRDFbs2R7XnfEv3g";
const LAUNDRY_COST_PER_MISSION = 14;

type AppTab = 'dashboard' | 'calendar' | 'missions' | 'staff' | 'finance' | 'agent-calendar' | 'emails' | 'agent-finance';

const LogoComponent: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
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

const Login: React.FC<{ onLogin: (user: 'admin' | Cleaner) => void, cleaners: Cleaner[] }> = ({ onLogin, cleaners }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      onLogin('admin');
      return;
    }
    const agent = cleaners.find(c => c.email === email && c.password === password);
    if (agent) {
      onLogin(agent);
    } else {
      setError('Identifiants incorrects. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
          <div className="flex flex-col items-center mb-10">
            <LogoComponent />
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Identifiant Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-400 transition-all outline-none"
                  placeholder="exemple@gmail.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-400 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <button type="submit" className="w-full bg-[#1A2D42] text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] mt-4 tracking-widest uppercase text-sm">Se connecter</button>
          </form>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<'admin' | Cleaner | null>(() => {
    const saved = localStorage.getItem('zenclean_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const savedUser = localStorage.getItem('zenclean_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      return user === 'admin' ? 'dashboard' : 'missions';
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingMission, setIsCreatingMission] = useState(false);
  const [editingNoteMission, setEditingNoteMission] = useState<Mission | null>(null);
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null | 'new'>(null);

  const isAdmin = currentUser === 'admin';

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [cleanersRes, missionsRes] = await Promise.all([
        fetch('/api/cleaners').then(res => res.json()),
        fetch('/api/missions').then(res => res.json())
      ]);
      setCleaners(cleanersRes.length > 0 ? cleanersRes : INITIAL_CLEANERS);
      setMissions(missionsRes);
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

  const handleSaveCleaner = async (cleaner: Cleaner) => {
    setCleaners(prev => {
      const exists = prev.find(c => c.id === cleaner.id);
      if (exists) {
        return prev.map(c => c.id === cleaner.id ? cleaner : c);
      }
      return [...prev, cleaner];
    });

    try {
      await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaner)
      });
      setEditingCleaner(null);
    } catch (e) {
      console.error("Failed to save cleaner:", e);
    }
  };

 const handleUpdateMission = async (mission: Mission) => {
    const missionIdKey = mission._id ? '_id' : 'id';
    const missionId = mission[missionIdKey];

    const prevMission = missions.find(m => (m._id || m.id) === missionId);

    if (mission.cleanerId && mission.status === 'pending') {
      mission.status = 'assigned';
    } else if (!mission.cleanerId && mission.status === 'assigned') {
      mission.status = 'pending';
    }

    setMissions(prev => prev.map(m => ((m._id || m.id) === missionId ? mission : m)));
    
    try {
      await fetch('/api/missions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mission)
      });
      
      if (mission.cleanerId && (!prevMission || prevMission.cleanerId !== mission.cleanerId)) {
        const cleaner = cleaners.find(c => c.id === mission.cleanerId);
        if (cleaner?.email) {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: cleaner.email,
              subject: `[Mission Assignée] ${mission.propertyId.toUpperCase()}`,
              dedupKey: `assign-${missionId}-${cleaner.id}`,
              html: `<p>Bonjour ${cleaner.name}, la mission du ${mission.date} vous a été assignée.</p>`
            })
          });
        }
      }
    } catch (e) { console.error(e); }
  };
  
  const handleCreateMission = async (missionData: Partial<Mission>) => {
    const newMission = {
      isManual: true,
      status: 'pending',
      ...missionData,
    } as Mission;
    
    try {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });
      
      if(response.ok) {
        const createdMission = await response.json();
        setMissions(prev => [...prev, createdMission as Mission]);
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
        alert(data.error || 'Impossible de supprimer la mission.')
      }
    } catch (e) {
      console.error("Error deleting mission:", e);
      alert('Une erreur est survenue.')
    }
  };

  const handleLogin = (user: 'admin' | Cleaner) => {
    setCurrentUser(user);
    localStorage.setItem('zenclean_user', JSON.stringify(user));
    setActiveTab(user === 'admin' ? 'dashboard' : 'missions');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-orange-500" size={48} /></div>;
  if (!currentUser) return <Login onLogin={handleLogin} cleaners={cleaners} />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10"><LogoComponent size="sm" /><h1 className="text-lg font-black text-[#1A2D42] uppercase">My Toul'House</h1></div>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {isAdmin && <SidebarItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {isAdmin && <SidebarItem id="calendar" icon={CalendarIcon} label="Calendriers" activeTab={activeTab} setActiveTab={setActiveTab} />}
            {!isAdmin && <SidebarItem id="agent-calendar" icon={CalendarIcon} label="Mon Calendrier" activeTab={activeTab} setActiveTab={setActiveTab} />}
            <SidebarItem id="missions" icon={ClipboardCheck} label="Missions" activeTab={activeTab} setActiveTab={setActiveTab} />
            {!isAdmin && <SidebarItem id="agent-finance" icon={FileText} label="Mon Bilan" activeTab={activeTab} setActiveTab={setActiveTab} />}
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

      <main className={`flex-1 transition-all ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-slate-900">{isAdmin ? "Administrateur" : (currentUser as Cleaner).name}</p>
               <p className="text-[10px] text-slate-400">En ligne</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-slate-400"><Users size={18} /></div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView missions={missions} cleaners={cleaners} onUpdateMission={handleUpdateMission} />}
          {activeTab === 'calendar' && <CalendarsTabView onSync={handleManualSync} isSyncing={isSyncing} />}
          {activeTab === 'agent-calendar' && <AgentCalendarView missions={missions} currentCleaner={currentUser as Cleaner} />}
          {activeTab === 'missions' && (
            <MissionsTableView 
              missions={missions} 
              cleaners={cleaners} 
              isAdmin={isAdmin} 
              currentCleaner={isAdmin ? null : currentUser as Cleaner} 
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
                  <UserPlus size={18} />
                  Nouvel Agent
                </button>
              </div>
              <StaffGridView cleaners={cleaners} onEdit={setEditingCleaner} />
            </div>
          )}
          {activeTab === 'finance' && <FinanceView missions={missions} cleaners={cleaners} />}
          {activeTab === 'agent-finance' && <AgentFinanceView missions={missions} currentCleaner={currentUser as Cleaner} />}
          {activeTab === 'emails' && <EmailsArchiveView onDataRefresh={loadInitialData}/>}
        </div>
      </main>

      {isCreatingMission && (
        <MissionCreatorModal 
          onClose={() => setIsCreatingMission(false)} 
          onSave={handleCreateMission} 
        />
      )}

      {editingNoteMission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <h3 className="font-black text-[#1A2D42] uppercase text-sm tracking-widest">Note de mission - {editingNoteMission.propertyId}</h3>
              <button onClick={() => setEditingNoteMission(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <div className="p-8">
              <textarea 
                className="w-full h-40 bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-medium text-slate-700"
                placeholder="Ajouter des instructions particulières ici..."
                defaultValue={editingNoteMission.notes || ""}
                id="mission-note-input"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingNoteMission(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
                <button 
                  onClick={() => {
                    const note = (document.getElementById('mission-note-input') as HTMLTextAreaElement).value;
                    handleUpdateMission({...editingNoteMission, notes: note});
                    setEditingNoteMission(null);
                  }} 
                  className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCleaner && (
        <CleanerModal 
          cleaner={editingCleaner === 'new' ? null : editingCleaner} 
          onClose={() => setEditingCleaner(null)} 
          onSave={handleSaveCleaner}
        />
      )}
    </div>
  );
};

/* --- SOUS-COMPOSANTS DE VUES --- */

const SidebarItem = ({ id, icon: Icon, label, activeTab, setActiveTab }: any) => (
  <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-[#1A2D42] text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
    <Icon size={20} /> <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

const CleanerModal = ({ cleaner, onClose, onSave }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Cleaner>>(
    cleaner || {
      id: `c${Date.now()}`,
      name: '',
      email: '',
      password: '',
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
      assignedProperties: [],
      propertyRates: PROPERTIES.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {})
    }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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
              <img src={formData.avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-100 group-hover:ring-orange-200 transition-all shadow-lg" alt="" />
              <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliquez pour changer l'avatar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nom Complet</label>
              <input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold"
                placeholder="Ex: Maria Dupont"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Email</label>
              <input 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold"
                placeholder="maria@exemple.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Mot de passe</label>
              <input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold"
                placeholder="••••••••"
              />
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
                      <input 
                        type="checkbox" 
                        checked={isAssigned}
                        onChange={e => {
                          const props = e.target.checked 
                            ? [...(formData.assignedProperties || []), p.id]
                            : (formData.assignedProperties || []).filter(id => id !== p.id);
                          setFormData({...formData, assignedProperties: props});
                        }}
                        className="w-5 h-5 rounded-md accent-orange-500"
                      />
                      <span className="font-black text-xs uppercase tracking-tight">{p.name}</span>
                    </div>
                    {isAssigned && (
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="number"
                          value={formData.propertyRates?.[p.id] || 0}
                          onChange={e => setFormData({
                            ...formData, 
                            propertyRates: { ...formData.propertyRates, [p.id]: parseFloat(e.target.value) }
                          })}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-400 outline-none font-bold text-sm"
                          placeholder="Tarif"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
            <button 
              onClick={() => onSave(formData)} 
              className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MissionCreatorModal = ({ onClose, onSave }: any) => {
  const [propertyId, setPropertyId] = useState<PropertyKey | ''>(PROPERTIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    if (propertyId && date) {
      onSave({ propertyId, date });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b flex items-center justify-between">
          <h3 className="font-black text-[#1A2D42] uppercase text-sm tracking-widest">Créer une mission manuelle</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Propriété</label>
            <select 
              value={propertyId} 
              onChange={e => setPropertyId(e.target.value as PropertyKey)}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold"
            >
              {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Date</label>
            <input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-400 outline-none font-bold"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSave} className="bg-[#1A2D42] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
              <Plus size={18} />
              Créer la mission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DashboardView = ({ missions, cleaners, onUpdateMission }: any) => {
  const { priorityMissions, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    const filtered = missions.filter((m: any) => {
      const isUnassigned = m.status === 'pending';
      const isWithin7Days = m.date >= todayStr && m.date <= sevenDaysLaterStr && m.status !== 'completed';
      return isUnassigned || isWithin7Days;
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      priorityMissions: filtered,
      stats: {
        pending: missions.filter((m: any) => m.status === 'pending').length,
        today: missions.filter((m: any) => m.date === todayStr).length,
        completed: missions.filter((m: any) => m.status === 'completed').length,
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
          {priorityMissions.length > 0 ? priorityMissions.map((m: any) => (
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
                <button onClick={() => onUpdateMission({...m, status: m.status === 'completed' ? 'assigned' : 'completed'})} className={`p-2 transition-colors ${m.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}><CheckCircle size={20} /></button>
              </div>
            </div>
          )) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-bold text-slate-400">Aucune mission prioritaire à afficher.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg, suffix = "" }: any) => (
  <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center gap-5">
    <div className={`${bg} ${color} p-4 rounded-2xl`}><Icon size={24} /></div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}{suffix}</p>
    </div>
  </div>
);

const CalendarsTabView = ({ onSync, isSyncing }: { onSync: () => void, isSyncing: boolean }) => {
  const [activeProp, setActiveProp] = useState<PropertyKey | 'all'>('all');

  const getCalendarUrl = () => {
    const baseParams = "&ctz=Europe%2FParis&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0";
    if (activeProp === 'all') {
      const srcParams = PROPERTIES.map(p => `src=${encodeURIComponent(p.calendarId)}&color=${encodeURIComponent(p.hexColor)}`).join('&');
      return `https://calendar.google.com/calendar/embed?${srcParams}${baseParams}`;
    }
    const prop = PROPERTIES.find(p => p.id === activeProp);
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(prop?.calendarId || '')}&color=${encodeURIComponent(prop?.hexColor || '')}${baseParams}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveProp('all')} 
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeProp === 'all' ? 'bg-[#1A2D42] text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}
          >
            Vue d'ensemble
          </button>
          {PROPERTIES.map(p => (
            <button 
              key={p.id} 
              onClick={() => setActiveProp(p.id)} 
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeProp === p.id ? 'bg-[#1A2D42] text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onSync} 
          disabled={isSyncing}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
        >
          {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
        </button>
      </div>

      <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden h-[750px] relative">
        <iframe 
          src={getCalendarUrl()} 
          className="w-full h-full border-none" 
          key={activeProp}
          style={{ marginBottom: '-30px' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-white pointer-events-none" />
      </div>
    </div>
  );
};

const AgentCalendarView = ({ missions, currentCleaner }: { missions: Mission[], currentCleaner: Cleaner }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);

  const missionsForDay = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return missions.filter(m => 
      m.date === dayStr && 
      (m.cleanerId === currentCleaner.id || (!m.cleanerId && currentCleaner.assignedProperties.includes(m.propertyId)))
    );
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const gridDays = [];
  const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Lundi = 0
  for (let i = 0; i < startDay; i++) gridDays.push(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) gridDays.push(d);

  return (
    <div className="bg-white rounded-[40px] border shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-[#1A2D42] uppercase tracking-tight capitalize">{monthName}</h2>
        <div className="flex items-center bg-white p-1 rounded-2xl border shadow-sm">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={handleToday} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#1A2D42] transition-colors">Aujourd'hui</button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b text-[10px] font-black uppercase tracking-widest text-slate-400 text-center py-4">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 auto-rows-[120px]">
        {gridDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="bg-slate-50/30 border-r border-b" />;
          const dayMissions = missionsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div key={day} className={`p-2 border-r border-b relative group hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-orange-50/20' : ''}`}>
              <span className={`text-xs font-black ${isToday ? 'bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md shadow-orange-200' : 'text-slate-400'}`}>
                {day}
              </span>
              <div className="mt-2 space-y-1">
                {dayMissions.map(m => {
                  const prop = PROPERTIES.find(p => p.id === m.propertyId);
                  const isMine = m.cleanerId === currentCleaner.id;
                  return (
                    <div 
                      key={m._id || m.id} 
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase truncate flex items-center gap-1.5 border ${isMine ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-orange-50 border-orange-100 text-orange-600'}`}
                      title={`${m.propertyId} - ${m.status}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${prop?.color}`} />
                      <span className="truncate">{m.propertyId}</span>
                      {!isMine && <Zap size={8} className="text-orange-500 fill-orange-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MissionsTableView = ({ missions, cleaners, isAdmin, currentCleaner, onUpdateMission, onEditNote, onSync, isSyncing, onCreateMission, onDeleteMission }: any) => {
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const filteredMissions = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    let base = isAdmin ? missions : missions.filter((m: any) => {
      const isMyMission = m.cleanerId === currentCleaner?.id || (!m.cleanerId && currentCleaner?.assignedProperties.includes(m.propertyId));
      
      if (!isAdmin && m.status === 'completed' && new Date(m.date) < today) {
        return false;
      }

      return isMyMission;
    });

    return [...base].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [missions, isAdmin, currentCleaner]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">{isAdmin ? "Toutes les missions" : "Missions disponibles & assignées"}</h3>
        
        <div className="flex items-center gap-2">
          {!isAdmin ? (
             <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
               {isSyncing ? "Sync..." : "Synchroniser les missions"}
             </button>
          ) : (
            <button onClick={onCreateMission} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-orange-100 transition-all active:scale-95">
              <Plus size={16}/>
              Créer une mission
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border shadow-sm overflow-visible">
        <table className="w-full text-left">
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
            {filteredMissions.map((m: any) => (
              <tr key={m._id || m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PROPERTIES.find(p => p.id === m.propertyId)?.color}`} />
                    <span className="font-bold uppercase tracking-tight">{m.propertyId}</span>
                    {m.isManual && <MousePointer2 size={12} className="text-orange-500" />}
                    {m.notes && (
                      <div className="group relative">
                        <StickyNote size={14} className="text-orange-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded-lg w-48 shadow-xl z-50">
                          {m.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600">{m.date}</td>
                <td className="px-6 py-4 relative">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      {m.cleanerId ? (
                        <button 
                          onClick={() => setActivePicker(activePicker === (m._id || m.id) ? null : (m._id || m.id))}
                          className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl hover:shadow-md transition-all group"
                        >
                          <img src={cleaners.find((c: any) => c.id === m.cleanerId)?.avatar} className="w-6 h-6 rounded-lg object-cover" alt="" />
                          <span className="font-bold text-xs truncate max-w-[80px]">{cleaners.find((c: any) => c.id === m.cleanerId)?.name}</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => setActivePicker(activePicker === (m._id || m.id) ? null : (m._id || m.id))}
                          className="flex items-center gap-2 text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-all font-black text-[10px] uppercase"
                        >
                          <UserPlus size={14} />
                          Assigner
                        </button>
                      )}
                      {activePicker === (m._id || m.id) && (
                        <div className="absolute left-6 top-full mt-2 bg-white border shadow-2xl rounded-2xl p-2 z-[60] w-64 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center px-2 py-1 mb-2 border-b">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Choisir l'agent</span>
                            <button onClick={() => setActivePicker(null)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            <button 
                              onClick={() => { onUpdateMission({...m, cleanerId: ""}); setActivePicker(null); }}
                              className="flex items-center gap-3 p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><X size={16}/></div>
                              <span className="font-bold text-xs">Retirer l'agent</span>
                            </button>
                            {cleaners.filter((c:any) => c.assignedProperties.includes(m.propertyId)).map((c: any) => (
                              <button 
                                key={c.id} 
                                onClick={() => { onUpdateMission({...m, cleanerId: c.id}); setActivePicker(null); }}
                                className={`flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${m.cleanerId === c.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                              >
                                <img src={c.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <span className={`font-bold text-xs ${m.cleanerId === c.id ? 'text-orange-600' : 'text-slate-700'}`}>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-slate-800">{cleaners.find((c: any) => c.id === m.cleanerId)?.name || "-"}</span>
                  )}
                </td>
                <td className="px-6 py-4"><StatusBadge status={m.status} cleanerId={m.cleanerId} /></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-1">
                    {isAdmin && m.isManual && (
                        <button onClick={() => onDeleteMission(m)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Supprimer la mission">
                            <Trash2 size={18} />
                        </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onEditNote(m)} className="p-2 text-slate-400 hover:text-[#1A2D42] transition-colors" title="Ajouter une note">
                        <MessageSquare size={18} />
                      </button>
                    )}
                    {!m.cleanerId && !isAdmin && (
                      <button onClick={() => onUpdateMission({...m, cleanerId: currentCleaner.id, status: 'assigned'})} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all">Prendre</button>
                    )}
                    {(m.cleanerId === currentCleaner?.id || isAdmin) && (
                      <button onClick={() => onUpdateMission({...m, status: m.status === 'completed' ? 'assigned' : 'completed'})} className={`p-2 transition-colors ${m.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}><CheckCircle size={20} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StaffGridView = ({ cleaners, onEdit }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cleaners.map((c: any) => (
        <div key={c.id} className="bg-white rounded-[32px] border p-6 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={c.avatar} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-50 group-hover:ring-orange-100 transition-all" alt="" />
                <button 
                  onClick={() => onEdit(c)}
                  className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-lg border shadow-sm text-[#1A2D42] hover:bg-slate-50 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
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
              {c.assignedProperties.map((p: any) => (
                <span key={p} className="bg-slate-50 border text-slate-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase">{p}</span>
              ))}
              {c.assignedProperties.length === 0 && <span className="text-[9px] text-slate-300 italic">Aucune propriété</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const FinanceView = ({ missions, cleaners }: any) => {
  const monthStats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const completedMissions = missions.filter((m: any) => 
      m.status === 'completed' && m.date >= firstDayOfMonth
    );

    const totalMissions = completedMissions.length;
    const laundryCost = totalMissions * LAUNDRY_COST_PER_MISSION;
    
    const serviceCost = completedMissions.reduce((acc: number, m: any) => {
      const cleaner = cleaners.find((c: any) => c.id === m.cleanerId);
      return acc + (cleaner?.propertyRates[m.propertyId] || 0);
    }, 0);

    return {
      firstDayOfMonth,
      totalMissions,
      laundryCost,
      totalCost: serviceCost + laundryCost
    };
  }, [missions, cleaners]);

  const agentReports = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return cleaners.map((c: any) => {
      const cMissions = missions.filter((m: any) => 
        m.cleanerId === c.id && 
        m.status === 'completed' &&
        m.date >= firstDayOfMonth
      );
      const totalEarned = cMissions.reduce((acc: number, m: any) => acc + (c.propertyRates[m.propertyId] || 0), 0);
      return { ...c, totalEarned, missionCount: cMissions.length };
    });
  }, [missions, cleaners]);

  const handleExportCSV = () => {
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}_${now.getFullYear()}`;
    const filename = `Bilan_Mensuel_Admin_${monthYear}.csv`;

    let csvContent = "Agent;Missions;Blanchisserie (EUR);Net à payer (EUR)\n";
    
    agentReports.forEach((r: any) => {
      const laundry = r.missionCount * LAUNDRY_COST_PER_MISSION;
      csvContent += `${r.name};${r.missionCount};-${laundry};${r.totalEarned}\n`;
    });

    csvContent += `\nTOTAL MENSUEL;${monthStats.totalMissions};-${monthStats.laundryCost};${monthStats.totalCost - monthStats.laundryCost}\n`;
    csvContent += `COÛT TOTAL PRESTATIONS (Ménages + Blanchisserie);;;${monthStats.totalCost}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1A2D42]">Bilan Financier Global</h2>
        <button 
          onClick={handleExportCSV}
          className="bg-[#1A2D42] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-slate-200 transition-all active:scale-95 text-sm"
        >
          <Download size={18} />
          Exporter le bilan (.csv)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Ménages effectués (ce mois)" 
          value={monthStats.totalMissions} 
          icon={ClipboardCheck} 
          color="text-blue-500" 
          bg="bg-blue-50" 
        />
        <StatCard 
          label="Coût Blanchisserie (ce mois)" 
          value={monthStats.laundryCost} 
          icon={Waves} 
          color="text-indigo-500" 
          bg="bg-indigo-50" 
          suffix=" €"
        />
        <StatCard 
          label="Coût Total (ce mois)" 
          value={monthStats.totalCost} 
          icon={Euro} 
          color="text-emerald-500" 
          bg="bg-emerald-50" 
          suffix=" €"
        />
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50">
          <h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Détail des paiements par agent (Mois en cours)</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
            <tr><th className="px-6 py-4">Agent</th><th className="px-6 py-4">Missions</th><th className="px-6 py-4">Frais Blanchisserie</th><th className="px-6 py-4 text-right">Montant dû</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {agentReports.map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                     <img src={r.avatar} className="w-8 h-8 rounded-lg" alt="" />
                     <span className="font-bold">{r.name}</span>
                  </div>
                </td>
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

const AgentFinanceView = ({ missions, currentCleaner }: { missions: Mission[], currentCleaner: Cleaner }) => {
  const monthData = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const myMissions = missions.filter(m => 
      m.cleanerId === currentCleaner.id && 
      m.status === 'completed' && 
      m.date >= firstDayOfMonth
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalEarned = myMissions.reduce((acc, m) => acc + (currentCleaner.propertyRates[m.propertyId] || 0), 0);

    return {
      missions: myMissions,
      count: myMissions.length,
      total: totalEarned
    };
  }, [missions, currentCleaner]);

  const handleExportCSV = () => {
    const now = new Date();
    const filename = `Mon_Bilan_MyToulHouse_${now.getMonth() + 1}_${now.getFullYear()}.csv`;

    let csvContent = "Date;Propriété;Montant (EUR)\n";
    monthData.missions.forEach(m => {
      csvContent += `${m.date};${m.propertyId.toUpperCase()};${currentCleaner.propertyRates[m.propertyId] || 0}\n`;
    });
    csvContent += `\nTOTAL MENSUEL;;${monthData.total}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1A2D42]">Mon Bilan du Mois</h2>
        <button 
          onClick={handleExportCSV}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95 text-sm"
        >
          <Download size={18} />
          Télécharger mon bilan (.csv)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center gap-5">
          <div className="bg-blue-50 text-blue-500 p-4 rounded-2xl"><ClipboardCheck size={24} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Missions Accomplies</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{monthData.count}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center gap-5">
          <div className="bg-emerald-50 text-emerald-500 p-4 rounded-2xl"><Euro size={24} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total à percevoir</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{monthData.total} €</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50">
          <h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Détail de mes missions (Ce mois)</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Propriété</th>
              <th className="px-6 py-4 text-right">Tarif Prestation</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {monthData.missions.map((m: any) => (
              <tr key={m._id || m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-600">{m.date}</td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${PROPERTIES.find(p => p.id === m.propertyId)?.color}`} />
                     <span className="font-bold uppercase">{m.propertyId}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right font-black text-emerald-600">{currentCleaner.propertyRates[m.propertyId] || 0} €</td>
              </tr>
            ))}
            {monthData.missions.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold italic">Aucune mission traitée ce mois-ci.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmailsArchiveView: React.FC<{onDataRefresh: () => void}> = ({ onDataRefresh }) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const loadEmails = () => fetch('/api/emails').then(r => r.json()).then(setEmails);
  useEffect(() => { loadEmails(); }, []);

  const handleTestMailjet = async () => {
    setIsTesting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ADMIN_EMAIL,
          subject: "[TEST] API Mailjet My Toul'House",
          html: `<h2>Connexion API OK</h2><p>Test envoyé le ${new Date().toLocaleString()}</p>`,
          dedupKey: `test-${Date.now()}`
        })
      });
      const resData = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Email de test envoyé avec succès !' });
        loadEmails();
      } else {
        setStatus({ type: 'error', message: resData.error || 'Erreur API lors de l\'envoi du test.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Impossible de joindre l\'API. Vérifiez la config.' });
    } finally { setIsTesting(false); }
  };

  const handleMigration = async () => {
    if (!confirm("Êtes-vous sûr de vouloir nettoyer les notes de toutes les missions existantes ? Cette action est irréversible.")) return;
    
    setIsMigrating(true);
    setStatus(null);
    try {
      const response = await fetch('/api/migrate-notes', { method: 'POST' });
      const resData = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: resData.message || 'Migration réussie !' });
        onDataRefresh(); // Re-fetch all data
      } else {
        setStatus({ type: 'error', message: resData.error || 'Erreur durant la migration.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Impossible de joindre l\'API de migration.' });
    } finally { setIsMigrating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1A2D42]">Zone Technique</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleMigration} disabled={isMigrating} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm">{isMigrating ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />} Purger les anciennes notes</button>
          <button onClick={handleTestMailjet} disabled={isTesting} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm">{isTesting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} Tester Mailjet</button>
        </div>
      </div>
      {status && <div className={`p-4 rounded-2xl border font-bold text-sm ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{status.message}</div>}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50"><h3 className="font-black text-[#1A2D42] uppercase text-xs tracking-widest">Emails Récemment Archivés</h3></div>
        <table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">À</th><th className="px-6 py-4">Sujet</th></tr></thead>
        <tbody className="divide-y">{emails.map((e:any) => <tr key={e._id} className="text-xs hover:bg-slate-50 transition-colors"><td className="px-6 py-4 whitespace-nowrap">{new Date(e.sentAt).toLocaleString()}</td><td className="px-6 py-4">{e.to}</td><td className="px-6 py-4 truncate max-w-xs">{e.subject}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Mission['status']; cleanerId?: string }> = ({ status, cleanerId }) => {
  if (status === 'completed') return <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg">Traité</span>;
  if (!cleanerId) return <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 px-2 py-1 rounded-lg">Libre</span>;
  return <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">Assigné</span>;
};

export default App;
