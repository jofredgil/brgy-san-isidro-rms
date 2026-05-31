import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { collection, doc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { BRANDING, PUROKS, CIVIL_STATUSES, GENDERS, EDU_OPTIONS, DOC_TYPES } from '../config/constants';
import { FormInput, FormSelect, InitialsAvatar, StatusBadge } from '../components/ui/Components';
import { useResidentRequests } from '../hooks/useResidentRequests';
import { useOnDemandCollection } from '../hooks/useOnDemandCollection';
import AboutPage from './AboutPage';
import {
  User, FileText, Clock, Building2, Info, LogOut, Menu, X, Calendar, 
  Pencil, Activity, CheckCircle, Accessibility, Loader2, MapPin, Send, 
  Home, Shield, AlertCircle, PlusCircle
} from 'lucide-react';

// ─── LOCAL UI COMPONENTS ──────────────────────────────────────────────────────
function SidebarItem({ icon: Icon, label, badge, isActive, onClick }) {
  return (
    <div className="px-3 mb-1">
      <button onClick={onClick} className={`w-full flex items-center h-11 text-sm font-semibold transition-all duration-200 cursor-pointer overflow-hidden rounded-xl ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
        <div className="flex items-center justify-center w-[56px] flex-shrink-0">
          <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300 transition-colors'}`} />
        </div>
        <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200 text-left flex-1">{label}</span>
        {badge !== undefined && (<span className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 mr-3 text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-blue-400 text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>)}
      </button>
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

// ─── RESIDENT DASHBOARD ───────────────────────────────────────────────────────
export default function ResidentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeout = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3000);
  };

  const onLogout = () => signOut(auth);

  // ── Firestore Refs & Hooks ──────────────────────────────────────────────────
  const requestsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'requests'), []);
  const householdsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'households'), []);
  const officialsColRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'officials'), []);

  // Fetch only this resident's requests securely
  const { requests, loading: reqLoading } = useResidentRequests(requestsColRef, user.id);

  // Fetch public dropdown data
  const officialsQuery = useMemo(() => query(officialsColRef, orderBy('name', 'asc')), [officialsColRef]);
  const householdsQuery = useMemo(() => query(householdsColRef, orderBy('hhNumber', 'asc')), [householdsColRef]);
  
  const { records: officialsList, loading: offLoading } = useOnDemandCollection(officialsQuery);
  const { records: households } = useOnDemandCollection(householdsQuery);
  // Sort officials by rank, then alphabetically by name for ties (like Kagawads)
 const sortedOfficials = useMemo(() => {
    return [...officialsList].sort((a, b) => {
      const rankA = getPositionRank(a.position);
      const rankB = getPositionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || ''); 
    });
  }, [officialsList]);

  // ── Edit Profile Form ─────────────────────────────────────────────────────
  const initializeEditForm = useCallback(() => ({
    firstName: user.profile.firstName || user.profile.name.split(' ')[0] || '',
    lastName: user.profile.lastName || user.profile.name.split(' ').slice(1).join(' ') || '',
    middleName: user.profile.middleName || '',
    age: user.profile.age || '',
    gender: user.profile.gender || 'Male',
    dateOfBirth: user.profile.dateOfBirth || '',
    placeOfBirth: user.profile.placeOfBirth || '',
    nationality: user.profile.nationality || 'Filipino',
    religion: user.profile.religion || 'Roman Catholic',
    civilStatus: user.profile.civilStatus || 'Single',
    address: user.profile.address || `Purok ${PUROKS[0]}`,
    homeAddress: user.profile.homeAddress || '',
    householdId: user.profile.householdId || '',
    isHouseholdHead: user.profile.householdRole === 'Head' ? 'true' : 'false',
    municipality: user.profile.municipality || 'Gigaquit',
    contactNumber: user.profile.contactNumber || '',
    contactEmail: user.profile.contactEmail || user.email || '',
    occupation: user.profile.occupation || '',
    educationalAttainment: user.profile.educationalAttainment || '',
    password: '', 
    confirmPassword: ''
  }), [user]);

  const [editForm, setEditForm] = useState(initializeEditForm());

  useEffect(() => { setEditForm(initializeEditForm()); }, [initializeEditForm]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const fullName = `${editForm.firstName} ${editForm.middleName ? editForm.middleName + ' ' : ''}${editForm.lastName}`.trim().replace(/\s+/g, ' ');
      
      const updateData = {
        email: editForm.contactEmail,
        profile: {
          ...user.profile,
          name: fullName,
          firstName: editForm.firstName,
          middleName: editForm.middleName,
          lastName: editForm.lastName,
          age: parseInt(editForm.age) || user.profile.age,
          gender: editForm.gender,
          civilStatus: editForm.civilStatus,
          dateOfBirth: editForm.dateOfBirth,
          placeOfBirth: editForm.placeOfBirth,
          nationality: editForm.nationality,
          religion: editForm.religion,
          address: editForm.address,
          homeAddress: editForm.homeAddress,
          householdId: editForm.householdId,
          householdRole: editForm.isHouseholdHead === 'true' ? 'Head' : 'Member',
          municipality: editForm.municipality,
          contactNumber: editForm.contactNumber,
          contactEmail: editForm.contactEmail,
          occupation: editForm.occupation,
          educationalAttainment: editForm.educationalAttainment,
        }
      };

      if (editForm.password) {
        // Note: Realistically updating a Firebase Auth password requires re-authentication,
        // but this updates the stored DB record placeholder if you are still syncing them.
        updateData.password = editForm.password;
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), updateData);
      setIsEditingProfile(false);
      showToast('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile.', 'error');
    }
    setIsSubmitting(false);
  };

  // ── Document Request Form ─────────────────────────────────────────────────
  const [reqForm, setReqForm] = useState({
    documentType: DOC_TYPES[0],
    firstName: user.profile.firstName || user.profile.name.split(' ')[0] || '',
    lastName: user.profile.lastName || user.profile.name.split(' ').slice(1).join(' ') || '',
    middleName: user.profile.middleName || '',
    age: user.profile.age || '',
    civilStatus: user.profile.civilStatus || 'Single',
    purok: user.profile.address || `Purok ${PUROKS[0]}`,
    purpose: '',
  });

  const handleRequestDoc = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(requestsColRef, {
        residentId: user.id,
        documentType: reqForm.documentType,
        status: 'Pending',
        dateRequested: new Date().toISOString(),
        requestDetails: {
          firstName: reqForm.firstName,
          lastName: reqForm.lastName,
          middleName: reqForm.middleName,
          age: reqForm.age,
          civilStatus: reqForm.civilStatus,
          purok: reqForm.purok,
          purpose: reqForm.purpose,
        },
      });
      
      setActiveTab('my-requests');
      setReqForm(f => ({ ...f, purpose: '' }));
      showToast('Document requested successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to request document.', 'error');
    }
    setIsSubmitting(false);
  };

  // ── Display Variables ─────────────────────────────────────────────────────
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const myHousehold = households.find(h => h.id === user.profile.householdId);
  const displayHHNumber = myHousehold ? myHousehold.hhNumber : 'Unassigned';
  const displayHHHead = user.profile.householdRole === 'Head' ? user.profile.name : (myHousehold ? myHousehold.headName : 'None/Self');

  return (
    <>
      <div className="flex w-full h-screen overflow-hidden font-sans relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${BRANDING.landingBackground}')` }}>
        <div className="absolute inset-0 bg-blue-100/85 backdrop-blur-[3px] z-0" />
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* ── SIDEBAR ── */}
        <div className={`peer fixed inset-y-0 left-0 z-50 bg-[#0f172a]/95 backdrop-blur-md text-slate-300 shadow-2xl transition-[width] duration-200 ease-in-out flex flex-col group overflow-x-hidden ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0 md:w-20 md:hover:w-64`}>
          <div className="h-20 flex items-center pl-[18px] border-b border-slate-800 flex-shrink-0 overflow-hidden cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}>
            <div className="flex items-center space-x-[-12px] flex-shrink-0 pr-1">
              <div className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-lg border-2 border-[#0f172a] hidden group-hover:flex z-10 overflow-hidden shrink-0">
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
            <button className="md:hidden ml-auto mr-4 text-slate-400 hover:text-white p-1" onClick={e => { e.stopPropagation(); setIsMobileMenuOpen(false); }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Overview</div>
            <SidebarItem icon={User} label="My Profile" isActive={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} />
            
            <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Documents</div>
            <SidebarItem icon={FileText} label="Request Documents" isActive={activeTab === 'request'} onClick={() => { setActiveTab('request'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={Clock} label="My Requests" isActive={activeTab === 'my-requests'} badge={requests.filter(r => r.status === 'Pending').length || undefined} onClick={() => { setActiveTab('my-requests'); setIsMobileMenuOpen(false); }} />
            
            <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Barangay</div>
            <SidebarItem icon={Building2} label="Officials" isActive={activeTab === 'officials'} onClick={() => { setActiveTab('officials'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={Info} label="About" isActive={activeTab === 'about'} onClick={() => { setActiveTab('about'); setIsMobileMenuOpen(false); }} />
          </div>

          <div className="border-t border-slate-800 bg-[#0B1120] h-20 flex items-center px-3 flex-shrink-0 overflow-hidden">
            <div className="flex items-center w-full bg-slate-800/40 hover:bg-slate-800 rounded-xl h-14 cursor-pointer transition-colors" onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}>
              <div className="flex items-center justify-center w-[56px] flex-shrink-0">
                <InitialsAvatar name={user.profile.name || 'Resident'} size="md" />
              </div>
              <div className="flex-1 opacity-100 w-auto md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap flex justify-between items-center pr-4 transition-all duration-200">
                <div className="flex flex-col justify-center overflow-hidden mr-2">
                  <p className="text-sm font-bold text-white leading-tight truncate uppercase">{user.profile.firstName || 'Resident'}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Resident</p>
                </div>
                <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400 flex-shrink-0" onClick={e => { e.stopPropagation(); onLogout(); }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto ml-0 md:ml-20 md:peer-hover:ml-64 transition-[margin] duration-200 ease-in-out relative z-10">
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4 md:py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center">
              <button className="md:hidden mr-3 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight capitalize">
                  {activeTab === 'profile' ? 'My Profile' : activeTab === 'request' ? 'Document Requests' : activeTab.replace('-', ' ')}
                </h1>
                <p className="hidden sm:block text-xs md:text-sm font-medium text-slate-500">
                  {activeTab === 'profile' ? 'View and update your information' : activeTab === 'request' ? 'Request and track barangay documents' : activeTab === 'about' ? 'System & Barangay Information' : 'Manage your records'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-slate-50/80 shadow-sm flex items-center">
                <Calendar className="w-3 h-3 md:w-4 mr-1.5" />{currentDate}
              </div>
              <div className="hidden sm:flex items-center space-x-2 border border-slate-200 px-3 py-1.5 rounded-lg bg-white/90 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setActiveTab('profile')} title="Go to Profile">
                <InitialsAvatar name={user.profile.name || 'Resident'} size="sm" />
                <span className="font-bold text-sm text-slate-700 max-w-[120px] truncate uppercase hidden sm:inline-block ml-2">
                  {user.profile.firstName || 'Me'}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="max-w-5xl mx-auto animate-in fade-in duration-300 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 md:h-40 bg-gradient-to-r from-blue-800 to-blue-600 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                </div>
                <div className="px-4 md:px-8 pb-6 md:pb-10 relative">
                  <div className="absolute -top-10 left-4 md:-top-12 md:left-8 bg-white p-1.5 rounded-full shadow-lg">
                    <InitialsAvatar name={user.profile.name || ''} size="2xl" />
                  </div>

                  <div className="pt-12 md:pt-16">
                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-3xl animate-in fade-in duration-300">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Edit My Information</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInput label="First Name" required value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                            <FormInput label="Middle Name" value={editForm.middleName} onChange={e => setEditForm({ ...editForm, middleName: e.target.value })} />
                            <FormInput label="Last Name" required value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                          </div>
                          
                          <FormInput label="Date of Birth" type="date" required value={editForm.dateOfBirth || ''} onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700 hover:bg-white transition-colors" />
                          <FormInput label="Place of Birth" required value={editForm.placeOfBirth || ''} onChange={e => setEditForm({ ...editForm, placeOfBirth: e.target.value })} />
                          <FormInput label="Nationality" required value={editForm.nationality || ''} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} />
                          <FormInput label="Religion" required value={editForm.religion || ''} onChange={e => setEditForm({ ...editForm, religion: e.target.value })} />
                          <FormSelect label="Civil Status" value={editForm.civilStatus || 'Single'} onChange={e => setEditForm({ ...editForm, civilStatus: e.target.value })}>{CIVIL_STATUSES.map(c => <option key={c}>{c}</option>)}</FormSelect>
                          <FormSelect label="Gender" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>{GENDERS.map(g => <option key={g}>{g}</option>)}</FormSelect>
                          <FormInput label="Age" type="number" required value={editForm.age} onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) })} />
                          <FormInput label="Contact Number" type="tel" value={editForm.contactNumber || ''} onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })} />
                          
                          <div className="md:col-span-2">
                            <FormInput label="Email Address (Login Email)" type="email" required value={editForm.contactEmail || ''} onChange={e => setEditForm({ ...editForm, contactEmail: e.target.value })} />
                          </div>
                          <FormInput label="Occupation" value={editForm.occupation || ''} onChange={e => setEditForm({ ...editForm, occupation: e.target.value })} />
                          <FormSelect label="Educational Attainment" value={editForm.educationalAttainment || ''} onChange={e => setEditForm({ ...editForm, educationalAttainment: e.target.value })}>{EDU_OPTIONS.map(o => <option key={o}>{o}</option>)}</FormSelect>

                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2"><h4 className="text-sm font-bold text-blue-800 mb-1">Location & Household</h4><p className="text-xs text-blue-600 mb-3">Update your address and official household link.</p></div>
                            <div className="sm:col-span-2"><FormInput label="Specific Home Address" value={editForm.homeAddress || ''} onChange={e => setEditForm({ ...editForm, homeAddress: e.target.value })} placeholder="House No., Block, Street..." className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
                            <FormSelect label="Select Household Record" value={editForm.householdId || ''} onChange={e => setEditForm({ ...editForm, householdId: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"><option value="">None / Not Listed</option>{households.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}</FormSelect>
                            <FormSelect label="Household Role" value={editForm.isHouseholdHead} onChange={e => setEditForm({ ...editForm, isHouseholdHead: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"><option value="false">Member</option><option value="true">Head of Household</option></FormSelect>
                            <div className="sm:col-span-2 mt-2">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purok / Sitio <span className="text-red-500">*</span></label>
                              <select value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer" required>{PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}</select>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <div className="sm:col-span-2"><h4 className="text-sm font-bold text-slate-700 mb-1">Account Security</h4><p className="text-xs text-slate-500 mb-2">Update your login password securely.</p></div>
                            <FormInput label="New Password" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Leave blank to keep current" />
                            <FormInput label="Confirm Password" type="password" value={editForm.confirmPassword} onChange={e => setEditForm({ ...editForm, confirmPassword: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Leave blank to keep current" />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-slate-100">
                          <button disabled={isSubmitting} type="submit" className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-70">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Changes</button>
                          <button disabled={isSubmitting} type="button" onClick={() => { setIsEditingProfile(false); setEditForm(initializeEditForm()); }} className="cursor-pointer bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex justify-center items-center">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start pt-4 sm:pt-8">
                          <div>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] uppercase tracking-tight mb-2">{user.profile.name}</h2>
                            <p className="text-sm text-slate-500 font-medium">{user.profile.address || 'Purok N/A'} • {user.profile.civilStatus || 'Single'} • {user.profile.age} years old</p>
                            <div className="mt-4 flex flex-wrap gap-2 items-center">
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border ${user.accountStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}><Activity className="w-3.5 h-3.5 mr-1.5" /> Account: {user.accountStatus || 'Active'}</span>
                              {user.profile.isVoter && (<span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border border-blue-100 shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Registered Voter</span>)}
                              {user.profile.isPwd && (<span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border border-purple-100 shadow-sm"><Accessibility className="w-3.5 h-3.5 mr-1.5" /> PWD</span>)}
                            </div>
                            <p className="text-xs text-slate-400 mt-3 flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> Registered on {new Date(user.dateOfRegistration || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <button onClick={() => setIsEditingProfile(true)} className="cursor-pointer mt-6 sm:mt-0 bg-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"><Pencil className="w-4 h-4 mr-2" /> Edit My Information</button>
                        </div>

                        {/* Beautiful 3-Card Grid Restored */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
                          
                          {/* Personal Details Card */}
                          <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white h-max hover:border-blue-200 transition-colors">
                            <h3 className="text-xs font-bold text-[#1e3a8a] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider"><User className="w-4 h-4 mr-2" /> Personal Details</h3>
                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                              <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</p><p className="text-sm font-bold text-slate-800 uppercase">{user.profile.name}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p><p className="text-sm font-bold text-slate-800">{user.profile.dateOfBirth ? new Date(user.profile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Place of Birth</p><p className="text-sm font-bold text-slate-800">{user.profile.placeOfBirth || 'N/A'}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Age</p><p className="text-sm font-bold text-slate-800">{user.profile.age} years old</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</p><p className="text-sm font-bold text-slate-800 capitalize">{user.profile.gender}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nationality</p><p className="text-sm font-bold text-slate-800">{user.profile.nationality || 'Filipino'}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Religion</p><p className="text-sm font-bold text-slate-800">{user.profile.religion || 'N/A'}</p></div>
                              <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Civil Status</p><p className="text-sm font-bold text-slate-800 capitalize">{user.profile.civilStatus || 'Single'}</p></div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-6 h-max">
                            {/* Contact & Work Card */}
                            <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white hover:border-green-200 transition-colors">
                              <h3 className="text-xs font-bold text-[#15803d] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider"><Activity className="w-4 h-4 mr-2" /> Contact & Work</h3>
                              <div className="space-y-5">
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p><p className="text-sm font-bold text-slate-800 break-all">{user.profile.contactEmail || user.email}</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Number</p><p className="text-sm font-bold text-slate-800">{user.profile.contactNumber || 'N/A'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Occupation</p><p className="text-sm font-bold text-slate-800">{user.profile.occupation || 'N/A'}</p></div>
                                </div>
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Educational Attainment</p><p className="text-sm font-bold text-slate-800">{user.profile.educationalAttainment || 'N/A'}</p></div>
                              </div>
                            </div>

                            {/* Address & Household Card */}
                            <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white hover:border-red-200 transition-colors">
                              <h3 className="text-xs font-bold text-[#e11d48] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider"><MapPin className="w-4 h-4 mr-2" /> Address & Household</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                                <div className="sm:col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Home Address</p><p className="text-sm font-bold text-slate-800">{user.profile.homeAddress || 'N/A'}</p></div>
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purok / Sitio</p><p className="text-sm font-bold text-slate-800">{user.profile.address || 'N/A'}</p></div>
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Municipality</p><p className="text-sm font-bold text-slate-800">{user.profile.municipality || 'Gigaquit'}</p></div>
                                <div className="sm:col-span-2 pt-2 border-t border-slate-100 mt-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Household Link</p>
                                  <div className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <Home className="w-5 h-5 text-blue-600 mr-3" />
                                    <div><p className="text-sm font-extrabold text-blue-900">{displayHHNumber}</p><p className="text-[10px] font-medium text-blue-700 uppercase">Head: {displayHHHead}</p></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* REQUEST DOCUMENT TAB */}
            {activeTab === 'request' && (
              <div className="max-w-4xl mx-auto animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2 text-[#0f172a]" />
                    <h2 className="text-lg font-extrabold text-slate-800">Request a Document</h2>
                  </div>
                  <form onSubmit={handleRequestDoc} className="p-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <FormSelect label="Document Type" required value={reqForm.documentType} onChange={e => setReqForm(f => ({ ...f, documentType: e.target.value }))}>
                          {DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </FormSelect>
                      </div>
                      <FormInput label="First Name" required value={reqForm.firstName} onChange={e => setReqForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Your first name" />
                      <FormInput label="Last Name" required value={reqForm.lastName} onChange={e => setReqForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Your last name" />
                      <FormInput label="Middle Name (Optional)" value={reqForm.middleName} onChange={e => setReqForm(f => ({ ...f, middleName: e.target.value }))} placeholder="Leave blank if none" />
                      <FormInput label="Age" type="number" value={reqForm.age} onChange={e => setReqForm(f => ({ ...f, age: e.target.value }))} placeholder="Your age" />
                      <FormSelect label="Civil Status" value={reqForm.civilStatus} onChange={e => setReqForm(f => ({ ...f, civilStatus: e.target.value }))}>
                        {CIVIL_STATUSES.map(c => <option key={c}>{c}</option>)}
                      </FormSelect>
                      <FormSelect label="Purok / Sitio" required value={reqForm.purok} onChange={e => setReqForm(f => ({ ...f, purok: e.target.value }))}>
                        {PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                      </FormSelect>
                      <div className="md:col-span-2 mt-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purpose of Request <span className="text-red-500">*</span></label>
                        <textarea required value={reqForm.purpose} onChange={e => setReqForm(f => ({ ...f, purpose: e.target.value }))} rows="4" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-blue-500 outline-none bg-slate-50 text-sm resize-none" placeholder="Explain why you need this document..." />
                      </div>
                    </div>
                    <button disabled={isSubmitting} type="submit" className="mt-8 bg-blue-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-900 flex items-center shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-70 cursor-pointer">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Submit Request
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* MY REQUESTS TAB */}
            {activeTab === 'my-requests' && (
              <div className="max-w-5xl mx-auto animate-in fade-in bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 bg-white/50">
                  <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Request History</h2>
                </div>
                <div className="p-4 md:p-8">
                  {reqLoading ? (
                    <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium text-slate-500">No documents requested yet.</p>
                      <button onClick={() => setActiveTab('request')} className="cursor-pointer mt-4 bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors shadow-md">
                        Request a Document →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map(req => (
                        <div key={req.id} className="flex flex-col p-4 md:p-6 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-3">
                            <div>
                              <h4 className="font-bold text-slate-800 text-lg">{req.documentType}</h4>
                              <p className="text-sm text-slate-500 flex items-center mt-1.5 font-medium">
                                <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                                {new Date(req.dateRequested).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex flex-col sm:items-end">
                              <StatusBadge status={req.status} />
                              {req.dateProcessed && (
                                <span className="text-xs text-slate-400 mt-2.5 font-medium">
                                  Processed {new Date(req.dateProcessed).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {req.adminNote && (
                            <div className="mt-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-sm w-full">
                              <span className="font-bold text-blue-900 block mb-1">Message from Admin:</span>
                              <span className="text-blue-800/90 leading-relaxed block">"{req.adminNote}"</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OFFICIALS TAB */}
            {activeTab === 'officials' && (
              <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Barangay Officials</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Get to know the current term's barangay council.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offLoading ? (
                    <div className="col-span-3 text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
                  ) : officialsList.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-400 font-medium bg-white/80 rounded-3xl">No officials recorded.</div>
                  ) : sortedOfficials.map(official => (
                    <div key={official.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-200/60 text-center hover:-translate-y-1 transition-transform hover:shadow-lg">
                      {official.image ? (
                        <div className="w-28 h-28 mx-auto bg-blue-50 rounded-full mb-5 shadow-sm border-2 border-slate-100 overflow-hidden flex items-center justify-center">
                          <img src={official.image} alt={official.name} className="w-full h-full object-cover scale-110" />
                        </div>
                      ) : (
                        <div className="flex justify-center mb-5"><InitialsAvatar name={official.name} size="2xl" /></div>
                      )}
                      <h3 className="font-bold text-lg text-slate-800 leading-tight uppercase">{official.name}</h3>
                      <p className="text-blue-600 text-sm font-bold mt-2 bg-blue-50 inline-block px-3 py-1 rounded-full">{official.position}</p>
                      {official.yearOfTerm && (
                        <p className="text-xs font-bold text-slate-400 mt-3 tracking-widest uppercase">Term: {official.yearOfTerm}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <AboutPage />
            )}

          </main>
        </div>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300 cursor-pointer" onClick={() => setToast({show: false})}>
          <div className={`flex items-center space-x-3 px-5 py-3.5 rounded-xl shadow-2xl font-bold border ${toast.type === 'success' ? 'bg-[#0f172a] text-white border-slate-700/50' : 'bg-red-600 text-white border-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-white" />}
            <span className="text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}