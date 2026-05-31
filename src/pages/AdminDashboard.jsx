import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, limit, getDocs, startAfter, orderBy, where, getCountFromServer, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { BRANDING, PUROKS, CIVIL_STATUSES, GENDERS, EDU_OPTIONS, DOC_TYPES } from '../config/constants';
import { 
  FormInput, FormSelect, InitialsAvatar, StatusBadge, handleImageResize, 
  IconMale, IconFemale, IconAdult, IconMinor, IconSenior, ProgressBar 
} from '../components/ui/Components';
import { useFirestorePagination } from '../hooks/useFirestorePagination';
import { useOnDemandCollection } from '../hooks/useOnDemandCollection';
import AboutPage from './AboutPage';
import {
  Users, FileText, CheckCircle, Home, Shield, PlusCircle, Activity,
  AlertCircle, Menu, X, Loader2, MapPin, Building2, LayoutDashboard,
  Heart, Accessibility, Pencil, Calendar, Trash2, Search,
  ChevronDown, ChevronUp, FileCheck, BarChart2, Camera, LogOut, Info, Clock, Ban, UserCheck, UserPlus
} from 'lucide-react';

// ─── LOCAL UI COMPONENTS ──────────────────────────────────────────────────────
function SidebarItem({ icon: Icon, label, badge, isActive, onClick }) {
  return (
    <div className="px-3 mb-1">
      <button onClick={onClick} className={`w-full flex items-center h-11 text-sm font-semibold transition-all duration-200 cursor-pointer overflow-hidden rounded-xl ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
        <div className="flex items-center justify-center w-[56px] flex-shrink-0"><Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300 transition-colors'}`} /></div>
        <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200 text-left flex-1">{label}</span>
        {badge !== undefined && (<span className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 mr-3 text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-blue-400 text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>)}
      </button>
    </div>
  );
}

function ModernStatCard({ title, value, subtext, icon: Icon, color, borderTop }) {
  return (
    <div className={`bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-xl shadow-sm border border-slate-100 border-t-4 ${borderTop} flex flex-col hover:shadow-md transition-all cursor-pointer hover:-translate-y-1`}>
      <Icon className={`w-5 h-5 md:w-6 md:h-6 mb-2 md:mb-3 ${color}`} />
      <p className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-1 leading-none">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1 md:mt-2 font-medium">{subtext}</p>}
    </div>
  );
}

function PaginationBar({ page, hasNext, hasPrev, fetchNext, fetchPrev, loading, totalCount, pageSize }) {
  const start = (page - 1) * pageSize + 1;
  const end = start + pageSize - 1;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs font-medium text-slate-400">
        {totalCount != null ? `Showing ${start}–${Math.min(end, totalCount)} of ${totalCount}` : `Page ${page}`}
      </p>
      <div className="flex items-center gap-2">
        <button onClick={fetchPrev} disabled={!hasPrev || loading} className="cursor-pointer px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
        <span className="text-xs font-extrabold text-slate-700 px-2">{page}</span>
        <button onClick={fetchNext} disabled={!hasNext || loading} className="cursor-pointer px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
      </div>
    </div>
  );
}

