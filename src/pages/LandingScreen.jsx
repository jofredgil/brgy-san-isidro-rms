import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Key, X, Loader2, AlertCircle, MapPin, Building2, Eye, EyeOff } from 'lucide-react';
import { BRANDING, PUROKS, CIVIL_STATUSES, GENDERS, EDU_OPTIONS } from '../config/constants';
import { FormInput, FormSelect, FloatingInput } from '../components/ui/Components';
import { auth, db, appId } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export default function LandingScreen() {
  const [view, setView] = useState('landing');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [households, setHouseholds] = useState([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Added toggle state

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [nationality, setNationality] = useState('Filipino');
  const [religion, setReligion] = useState('Roman Catholic');
  const [address, setAddress] = useState(`Purok ${PUROKS[0]}`);
  const [homeAddress, setHomeAddress] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [isHouseholdHead, setIsHouseholdHead] = useState('false');
  const [contactNumber, setContactNumber] = useState('');
  const [occupation, setOccupation] = useState('');
  const [educationalAttainment, setEducationalAttainment] = useState('');
  const [isVoter, setIsVoter] = useState('false');
  const [isPwd, setIsPwd] = useState('false');
  const [is4ps, setIs4ps] = useState('false');
  const [civilStatus, setCivilStatus] = useState('Single');

  useEffect(() => {
    const fetchHHs = async () => {
      try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'households'));
        setHouseholds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to fetch households", err);
      }
    };
    fetchHHs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (view === 'register') {
        // 1. Create secure Firebase Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Format data and bind to Auth UID
        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim().replace(/\s+/g, ' ');
        const resData = {
          email: email,
          role: 'resident',
          accountStatus: 'Active',
          dateOfRegistration: new Date().toISOString(),
          profile: {
            name: fullName,
            firstName,
            middleName,
            lastName,
            age: parseInt(age) || 0,
            gender,
            address,
            homeAddress: homeAddress || '',
            municipality: 'Gigaquit',
            householdId: householdId || '',
            householdRole: isHouseholdHead === 'true' ? 'Head' : 'Member',
            contactNumber: contactNumber || '',
            contactEmail: email,
            occupation: occupation || '',
            educationalAttainment: educationalAttainment || '',
            isVoter: isVoter === 'true',
            isPwd: isPwd === 'true',
            is4ps: is4ps === 'true',
            civilStatus: civilStatus || 'Single',
            dateOfBirth: dateOfBirth || '',
            placeOfBirth: placeOfBirth || '',
            nationality: nationality || 'Filipino',
            religion: religion || '',
            zipCode: '8400'
          }
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), resData);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError('An error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

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

      {view === 'landing' && (
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
      )}

      <footer className="relative z-10 w-full p-6 text-center">
        <p className="text-blue-300/50 text-xs font-medium tracking-wide">© {new Date().getFullYear()} {BRANDING.appName}, {BRANDING.appLocation}. All rights reserved.</p>
      </footer>

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput label="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" />
                      <FormInput label="Middle Name" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Reyes" />
                      <FormInput label="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput label="Date of Birth" type="date" required value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="cursor-text w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-slate-700 text-sm" />
                      <FormInput label="Place of Birth" required value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="City, Province" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput label="Age" type="number" min="0" required value={age} onChange={e => setAge(e.target.value)} placeholder="0" />
                      <FormSelect label="Gender" value={gender} onChange={e => setGender(e.target.value)}>{GENDERS.map(g => <option key={g}>{g}</option>)}</FormSelect>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput label="Nationality" required value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Filipino" />
                      <FormInput label="Religion" required value={religion} onChange={e => setReligion(e.target.value)} placeholder="Roman Catholic" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput label="Contact Number" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="09XX..." />
                      <FormSelect label="Education" value={educationalAttainment} onChange={e => setEducationalAttainment(e.target.value)}>{EDU_OPTIONS.map(o => <option key={o}>{o}</option>)}</FormSelect>
                    </div>

                    <FormInput label="Occupation" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="E.g. Farmer, Teacher, None" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div className="sm:col-span-2"><FormInput label="Home Address" required value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="e.g. Block 1, Lot 2" /></div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purok <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <select required value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm">{PUROKS.map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}</select>
                        </div>
                      </div>
                      <FormSelect label="Household" value={householdId} onChange={e => setHouseholdId(e.target.value)}><option value="">None / Not listed</option>{households.map(hh => <option key={hh.id} value={hh.id}>{hh.hhNumber} - {hh.headName}</option>)}</FormSelect>
                      <div className="sm:col-span-2"><FormSelect label="Household Role" value={isHouseholdHead} onChange={e => setIsHouseholdHead(e.target.value)}><option value="false">Member</option><option value="true">Head</option></FormSelect></div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <FormSelect label="Voter?" value={isVoter} onChange={e => setIsVoter(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="true">Yes</option><option value="false">No</option></FormSelect>
                      <FormSelect label="PWD?" value={isPwd} onChange={e => setIsPwd(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="false">No</option><option value="true">Yes</option></FormSelect>
                      <FormSelect label="4Ps?" value={is4ps} onChange={e => setIs4ps(e.target.value)} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"><option value="false">No</option><option value="true">Yes</option></FormSelect>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <FloatingInput id="email-input" label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                  
                  {/* Eye Toggle Container Added Here! */}
                  <div className="relative">
                    <FloatingInput 
                      id="password-input" 
                      label="Password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 focus:outline-none p-1 cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    </button>
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