import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, FileText, CheckCircle, Clock, XCircle, User, LogOut, 
  Home, Shield, PlusCircle, Activity, FileCheck, AlertCircle, Menu, X, Loader2,
  MapPin, Key, UserPlus, ArrowLeft, Building2, LayoutDashboard, Heart, Accessibility, Pencil, Calendar, Send, Trash2, Search, ChevronDown, ChevronUp, Ban, UserCheck, BarChart2, Camera
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBf6OACnsfFYpkubm4_XDdjs0dDHAq5HiM",
  authDomain: "brgy-san-isidro-system.firebaseapp.com",
  projectId: "brgy-san-isidro-system",
  storageBucket: "brgy-san-isidro-system.firebasestorage.app",
  messagingSenderId: "1049514592500",
  appId: "1:1049514592500:web:09f785c0d7de3aad6ab6a1",
  measurementId: "G-HTBMX2FQG0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'brgy-san-isidro-app';

// --- CONSTANTS ---
const DEFAULT_OFFICIALS = [
  { name: 'Hon. Roberto S. Kapitan', position: 'Barangay Captain', yearOfTerm: '2023 - 2026', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto' },
  { name: 'Hon. Elena M. Kagawad', position: 'Kagawad - Comm. on Health', yearOfTerm: '2023 - 2026', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
  { name: 'Hon. Mark T. Kagawad', position: 'Kagawad - Comm. on Peace & Order', yearOfTerm: '2023 - 2026', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark' },
  { name: 'Hon. Sarah L. Kagawad', position: 'Kagawad - Comm. on Education', yearOfTerm: '2023 - 2026', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { name: 'Juan P. Kalihim', position: 'Barangay Secretary', yearOfTerm: 'Appointed', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JuanK' },
];

const DOC_TYPES = ["Certificate of Indigency", "Certificate of First Time Job Seeker", "Certificate of Barangay Clearance", "Certificate of Business Permit/Clearance", "Certificate of Residency"];
const PUROKS = ["Sikat", "Kanipaan", "Makugihon", "Magbabaol", "Kalubihan", "Malipayon", "Makiangayon"];

const BRANDING = {
  appName: "Barangay San Isidro RMS",
  appLocation: "Gigaquit, Surigao del Norte",
  appShortName: "Brgy San Isidro",
  appShortLocation: "Gigaquit, SDN",
  logo1: "/gakit.jpg", 
  logo2: "/san isidro logo.jpg", 
  landingBackground: "/bg1.jpg" 
};

const handleImageResize = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > height) { if (width > 400) { height *= 400 / width; width = 400; } } 
      else { if (height > 400) { width *= 400 / height; height = 400; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [sandboxUser, setSandboxUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isCheckingLocalAuth, setIsCheckingLocalAuth] = useState(true);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeout = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3000);
  };

  useEffect(() => {
    document.title = `${BRANDING.appName} — ${BRANDING.appLocation}`;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Firebase Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setSandboxUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!sandboxUser) return;
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
    const householdsRef = collection(db, 'artifacts', appId, 'public', 'data', 'households');
    const officialsRef = collection(db, 'artifacts', appId, 'public', 'data', 'officials');

    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (fetchedUsers.length === 0) {
        setDoc(doc(usersRef, 'admin1'), { email: 'admin@sanisidro.gov', password: 'admin', role: 'admin', profile: { name: 'System Administrator', image: '' } });
      } else {
        setUsers(fetchedUsers);
        const savedUserId = localStorage.getItem('brgy-app-user-id');
        setCurrentUser(prevUser => {
          if (prevUser) return fetchedUsers.find(u => u.id === prevUser.id) || prevUser;
          else if (savedUserId) return fetchedUsers.find(u => u.id === savedUserId) || null;
          return null;
        });
        setIsCheckingLocalAuth(false);
      }
    });

    const unsubRequests = onSnapshot(requestsRef, (snap) => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubHouseholds = onSnapshot(householdsRef, (snap) => { setHouseholds(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsDbReady(true); });
    const unsubOfficials = onSnapshot(officialsRef, (snap) => {
      const fetchedOfficials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (fetchedOfficials.length === 0) DEFAULT_OFFICIALS.forEach(async (off) => await addDoc(officialsRef, off));
      else setOfficials(fetchedOfficials);
    });

    return () => { unsubUsers(); unsubRequests(); unsubHouseholds(); unsubOfficials(); };
  }, [sandboxUser]);

  const handleLogin = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user); localStorage.setItem('brgy-app-user-id', user.id); 
      showToast(`Welcome back, ${user.profile.firstName || user.profile.name.split(' ')[0]}!`);
      return true;
    }
    return false;
  };

  const handleSignup = async (userData) => {
    if (users.find(u => u.email === userData.email)) return false; 
    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const fullName = `${userData.firstName} ${userData.middleName ? userData.middleName + ' ' : ''}${userData.lastName}`.trim().replace(/\s+/g, ' ');
      const newUser = {
        email: userData.email, password: userData.password, role: 'resident', accountStatus: 'Active', dateOfRegistration: new Date().toISOString(),
        profile: {
          name: fullName, image: userData.image || '', firstName: userData.firstName, middleName: userData.middleName, lastName: userData.lastName,
          age: parseInt(userData.age) || 0, gender: userData.gender, address: userData.address, homeAddress: userData.homeAddress || '',
          municipality: 'Gigaquit', householdId: userData.householdId || '', householdRole: userData.isHouseholdHead === 'true' ? 'Head' : 'Member',
          contactNumber: userData.contactNumber || '', contactEmail: userData.email, occupation: userData.occupation || '', educationalAttainment: userData.educationalAttainment || '',
          isVoter: userData.isVoter === 'true', isPwd: userData.isPwd === 'true', is4ps: userData.is4ps === 'true', civilStatus: userData.civilStatus || 'Single',
          dateOfBirth: userData.dateOfBirth || '', placeOfBirth: userData.placeOfBirth || '', nationality: userData.nationality || 'Filipino', religion: userData.religion || '', zipCode: '8400'
        }
      };
      const docRef = await addDoc(usersRef, newUser);
      setCurrentUser({ id: docRef.id, ...newUser });
      localStorage.setItem('brgy-app-user-id', docRef.id); 
      showToast(`Registration successful! Welcome, ${userData.firstName.toUpperCase()}.`);
      return true;
    } catch (err) { console.error("Signup error:", err); return false; }
  };

  const handleLogout = () => {
    setCurrentUser(null); localStorage.removeItem('brgy-app-user-id'); showToast("Logged out successfully.");
  };

  if (!isDbReady || isCheckingLocalAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950 text-blue-100">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
        <h2 className="text-xl font-bold tracking-wide">Connecting to Portal...</h2>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-transparent flex text-slate-800 font-sans">
        {!currentUser ? (
          <LandingScreen onLogin={handleLogin} onSignup={handleSignup} households={households} />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard users={users} requests={requests} households={households} officials={officials} onLogout={handleLogout} showToast={showToast} currentUser={currentUser} />
        ) : (
          <ResidentDashboard user={currentUser} requests={requests.filter(r => r.residentId === currentUser.id)} households={households} officials={officials} onLogout={handleLogout} showToast={showToast} />
        )}
      </div>
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

function LandingScreen({ onLogin, onSignup, households }) {
  const [view, setView] = useState('landing');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(''); const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState(''); const [lastName, setLastName] = useState('');
  const [age, setAge] = useState(''); const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState(''); const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [nationality, setNationality] = useState('Filipino'); const [religion, setReligion] = useState('Roman Catholic');
  const [address, setAddress] = useState(`Purok ${PUROKS[0]}`); const [homeAddress, setHomeAddress] = useState(''); 
  const [householdId, setHouseholdId] = useState(''); const [isHouseholdHead, setIsHouseholdHead] = useState('false');
  const [contactNumber, setContactNumber] = useState(''); const [occupation, setOccupation] = useState('');
  const [educationalAttainment, setEducationalAttainment] = useState(''); const [isVoter, setIsVoter] = useState('false');
  const [isPwd, setIsPwd] = useState('false'); const [is4ps, setIs4ps] = useState('false');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    if (view === 'login') {
      const success = onLogin(email, password);
      if (!success) setError('Invalid email or password.');
    } else {
      const success = await onSignup({ email, password, image: profileImage, firstName, middleName, lastName, age, gender, dateOfBirth, placeOfBirth, nationality, religion, address, homeAddress, householdId, isHouseholdHead, contactNumber, occupation, educationalAttainment, isVoter, isPwd, is4ps });
      if (!success) setError('Email already exists or network error.');
    }
    setIsLoading(false);
  };

  const resetForm = () => { setError(''); setEmail(''); setPassword(''); };

  return (
    <div className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat font-sans selection:bg-blue-500 selection:text-white flex flex-col" style={{ backgroundImage: `url('${BRANDING.landingBackground}')` }}>
      <div className="absolute inset-0 bg-blue-900/40 bg-blend-overlay z-0 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-blue-900/70 z-0"></div>

      <header className="relative z-10 w-full p-4 md:p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-white">
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity duration-200" onClick={() => setView('landing')}>
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-white/30 z-10 overflow-hidden">
              {BRANDING.logo1 ? <img src={BRANDING.logo1} alt="Logo 1" className="w-full h-full object-cover scale-110 drop-shadow-sm" /> : <Shield className="w-6 h-6 text-blue-600" />}
            </div>
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-white/30 z-0 overflow-hidden">
              {BRANDING.logo2 ? <img src={BRANDING.logo2} alt="Logo 2" className="w-full h-full object-cover scale-110 drop-shadow-sm" /> : <Building2 className="w-6 h-6 text-blue-600" />}
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg md:text-xl leading-tight tracking-wide drop-shadow-md">{BRANDING.appName}</h1>
            <p className="text-xs text-blue-100 font-medium drop-shadow-md">{BRANDING.appLocation}</p>
          </div>
        </div>
        
        <div className="hidden sm:flex space-x-3 z-10 relative">
          <button onClick={() => { resetForm(); setView('login'); }} className="cursor-pointer px-5 py-2.5 text-white font-bold hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/20">Sign In</button>
          <button onClick={() => { resetForm(); setView('register'); }} className="cursor-pointer px-5 py-2.5 bg-white text-blue-900 font-extrabold rounded-xl hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5">Register as Resident</button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="inline-block px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/20 backdrop-blur-md text-blue-50 text-xs font-bold tracking-[0.2em] uppercase mb-8 shadow-sm">
            Records Management System
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-3 drop-shadow-xl tracking-tight">{BRANDING.appName.replace(' RMS', '')}</h2>
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-blue-100 mb-8 drop-shadow-lg">Official Records Portal</h3>
          <p className="text-blue-50/90 text-lg md:text-xl max-w-2xl mx-auto mb-12 drop-shadow leading-relaxed font-medium">
            Serving the residents of {BRANDING.appName.replace(' RMS', '')}, {BRANDING.appLocation}. <br className="hidden md:block"/>
            Secure, digital, and always accessible.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:hidden">
            <button onClick={() => { resetForm(); setView('register'); }} className="cursor-pointer w-full flex items-center justify-center px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-xl">
              <UserPlus className="w-5 h-5 mr-2" /> Register
            </button>
            <button onClick={() => { resetForm(); setView('login'); }} className="cursor-pointer w-full flex items-center justify-center px-8 py-4 bg-blue-600/40 hover:bg-blue-600/60 text-white border border-blue-300/30 backdrop-blur-md font-bold rounded-xl transition-colors shadow-xl">
              <Key className="w-5 h-5 mr-2" /> Sign In
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full p-6 text-center">
        <p className="text-blue-300/50 text-xs font-medium tracking-wide">© {new Date().getFullYear()} {BRANDING.appName}, {BRANDING.appLocation}. All rights reserved.</p>
      </footer>

      {/* --- MODAL POP-UPS FOR LOGIN/REGISTER --- */}
      {view !== 'landing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 relative animate-in zoom-in-95 duration-300 slide-in-from-bottom-8 flex flex-col max-h-[90vh]">
            
            <button onClick={() => setView('landing')} className="absolute top-4 right-4 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 md:p-8 text-center text-white relative shrink-0">
              <Shield className="w-12 h-12 mx-auto mb-4 text-blue-200 drop-shadow-md" />
              {view === 'login' ? (
                <>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">Welcome Back!</h2>
                  <p className="text-blue-200 text-sm mt-1.5 font-medium drop-shadow-sm">Please login with your personal info</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">Resident Registration</h2>
                  <p className="text-blue-200 text-sm mt-1.5 font-medium drop-shadow-sm">Create your official digital record</p>
                </>
              )}
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
              {error && (
                <div className="mb-6 p-3.5 bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                {view === 'register' && (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                      {profileImage ? (
                        <img src={profileImage} alt="Preview" className="w-20 h-20 rounded-full object-cover scale-110 border-4 border-white shadow-md group-hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-2 shadow-inner group-hover:bg-slate-300 transition-colors">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Upload Photo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], setProfileImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name <span className="text-red-500">*</span></label><input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Juan" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Middle Name</label><input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Reyes" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name <span className="text-red-500">*</span></label><input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Dela Cruz" /></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date of Birth</label><input required type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Place of Birth</label><input required type="text" value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="City, Province" /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Age</label><input required type="number" min="0" value={age} onChange={e => setAge(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="0" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gender</label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"><option>Male</option><option>Female</option></select></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nationality</label><input required type="text" value={nationality} onChange={e => setNationality(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Filipino" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Religion</label><input required type="text" value={religion} onChange={e => setReligion(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Roman Catholic" /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Number</label><input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="09XX..." /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Education</label><select value={educationalAttainment} onChange={e => setEducationalAttainment(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"><option value="">Select...</option><option>Elementary Level</option><option>Elementary Graduate</option><option>High School Level</option><option>High School Graduate</option><option>College Level</option><option>College Graduate</option><option>Vocational</option><option>Post-Graduate</option></select></div>
                    </div>

                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Occupation</label><input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="E.g. Farmer, Teacher, None" /></div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Home Address <span className="text-red-500">*</span></label><input required type="text" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="e.g. Block 1, Lot 2" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purok <span className="text-red-500">*</span></label><div className="relative"><MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><select required value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm">{PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}</select></div></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Household</label><select value={householdId} onChange={e => setHouseholdId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"><option value="">None / Not listed</option>{households.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}</select></div>
                      <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Household Role</label><select value={isHouseholdHead} onChange={e => setIsHouseholdHead(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"><option value="false">Member</option><option value="true">Head</option></select></div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-center">Voter?</label><select value={isVoter} onChange={e => setIsVoter(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="true">Yes</option><option value="false">No</option></select></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-center">PWD?</label><select value={isPwd} onChange={e => setIsPwd(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="false">No</option><option value="true">Yes</option></select></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-center">4Ps?</label><select value={is4ps} onChange={e => setIs4ps(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="false">No</option><option value="true">Yes</option></select></div>
                    </div>
                  </div>
                )}

                {/* Floating Label Inputs for Email & Password */}
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <input required type="email" id="email-input" value={email} onChange={e => setEmail(e.target.value)} className="block w-full px-4 pt-6 pb-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-sm font-medium peer cursor-text" placeholder=" " autoComplete="off" />
                    <label htmlFor="email-input" className="absolute text-slate-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 font-bold text-xs uppercase tracking-wider cursor-text pointer-events-none">Email Address <span className="text-red-500">*</span></label>
                  </div>
                  <div className="relative">
                    <input required type="password" id="password-input" value={password} onChange={e => setPassword(e.target.value)} className="block w-full px-4 pt-6 pb-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-sm font-medium peer cursor-text" placeholder=" " autoComplete="new-password" />
                    <label htmlFor="password-input" className="absolute text-slate-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 font-bold text-xs uppercase tracking-wider cursor-text pointer-events-none">Password <span className="text-red-500">*</span></label>
                  </div>
                </div>

                <button disabled={isLoading} type="submit" className="cursor-pointer w-full bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 mt-6 shadow-md shadow-blue-500/30 flex justify-center items-center hover:-translate-y-0.5">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'login' ? 'Secure Sign In' : 'Complete Registration')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- REDESIGNED ADMIN DASHBOARD ---
function AdminDashboard({ users, requests, households, officials, onLogout, showToast, currentUser }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [reqStatus, setReqStatus] = useState('Pending');
  const [isSaving, setIsSaving] = useState(false);

  const [resSearch, setResSearch] = useState('');
  const [resGenderFilter, setResGenderFilter] = useState('All Genders');
  const [resPurokFilter, setResPurokFilter] = useState('All Puroks');
  const [resStatusFilter, setResStatusFilter] = useState('All Status');
  const [resTagFilter, setResTagFilter] = useState('All Tags'); 
  
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState('All');

  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resModalMode, setResModalMode] = useState('add');
  const [selectedResId, setSelectedResId] = useState(null);
  const [resForm, setResForm] = useState({ email: '', password: '', image: '', firstName: '', middleName: '', lastName: '', age: '', gender: 'Male', dateOfBirth: '', placeOfBirth: '', nationality: 'Filipino', religion: 'Roman Catholic', address: `Purok ${PUROKS[0]}`, homeAddress: '', householdId: '', isHouseholdHead: 'false', contactNumber: '', occupation: '', educationalAttainment: '', isVoter: 'false', isPwd: 'false', is4ps: 'false', accountStatus: 'Active' });

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

  const residents = useMemo(() => users.filter(u => u.role === 'resident'), [users]);
  const stats = useMemo(() => ({ population: residents.length, households: households.length, male: residents.filter(r => r.profile.gender === 'Male').length, female: residents.filter(r => r.profile.gender === 'Female').length, minor: residents.filter(r => r.profile.age < 18).length, adult: residents.filter(r => r.profile.age >= 18).length, senior: residents.filter(r => r.profile.age >= 60).length, pwd: residents.filter(r => r.profile.isPwd).length, voters: residents.filter(r => r.profile.isVoter).length, fourPs: residents.filter(r => r.profile.is4ps).length, pendingReqs: requests.filter(r => r.status === 'Pending').length }), [residents, requests, households]);

  const handleSaveRequestDetails = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', selectedReq.id), { status: reqStatus, adminNote: adminNote, dateProcessed: new Date().toISOString() }); setIsReqModalOpen(false); showToast("Request updated successfully."); } catch (err) { console.error(err); showToast("Failed to update request.", "error"); }
    setIsSaving(false);
  };

  const handleDeleteRequest = async (reqId) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', reqId)); showToast("Request deleted successfully."); } catch (err) { console.error(err); showToast("Failed to delete request.", "error"); } };

  const openEditModal = (req) => { setSelectedReq(req); setReqStatus(req.status); setAdminNote(req.adminNote || ''); setIsReqModalOpen(true); };

  const openAddResident = () => { setResModalMode('add'); setSelectedResId(null); setResForm({ email: '', password: '', image: '', firstName: '', middleName: '', lastName: '', age: '', gender: 'Male', dateOfBirth: '', placeOfBirth: '', nationality: 'Filipino', religion: 'Roman Catholic', address: `Purok ${PUROKS[0]}`, homeAddress: '', householdId: '', isHouseholdHead: 'false', contactNumber: '', occupation: '', educationalAttainment: '', isVoter: 'false', isPwd: 'false', is4ps: 'false', accountStatus: 'Active' }); setIsResModalOpen(true); };

  const openEditResident = (res) => {
    setResModalMode('edit'); setSelectedResId(res.id);
    setResForm({ email: res.email || '', password: res.password || '', image: res.profile.image || '', firstName: res.profile.firstName || '', middleName: res.profile.middleName || '', lastName: res.profile.lastName || '', age: res.profile.age || '', gender: res.profile.gender || 'Male', dateOfBirth: res.profile.dateOfBirth || '', placeOfBirth: res.profile.placeOfBirth || '', nationality: res.profile.nationality || 'Filipino', religion: res.profile.religion || 'Roman Catholic', address: res.profile.address || `Purok ${PUROKS[0]}`, homeAddress: res.profile.homeAddress || '', householdId: res.profile.householdId || '', isHouseholdHead: res.profile.householdRole === 'Head' ? 'true' : 'false', contactNumber: res.profile.contactNumber || '', occupation: res.profile.occupation || '', educationalAttainment: res.profile.educationalAttainment || '', isVoter: res.profile.isVoter ? 'true' : 'false', isPwd: res.profile.isPwd ? 'true' : 'false', is4ps: res.profile.is4ps ? 'true' : 'false', accountStatus: res.accountStatus || 'Active', civilStatus: res.profile.civilStatus || 'Single' });
    setIsResModalOpen(true);
  };

  const handleSaveResident = async (e) => {
    e.preventDefault(); setIsSaving(true);
    if (resModalMode === 'add' && users.find(u => u.email === resForm.email)) { showToast("Email already exists.", "error"); setIsSaving(false); return; }
    try {
      const fullName = `${resForm.firstName} ${resForm.middleName ? resForm.middleName + ' ' : ''}${resForm.lastName}`.trim().replace(/\s+/g, ' ');
      const resData = { email: resForm.email, password: resForm.password, role: 'resident', accountStatus: resForm.accountStatus, profile: { name: fullName, image: resForm.image, firstName: resForm.firstName, middleName: resForm.middleName, lastName: resForm.lastName, age: parseInt(resForm.age) || 0, gender: resForm.gender, address: resForm.address, homeAddress: resForm.homeAddress, municipality: 'Gigaquit', householdId: resForm.householdId, householdRole: resForm.isHouseholdHead === 'true' ? 'Head' : 'Member', contactNumber: resForm.contactNumber, contactEmail: resForm.email, occupation: resForm.occupation, educationalAttainment: resForm.educationalAttainment, isVoter: resForm.isVoter === 'true', isPwd: resForm.isPwd === 'true', is4ps: resForm.is4ps === 'true', civilStatus: resForm.civilStatus || 'Single', dateOfBirth: resForm.dateOfBirth, placeOfBirth: resForm.placeOfBirth, nationality: resForm.nationality, religion: resForm.religion, zipCode: '8400' } };
      if (resModalMode === 'add') { resData.dateOfRegistration = new Date().toISOString(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), resData); showToast("Resident added successfully."); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', selectedResId), resData); showToast("Resident updated successfully."); }
      setIsResModalOpen(false); 
    } catch (err) { console.error(err); showToast(`Failed to ${resModalMode} resident.`, "error"); }
    setIsSaving(false);
  };

  const handleDeleteResident = async (resId) => { if(window.confirm("Are you sure you want to delete this resident?")) { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', resId)); showToast("Resident deleted successfully."); } catch (err) { console.error(err); showToast("Failed to delete resident.", "error"); } } };

  const generateHHNumber = () => { if (households.length === 0) return "HH-001"; const max = Math.max(...households.map(h => parseInt(h.hhNumber.match(/\d+/)?.[0] || 0)), 0); return `HH-${String(max + 1).padStart(3, '0')}`; };
  const openAddHousehold = () => { setHhModalMode('add'); setSelectedHhId(null); setHhForm({ headName: '', address: '', purok: `Purok ${PUROKS[0]}`, is4ps: 'No', status: 'Active' }); setIsHhModalOpen(true); };
  const openEditHousehold = (hh) => { setHhModalMode('edit'); setSelectedHhId(hh.id); setHhForm({ headName: hh.headName, address: hh.address || '', purok: hh.purok || `Purok ${PUROKS[0]}`, is4ps: hh.is4ps ? 'Yes' : 'No', status: hh.status || 'Active' }); setIsHhModalOpen(true); };

  const handleSaveHousehold = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const hhData = { headName: hhForm.headName.toUpperCase(), address: hhForm.address, purok: hhForm.purok, is4ps: hhForm.is4ps === 'Yes', status: hhForm.status };
      if (hhModalMode === 'add') { hhData.hhNumber = generateHHNumber(); hhData.dateRegistered = new Date().toISOString(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'households'), hhData); showToast("Household created successfully."); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'households', selectedHhId), hhData); showToast("Household updated successfully."); }
      setIsHhModalOpen(false);
    } catch (err) { console.error(err); showToast(`Failed to ${hhModalMode} household.`, "error"); }
    setIsSaving(false);
  };

  const handleDeleteHousehold = async (hhId) => { if(window.confirm("Delete this household?")) { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'households', hhId)); showToast("Household deleted."); } catch (err) { console.error(err); showToast("Error deleting household.", "error"); } } };

  const openAddOfficial = () => { setOffModalMode('add'); setSelectedOffId(null); setOffForm({ name: '', position: '', yearOfTerm: '', image: '' }); setIsOffModalOpen(true); };
  const openEditOfficial = (off) => { setOffModalMode('edit'); setSelectedOffId(off.id); setOffForm({ name: off.name, position: off.position, yearOfTerm: off.yearOfTerm || '', image: off.image || '' }); setIsOffModalOpen(true); };
  const handleSaveOfficial = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const payload = { ...offForm, image: offForm.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${offForm.name}` };
      if (offModalMode === 'add') { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'officials'), payload); showToast("Official added."); } 
      else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'officials', selectedOffId), payload); showToast("Official updated."); }
      setIsOffModalOpen(false);
    } catch (err) { console.error(err); showToast(`Failed to ${offModalMode} official.`, "error"); }
    setIsSaving(false);
  };

  const handleDeleteOfficial = async (offId) => { if(window.confirm("Delete this official?")) { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'officials', offId)); showToast("Official removed."); } catch (err) { console.error(err); showToast("Failed to remove official.", "error"); } } };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const filteredRequests = requests.filter(r => filterStatus === 'All' || r.status === filterStatus);
  const filteredResidents = residents.filter(r => {
    const matchesSearch = r.profile.name.toLowerCase().includes(resSearch.toLowerCase());
    const matchesGender = resGenderFilter === 'All Genders' || r.profile.gender === resGenderFilter;
    const matchesPurok = resPurokFilter === 'All Puroks' || r.profile.address === (resPurokFilter === 'All Puroks' ? 'All' : `Purok ${resPurokFilter}`);
    const matchesStatus = resStatusFilter === 'All Status' || r.accountStatus === resStatusFilter;
    const matchesTag = resTagFilter === 'All Tags' || (resTagFilter === 'Senior' && r.profile.age >= 60) || (resTagFilter === 'PWD' && r.profile.isPwd) || (resTagFilter === 'Voter' && r.profile.isVoter) || (resTagFilter === '4Ps' && r.profile.is4ps);
    return matchesSearch && matchesGender && matchesPurok && matchesStatus && matchesTag;
  });

  const filteredHouseholds = households.filter(h => h.hhNumber.toLowerCase().includes(hhSearch.toLowerCase()) || h.headName.toLowerCase().includes(hhSearch.toLowerCase())).sort((a,b) => a.hhNumber.localeCompare(b.hhNumber));
  const eligibleVoters = residents.filter(r => r.profile.age >= 18).length;
  const registeredVoters = residents.filter(r => r.profile.isVoter).length;
  const nonVotersCount = eligibleVoters > registeredVoters ? eligibleVoters - registeredVoters : 0;
  const registrationRate = eligibleVoters > 0 ? ((registeredVoters / eligibleVoters) * 100).toFixed(1) : 0;

  const filteredVoters = residents.filter(r => {
    if (!(r.profile.age >= 18 || r.profile.isVoter)) return false; 
    const matchesSearch = r.profile.name.toLowerCase().includes(voterSearch.toLowerCase());
    const matchesStatus = voterFilter === 'All' || (voterFilter === 'Registered' && r.profile.isVoter) || (voterFilter === 'Non-Voters' && !r.profile.isVoter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${BRANDING.landingBackground}')` }}>
      <div className="absolute inset-0 bg-blue-100/85 backdrop-blur-[3px] z-0"></div>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <div className={`peer fixed inset-y-0 left-0 z-50 bg-[#0f172a]/95 backdrop-blur-md text-slate-300 shadow-2xl transition-[width] duration-200 ease-in-out flex flex-col group overflow-x-hidden ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0 md:w-20 md:hover:w-64`}>
        <div className="h-20 flex items-center pl-[18px] border-b border-slate-800 flex-shrink-0 overflow-hidden cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}}>
          <div className="flex items-center space-x-[-12px] flex-shrink-0 pr-1">
            <div className={`w-11 h-11 bg-white rounded-full items-center justify-center shadow-lg border-2 border-[#0f172a] hidden group-hover:flex z-10 overflow-hidden shrink-0`}>
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
          <button className="md:hidden ml-auto mr-4 text-slate-400 hover:text-white p-1" onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Overview</div>
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
          <SidebarItem icon={Building2} label="Officials" badge="5" isActive={activeTab === 'officials'} onClick={() => {setActiveTab('officials'); setIsMobileMenuOpen(false);}} />
        </div>

        <div className="border-t border-slate-800 bg-[#0B1120] h-20 flex items-center px-3 flex-shrink-0 overflow-hidden">
          <div className="flex items-center w-full bg-slate-800/40 hover:bg-slate-800 rounded-xl h-14 cursor-pointer transition-colors" onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}}>
             <div className="flex items-center justify-center w-[56px] flex-shrink-0">
                {currentUser?.profile?.image ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-600 flex items-center justify-center bg-slate-200">
                    <img src={currentUser.profile.image} alt="admin" className="w-full h-full object-cover scale-110" />
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-blue-600 rounded-full text-white flex items-center justify-center font-extrabold text-xs">AD</div>
                )}
             </div>
             <div className="flex-1 opacity-100 w-auto md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-200 flex justify-between items-center pr-4">
               <div className="flex flex-col justify-center">
                 <p className="text-sm font-bold text-white leading-tight">Admin</p>
                 <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
               </div>
               <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onLogout(); }}/>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto ml-0 md:ml-20 md:peer-hover:ml-64 transition-[margin] duration-200 ease-in-out relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4 md:py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button className="md:hidden mr-3 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab.replace('-', ' ')}</h1>
              <p className="hidden sm:block text-xs md:text-sm font-medium text-slate-500">
                {activeTab === 'requests' ? 'Manage resident document requests' : 
                 activeTab === 'residents' ? `Manage registered residents directory` : 
                 activeTab === 'households' ? 'Manage household records' : 
                 activeTab === 'voters' ? 'Registered & Non-Registered Voters' : 
                 activeTab === 'officials' ? 'Manage Officials' : 'Overview & Statistics'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="text-[10px] md:text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-slate-50/80 shadow-sm flex items-center">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              {currentDate}
            </div>
            <div className="hidden sm:flex items-center space-x-2 border border-slate-200 px-3 py-1.5 rounded-lg bg-white/90 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={onLogout} title="Click to logout">
              {currentUser?.profile?.image ? (
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200">
                  <img src={currentUser.profile.image} alt="admin" className="w-full h-full object-cover scale-110" />
                </div>
              ) : (
                <div className="w-7 h-7 bg-blue-600 rounded-full text-white flex items-center justify-center font-bold text-xs">AD</div>
              )}
              <span className="font-bold text-sm text-slate-700 hidden sm:inline-block">Admin</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
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
                  <div className="flex items-center font-extrabold text-slate-800 mb-6">
                    <Users className="w-5 h-5 mr-2 text-slate-400" /> Gender Distribution
                  </div>
                  <div className="space-y-6 mb-8">
                    <div className="cursor-pointer group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-slate-500 flex items-center group-hover:text-blue-500 transition-colors"><span className="text-blue-500 mr-2 text-lg">♂</span> Male</span>
                        <span className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{stats.male}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full shadow-sm" style={{ width: `${(stats.male/stats.population)*100 || 0}%` }}></div></div>
                    </div>
                    <div className="cursor-pointer group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-slate-500 flex items-center group-hover:text-pink-500 transition-colors"><span className="text-pink-500 mr-2 text-lg">♀</span> Female</span>
                        <span className="font-extrabold text-slate-800 group-hover:text-pink-600 transition-colors">{stats.female}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-pink-500 h-2.5 rounded-full shadow-sm" style={{ width: `${(stats.female/stats.population)*100 || 0}%` }}></div></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Adults</p><p className="text-2xl font-extrabold text-blue-600">{stats.adult}</p>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Minors</p><p className="text-2xl font-extrabold text-amber-500">{stats.minor}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center font-extrabold text-slate-800 mb-6">
                    <CheckCircle className="w-5 h-5 mr-2 text-slate-400" /> Special Groups
                  </div>
                  <div className="space-y-6">
                    <ProgressBar label="Senior Citizens" value={stats.senior} total={stats.population} color="bg-red-500" onClick={() => { setActiveTab('residents'); setResTagFilter('Senior'); }} />
                    <ProgressBar label="PWDs" value={stats.pwd} total={stats.population} color="bg-purple-500" onClick={() => { setActiveTab('residents'); setResTagFilter('PWD'); }} />
                    <ProgressBar label="Registered Voters" value={stats.voters} total={stats.adult} color="bg-blue-800" onClick={() => { setActiveTab('voters'); }} />
                    <ProgressBar label="4Ps Beneficiaries" value={stats.fourPs} total={stats.households} color="bg-cyan-500" onClick={() => { setActiveTab('residents'); setResTagFilter('4Ps'); }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'households' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto">
                  <Home className="w-5 h-5 mr-2 text-slate-700" /> Household Records
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" />
                    <input type="text" placeholder="Search household..." value={hhSearch} onChange={(e) => setHhSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all hover:bg-white" />
                  </div>
                  <button onClick={openAddHousehold} className="cursor-pointer bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm ml-1 whitespace-nowrap hover:-translate-y-0.5">
                    <PlusCircle className="w-4 h-4 mr-2" /> Add
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200">
                      <th className="p-4 whitespace-nowrap">HH #</th><th className="p-4">Head of Family</th><th className="p-4">Address</th><th className="p-4">Purok/Sitio</th><th className="p-4 text-center">Members</th><th className="p-4 text-center">4Ps</th><th className="p-4 text-center">Status</th><th className="p-4">Registered</th><th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHouseholds.length === 0 ? (
                      <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-medium">No households found.</td></tr>
                    ) : filteredHouseholds.map(hh => {
                      const hhMembers = residents.filter(r => r.profile.householdId === hh.id && r.profile.householdRole !== 'Head');
                      const isExpanded = expandedHH === hh.id;
                      const hhDate = new Date(hh.dateRegistered).toLocaleDateString('en-CA'); 

                      return (
                        <React.Fragment key={hh.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                            <td className="p-4 text-sm font-extrabold text-blue-700">{hh.hhNumber}</td>
                            <td className="p-4">
                              <div className="flex items-center cursor-pointer">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center mr-3 text-xs flex-shrink-0">
                                  {hh.headName.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-extrabold text-[#0f172a] text-sm tracking-tight uppercase group-hover:text-blue-600 transition-colors">{hh.headName}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-600">{hh.address || '-'}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm">
                                <MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {hh.purok}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => setExpandedHH(isExpanded ? null : hh.id)} className="cursor-pointer inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-md hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm">
                                {hhMembers.length} <span className="ml-1 font-medium flex items-center opacity-70 text-[10px]">{isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5"/> : <ChevronDown className="w-3 h-3 ml-0.5"/>} view</span>
                              </button>
                            </td>
                            <td className="p-4 text-center text-sm font-bold text-slate-400">{hh.is4ps ? 'Yes' : 'No'}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${hh.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                {hh.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-500">{hhDate}</td>
                            <td className="p-4 text-center space-x-1 whitespace-nowrap">
                              <button onClick={() => openEditHousehold(hh)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Edit"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteHousehold(hh.id)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                              <td colSpan="9" className="p-0">
                                <div className="px-4 md:px-16 py-4 animate-in slide-in-from-top-2 duration-200">
                                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Registered Household Members</h5>
                                  {hhMembers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {hhMembers.map(m => (
                                        <div key={m.id} className="flex items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
                                          {m.profile.image ? (
                                            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                              <img src={m.profile.image} alt={m.profile.name} className="w-full h-full object-cover scale-110" />
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center mr-3 text-xs flex-shrink-0">
                                              {m.profile.firstName?.[0] || ''}{m.profile.lastName?.[0] || ''}
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-sm font-bold text-slate-800 uppercase leading-tight">{m.profile.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex gap-1 flex-wrap items-center">
                                              {m.profile.age} yrs • {m.profile.gender} • {m.profile.civilStatus || 'Single'}
                                              {m.profile.age >= 60 && <span className="bg-amber-100 text-amber-700 px-1 rounded ml-1 font-bold">Senior</span>}
                                              {m.profile.isPwd && <span className="bg-purple-100 text-purple-700 px-1 rounded ml-1 font-bold">PWD</span>}
                                              {m.profile.isVoter && <span className="bg-blue-100 text-blue-700 px-1 rounded ml-1 font-bold">Voter</span>}
                                              {m.profile.is4ps && <span className="bg-cyan-100 text-cyan-700 px-1 rounded ml-1 font-bold">4Ps</span>}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm font-medium text-slate-400 flex items-center bg-white p-4 rounded-lg border border-slate-200 border-dashed">
                                      <AlertCircle className="w-4 h-4 mr-2 opacity-50"/> No residents linked to this household yet.
                                    </div>
                                  )}
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
            </div>
          )}

          {activeTab === 'residents' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto">
                  <Users className="w-5 h-5 mr-2 text-slate-700" /> Resident Records
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" />
                    <input type="text" placeholder="Search resident..." value={resSearch} onChange={(e) => setResSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-colors hover:bg-white" />
                  </div>
                  {resTagFilter !== 'All Tags' && (
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg border border-blue-200 flex items-center cursor-pointer" onClick={() => setResTagFilter('All Tags')} title="Clear Filter">
                      Filter: {resTagFilter} <X className="w-3 h-3 ml-1" />
                    </div>
                  )}
                  <select value={resGenderFilter} onChange={e=>setResGenderFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors">
                    <option>All Genders</option><option>Male</option><option>Female</option>
                  </select>
                  <select value={resPurokFilter} onChange={e=>setResPurokFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors">
                    <option>All Puroks</option>
                    {PUROKS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={resStatusFilter} onChange={e=>setResStatusFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors">
                    <option>All Status</option><option>Active</option><option>Inactive</option>
                  </select>
                  <button onClick={openAddResident} className="cursor-pointer bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm ml-1 whitespace-nowrap hover:-translate-y-0.5">
                    <PlusCircle className="w-4 h-4 mr-2" /> Add
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200">
                      <th className="p-4 text-center w-10">#</th><th className="p-4">Name</th><th className="p-4 text-center">Age</th><th className="p-4 text-center">Gender</th><th className="p-4">Civil Status</th><th className="p-4">Purok/Sitio</th><th className="p-4">Household Head</th><th className="p-4">Tags</th><th className="p-4">Registered</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResidents.length === 0 ? (
                      <tr><td colSpan="11" className="p-8 text-center text-slate-500 font-medium">No residents found.</td></tr>
                    ) : filteredResidents.map((res, index) => {
                      const initials = `${res.profile.firstName?.[0] || ''}${res.profile.lastName?.[0] || ''}`;
                      const formattedName = `${res.profile.lastName || ''}, ${res.profile.firstName || ''} ${res.profile.middleName || ''}`.trim().toUpperCase() || res.profile.name.toUpperCase();
                      const hhInfo = households.find(h => h.id === res.profile.householdId);
                      const headDisplay = res.profile.householdRole === 'Head' ? '-' : (hhInfo ? hhInfo.headName : '-');
                      const regDate = new Date(res.dateOfRegistration || Date.now()).toLocaleDateString('en-CA');

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                          <td className="p-4 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center">
                              {res.profile.image ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                  <img src={res.profile.image} alt={res.profile.name} className="w-full h-full object-cover scale-110" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center mr-3 text-xs flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  {initials || 'U'}
                                </div>
                              )}
                              <span className="font-extrabold text-[#0f172a] text-sm tracking-tight group-hover:text-blue-700 transition-colors">{formattedName}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-600 text-center">{res.profile.age}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.profile.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{res.profile.gender}</span>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-600">{res.profile.civilStatus || 'Single'}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm group-hover:border-red-200 transition-colors">
                              <MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {res.profile.address}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[120px]" title={headDisplay}>{headDisplay}</td>
                          <td className="p-4 flex flex-wrap gap-1">
                            {res.profile.age >= 60 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded shadow-sm">Senior</span>}
                            {res.profile.isVoter && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm">Voter</span>}
                            {res.profile.isPwd && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded shadow-sm">PWD</span>}
                            {res.profile.is4ps && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded shadow-sm">4Ps</span>}
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500">{regDate}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.accountStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                              {res.accountStatus || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-center space-x-1 whitespace-nowrap">
                            <button onClick={() => openEditResident(res)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteResident(res.id)} className="cursor-pointer p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hover:-translate-y-0.5" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'voters' && (
            <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <ModernStatCard title="Registered Voters" value={registeredVoters} icon={FileCheck} color="text-blue-600" borderTop="border-t-blue-600" />
                <ModernStatCard title="Non-Voters (18+)" value={nonVotersCount} icon={Ban} color="text-red-500" borderTop="border-t-red-500" />
                <ModernStatCard title="Eligible (18+)" value={eligibleVoters} icon={UserCheck} color="text-emerald-500" borderTop="border-t-emerald-500" />
                <ModernStatCard title="Registration Rate" value={`${registrationRate}%`} icon={BarChart2} color="text-amber-500" borderTop="border-t-amber-400" />
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white/50 gap-4">
                  <div className="flex items-center font-extrabold text-[#0f172a] text-lg w-full md:w-auto">
                    <FileCheck className="w-5 h-5 mr-2 text-slate-700" /> Voter Records
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 cursor-text" />
                      <input type="text" placeholder="Search..." value={voterSearch} onChange={(e) => setVoterSearch(e.target.value)} className="cursor-text w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-colors hover:bg-white" />
                    </div>
                    <select value={voterFilter} onChange={e=>setVoterFilter(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none bg-slate-50 hover:bg-white transition-colors">
                      <option>All</option><option>Registered</option><option>Non-Voters</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200">
                        <th className="p-4 text-center w-10">#</th><th className="p-4">Name</th><th className="p-4 text-center">Age</th><th className="p-4 text-center">Gender</th><th className="p-4">Purok/Sitio</th><th className="p-4 text-center">Voter Status</th><th className="p-4">Household Head</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVoters.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No voters found.</td></tr>
                      ) : filteredVoters.map((res, index) => {
                        const formattedName = `${res.profile.lastName || ''}, ${res.profile.firstName || ''} ${res.profile.middleName || ''}`.trim().toUpperCase() || res.profile.name.toUpperCase();
                        const hhInfo = households.find(h => h.id === res.profile.householdId);
                        const headDisplay = res.profile.householdRole === 'Head' ? '-' : (hhInfo ? hhInfo.headName : '-');

                        return (
                          <tr key={res.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                            <td className="p-4 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="p-4 font-extrabold text-[#0f172a] text-sm tracking-tight group-hover:text-blue-700 transition-colors">
                              <div className="flex items-center">
                                {res.profile.image ? (
                                  <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <img src={res.profile.image} alt={res.profile.name} className="w-full h-full object-cover scale-110" />
                                  </div>
                                ) : null}
                                {formattedName}
                              </div>
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-600 text-center">{res.profile.age}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${res.profile.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{res.profile.gender}</span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-600 bg-white whitespace-nowrap shadow-sm">
                                <MapPin className="w-3 h-3 text-red-500 inline mr-1" /> {res.profile.address}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {res.profile.isVoter ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">✓ Registered</span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">Non-Voter</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[150px]" title={headDisplay}>{headDisplay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                <div className="flex items-center text-[#0f172a] font-extrabold text-lg">
                  <FileText className="w-5 h-5 mr-2 text-slate-700" /> Document Requests
                </div>
                <div>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="cursor-pointer border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500 hover:bg-white transition-colors">
                    <option value="All">All Status</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4 font-extrabold">Request Date</th><th className="p-4 font-extrabold">Name</th><th className="p-4 font-extrabold">Document Type</th><th className="p-4 font-extrabold">Civil Status</th><th className="p-4 font-extrabold">Purok/Sitio</th><th className="p-4 font-extrabold text-center">Status</th><th className="p-4 font-extrabold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No requests found.</td></tr>
                    ) : filteredRequests.sort((a,b) => new Date(b.dateRequested) - new Date(a.dateRequested)).map(req => {
                      const resident = residents.find(r => r.id === req.residentId);
                      const reqDate = new Date(req.dateRequested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const fullName = req.requestDetails ? `${req.requestDetails.firstName} ${req.requestDetails.lastName}`.toUpperCase() : resident?.profile.name.toUpperCase() || 'UNKNOWN';
                      const civilStatus = req.requestDetails?.civilStatus || resident?.profile.civilStatus || 'Single';
                      const purok = req.requestDetails?.purok || resident?.profile.address || 'N/A';

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

          {activeTab === 'officials' && (
             <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Barangay Officials</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage the current term's barangay council.</p>
                </div>
                <button onClick={openAddOfficial} className="cursor-pointer bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm hover:-translate-y-0.5">
                  <PlusCircle className="w-5 h-5 mr-2" /> Add Official
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {officials.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-slate-400 font-medium bg-white/80 rounded-3xl">No officials recorded.</div>
                ) : officials.map(official => (
                  <div key={official.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-200/60 text-center hover:-translate-y-1 transition-transform relative group cursor-pointer hover:shadow-lg">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button onClick={() => openEditOfficial(official)} className="cursor-pointer p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors shadow-sm"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteOfficial(official.id)} className="cursor-pointer p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <div className="w-28 h-28 mx-auto bg-blue-50 rounded-full mb-5 shadow-sm border-2 border-slate-100 overflow-hidden flex items-center justify-center">
                      <img src={official.image} alt={official.name} className="w-full h-full object-cover scale-110" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight uppercase">{official.name}</h3>
                    <p className="text-blue-600 text-sm font-bold mt-2 bg-blue-50 inline-block px-3 py-1 rounded-full">{official.position}</p>
                    {official.yearOfTerm && <p className="text-xs font-bold text-slate-400 mt-3 tracking-widest uppercase">Term: {official.yearOfTerm}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {isHhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
              <h3 className="font-extrabold flex items-center">
                <Home className="w-5 h-5 mr-2"/> {hhModalMode === 'add' ? 'Add Household Record' : 'Edit Household Record'}
              </h3>
              <button onClick={() => setIsHhModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveHousehold} className="p-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-slate-50">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Household Number</label>
                    <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-extrabold tracking-widest">
                      {hhModalMode === 'add' ? generateHHNumber() : hhForm.hhNumber}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Head of Family Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={hhForm.headName} onChange={e=>setHhForm({...hhForm, headName: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase" placeholder="E.g. DELA CRUZ, JUAN" />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specific Home Address <span className="text-slate-400">(Optional)</span></label>
                    <input type="text" value={hhForm.address} onChange={e=>setHhForm({...hhForm, address: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="House No., Street Name..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purok / Sitio <span className="text-red-500">*</span></label>
                    <select required value={hhForm.purok} onChange={e=>setHhForm({...hhForm, purok: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      {PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">4Ps Beneficiary?</label>
                    <select value={hhForm.is4ps} onChange={e=>setHhForm({...hhForm, is4ps: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option>No</option><option>Yes</option>
                    </select>
                  </div>
                  {hhModalMode === 'edit' && (
                    <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Household Status</label>
                      <select value={hhForm.status} onChange={e=>setHhForm({...hhForm, status: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex space-x-3">
                <button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2"/> : null} {hhModalMode === 'add' ? 'Create Household' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
              <h3 className="font-extrabold flex items-center">
                <UserPlus className="w-5 h-5 mr-2"/> {resModalMode === 'add' ? 'Add New Resident' : 'Edit Resident Record'}
              </h3>
              <button onClick={() => setIsResModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveResident} className="p-4 md:p-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-slate-50">
              
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative group mb-6">
                {resForm.image ? (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden group-hover:opacity-80 transition-opacity">
                    <img src={resForm.image} alt="Profile Preview" className="w-full h-full object-cover scale-110" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2 shadow-inner group-hover:bg-slate-200 transition-colors">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Upload Profile Picture</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setResForm({...resForm, image: base64}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-4 border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={resForm.firstName} onChange={e=>setResForm({...resForm, firstName: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Middle Name</label>
                    <input type="text" value={resForm.middleName} onChange={e=>setResForm({...resForm, middleName: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={resForm.lastName} onChange={e=>setResForm({...resForm, lastName: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label>
                    <input required type="date" value={resForm.dateOfBirth} onChange={e=>setResForm({...resForm, dateOfBirth: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age</label>
                    <input required type="number" min="0" value={resForm.age} onChange={e=>setResForm({...resForm, age: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                    <select value={resForm.gender} onChange={e=>setResForm({...resForm, gender: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Civil Status</label>
                    <select value={resForm.civilStatus} onChange={e=>setResForm({...resForm, civilStatus: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Place of Birth</label>
                    <input type="text" value={resForm.placeOfBirth} onChange={e=>setResForm({...resForm, placeOfBirth: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-emerald-800 uppercase mb-4 border-b pb-2">Address & Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specific Home Address <span className="text-slate-400">(Optional)</span></label>
                    <input type="text" value={resForm.homeAddress} onChange={e=>setResForm({...resForm, homeAddress: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="House No., Street Name..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purok / Sitio <span className="text-red-500">*</span></label>
                    <select required value={resForm.address} onChange={e=>setResForm({...resForm, address: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      {PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Household</label>
                    <select value={resForm.householdId} onChange={e=>setResForm({...resForm, householdId: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">None / Not Listed</option>
                      {households.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Household Role</label>
                    <select value={resForm.isHouseholdHead} onChange={e=>setResForm({...resForm, isHouseholdHead: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
                      <option value="false">Member</option><option value="true">Head of Household</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Number</label>
                    <input type="text" value={resForm.contactNumber} onChange={e=>setResForm({...resForm, contactNumber: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Occupation</label>
                    <input type="text" value={resForm.occupation} onChange={e=>setResForm({...resForm, occupation: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Educational Attainment</label>
                    <select value={resForm.educationalAttainment} onChange={e=>setResForm({...resForm, educationalAttainment: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Select...</option>
                      <option>Elementary Level</option><option>Elementary Graduate</option>
                      <option>High School Level</option><option>High School Graduate</option>
                      <option>College Level</option><option>College Graduate</option>
                      <option>Vocational</option><option>Post-Graduate</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-xs font-bold text-amber-800 uppercase mb-4 border-b pb-2">Demographics & Tags</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center sm:text-left">Voter?</label>
                    <select value={resForm.isVoter} onChange={e=>setResForm({...resForm, isVoter: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-center sm:text-left text-sm">
                      <option value="true">Yes</option><option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center sm:text-left">PWD?</label>
                    <select value={resForm.isPwd} onChange={e=>setResForm({...resForm, isPwd: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-center sm:text-left text-sm">
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center sm:text-left">4Ps?</label>
                    <select value={resForm.is4ps} onChange={e=>setResForm({...resForm, is4ps: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-center sm:text-left text-sm">
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-4 border-b pb-2">System Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={resModalMode === 'edit' ? 'sm:col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Login Email <span className="text-red-500">*</span></label>
                    <input required type="email" value={resForm.email} onChange={e=>setResForm({...resForm, email: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" autoComplete="off" />
                  </div>
                  {resModalMode === 'add' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temporary Password <span className="text-red-500">*</span></label>
                      <input required type="password" value={resForm.password} onChange={e=>setResForm({...resForm, password: e.target.value})} className="cursor-text w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" autoComplete="new-password" />
                    </div>
                  )}
                  {resModalMode === 'edit' && (
                    <div className="sm:col-span-2 pt-2 sm:border-t sm:border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Status</label>
                      <select value={resForm.accountStatus} onChange={e=>setResForm({...resForm, accountStatus: e.target.value})} className="cursor-pointer w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button disabled={isSaving} type="submit" className="cursor-pointer w-full sm:flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors flex justify-center items-center shadow-md hover:-translate-y-0.5 disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} {resModalMode === 'add' ? 'Create Resident Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReqModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-[#0f172a] flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600"/> Update Request Details
              </h3>
              <button onClick={() => setIsReqModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-700 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRequestDetails} className="p-6 flex-1 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resident Requesting</p>
                  <p className="text-sm font-extrabold text-slate-800 uppercase">
                    {selectedReq.requestDetails ? `${selectedReq.requestDetails.firstName} ${selectedReq.requestDetails.lastName}` : 'Unknown Resident'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Document Needed</p>
                  <p className="text-sm font-bold text-blue-700">{selectedReq.documentType}</p>
                </div>
                {selectedReq.requestDetails?.purpose && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stated Purpose</p>
                    <p className="text-sm font-medium text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
                      "{selectedReq.requestDetails.purpose}"
                    </p>
                  </div>
                )}
              </div>
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Update Status</label>
                <select value={reqStatus} onChange={e => setReqStatus(e.target.value)} className="cursor-pointer w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700">
                  <option value="Pending">Pending (In Progress)</option><option value="Approved">Approved (Ready for Pickup)</option><option value="Rejected">Rejected (Declined)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Message / Note to Resident</span><span className="text-slate-400 font-normal normal-case">(Optional)</span>
                </label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows="3" className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700 resize-none" placeholder="e.g. 'Please bring a valid ID to claim this document.'"></textarea>
              </div>
              <div className="mt-8 flex space-x-3">
                <button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors flex justify-center items-center shadow-md hover:-translate-y-0.5 disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Save Changes
                </button>
                <button disabled={isSaving} type="button" onClick={() => setIsReqModalOpen(false)} className="cursor-pointer flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-70">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
              <h3 className="font-extrabold flex items-center">
                <Building2 className="w-5 h-5 mr-2"/> {offModalMode === 'add' ? 'Add Barangay Official' : 'Edit Official'}
              </h3>
              <button onClick={() => setIsOffModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-white rounded-full p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveOfficial} className="p-6 bg-slate-50">
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative group mb-6">
                {offForm.image ? (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden group-hover:opacity-80 transition-opacity flex items-center justify-center">
                    <img src={offForm.image} alt="Official Preview" className="w-full h-full object-cover scale-110" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2 shadow-inner group-hover:bg-slate-200 transition-colors">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Upload Photo</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setOffForm({...offForm, image: base64}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input required type="text" value={offForm.name} onChange={e=>setOffForm({...offForm, name: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" placeholder="E.g. Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Position / Title <span className="text-red-500">*</span></label>
                  <input required type="text" value={offForm.position} onChange={e=>setOffForm({...offForm, position: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="E.g. Barangay Captain" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year of Term</label>
                  <input type="text" value={offForm.yearOfTerm} onChange={e=>setOffForm({...offForm, yearOfTerm: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="E.g. 2023 - 2026" />
                </div>
              </div>
              <div className="mt-8 flex space-x-3">
                <button disabled={isSaving} type="submit" className="cursor-pointer flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2"/> : null} {offModalMode === 'add' ? 'Save Official' : 'Update Official'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Custom Demographic Icons
function IconMale({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>♂️</div>; }
function IconFemale({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>♀️</div>; }
function IconAdult({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>🧑</div>; }
function IconMinor({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>👶</div>; }
function IconSenior({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>🧓</div>; }

// Sidebar Button Helper
function SidebarItem({ icon: Icon, label, badge, isActive, onClick }) {
  return (
    <div className="px-3 mb-1">
      <button 
        onClick={onClick}
        className={`w-full flex items-center h-11 text-sm font-semibold transition-all duration-200 cursor-pointer overflow-hidden rounded-xl
          ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
      >
        <div className="flex items-center justify-center w-[56px] flex-shrink-0">
          <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300 transition-colors'}`} />
        </div>
        <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200 text-left flex-1">
          {label}
        </span>
        {badge !== undefined && (
          <span className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 mr-3 text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-blue-400 text-white' : 'bg-slate-700 text-slate-300'}`}>
            {badge}
          </span>
        )}
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

function ProgressBar({ label, value, total, color, onClick }) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  return (
    <div onClick={onClick} className="cursor-pointer group">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-bold text-slate-600 group-hover:text-blue-700 transition-colors">{label}</span>
        <span className="font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors">{value}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

// --- RESIDENT DASHBOARD ---
function ResidentDashboard({ user, requests, households, officials, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const initializeEditForm = () => ({
    ...user.profile,
    firstName: user.profile.firstName || user.profile.name.split(' ')[0] || '',
    lastName: user.profile.lastName || user.profile.name.split(' ').slice(1).join(' ') || '',
    middleName: user.profile.middleName || '',
    contactEmail: user.profile.contactEmail || user.email || '',
    password: user.password || '', // Added to allow password updates securely
    confirmPassword: user.password || '', // Used for validation check
    contactNumber: user.profile.contactNumber || '',
    occupation: user.profile.occupation || '',
    educationalAttainment: user.profile.educationalAttainment || '',
    address: user.profile.address || `Purok ${PUROKS[0]}`,
    homeAddress: user.profile.homeAddress || '',
    householdId: user.profile.householdId || '',
    isHouseholdHead: user.profile.householdRole === 'Head' ? 'true' : 'false',
    municipality: user.profile.municipality || 'Gigaquit',
    image: user.profile.image || ''
  });

  const [editForm, setEditForm] = useState(initializeEditForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reqForm, setReqForm] = useState({
    documentType: DOC_TYPES[0],
    firstName: user.profile.firstName || user.profile.name.split(' ')[0] || '',
    lastName: user.profile.lastName || user.profile.name.split(' ').slice(1).join(' ') || '',
    middleName: user.profile.middleName || '',
    age: user.profile.age || '',
    civilStatus: user.profile.civilStatus || 'Single',
    purok: user.profile.address || `Purok ${PUROKS[0]}`,
    purpose: ''
  });

  const handleRequestDoc = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
      await addDoc(requestsRef, {
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
          purpose: reqForm.purpose
        }
      });
      setActiveTab('my-requests');
      setReqForm({ ...reqForm, purpose: '' }); 
      showToast("Document requested successfully!");
    } catch (err) { 
      console.error(err);
      showToast("Failed to request document.", "error");
    }
    setIsSubmitting(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (editForm.password !== editForm.confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const userDoc = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      const updatedName = `${editForm.firstName} ${editForm.middleName ? editForm.middleName + ' ' : ''}${editForm.lastName}`.trim().replace(/\s+/g, ' ');
      
      await updateDoc(userDoc, { 
        email: editForm.contactEmail,
        password: editForm.password, // Updates the password safely in the database backend
        profile: {
          ...editForm,
          name: updatedName,
          householdRole: editForm.isHouseholdHead === 'true' ? 'Head' : 'Member'
        }
      });
      setIsEditingProfile(false);
      showToast("Profile updated successfully!");
    } catch (err) { 
      console.error(err);
      showToast("Failed to update profile.", "error");
    }
    setIsSubmitting(false);
  };

  useEffect(() => { 
    setEditForm(initializeEditForm());
    setReqForm(prev => ({
      ...prev,
      firstName: user.profile.firstName || user.profile.name.split(' ')[0] || '',
      lastName: user.profile.lastName || user.profile.name.split(' ').slice(1).join(' ') || '',
      middleName: user.profile.middleName || '',
      age: user.profile.age || '',
      civilStatus: user.profile.civilStatus || 'Single',
      purok: user.profile.address || `Purok ${PUROKS[0]}`
    }));
  }, [user]);

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const initialsFallback = `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}` || user.profile.name.substring(0,2).toUpperCase();
  const profileImage = user.profile.image || null;

  const myHousehold = households.find(h => h.id === user.profile.householdId);
  const displayHHNumber = myHousehold ? myHousehold.hhNumber : 'Unassigned';
  const displayHHHead = user.profile.householdRole === 'Head' ? user.profile.name : (myHousehold ? myHousehold.headName : (user.profile.householdHead || 'None/Self'));

  return (
    <div 
      className="flex w-full h-screen overflow-hidden font-sans relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('${BRANDING.landingBackground}')` }}
    >
      {/* Light blue overlay for Resident Dashboard */}
      <div className="absolute inset-0 bg-blue-100/85 backdrop-blur-[3px] z-0"></div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* --- NEW COLLAPSING SMART SIDEBAR --- */}
      <div className={`peer fixed inset-y-0 left-0 z-50 bg-[#0f172a]/95 backdrop-blur-md text-slate-300 shadow-2xl transition-[width] duration-200 ease-in-out flex flex-col group overflow-x-hidden ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0 md:w-20 md:hover:w-64`}>
        
        {/* Sidebar Header / Logos */}
        <div className="h-20 flex items-center pl-[18px] border-b border-slate-800 flex-shrink-0 overflow-hidden cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}}>
          <div className="flex items-center space-x-[-12px] flex-shrink-0 pr-1">
            <div className={`w-11 h-11 bg-white rounded-full items-center justify-center shadow-lg border-2 border-[#0f172a] hidden group-hover:flex z-10 overflow-hidden shrink-0`}>
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
          {/* Close button for mobile */}
          <button className="md:hidden ml-auto mr-4 text-slate-400 hover:text-white p-1" onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Overview</div>
          <SidebarItem icon={User} label="My Profile" isActive={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}} />
          
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Documents</div>
          <SidebarItem icon={FileText} label="Request Documents" isActive={activeTab === 'request'} onClick={() => {setActiveTab('request'); setIsMobileMenuOpen(false);}} />
          <SidebarItem icon={Clock} label="My Requests" isActive={activeTab === 'my-requests'} onClick={() => {setActiveTab('my-requests'); setIsMobileMenuOpen(false);}} />
          
          <div className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">Barangay</div>
          <SidebarItem icon={Building2} label="Officials" isActive={activeTab === 'officials'} onClick={() => {setActiveTab('officials'); setIsMobileMenuOpen(false);}} />
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="border-t border-slate-800 bg-[#0B1120] h-20 flex items-center px-3 flex-shrink-0 overflow-hidden">
          <div className="flex items-center w-full bg-slate-800/40 hover:bg-slate-800 rounded-xl h-14 cursor-pointer transition-colors" onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}}>
             <div className="flex items-center justify-center w-[56px] flex-shrink-0">
                {profileImage ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-600 flex items-center justify-center bg-slate-200">
                    <img src={profileImage} alt="avatar" className="w-full h-full object-cover scale-110" />
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-blue-600 rounded-full text-white flex items-center justify-center font-extrabold text-xs">
                    {initialsFallback}
                  </div>
                )}
             </div>
             <div className="flex-1 opacity-100 w-auto md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-200 flex justify-between items-center pr-4">
               <div className="flex flex-col justify-center overflow-hidden mr-2">
                 <p className="text-sm font-bold text-white leading-tight truncate uppercase">{user.profile.firstName || 'Resident'}</p>
                 <p className="text-[10px] text-slate-400 font-medium">Resident</p>
               </div>
               <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onLogout(); }}/>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto ml-0 md:ml-20 md:peer-hover:ml-64 transition-[margin] duration-200 ease-in-out relative z-10">
        
        {/* Top Header */}
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
                {activeTab === 'profile' ? 'View and update your information' : activeTab === 'request' ? 'Request and track barangay documents' : 'Manage your records'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="text-[10px] md:text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-slate-50/80 shadow-sm flex items-center">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              {currentDate}
            </div>
            <div className="hidden sm:flex items-center space-x-2 border border-slate-200 px-3 py-1.5 rounded-lg bg-white/90 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setActiveTab('profile')} title="Go to Profile">
              {profileImage ? (
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
                  <img src={profileImage} alt="avatar" className="w-full h-full object-cover scale-110" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">{initialsFallback}</div>
              )}
              <span className="font-bold text-sm text-slate-700 max-w-[120px] truncate uppercase hidden sm:inline-block">{user.profile.name.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          
          {activeTab === 'profile' && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-300 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              <div className="h-32 md:h-40 bg-gradient-to-r from-blue-800 to-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
              </div>
              
              <div className="px-4 md:px-8 pb-6 md:pb-10 relative">
                
                {/* Banner Profile Image Override */}
                <div className="absolute -top-10 left-4 md:-top-12 md:left-8 bg-white p-1.5 rounded-full shadow-lg">
                  {profileImage ? (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-slate-100 overflow-hidden flex items-center justify-center bg-slate-100">
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover scale-110" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 border-2 border-slate-100">
                      <User className="w-8 h-8 md:w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="pt-12 md:pt-16">
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-3xl animate-in fade-in duration-300">
                      <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Edit My Information</h2>
                      
                      {/* Image Uploader for Resident */}
                      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group w-max">
                        {editForm.image ? (
                          <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden group-hover:opacity-80 transition-opacity flex items-center justify-center bg-slate-100">
                            <img src={editForm.image} alt="Profile Preview" className="w-full h-full object-cover scale-110" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-1 shadow-inner group-hover:bg-slate-300 transition-colors">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-4">Change Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setEditForm({...editForm, image: base64}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                            <input type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Middle Name</label>
                            <input type="text" value={editForm.middleName} onChange={e => setEditForm({...editForm, middleName: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                            <input type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Birth</label>
                          <input type="date" value={editForm.dateOfBirth || ''} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Place of Birth</label>
                          <input type="text" value={editForm.placeOfBirth || ''} onChange={e => setEditForm({...editForm, placeOfBirth: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nationality</label>
                          <input type="text" value={editForm.nationality || ''} onChange={e => setEditForm({...editForm, nationality: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Religion</label>
                          <input type="text" value={editForm.religion || ''} onChange={e => setEditForm({...editForm, religion: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Civil Status</label>
                          <select value={editForm.civilStatus || 'Single'} onChange={e => setEditForm({...editForm, civilStatus: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                            <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                          <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                            <option>Male</option><option>Female</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Age</label>
                          <input type="number" value={editForm.age} onChange={e => setEditForm({...editForm, age: parseInt(e.target.value)})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Number</label>
                          <input type="tel" value={editForm.contactNumber || ''} onChange={e => setEditForm({...editForm, contactNumber: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address (Login Email)</label>
                          <input type="email" value={editForm.contactEmail || ''} onChange={e => setEditForm({...editForm, contactEmail: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Occupation</label>
                          <input type="text" value={editForm.occupation || ''} onChange={e => setEditForm({...editForm, occupation: e.target.value})} className="cursor-text w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Educational Attainment</label>
                          <select value={editForm.educationalAttainment || ''} onChange={e => setEditForm({...editForm, educationalAttainment: e.target.value})} className="cursor-pointer w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                            <option value="">Select...</option>
                            <option>Elementary Level</option>
                            <option>Elementary Graduate</option>
                            <option>High School Level</option>
                            <option>High School Graduate</option>
                            <option>College Level</option>
                            <option>College Graduate</option>
                            <option>Vocational</option>
                            <option>Post-Graduate</option>
                          </select>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <h4 className="text-sm font-bold text-blue-800 mb-1">Location & Household</h4>
                            <p className="text-xs text-blue-600 mb-3">Update your address and official household link.</p>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Specific Home Address</label>
                            <input type="text" value={editForm.homeAddress || ''} onChange={e => setEditForm({...editForm, homeAddress: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="House No., Block, Street..." />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Household Record</label>
                            <select value={editForm.householdId || ''} onChange={e => setEditForm({...editForm, householdId: e.target.value})} className="cursor-pointer w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                              <option value="">None / Not Listed</option>
                              {households.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Household Role</label>
                            <select value={editForm.isHouseholdHead} onChange={e => setEditForm({...editForm, isHouseholdHead: e.target.value})} className="cursor-pointer w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold">
                              <option value="false">Member</option><option value="true">Head of Household</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2 mt-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Purok / Sitio <span className="text-red-500">*</span></label>
                            <select value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="cursor-pointer w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required>
                              {PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                            </select>
                          </div>
                        </div>
                        
                        {/* New Password Edit Section for Resident */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="sm:col-span-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-1">Account Security</h4>
                            <p className="text-xs text-slate-500 mb-2">Update your login password securely.</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password <span className="text-red-500">*</span></label>
                            <input type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password <span className="text-red-500">*</span></label>
                            <input type="password" value={editForm.confirmPassword} onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})} className="cursor-text w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                          </div>
                        </div>

                      </div>
                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-slate-100">
                        <button disabled={isSubmitting} type="submit" className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center shadow-md hover:-translate-y-0.5 transition-all">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Save Changes
                        </button>
                        <button disabled={isSubmitting} type="button" onClick={() => {setIsEditingProfile(false); setEditForm(initializeEditForm())}} className="cursor-pointer bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex justify-center items-center">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start pt-4 sm:pt-8">
                        <div>
                          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] uppercase tracking-tight mb-2">
                            {user.profile.name}
                          </h2>
                          <p className="text-sm text-slate-500 font-medium">
                            {user.profile.address || 'Purok N/A'} • {user.profile.civilStatus || 'Single'} • {user.profile.age} years old
                          </p>
                          
                          <div className="mt-4 flex flex-wrap gap-2 items-center">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border ${user.accountStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              <Activity className="w-3.5 h-3.5 mr-1.5"/> Account: {user.accountStatus || 'Active'}
                            </span>
                            
                            {user.profile.isVoter && (
                              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border border-blue-100 shadow-sm">
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Registered Voter
                              </span>
                            )}
                            {user.profile.isPwd && (
                              <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center w-max border border-purple-100 shadow-sm">
                                <Accessibility className="w-3.5 h-3.5 mr-1.5"/> PWD
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-400 mt-3 flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Registered on {new Date(user.dateOfRegistration || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        
                        <button onClick={() => setIsEditingProfile(true)} className="cursor-pointer mt-6 sm:mt-0 bg-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                          <Pencil className="w-4 h-4 mr-2" /> Edit My Information
                        </button>
                      </div>

                      {/* Detailed Data Grid - 2 Columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
                        
                        {/* Personal Details Card */}
                        <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white h-max hover:border-blue-200 transition-colors">
                          <h3 className="text-xs font-bold text-[#1e3a8a] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider">
                            <User className="w-4 h-4 mr-2"/> Personal Details
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                              <p className="text-sm font-bold text-slate-800 uppercase">{user.profile.name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                              <p className="text-sm font-bold text-slate-800">{user.profile.dateOfBirth ? new Date(user.profile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Place of Birth</p>
                              <p className="text-sm font-bold text-slate-800">{user.profile.placeOfBirth || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Age</p>
                              <p className="text-sm font-bold text-slate-800">{user.profile.age} years old</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                              <p className="text-sm font-bold text-slate-800 capitalize">{user.profile.gender}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nationality</p>
                              <p className="text-sm font-bold text-slate-800">{user.profile.nationality || 'Filipino'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Religion</p>
                              <p className="text-sm font-bold text-slate-800">{user.profile.religion || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Civil Status</p>
                              <p className="text-sm font-bold text-slate-800 capitalize">{user.profile.civilStatus || 'Single'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Right Column Stack */}
                        <div className="flex flex-col gap-6 h-max">
                          
                          {/* Contact & Work Card */}
                          <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white hover:border-green-200 transition-colors">
                            <h3 className="text-xs font-bold text-[#15803d] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider">
                              <Activity className="w-4 h-4 mr-2"/> Contact & Work
                            </h3>
                            
                            <div className="space-y-5">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                                <p className="text-sm font-bold text-slate-800 break-all">{user.profile.contactEmail || user.email}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Number</p>
                                  <p className="text-sm font-bold text-slate-800">{user.profile.contactNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Occupation</p>
                                  <p className="text-sm font-bold text-slate-800">{user.profile.occupation || 'N/A'}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Educational Attainment</p>
                                <p className="text-sm font-bold text-slate-800">{user.profile.educationalAttainment || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Address & Location Card */}
                          <div className="border border-slate-100 rounded-xl p-4 sm:p-6 shadow-sm bg-white hover:border-red-200 transition-colors">
                            <h3 className="text-xs font-bold text-[#e11d48] uppercase flex items-center mb-5 pb-4 border-b border-dashed border-slate-200 tracking-wider">
                              <MapPin className="w-4 h-4 mr-2"/> Address & Household
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                              <div className="sm:col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Home Address</p>
                                <p className="text-sm font-bold text-slate-800">{user.profile.homeAddress || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purok / Sitio</p>
                                <p className="text-sm font-bold text-slate-800">{user.profile.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Municipality</p>
                                <p className="text-sm font-bold text-slate-800">{user.profile.municipality || 'Gigaquit'}</p>
                              </div>
                              
                              {/* NEW HOUSEHOLD DISPLAY */}
                              <div className="sm:col-span-2 pt-2 border-t border-slate-100 mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Household Link</p>
                                <div className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm">
                                  <Home className="w-5 h-5 text-blue-600 mr-3" />
                                  <div>
                                    <p className="text-sm font-extrabold text-blue-900">{displayHHNumber}</p>
                                    <p className="text-[10px] font-medium text-blue-700 uppercase">Head: {displayHHHead}</p>
                                  </div>
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

          {activeTab === 'request' && (
            <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center bg-white/50">
                  <PlusCircle className="w-5 h-5 mr-2 text-[#0f172a]" />
                  <h2 className="text-lg font-extrabold text-[#0f172a]">Request a Document</h2>
                </div>
                
                <form onSubmit={handleRequestDoc} className="p-8">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Document Type <span className="text-red-500">*</span></label>
                      <select 
                        value={reqForm.documentType} onChange={e => setReqForm({...reqForm, documentType: e.target.value})}
                        className="cursor-pointer w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm font-medium"
                      >
                        {DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name <span className="text-red-500">*</span></label>
                      <input required type="text" value={reqForm.firstName} onChange={e => setReqForm({...reqForm, firstName: e.target.value})} className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm" placeholder="Your first name" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name <span className="text-red-500">*</span></label>
                      <input required type="text" value={reqForm.lastName} onChange={e => setReqForm({...reqForm, lastName: e.target.value})} className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm" placeholder="Your last name" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Middle Name (Optional)</label>
                      <input type="text" value={reqForm.middleName} onChange={e => setReqForm({...reqForm, middleName: e.target.value})} className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm" placeholder="Leave blank if you don't have one" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Age</label>
                      <input type="number" value={reqForm.age} onChange={e => setReqForm({...reqForm, age: e.target.value})} className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm" placeholder="Your age" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Civil Status</label>
                      <select value={reqForm.civilStatus} onChange={e => setReqForm({...reqForm, civilStatus: e.target.value})} className="cursor-pointer w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm">
                        <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purok / Sitio <span className="text-red-500">*</span></label>
                      <select required value={reqForm.purok} onChange={e => setReqForm({...reqForm, purok: e.target.value})} className="cursor-pointer w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm">
                        {PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 mt-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purpose of Request <span className="text-red-500">*</span></label>
                      <textarea required value={reqForm.purpose} onChange={e => setReqForm({...reqForm, purpose: e.target.value})} rows="4" className="cursor-text w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 text-sm resize-none custom-scrollbar" placeholder="Explain why you need this document..."></textarea>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <button disabled={isSubmitting} type="submit" className="cursor-pointer bg-[#1e3a8a] text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-900 transition-all flex justify-center items-center disabled:opacity-70 shadow-md hover:-translate-y-0.5">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} 
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'my-requests' && (
             <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden max-w-5xl mx-auto">
               <div className="p-6 md:p-8 border-b border-slate-100 bg-white/50">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Request History</h2>
              </div>
              <div className="p-4 md:p-8">
                {requests.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-500">No documents requested yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.sort((a,b) => new Date(b.dateRequested) - new Date(a.dateRequested)).map(req => (
                      <div key={req.id} className="flex flex-col p-4 md:p-6 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-3">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">{req.documentType}</h4>
                            <p className="text-sm text-slate-500 flex items-center mt-1.5 font-medium">
                              <Clock className="w-4 h-4 mr-1.5 opacity-70" /> {new Date(req.dateRequested).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col sm:items-end">
                            <StatusBadge status={req.status} />
                            {req.dateProcessed && <span className="text-xs text-slate-400 mt-2.5 font-medium">Processed</span>}
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

          {activeTab === 'officials' && (
             <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Barangay Officials</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Get to know the current term's barangay council.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {officials.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-slate-400 font-medium bg-white/80 rounded-3xl">No officials recorded.</div>
                ) : officials.map(official => (
                  <div key={official.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-200/60 text-center hover:-translate-y-1 transition-transform relative group cursor-pointer hover:shadow-lg">
                    <div className="w-28 h-28 mx-auto bg-blue-50 rounded-full mb-5 shadow-sm border-2 border-slate-100 overflow-hidden flex items-center justify-center">
                      <img src={official.image} alt={official.name} className="w-full h-full object-cover scale-110" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight uppercase">{official.name}</h3>
                    <p className="text-blue-600 text-sm font-bold mt-2 bg-blue-50 inline-block px-3 py-1 rounded-full">{official.position}</p>
                    {official.yearOfTerm && <p className="text-xs font-bold text-slate-400 mt-3 tracking-widest uppercase">Term: {official.yearOfTerm}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Pending': 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
    'Approved': 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]',
    'Rejected': 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
  };
  return (
    <span className={`px-3 py-1 rounded-md text-[10px] font-extrabold border tracking-wider uppercase ${styles[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}