// Helper to rank barangay officials by position
const getPositionRank = (position) => {
  const pos = (position || '').toLowerCase();
  
  if (pos.includes('captain') || pos.includes('punong')) return 1;
  if (pos.includes('secretary')) return 2;
  if (pos.includes('treasurer')) return 3;
  if ((pos.includes('sb ') || pos.includes('kagawad')) && !pos.includes('sk')) return 4;
  
  // SK gets the highest numbers so they sink to the bottom
  if (pos.includes('sk chair')) return 6;
  if (pos.includes('sk kagawad') || pos.includes('sk member')) return 7;
  
  // Any other roles (like Tanods, Clerks, etc.) will go above the SK
  return 5; 
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onLogout = () => signOut(auth);

  // Modals & Forms
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqStatus, setReqStatus] = useState('Pending');
  const [adminNote, setAdminNote] = useState('');

  const [resSearch, setResSearch] = useState('');
  const [resGenderFilter, setResGenderFilter] = useState('All Genders');
  const [resPurokFilter, setResPurokFilter] = useState('All Puroks');
  const [resStatusFilter, setResStatusFilter] = useState('All Status');
  const [resTagFilter, setResTagFilter] = useState('All Tags');
  
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resModalMode, setResModalMode] = useState('add');
  const [selectedResId, setSelectedResId] = useState(null);
  const [resForm, setResForm] = useState({
    email: '', password: '', firstName: '', middleName: '', lastName: '', age: '', gender: 'Male',
    dateOfBirth: '', placeOfBirth: '', nationality: 'Filipino', religion: 'Roman Catholic',
    address: `Purok ${PUROKS[0]}`, homeAddress: '', householdId: '', isHouseholdHead: 'false',
    contactNumber: '', occupation: '', educationalAttainment: '', isVoter: 'false', isPwd: 'false',
    is4ps: 'false', accountStatus: 'Active', civilStatus: 'Single',
  });

  const [hhSearch, setHhSearch] = useState('');
  const [isHhModalOpen, setIsHhModalOpen] = useState(false);
  const [hhModalMode, setHhModalMode] = useState('add');
  const [selectedHhId, setSelectedHhId] = useState(null);
  const [expandedHH, setExpandedHH] = useState(null);
  const [hhForm, setHhForm] = useState({ headName: '', address: '', purok: `Purok ${PUROKS[0]}`, is4ps: 'No', status: 'Active' });

  const [isOffModalOpen, setIsOffModalOpen] = useState(false);
  const [offModalMode, setOffModalMode] = useState('add');
  const [selectedOffId, setSelectedOffId] = useState(null);
  const [offForm, setOffForm] = useState({ name: '', position: '', yearOfTerm: '', image: '' });

  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState('All');

  // Collection Refs
  const usersColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'users'), []);
  const householdsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'households'), []);
  const requestsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'requests'), []);
  const officialsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'officials'), []);

  // Pagination Hooks
  const residentsBaseQuery = useMemo(() => {
    let q = query(usersColRef, where('role', '==', 'resident'), orderBy('profile.lastName', 'asc'));
    if (resGenderFilter !== 'All Genders') q = query(q, where('profile.gender', '==', resGenderFilter));
    if (resPurokFilter !== 'All Puroks') q = query(q, where('profile.address', '==', `Purok ${resPurokFilter}`));
    if (resStatusFilter !== 'All Status') q = query(q, where('accountStatus', '==', resStatusFilter));
    if (resTagFilter === 'PWD') q = query(q, where('profile.isPwd', '==', true));
    if (resTagFilter === 'Voter') q = query(q, where('profile.isVoter', '==', true));
    if (resTagFilter === '4Ps') q = query(q, where('profile.is4ps', '==', true));
    return q;
  }, [usersColRef, resGenderFilter, resPurokFilter, resStatusFilter, resTagFilter]);

  const { records: residentPage, loading: resLoading, error: resError, page: resPage, hasNext: resHasNext, hasPrev: resHasPrev, fetchNext: resFetchNext, fetchPrev: resFetchPrev, refresh: resRefresh, totalCount: resTotalCount } = useFirestorePagination(residentsBaseQuery, 20);

  const householdsBaseQuery = useMemo(() => query(householdsColRef, orderBy('hhNumber', 'asc')), [householdsColRef]);
  const { records: householdPage, loading: hhLoading, error: hhError, page: hhPage, hasNext: hhHasNext, hasPrev: hhHasPrev, fetchNext: hhFetchNext, fetchPrev: hhFetchPrev, refresh: hhRefresh, totalCount: hhTotalCount } = useFirestorePagination(householdsBaseQuery, 20);

  const requestsQuery = useMemo(() => query(requestsColRef, orderBy('dateRequested', 'desc')), [requestsColRef]);
  const officialsQuery = useMemo(() => query(officialsColRef, orderBy('name', 'asc')), [officialsColRef]);
  
  const { records: allRequests, loading: reqLoading, refresh: reqRefresh } = useOnDemandCollection(requestsQuery);
  const { records: officials, loading: offLoading, refresh: offRefresh } = useOnDemandCollection(officialsQuery);
  // Sort officials by rank, then alphabetically by name for ties (like Kagawads)
  const sortedOfficials = useMemo(() => {
    return [...officials].sort((a, b) => {
      const rankA = getPositionRank(a.position);
      const rankB = getPositionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || ''); 
    });
  }, [officials]);

  // Stats
  const [stats, setStats] = useState({ population: 0, households: 0, male: 0, female: 0, minor: 0, adult: 0, senior: 0, pwd: 0, voters: 0, fourPs: 0, pendingReqs: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const base = query(usersColRef, where('role', '==', 'resident'));
        const [popSnap, hhSnap, maleSnap, femaleSnap, minorSnap, adultSnap, seniorSnap, pwdSnap, voterSnap, fourPsSnap, pendingSnap] = await Promise.all([
          getCountFromServer(base), 
          getCountFromServer(householdsColRef),
          getCountFromServer(query(base, where('profile.gender', '==', 'Male'))),
          getCountFromServer(query(base, where('profile.gender', '==', 'Female'))),
          getCountFromServer(query(base, where('profile.age', '<', 18))),
          getCountFromServer(query(base, where('profile.age', '>=', 18))),
          getCountFromServer(query(base, where('profile.age', '>=', 60))),
          getCountFromServer(query(base, where('profile.isPwd', '==', true))),
          getCountFromServer(query(base, where('profile.isVoter', '==', true))),
          getCountFromServer(query(base, where('profile.is4ps', '==', true))),
          getCountFromServer(query(requestsColRef, where('status', '==', 'Pending'))),
        ]);
        setStats({
          population: popSnap.data().count, households: hhSnap.data().count, male: maleSnap.data().count, female: femaleSnap.data().count,
          minor: minorSnap.data().count, adult: adultSnap.data().count, senior: seniorSnap.data().count, pwd: pwdSnap.data().count, 
          voters: voterSnap.data().count, fourPs: fourPsSnap.data().count, pendingReqs: pendingSnap.data().count,
        });
      } catch (err) { console.error('Stats error:', err); }
    };
    fetchStats();
  }, [usersColRef, householdsColRef, requestsColRef]);

  // Client Filters
  const filteredResidents = useMemo(() => {
    let list = residentPage;
    if (resSearch) list = list.filter(r => r.profile?.name?.toLowerCase().includes(resSearch.toLowerCase()) || r.email?.toLowerCase().includes(resSearch.toLowerCase()));
    if (resTagFilter === 'Senior') list = list.filter(r => (r.profile?.age ?? 0) >= 60);
    return list;
  }, [residentPage, resSearch, resTagFilter]);

  const filteredRequests = useMemo(() => filterStatus === 'All' ? allRequests : allRequests.filter(r => r.status === filterStatus), [allRequests, filterStatus]);
  const filteredHouseholds = useMemo(() => hhSearch ? householdPage.filter(h => h.hhNumber?.toLowerCase().includes(hhSearch.toLowerCase()) || h.headName?.toLowerCase().includes(hhSearch.toLowerCase())) : householdPage, [householdPage, hhSearch]);

  const filteredVoters = useMemo(() => residentPage.filter(r => {
    const isEligible = (r.profile?.age ?? 0) >= 18 || r.profile?.isVoter;
    if (!isEligible) return false;
    const matchSearch = voterSearch ? r.profile?.name?.toLowerCase().includes(voterSearch.toLowerCase()) : true;
    const matchFilter = voterFilter === 'All' || (voterFilter === 'Registered' && r.profile?.isVoter) || (voterFilter === 'Non-Voters' && !r.profile?.isVoter);
    return matchSearch && matchFilter;
  }), [residentPage, voterSearch, voterFilter]);

  const purokBarData = useMemo(() => PUROKS.map(p => ({ name: `Purok ${p}`, count: residentPage.filter(r => r.profile?.address === `Purok ${p}`).length })).filter(p => p.count > 0).sort((a, b) => b.count - a.count), [residentPage]);
  const maxPurokCount = purokBarData.length > 0 ? Math.max(...purokBarData.map(p => p.count)) : 1;

  // Mutations
  const handleSaveOfficial = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { name: offForm.name, position: offForm.position, yearOfTerm: offForm.yearOfTerm, image: offForm.image };
      if (offModalMode === 'add') { await addDoc(officialsColRef, payload); showToast('Official added.'); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'officials', selectedOffId), payload); showToast('Official updated.'); }
      setIsOffModalOpen(false); offRefresh();
    } catch (err) { console.error(err); showToast('Failed to save official.', 'error'); }
    setIsSaving(false);
  };

  const handleDeleteOfficial = async (offId) => {
    if (!window.confirm('Delete this official?')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'officials', offId)); showToast('Official removed.'); offRefresh(); } 
    catch (err) { console.error(err); showToast('Failed to remove official.', 'error'); }
  };

  const handleSaveHousehold = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const hhData = { headName: hhForm.headName.toUpperCase(), address: hhForm.address, purok: hhForm.purok, is4ps: hhForm.is4ps === 'Yes', status: hhForm.status };
      if (hhModalMode === 'add') { hhData.hhNumber = `HH-${String(stats.households + 1).padStart(3, '0')}`; hhData.dateRegistered = new Date().toISOString(); await addDoc(householdsColRef, hhData); showToast('Household created.'); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'households', selectedHhId), hhData); showToast('Household updated.'); }
      setIsHhModalOpen(false); hhRefresh();
    } catch (err) { console.error(err); showToast('Error saving household', 'error'); }
    setIsSaving(false);
  };

  const handleDeleteHousehold = async (hhId) => {
    if (!window.confirm('Delete this household? Residents inside will lose their household link.')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'households', hhId)); showToast('Household deleted.'); hhRefresh(); } 
    catch (err) { console.error(err); showToast('Error deleting household.', 'error'); }
  };

  const handleSaveResident = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const fullName = [resForm.firstName, resForm.middleName, resForm.lastName].filter(Boolean).join(' ').trim();
      const resData = {
        email: resForm.email, password: resForm.password, role: 'resident', accountStatus: resForm.accountStatus,
        profile: {
          name: fullName, firstName: resForm.firstName, middleName: resForm.middleName, lastName: resForm.lastName,
          age: parseInt(resForm.age) || 0, gender: resForm.gender, address: resForm.address, homeAddress: resForm.homeAddress,
          municipality: 'Gigaquit', householdId: resForm.householdId, householdRole: resForm.isHouseholdHead === 'true' ? 'Head' : 'Member',
          contactNumber: resForm.contactNumber, contactEmail: resForm.email, occupation: resForm.occupation, educationalAttainment: resForm.educationalAttainment,
          isVoter: resForm.isVoter === 'true', isPwd: resForm.isPwd === 'true', is4ps: resForm.is4ps === 'true', civilStatus: resForm.civilStatus,
          dateOfBirth: resForm.dateOfBirth, placeOfBirth: resForm.placeOfBirth, nationality: resForm.nationality, religion: resForm.religion, zipCode: '8400'
        }
      };
      if (resModalMode === 'add') { resData.dateOfRegistration = new Date().toISOString(); await addDoc(usersColRef, resData); showToast('Resident added.'); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', selectedResId), resData); showToast('Resident updated.'); }
      setIsResModalOpen(false); resRefresh();
    } catch (err) { console.error(err); showToast('Error saving resident', 'error'); }
    setIsSaving(false);
  };

  const handleDeleteResident = async (resId) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', resId)); showToast('Resident deleted.'); resRefresh(); } 
    catch (err) { console.error(err); showToast('Failed to delete resident.', 'error'); }
  };

  const handleSaveRequestDetails = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', selectedReq.id), { status: reqStatus, adminNote, dateProcessed: new Date().toISOString() });
      setIsReqModalOpen(false); showToast('Request updated.'); reqRefresh();
    } catch (err) { console.error(err); showToast('Error updating request', 'error'); }
    setIsSaving(false);
  };

  const handleDeleteRequest = async (reqId) => {
    if (!window.confirm('Are you sure you want to delete this document request? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', reqId));
      showToast('Request deleted successfully.');
      reqRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete request.', 'error');
    }
  };

  const openAddHousehold = () => { setHhModalMode('add'); setSelectedHhId(null); setHhForm({ headName: '', address: '', purok: `Purok ${PUROKS[0]}`, is4ps: 'No', status: 'Active' }); setIsHhModalOpen(true); };
  const openEditHousehold = (hh) => { setHhModalMode('edit'); setSelectedHhId(hh.id); setHhForm({ headName: hh.headName, address: hh.address || '', purok: hh.purok || `Purok ${PUROKS[0]}`, is4ps: hh.is4ps ? 'Yes' : 'No', status: hh.status || 'Active' }); setIsHhModalOpen(true); };
  const openAddResident = () => { setResModalMode('add'); setSelectedResId(null); setResForm({ email: '', password: '', firstName: '', middleName: '', lastName: '', age: '', gender: 'Male', dateOfBirth: '', placeOfBirth: '', nationality: 'Filipino', religion: 'Roman Catholic', address: `Purok ${PUROKS[0]}`, homeAddress: '', householdId: '', isHouseholdHead: 'false', contactNumber: '', occupation: '', educationalAttainment: '', isVoter: 'false', isPwd: 'false', is4ps: 'false', accountStatus: 'Active', civilStatus: 'Single' }); setIsResModalOpen(true); };
  const openEditResident = (res) => { setResModalMode('edit'); setSelectedResId(res.id); setResForm({ email: res.email || '', password: res.password || '', firstName: res.profile.firstName || '', middleName: res.profile.middleName || '', lastName: res.profile.lastName || '', age: res.profile.age || '', gender: res.profile.gender || 'Male', dateOfBirth: res.profile.dateOfBirth || '', placeOfBirth: res.profile.placeOfBirth || '', nationality: res.profile.nationality || 'Filipino', religion: res.profile.religion || 'Roman Catholic', address: res.profile.address || `Purok ${PUROKS[0]}`, homeAddress: res.profile.homeAddress || '', householdId: res.profile.householdId || '', isHouseholdHead: res.profile.householdRole === 'Head' ? 'true' : 'false', contactNumber: res.profile.contactNumber || '', occupation: res.profile.occupation || '', educationalAttainment: res.profile.educationalAttainment || '', isVoter: res.profile.isVoter ? 'true' : 'false', isPwd: res.profile.isPwd ? 'true' : 'false', is4ps: res.profile.is4ps ? 'true' : 'false', accountStatus: res.accountStatus || 'Active', civilStatus: res.profile.civilStatus || 'Single' }); setIsResModalOpen(true); };
  const openEditModal = (req) => { setSelectedReq(req); setReqStatus(req.status); setAdminNote(req.adminNote || ''); setIsReqModalOpen(true); };
  const openAddOfficial = () => { setOffModalMode('add'); setSelectedOffId(null); setOffForm({ name: '', position: '', yearOfTerm: '', image: '' }); setIsOffModalOpen(true); };
  const openEditOfficial = (off) => { setOffModalMode('edit'); setSelectedOffId(off.id); setOffForm({ name: off.name, position: off.position, yearOfTerm: off.yearOfTerm || '', image: off.image || '' }); setIsOffModalOpen(true); };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${BRANDING.landingBackground}')` }}>
      <div className="absolute inset-0 bg-blue-100/85 backdrop-blur-[3px] z-0" />
      
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-2xl font-bold border flex items-center space-x-3 transition-all animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-red-600 text-white border-red-500' : 'bg-[#0f172a] text-white border-slate-700/50'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-white" />}
          <span className="text-sm tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className={`peer fixed inset-y-0 left-0 z-50 bg-[#0f172a]/95 backdrop-blur-md text-slate-300 shadow-2xl transition-[width] duration-200 ease-in-out flex flex-col group overflow-x-hidden ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0 md:w-20 md:hover:w-64`}>
        <div className="h-20 flex items-center pl-[18px] border-b border-slate-800 flex-shrink-0 overflow-hidden cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}>
          <div className="flex items-center space-x-[-12px] flex-shrink-0 pr-1">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a] hidden group-hover:flex z-10 overflow-hidden shrink-0">
              {BRANDING.logo1 ? <img src={BRANDING.logo1} alt="Logo 1" className="w-full h-full object-cover scale-110" /> : <Shield className="w-6 h-6 text-blue-600" />}
            </div>
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a] z-0 overflow-hidden shrink-0">
              {BRANDING.logo2 ? <img src={BRANDING.logo2} alt="Logo 2" className="w-full h-full object-cover scale-110" /> : <Building2 className="w-6 h-6 text-red-600" />}
            </div>
          </div>
          <div className="ml-2 opacity-100 w-auto md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-opacity duration-200 flex flex-col justify-center">
            <h2 className="text-white font-bold leading-tight tracking-wide">{BRANDING.appShortName}</h2>
            <p className="text-[10px] text-slate-400 font-medium">{BRANDING.appShortLocation}</p>
          </div>
          <button className="md:hidden ml-auto mr-4 text-slate-400 hover:text-white p-1" onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Overview</div>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} />
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Records</div>
          <SidebarItem icon={Home} label="Households" badge={stats.households} isActive={activeTab === 'households'} onClick={() => {setActiveTab('households'); setIsMobileMenuOpen(false);}} />
          <SidebarItem icon={Users} label="Residents" badge={stats.population} isActive={activeTab === 'residents' && resTagFilter === 'All Tags'} onClick={() => { setActiveTab('residents'); setResTagFilter('All Tags'); setIsMobileMenuOpen(false); }} />
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Requests</div>
          <SidebarItem icon={FileText} label="Document Requests" badge={stats.pendingReqs} isActive={activeTab === 'requests'} onClick={() => {setActiveTab('requests'); setIsMobileMenuOpen(false);}} />
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Special Groups</div>
          <SidebarItem icon={Users} label="Senior Citizens" badge={stats.senior} isActive={activeTab === 'residents' && resTagFilter === 'Senior'} onClick={() => { setActiveTab('residents'); setResTagFilter('Senior'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={Accessibility} label="PWDs" badge={stats.pwd} isActive={activeTab === 'residents' && resTagFilter === 'PWD'} onClick={() => { setActiveTab('residents'); setResTagFilter('PWD'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={CheckCircle} label="Voters" badge={stats.voters} isActive={activeTab === 'voters'} onClick={() => { setActiveTab('voters'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={Heart} label="4Ps Beneficiaries" badge={stats.fourPs} isActive={activeTab === 'residents' && resTagFilter === '4Ps'} onClick={() => { setActiveTab('residents'); setResTagFilter('4Ps'); setIsMobileMenuOpen(false); }} />
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Barangay</div>
          <SidebarItem icon={Building2} label="Officials" isActive={activeTab === 'officials'} onClick={() => {setActiveTab('officials'); setIsMobileMenuOpen(false);}} />
          <SidebarItem icon={Info} label="About" isActive={activeTab === 'about'} onClick={() => {setActiveTab('about'); setIsMobileMenuOpen(false);}} />
        </div>

        <div className="border-t border-slate-800 bg-[#0B1120] h-20 flex items-center px-3 flex-shrink-0 overflow-hidden">
          <div className="flex items-center w-full bg-slate-800/40 hover:bg-slate-800 rounded-xl h-14 cursor-pointer transition-colors" onClick={() => { setIsMobileMenuOpen(false); }}>
            <div className="flex items-center justify-center w-[56px] flex-shrink-0">
              <InitialsAvatar name={currentUser?.profile?.name || 'Admin'} size="md" />
            </div>
            <div className="flex-1 opacity-100 w-auto md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-200 flex justify-between items-center pr-4">
              <div className="flex flex-col justify-center"><p className="text-sm font-bold text-white leading-tight">Admin</p><p className="text-[10px] text-slate-400 font-medium">Administrator</p></div>
              <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onLogout(); }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto ml-0 md:ml-20 md:peer-hover:ml-64 transition-[margin] duration-200 ease-in-out relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4 md:py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button className="md:hidden mr-3 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab.replace('-', ' ')}</h1>
              <p className="hidden sm:block text-xs md:text-sm font-medium text-slate-500">
                {activeTab === 'requests' ? 'Manage resident document requests' : activeTab === 'residents' ? `Manage registered residents directory` : activeTab === 'households' ? 'Manage household records' : activeTab === 'voters' ? 'Registered & Non-Registered Voters' : activeTab === 'officials' ? 'Manage Officials' : activeTab === 'about' ? 'System & Barangay Information' : 'Overview & Statistics'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="text-[10px] md:text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-slate-50/80 shadow-sm flex items-center"><Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />{currentDate}</div>
            <div className="hidden sm:flex items-center space-x-2 border border-slate-200 px-3 py-1.5 rounded-lg bg-white/90 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={onLogout} title="Click to logout">
              <InitialsAvatar name={currentUser?.profile?.name || 'Admin'} size="sm" />
              <span className="font-bold text-sm text-slate-700 hidden sm:inline-block ml-2">Admin</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <ModernStatCard title="Total Population" value={stats.population} subtext={`${stats.households} Households`} icon={Users} color="text-indigo-500" borderTop="border-t-indigo-500" />
                <ModernStatCard title="Households" value={stats.households} subtext="Registered" icon={Home} color="text-orange-500" borderTop="border-t-orange-500" />
                <ModernStatCard title="Male" value={stats.male} subtext={`${stats.population ? ((stats.male/stats.population)*100).toFixed(1) : 0}%`} icon={IconMale} color="text-blue-500" borderTop="border-t-blue-500" />
                <ModernStatCard title="Female" value={stats.female} subtext={`${stats.population ? ((stats.female/stats.population)*100).toFixed(1) : 0}%`} icon={IconFemale} color="text-pink-500" borderTop="border-t-pink-500" />
                <ModernStatCard title="Adults (18+)" value={stats.adult} subtext="Voting Age" icon={IconAdult} color="text-emerald-500" borderTop="border-t-emerald-500" />
                <ModernStatCard title="Minors (<18)" value={stats.minor} subtext="Dependents" icon={IconMinor} color="text-amber-500" borderTop="border-t-amber-500" />
                <ModernStatCard title="Senior Citizens" value={stats.senior} subtext="60 yrs & above" icon={IconSenior} color="text-red-500" borderTop="border-t-red-500" />
                <ModernStatCard title="PWDs" value={stats.pwd} subtext="Registered PWD" icon={Accessibility} color="text-purple-600" borderTop="border-t-purple-600" />
                <ModernStatCard title="Voters" value={stats.voters} subtext={`${stats.adult - stats.voters} non-voters`} icon={CheckCircle} color="text-blue-800" borderTop="border-t-blue-800" />
                <ModernStatCard title="4Ps Beneficiaries" value={stats.fourPs} subtext="Active status" icon={Heart} color="text-cyan-500" borderTop="border-t-cyan-500" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center font-extrabold text-slate-800 mb-6"><Users className="w-5 h-5 mr-2 text-slate-400" /> Gender Distribution</div>
                  <div className="space-y-6 mb-8">
                    <div className="cursor-pointer group">
                      <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-slate-500 flex items-center group-hover:text-blue-500 transition-colors"><span className="text-blue-500 mr-2 text-lg">♂</span> Male</span><span className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{stats.male}</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full shadow-sm" style={{ width: `${(stats.male/stats.population)*100 || 0}%` }}></div></div>
                    </div>
                    <div className="cursor-pointer group">
                      <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-slate-500 flex items-center group-hover:text-pink-500 transition-colors"><span className="text-pink-500 mr-2 text-lg">♀</span> Female</span><span className="font-extrabold text-slate-800 group-hover:text-pink-600 transition-colors">{stats.female}</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-pink-500 h-2.5 rounded-full shadow-sm" style={{ width: `${(stats.female/stats.population)*100 || 0}%` }}></div></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Adults</p><p className="text-2xl font-extrabold text-blue-600">{stats.adult}</p></div>
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Minors</p><p className="text-2xl font-extrabold text-amber-500">{stats.minor}</p></div>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center font-extrabold text-slate-800 mb-6"><CheckCircle className="w-5 h-5 mr-2 text-slate-400" /> Special Groups</div>
                  <div className="space-y-6">
                    <ProgressBar label="Senior Citizens" value={stats.senior} total={stats.population} color="bg-red-500" onClick={() => { setActiveTab('residents'); setResTagFilter('Senior'); }} />
                    <ProgressBar label="PWDs" value={stats.pwd} total={stats.population} color="bg-purple-500" onClick={() => { setActiveTab('residents'); setResTagFilter('PWD'); }} />
                    <ProgressBar label="Registered Voters" value={stats.voters} total={stats.adult} color="bg-blue-800" onClick={() => { setActiveTab('voters'); }} />
                    <ProgressBar label="4Ps Beneficiaries" value={stats.fourPs} total={stats.households} color="bg-cyan-500" onClick={() => { setActiveTab('residents'); setResTagFilter('4Ps'); }} />
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                {/* 1. Population by Purok / Sitio */}
                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center font-extrabold text-slate-800 mb-6"><MapPin className="w-5 h-5 mr-2 text-slate-400" /> Population by Purok (current page sample)</div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {purokBarData.length === 0 ? (<p className="text-sm text-slate-500 italic">No population data available on current page.</p>) : (
                      purokBarData.map(p => (
                        <div key={p.name} className="cursor-pointer group">
                          <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-slate-600 flex items-center group-hover:text-blue-700 transition-colors"><MapPin className="w-3 h-3 text-red-500 mr-1.5" /> {p.name}</span><span className="font-extrabold text-[#1e3a8a]">{p.count}</span></div>
                          <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-[#1e3a8a] h-2 rounded-full shadow-sm" style={{ width: `${(p.count / maxPurokCount) * 100}%` }}></div></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Recent Households List */}
                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 shrink-0"><div className="flex items-center font-extrabold text-slate-800"><Home className="w-5 h-5 mr-2 text-slate-400" /> Recent Households</div></div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200"><th className="p-4 whitespace-nowrap">HH #</th><th className="p-4">Head of Family</th><th className="p-4">Purok</th><th className="p-4 text-center">4Ps</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {householdPage.slice(0, 5).length === 0 ? (<tr><td colSpan="4" className="p-6 text-center text-slate-500 text-sm font-medium">No recent households.</td></tr>) : householdPage.slice(0, 5).map(hh => (
                            <tr key={hh.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 text-sm font-extrabold text-blue-700">{hh.hhNumber}</td>
                              <td className="p-4 text-sm font-extrabold text-[#0f172a] uppercase">{hh.headName}</td>
                              <td className="p-4"><span className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm"><MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {hh.purok}</span></td>
                              <td className="p-4 text-center">{hh.is4ps ? <span className="text-cyan-600 font-bold text-xs uppercase bg-cyan-50 px-2 py-0.5 rounded">Yes</span> : <span className="text-slate-300 font-bold">—</span>}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOUSEHOLDS TAB */}
          {activeTab === 'households' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto"><Home className="w-5 h-5 mr-2 text-slate-700" /> Household Records</div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" />
                    <input type="text" placeholder="Search household..." value={hhSearch} onChange={(e) => setHhSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all hover:bg-white" />
                  </div>
                  <button onClick={hhRefresh} disabled={hhLoading} className="cursor-pointer p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50" title="Refresh">
                    <Activity className="w-4 h-4" />
                  </button>
                  <button onClick={openAddHousehold} className="cursor-pointer bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm ml-1 whitespace-nowrap hover:-translate-y-0.5"><PlusCircle className="w-4 h-4 mr-2" /> Add</button>
                </div>
              </div>
              {hhError && <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{hhError}</div>}
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200"><th className="p-4 whitespace-nowrap">HH #</th><th className="p-4">Head of Family</th><th className="p-4">Address</th><th className="p-4">Purok/Sitio</th><th className="p-4 text-center">Members</th><th className="p-4 text-center">4Ps</th><th className="p-4 text-center">Status</th><th className="p-4">Registered</th><th className="p-4 text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {hhLoading ? (
                      <tr><td colSpan="9" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filteredHouseholds.length === 0 ? (
                      <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-medium">No households found.</td></tr>
                    ) : filteredHouseholds.map(hh => {
                      const isExpanded = expandedHH === hh.id;
                      const hhDate = new Date(hh.dateRegistered).toLocaleDateString('en-CA'); 
                      return (
                        <React.Fragment key={hh.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                            <td className="p-4 text-sm font-extrabold text-blue-700">{hh.hhNumber}</td>
                            <td className="p-4"><div className="flex items-center cursor-pointer"><InitialsAvatar name={hh.headName} size="sm" className="mr-3" /><span className="font-extrabold text-[#0f172a] text-sm tracking-tight uppercase group-hover:text-blue-600 transition-colors">{hh.headName}</span></div></td>
                            <td className="p-4 text-sm font-medium text-slate-600">{hh.address || '-'}</td>
                            <td className="p-4"><span className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm"><MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {hh.purok}</span></td>
                            <td className="p-4 text-center"><button onClick={() => setExpandedHH(isExpanded ? null : hh.id)} className="cursor-pointer inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-md hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm"><span className="font-medium flex items-center text-[10px] uppercase tracking-wider">{isExpanded ? <ChevronUp className="w-3 h-3 mr-1"/> : <ChevronDown className="w-3 h-3 mr-1"/>} View</span></button></td>
                            <td className="p-4 text-center text-sm font-bold text-slate-400">{hh.is4ps ? 'Yes' : 'No'}</td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${hh.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{hh.status || 'Active'}</span></td>
                            <td className="p-4 text-sm font-medium text-slate-500">{hhDate}</td>
                            <td className="p-4 text-center space-x-1 whitespace-nowrap"><button onClick={() => openEditHousehold(hh)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Edit"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDeleteHousehold(hh.id)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Delete"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                              <td colSpan="9" className="p-0">
                                <div className="px-4 md:px-16 py-4 animate-in slide-in-from-top-2 duration-200">
                                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Linked Residents</h5>
                                  <div className="text-sm font-medium text-slate-500 bg-white p-4 rounded-lg border border-slate-200 border-dashed flex items-center">
                                    <Info className="w-5 h-5 mr-3 text-blue-500" /> 
                                    To view the individual members of this household, please search for Household <strong>{hh.hhNumber}</strong> or the Head of Family in the Residents tab.
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={hhPage} hasNext={hhHasNext} hasPrev={hhHasPrev} fetchNext={hhFetchNext} fetchPrev={hhFetchPrev} loading={hhLoading} totalCount={stats.households} pageSize={20} />
            </div>
          )}

          {/* RESIDENTS TAB */}
          {activeTab === 'residents' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto"><Users className="w-5 h-5 mr-2 text-slate-700" /> Resident Records</div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" /><input type="text" placeholder="Search resident..." value={resSearch} onChange={(e) => setResSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-colors hover:bg-white" /></div>
                  {resTagFilter !== 'All Tags' && (<div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg border border-blue-200 flex items-center cursor-pointer" onClick={() => setResTagFilter('All Tags')} title="Clear Filter">Filter: {resTagFilter} <X className="w-3 h-3 ml-1" /></div>)}
                  <select value={resGenderFilter} onChange={e=>setResGenderFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors"><option>All Genders</option><option>Male</option><option>Female</option></select>
                  <select value={resPurokFilter} onChange={e=>setResPurokFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors"><option>All Puroks</option>{PUROKS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  <select value={resStatusFilter} onChange={e=>setResStatusFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors"><option>All Status</option><option>Active</option><option>Inactive</option></select>
                  <button onClick={resRefresh} disabled={resLoading} className="cursor-pointer p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50" title="Refresh">
                    <Activity className="w-4 h-4" />
                  </button>
                  <button onClick={openAddResident} className="cursor-pointer bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm ml-1 whitespace-nowrap hover:-translate-y-0.5"><PlusCircle className="w-4 h-4 mr-2" /> Add</button>
                </div>
              </div>
              {resError && <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{resError}</div>}
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200"><th className="p-4 text-center w-10">#</th><th className="p-4">Name</th><th className="p-4 text-center">Age</th><th className="p-4 text-center">Gender</th><th className="p-4">Civil Status</th><th className="p-4">Purok/Sitio</th><th className="p-4">Household Head</th><th className="p-4">Tags</th><th className="p-4">Registered</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {resLoading ? (
                      <tr><td colSpan="11" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filteredResidents.length === 0 ? (
                      <tr><td colSpan="11" className="p-8 text-center text-slate-500 font-medium">No residents found.</td></tr>
                    ) : filteredResidents.map((res, index) => {
                      const formattedName = `${res.profile.lastName || ''}, ${res.profile.firstName || ''} ${res.profile.middleName || ''}`.trim().toUpperCase() || res.profile.name.toUpperCase();
                      const hhInfo = householdPage.find(h => h.id === res.profile.householdId);
                      const headDisplay = res.profile.householdRole === 'Head' ? '-' : (hhInfo ? hhInfo.headName : (res.profile.householdId ? 'Linked' : '-'));
                      const regDate = new Date(res.dateOfRegistration || Date.now()).toLocaleDateString('en-CA');

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                          <td className="p-4 text-xs font-bold text-slate-400 text-center">{(resPage - 1) * 20 + index + 1}</td>
                          <td className="p-4"><div className="flex items-center"><InitialsAvatar name={res.profile.name} size="sm" className="mr-3" /><span className="font-extrabold text-[#0f172a] text-sm tracking-tight group-hover:text-blue-700 transition-colors">{formattedName}</span></div></td>
                          <td className="p-4 text-sm font-medium text-slate-600 text-center">{res.profile.age}</td>
                          <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.profile.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{res.profile.gender}</span></td>
                          <td className="p-4 text-sm font-medium text-slate-600">{res.profile.civilStatus || 'Single'}</td>
                          <td className="p-4"><span className="px-2 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm group-hover:border-red-200 transition-colors"><MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {res.profile.address}</span></td>
                          <td className="p-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[120px]" title={headDisplay}>{headDisplay}</td>
                          <td className="p-4 flex flex-wrap gap-1">{res.profile.age >= 60 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded shadow-sm">Senior</span>}{res.profile.isVoter && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm">Voter</span>}{res.profile.isPwd && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded shadow-sm">PWD</span>}{res.profile.is4ps && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded shadow-sm">4Ps</span>}</td>
                          <td className="p-4 text-xs font-medium text-slate-500">{regDate}</td>
                          <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.accountStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{res.accountStatus || 'Active'}</span></td>
                          <td className="p-4 text-center space-x-1 whitespace-nowrap"><button onClick={() => openEditResident(res)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Edit"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDeleteResident(res.id)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Delete"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={resPage} hasNext={resHasNext} hasPrev={resHasPrev} fetchNext={resFetchNext} fetchPrev={resFetchPrev} loading={resLoading} totalCount={stats.population} pageSize={20} />
            </div>
          )}

          {/* VOTERS TAB */}
          {activeTab === 'voters' && (
            <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <ModernStatCard title="Registered Voters" value={stats.voters} icon={FileCheck} color="text-blue-600" borderTop="border-t-blue-600" />
                <ModernStatCard title="Non-Voters (18+)" value={stats.adult > stats.voters ? stats.adult - stats.voters : 0} icon={Ban} color="text-red-500" borderTop="border-t-red-500" />
                <ModernStatCard title="Eligible (18+)" value={stats.adult} icon={UserCheck} color="text-emerald-500" borderTop="border-t-emerald-500" />
                <ModernStatCard title="Registration Rate" value={stats.adult > 0 ? `${((stats.voters / stats.adult) * 100).toFixed(1)}%` : '0%'} icon={BarChart2} color="text-amber-500" borderTop="border-t-amber-400" />
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                  <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto"><FileCheck className="w-5 h-5 mr-2 text-slate-700" /> Voter Records (current page)</div>
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" /><input type="text" placeholder="Search..." value={voterSearch} onChange={(e) => setVoterSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-colors hover:bg-white" /></div>
                    <select value={voterFilter} onChange={e=>setVoterFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors"><option>All</option><option>Registered</option><option>Non-Voters</option></select>
                  </div>
                </div>

                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200"><th className="p-4 text-center w-10">#</th><th className="p-4">Name</th><th className="p-4 text-center">Age</th><th className="p-4 text-center">Gender</th><th className="p-4">Purok/Sitio</th><th className="p-4 text-center">Voter Status</th><th className="p-4">Household Head</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {resLoading ? (
                        <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                      ) : filteredVoters.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No voters found on this page.</td></tr>
                      ) : filteredVoters.map((res, index) => {
                        const formattedName = `${res.profile.lastName || ''}, ${res.profile.firstName || ''} ${res.profile.middleName || ''}`.trim().toUpperCase() || res.profile.name.toUpperCase();
                        const hhInfo = householdPage.find(h => h.id === res.profile.householdId);
                        const headDisplay = res.profile.householdRole === 'Head' ? '-' : (hhInfo ? hhInfo.headName : (res.profile.householdId ? 'Linked' : '-'));

                        return (
                          <tr key={res.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                            <td className="p-4 text-xs font-bold text-slate-400 text-center">{(resPage - 1) * 20 + index + 1}</td>
                            <td className="p-4 font-extrabold text-[#0f172a] text-sm tracking-tight group-hover:text-blue-700 transition-colors"><div className="flex items-center"><InitialsAvatar name={res.profile.name} size="sm" className="mr-2" />{formattedName}</div></td>
                            <td className="p-4 text-sm font-medium text-slate-600 text-center">{res.profile.age}</td>
                            <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.profile.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{res.profile.gender}</span></td>
                            <td className="p-4"><span className="px-2 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm"><MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {res.profile.address}</span></td>
                            <td className="p-4 text-center">{res.profile.isVoter ? (<span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">✓ Registered</span>) : (<span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">Non-Voter</span>)}</td>
                            <td className="p-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[150px]" title={headDisplay}>{headDisplay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={resPage} hasNext={resHasNext} hasPrev={resHasPrev} fetchNext={resFetchNext} fetchPrev={resFetchPrev} loading={resLoading} totalCount={stats.adult} pageSize={20} />
              </div>
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                <div className="flex items-center text-[#0f172a] font-extrabold text-lg"><FileText className="w-5 h-5 mr-2 text-slate-700" /> Document Requests</div>
                <div className="flex items-center gap-2">
                  <button onClick={reqRefresh} disabled={reqLoading} className="cursor-pointer p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50" title="Refresh">
                    <Activity className="w-4 h-4" />
                  </button>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500 hover:bg-white transition-colors"><option value="All">All Status</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select>
                </div>
              </div>

              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-white text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200"><th className="p-4 font-extrabold">Request Date</th><th className="p-4 font-extrabold">Name</th><th className="p-4 font-extrabold">Document Type</th><th className="p-4 font-extrabold">Civil Status</th><th className="p-4 font-extrabold">Purok/Sitio</th><th className="p-4 font-extrabold text-center">Status</th><th className="p-4 font-extrabold text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqLoading ? (
                      <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No requests found.</td></tr>
                    ) : filteredRequests.sort((a,b) => new Date(b.dateRequested) - new Date(a.dateRequested)).map(req => {
                      const reqDate = new Date(req.dateRequested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const fullName = req.requestDetails ? `${req.requestDetails.firstName} ${req.requestDetails.lastName}`.toUpperCase() : 'UNKNOWN';
                      const civilStatus = req.requestDetails?.civilStatus || 'Single';
                      const purok = req.requestDetails?.purok || 'N/A';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                          <td className="p-4 text-sm font-medium text-slate-600 whitespace-nowrap">{reqDate}</td>
                          <td className="p-4 text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{fullName}</td>
                          <td className="p-4 text-sm font-medium text-slate-600">{req.documentType}</td>
                          <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{civilStatus}</td>
                          <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{purok}</td>
                          <td className="p-4 text-center"><StatusBadge status={req.status} /></td>
                          <td className="p-4 flex justify-center space-x-2">
                            <button onClick={() => openEditModal(req)} className="cursor-pointer p-1.5 bg-[#1e3a8a] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm hover:-translate-y-0.5" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteRequest(req.id)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OFFICIALS TAB */}
          {activeTab === 'officials' && (
             <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
                <div><h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Barangay Officials</h2><p className="text-sm font-medium text-slate-500 mt-1">Manage the current term's barangay council.</p></div>
                <button onClick={openAddOfficial} className="cursor-pointer bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm hover:-translate-y-0.5"><PlusCircle className="w-5 h-5 mr-2" /> Add Official</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {offLoading ? (
                  <div className="col-span-3 text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
                ) : officials.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-slate-400 font-medium bg-white/80 rounded-3xl">No officials recorded.</div>
                ) : sortedOfficials.map(official => (
                  <div key={official.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-200/60 text-center hover:-translate-y-1 transition-transform relative group cursor-pointer hover:shadow-lg">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button onClick={() => openEditOfficial(official)} className="cursor-pointer p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors shadow-sm"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteOfficial(official.id)} className="cursor-pointer p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {official.image ? (
                      <div className="w-28 h-28 mx-auto bg-blue-50 rounded-full mb-5 shadow-sm border-2 border-slate-100 overflow-hidden flex items-center justify-center"><img src={official.image} alt={official.name} className="w-full h-full object-cover scale-110" /></div>
                    ) : (
                      <div className="flex justify-center mb-5"><InitialsAvatar name={official.name} size="2xl" /></div>
                    )}
                    <h3 className="font-bold text-lg text-slate-800 leading-tight uppercase">{official.name}</h3>
                    <p className="text-blue-600 text-sm font-bold mt-2 bg-blue-50 inline-block px-3 py-1 rounded-full">{official.position}</p>
                    {official.yearOfTerm && <p className="text-xs font-bold text-slate-400 mt-3 tracking-widest uppercase">Term: {official.yearOfTerm}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <AboutPage />
          )}

        </main>
      </div>

      {/* ADMIN MODALS (Household/Resident/Request/Official) */}

      {/* Household Modal */}
      {isHhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
              <h3 className="font-extrabold flex items-center"><Home className="w-5 h-5 mr-2"/> {hhModalMode === 'add' ? 'Add Household Record' : 'Edit Household Record'}</h3>
              <button onClick={() => setIsHhModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveHousehold} className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Household Number</label><div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-extrabold tracking-widest">{hhModalMode === 'add' ? `HH-${String(stats.households + 1).padStart(3, '0')}` : hhForm.hhNumber}</div></div>
                  <div className="md:col-span-2"><FormInput label="Head of Family Name" required value={hhForm.headName} onChange={e=>setHhForm({...hhForm, headName: e.target.value})} placeholder="E.g. DELA CRUZ, JUAN" /></div>
                  <div className="md:col-span-2"><FormInput label="Specific Home Address (Optional)" value={hhForm.address} onChange={e=>setHhForm({...hhForm, address: e.target.value})} placeholder="House No., Street Name..." /></div>
                  <div><FormSelect label="Purok / Sitio" required value={hhForm.purok} onChange={e=>setHhForm({...hhForm, purok: e.target.value})}>{PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}</FormSelect></div>
                  <div><FormSelect label="4Ps Beneficiary?" value={hhForm.is4ps} onChange={e=>setHhForm({...hhForm, is4ps: e.target.value})}><option>No</option><option>Yes</option></FormSelect></div>
                  {hhModalMode === 'edit' && (<div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2"><FormSelect label="Household Status" value={hhForm.status} onChange={e=>setHhForm({...hhForm, status: e.target.value})}><option>Active</option><option>Inactive</option></FormSelect></div>)}
                </div>
              </div>
              <div className="mt-8 flex space-x-3"><button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70">{isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2"/> : null} {hhModalMode === 'add' ? 'Create Household' : 'Save Changes'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Resident Modal */}
      {isResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
              <h3 className="font-extrabold flex items-center"><UserPlus className="w-5 h-5 mr-2"/> {resModalMode === 'add' ? 'Add New Resident' : 'Edit Resident Record'}</h3>
              <button onClick={() => setIsResModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveResident} className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-4 border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <FormInput label="First Name" required value={resForm.firstName} onChange={e=>setResForm({...resForm, firstName: e.target.value})} />
                  <FormInput label="Middle Name" value={resForm.middleName} onChange={e=>setResForm({...resForm, middleName: e.target.value})} />
                  <FormInput label="Last Name" required value={resForm.lastName} onChange={e=>setResForm({...resForm, lastName: e.target.value})} />
                  <FormInput label="Date of Birth" type="date" required value={resForm.dateOfBirth} onChange={e=>setResForm({...resForm, dateOfBirth: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700" />
                  <FormInput label="Age" type="number" min="0" required value={resForm.age} onChange={e=>setResForm({...resForm, age: e.target.value})} />
                  <FormSelect label="Gender" value={resForm.gender} onChange={e=>setResForm({...resForm, gender: e.target.value})}>{GENDERS.map(g=><option key={g}>{g}</option>)}</FormSelect>
                  <FormSelect label="Civil Status" value={resForm.civilStatus} onChange={e=>setResForm({...resForm, civilStatus: e.target.value})}>{CIVIL_STATUSES.map(c=><option key={c}>{c}</option>)}</FormSelect>
                  <div className="sm:col-span-2 md:col-span-1"><FormInput label="Place of Birth" value={resForm.placeOfBirth} onChange={e=>setResForm({...resForm, placeOfBirth: e.target.value})} /></div>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-emerald-800 uppercase mb-4 border-b pb-2">Address & Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><FormInput label="Specific Home Address (Optional)" value={resForm.homeAddress} onChange={e=>setResForm({...resForm, homeAddress: e.target.value})} placeholder="House No., Street Name..." /></div>
                  <FormSelect label="Purok / Sitio" required value={resForm.address} onChange={e=>setResForm({...resForm, address: e.target.value})}>{PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}</FormSelect>
                  <FormSelect label="Assign Household" value={resForm.householdId} onChange={e=>setResForm({...resForm, householdId: e.target.value})}><option value="">None / Not Listed</option>{householdPage.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}</FormSelect>
                  <FormSelect label="Household Role" value={resForm.isHouseholdHead} onChange={e=>setResForm({...resForm, isHouseholdHead: e.target.value})}><option value="false">Member</option><option value="true">Head of Household</option></FormSelect>
                  <FormInput label="Contact Number" type="tel" value={resForm.contactNumber} onChange={e=>setResForm({...resForm, contactNumber: e.target.value})} />
                  <FormInput label="Occupation" value={resForm.occupation} onChange={e=>setResForm({...resForm, occupation: e.target.value})} />
                  <FormSelect label="Educational Attainment" value={resForm.educationalAttainment} onChange={e=>setResForm({...resForm, educationalAttainment: e.target.value})}>{EDU_OPTIONS.map(o=><option key={o}>{o}</option>)}</FormSelect>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-amber-800 uppercase mb-4 border-b pb-2">Demographics & Tags</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect label="Voter?" value={resForm.isVoter} onChange={e=>setResForm({...resForm, isVoter: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center sm:text-left text-sm outline-none"><option value="true">Yes</option><option value="false">No</option></FormSelect>
                  <FormSelect label="PWD?" value={resForm.isPwd} onChange={e=>setResForm({...resForm, isPwd: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center sm:text-left text-sm outline-none"><option value="false">No</option><option value="true">Yes</option></FormSelect>
                  <FormSelect label="4Ps?" value={resForm.is4ps} onChange={e=>setResForm({...resForm, is4ps: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center sm:text-left text-sm outline-none"><option value="false">No</option><option value="true">Yes</option></FormSelect>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-4 border-b pb-2">System Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={resModalMode === 'edit' ? 'sm:col-span-2' : ''}><FormInput type="email" label="Login Email" required value={resForm.email} onChange={e=>setResForm({...resForm, email: e.target.value})} autoComplete="off" /></div>
                  {resModalMode === 'add' && (<div><FormInput type="password" label="Temporary Password" required value={resForm.password} onChange={e=>setResForm({...resForm, password: e.target.value})} autoComplete="new-password" /></div>)}
                  {resModalMode === 'edit' && (<div className="sm:col-span-2 pt-2 sm:border-t sm:border-slate-100"><FormSelect label="Account Status" value={resForm.accountStatus} onChange={e=>setResForm({...resForm, accountStatus: e.target.value})}><option>Active</option><option>Inactive</option></FormSelect></div>)}
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3"><button disabled={isSaving} type="submit" className="cursor-pointer w-full sm:flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors flex justify-center items-center shadow-md hover:-translate-y-0.5 disabled:opacity-70">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} {resModalMode === 'add' ? 'Create Resident Record' : 'Save Changes'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {isReqModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-extrabold text-[#0f172a] flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-600"/> Update Request Details</h3><button onClick={() => setIsReqModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-700 bg-white rounded-full p-1 border border-slate-200 shadow-sm"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSaveRequestDetails} className="p-6 flex-1 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resident Requesting</p><p className="text-sm font-extrabold text-slate-800 uppercase">{selectedReq.requestDetails ? `${selectedReq.requestDetails.firstName} ${selectedReq.requestDetails.lastName}` : 'Unknown Resident'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Document Needed</p><p className="text-sm font-bold text-blue-700">{selectedReq.documentType}</p></div>
                {selectedReq.requestDetails?.purpose && (<div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stated Purpose</p><p className="text-sm font-medium text-slate-600 bg-white p-2 rounded border border-slate-200 italic">"{selectedReq.requestDetails.purpose}"</p></div>)}
              </div>
              <div className="mb-5"><FormSelect label="Update Status" value={reqStatus} onChange={e => setReqStatus(e.target.value)} className="cursor-pointer w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"><option value="Pending">Pending (In Progress)</option><option value="Approved">Approved (Ready for Pickup)</option><option value="Rejected">Rejected (Declined)</option></FormSelect></div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between"><span>Message / Note to Resident</span><span className="text-slate-400 font-normal normal-case">(Optional)</span></label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows="3" className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700 resize-none" placeholder="e.g. 'Please bring a valid ID to claim this document.'"></textarea>
              </div>
              <div className="mt-8 flex space-x-3"><button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors flex justify-center items-center shadow-md hover:-translate-y-0.5 disabled:opacity-70">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Save Changes</button><button disabled={isSaving} type="button" onClick={() => setIsReqModalOpen(false)} className="cursor-pointer flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-70">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Official Modal */}
      {isOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white"><h3 className="font-extrabold flex items-center"><Building2 className="w-5 h-5 mr-2"/> {offModalMode === 'add' ? 'Add Barangay Official' : 'Edit Official'}</h3><button onClick={() => setIsOffModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSaveOfficial} className="p-6 bg-slate-50">
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative group mb-6">
                {offForm.image ? (<div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden group-hover:opacity-80 transition-opacity flex items-center justify-center"><img src={offForm.image} alt="Official Preview" className="w-full h-full object-cover scale-110" /></div>) : (<div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2 shadow-inner group-hover:bg-slate-200 transition-colors"><Camera className="w-8 h-8" /></div>)}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Upload Photo</span><input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setOffForm({...offForm, image: base64}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div className="space-y-4">
                <FormInput label="Full Name" required value={offForm.name} onChange={e=>setOffForm({...offForm, name: e.target.value})} placeholder="E.g. Juan Dela Cruz" />
                <FormInput label="Position / Title" required value={offForm.position} onChange={e=>setOffForm({...offForm, position: e.target.value})} placeholder="E.g. Barangay Captain" />
                <FormInput label="Year of Term" value={offForm.yearOfTerm} onChange={e=>setOffForm({...offForm, yearOfTerm: e.target.value})} placeholder="E.g. 2023 - 2026" />
              </div>
              <div className="mt-8 flex space-x-3"><button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70">{isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2"/> : null} {offModalMode === 'add' ? 'Save Official' : 'Update Official'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}