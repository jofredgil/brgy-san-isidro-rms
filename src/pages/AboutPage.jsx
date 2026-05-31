import React, { useState } from 'react';
import { 
  Info, FileText, BookOpen, Lightbulb, Building2, Eye, Target, 
  Star, Globe, Lock, Zap, Heart, Users, CheckCircle, Award, Phone, 
  MapPin, ExternalLink, ArrowRight, ChevronUp, ChevronDown, Shield, Clock, AlertCircle
} from 'lucide-react';
import { CERTIFICATES, COLOR_MAP, PROCEDURE_STEPS, TIPS, BENEFITS, BRANDING } from '../config/constants';
import { FacebookIcon } from '../components/ui/Components';

const KEY_FEATURES = [
  { icon: Users, label: "Resident Registration & Profiles" },
  { icon: FileText, label: "Online Document Requests" },
  { icon: Shield, label: "Household Records Management" },
  { icon: CheckCircle, label: "Request Tracking & Status Updates" },
  { icon: Award, label: "Barangay Officials Directory" },
  { icon: Globe, label: "Special Groups Registry" },
];

function SectionHeader({ icon: Icon, label, title, subtitle, color = "blue" }) {
  return (
    <div className="mb-8">
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-3 bg-${color}-100 text-${color}-700 border border-${color}-200`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
      {subtitle && <p className="text-slate-500 mt-2 font-medium text-sm md:text-base max-w-2xl">{subtitle}</p>}
    </div>
  );
}
 
function CertCard({ cert }) {
  const [open, setOpen] = useState(false);
  const c = COLOR_MAP[cert.color];
  return (
    <div className={`bg-white rounded-2xl border ${c.border} shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>{cert.icon}</div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm leading-tight">{cert.type}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${c.text} mt-0.5`}>Tap to expand</p>
          </div>
        </div>
        <div className={`w-7 h-7 ${c.bg} ${c.text} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className={`px-5 pb-6 border-t ${c.border} bg-white animate-in slide-in-from-top-2 duration-200`}>
          <div className="pt-4 space-y-4">
            <div className={`p-3.5 ${c.bg} rounded-xl border ${c.border}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Purpose</p>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">{cert.purpose}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5">Common Uses</p>
              <div className="space-y-1.5">
                {cert.uses.map((u, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0 mt-1.5`} />
                    <p className="text-sm font-medium text-slate-600">{u}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5">Requirements</p>
              <div className="space-y-1.5">
                {cert.requirements.map((r, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${c.text}`} />
                    <p className="text-sm font-medium text-slate-600">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  const [mapVisible, setMapVisible] = useState(false);
 
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300 space-y-10 pb-16">
      {/* ── HERO BANNER ── */}
      <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#1d4ed8] rounded-2xl overflow-hidden p-8 md:p-12 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-extrabold uppercase tracking-widest mb-4 backdrop-blur-sm">
            <Info className="w-3.5 h-3.5" />
            <span>About This Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">
            Barangay San Isidro<br />
            <span className="text-blue-200">Records Management System</span>
          </h1>
          <p className="text-blue-100 font-medium text-sm md:text-base max-w-xl leading-relaxed">
            A digital platform serving the residents of Barangay San Isidro, Gigaquit, Surigao del Norte — making records management secure, efficient, and community-focused.
          </p>
        </div>
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-600/30 rounded-full blur-2xl" />
      </div>
 
      {/* ── SECTION 1 — BARANGAY CERTIFICATES ── */}
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SectionHeader icon={FileText} label="Documents" title="Types of Barangay Certificates" subtitle="Learn about the documents you can request through this portal — their purpose, common uses, and what you need to prepare." color="blue" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CERTIFICATES.map((cert) => <CertCard key={cert.type} cert={cert} />)}
        </div>
      </section>
 
      {/* ── SECTION 2 — HOW TO CLAIM ── */}
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SectionHeader icon={BookOpen} label="Step-by-Step Guide" title="How to Request & Claim a Document" subtitle="Follow these simple steps to request your barangay certificate through this system." color="emerald" />
        <div className="relative">
          <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-emerald-200 to-slate-100 hidden md:block" />
          <div className="space-y-4">
            {PROCEDURE_STEPS.map((s, i) => {
               const Icon = i === 0 ? FileText : i === 1 ? CheckCircle : i === 2 ? Clock : i === 3 ? AlertCircle : Award;
               return (
                 <div key={i} className="flex items-start space-x-4 group">
                   <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] text-white flex flex-col items-center justify-center shadow-md shadow-blue-900/20 group-hover:-translate-y-0.5 transition-transform z-10">
                     <Icon className="w-4 h-4 mb-0.5" />
                     <span className="text-[9px] font-extrabold tracking-widest opacity-70">{s.step}</span>
                   </div>
                   <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 group-hover:bg-white group-hover:border-blue-100 group-hover:shadow-sm transition-all">
                     <p className="font-extrabold text-slate-800 text-sm mb-1">{s.title}</p>
                     <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                   </div>
                 </div>
               );
            })}
          </div>
        </div>
      </section>
 
      {/* ── SECTION 3 — TIPS FOR FASTER PROCESSING ── */}
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SectionHeader icon={Lightbulb} label="Pro Tips" title="Tips for Faster Processing" subtitle="Follow these best practices to ensure your documents are processed as quickly as possible." color="amber" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-start space-x-4 p-5 bg-amber-50 border border-amber-100 rounded-2xl hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-amber-100">{tip.icon}</div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm mb-1">{tip.title}</p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
 
      {/* ── SECTION 4 — ABOUT THE BARANGAY ── */}
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SectionHeader icon={Building2} label="About Us" title="Barangay San Isidro" subtitle="Gigaquit, Surigao del Norte" color="violet" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            { icon: Eye, label: "Vision", color: "violet", text: "A progressive, peaceful, and self-reliant Barangay San Isidro where every resident enjoys a high quality of life through effective governance, equitable access to services, and a united community." },
            { icon: Target, label: "Mission", color: "blue", text: "To deliver efficient, transparent, and accessible barangay services; to uphold the rights and welfare of every resident; and to foster a safe, healthy, and empowered community through inclusive and participatory governance." },
            { icon: Star, label: "Goals", color: "emerald", text: "Modernize barangay records and services; strengthen community health, education, and livelihood programs; ensure public safety and order; promote environmental protection; and sustain transparent and accountable local governance." },
          ].map((item, i) => {
            const c = COLOR_MAP[item.color];
            return (
              <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-5 flex flex-col hover:shadow-md transition-all hover:-translate-y-0.5`}>
                <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm border ${c.border}`}><item.icon className={`w-5 h-5 ${c.text}`} /></div>
                <p className={`text-[10px] font-extrabold uppercase tracking-widest ${c.text} mb-2`}>{item.label}</p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed flex-1">{item.text}</p>
              </div>
            );
          })}
        </div>
 
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] text-white rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-extrabold uppercase tracking-widest mb-4">
              <Globe className="w-3.5 h-3.5" />
              <span>What Is This System?</span>
            </div>
            <p className="text-blue-50 font-medium leading-relaxed text-sm md:text-base max-w-3xl">
              The <span className="font-extrabold text-white">Barangay San Isidro Records Management System (RMS)</span> is an official digital platform developed to digitize, organize, and streamline barangay operations. It enables residents to register their personal information, request barangay documents online, track their request status in real time, and stay informed about their community — all through a single, easy-to-use portal accessible from any device.
            </p>
          </div>
        </div>
 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: Lock, title: "Data Security & Privacy", color: "rose", desc: "All resident data is stored on a private, authenticated Firebase cloud database. Access is strictly controlled — only registered users can view their own data, and only authorized administrators can manage records. We are fully committed to protecting your personal information in compliance with the Data Privacy Act of the Philippines." },
            { icon: Zap, title: "Efficiency & Accessibility", color: "blue", desc: "Say goodbye to long queues and repeated visits to the barangay hall. With this system, you can submit requests, check statuses, and update your information anytime, anywhere — on mobile, tablet, or desktop." },
            { icon: Heart, title: "Community-Focused", color: "rose", desc: "Built specifically for the residents of Barangay San Isidro, this system reflects the barangay's commitment to inclusive, transparent, and participatory governance. Every feature is designed with the community's needs in mind." },
            { icon: Globe, title: "Transparency & Accountability", color: "emerald", desc: "Barangay officials and staff can manage records, update request statuses, and communicate with residents through a secure admin dashboard — ensuring every transaction is traceable and transparent." },
          ].map((item, i) => {
            const c = COLOR_MAP[item.color];
            return (
              <div key={i} className={`p-5 border ${c.border} ${c.bg} rounded-2xl hover:shadow-sm transition-all`}>
                <div className={`w-9 h-9 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm border ${c.border}`}>
                  <item.icon className={`w-4.5 h-4.5 ${c.text}`} style={{ width: 18, height: 18 }} />
                </div>
                <p className="font-extrabold text-slate-800 text-sm mb-2">{item.title}</p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
 
        <div className="mb-8">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">Key Features</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {KEY_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all cursor-default">
                <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center flex-shrink-0"><f.icon className="w-4 h-4 text-white" /></div>
                <p className="text-sm font-bold text-slate-700">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
 
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">Benefits for Residents</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className="text-2xl mb-2">{b.icon}</div>
                <p className="font-extrabold text-slate-800 text-sm mb-1">{b.title}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
 
      {/* ── SECTION 5 — CONTACT INFORMATION ── */}
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SectionHeader icon={Phone} label="Contact Us" title="Get in Touch" subtitle="We're here to help. Reach out to the Barangay San Isidro Hall for any concerns or assistance." color="blue" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <button onClick={() => setMapVisible(!mapVisible)} className="w-full flex items-start space-x-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 hover:shadow-sm transition-all cursor-pointer text-left group mb-4">
              <div className="w-11 h-11 bg-[#1e3a8a] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:-translate-y-0.5 transition-transform"><MapPin className="w-5 h-5 text-white" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 mb-1">Official Address</p>
                <p className="font-extrabold text-slate-800 text-sm leading-snug">Barangay San Isidro Hall</p>
                <p className="text-sm font-medium text-slate-500">Gigaquit, Surigao del Norte, Philippines</p>
                <div className="flex items-center space-x-1 mt-2"><span className={`text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200`}>{mapVisible ? "Hide Map" : "View on Map →"}</span></div>
              </div>
            </button>
            {mapVisible && (
              <div className="animate-in slide-in-from-top-2 duration-300 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-56 w-full relative bg-slate-100">
                <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d405.34870670355235!2d125.68286199978336!3d9.562485648500896!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sph!4v1779037537149!5m2!1sen!2sph" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade" 
                    title="Barangay San Isidro Hall Map" 
                    />
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"><Clock className="w-5 h-5 text-white" /></div>
              <div className="w-full">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 mb-2">Office Hours</p>
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-700">Monday – Friday</span><span className="text-sm font-extrabold text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">8:00 AM – 5:00 PM</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-700">Saturday</span><span className="text-sm font-extrabold text-amber-700 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200">By appointment</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-700">Sunday & Holidays</span><span className="text-sm font-extrabold text-rose-600 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">Closed</span></div>
                </div>
              </div>
            </div>
            <a href="https://www.facebook.com/barangay.san.isidro.244635" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-4 p-5 bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-2xl hover:bg-[#1877F2]/10 hover:border-[#1877F2]/40 hover:shadow-sm transition-all cursor-pointer group">
              <div className="w-11 h-11 bg-[#1877F2] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:-translate-y-0.5 transition-transform"><FacebookIcon className="w-5 h-5 text-white" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1877F2]/60 mb-1">Follow Us</p>
                <p className="font-extrabold text-slate-800 text-sm">Official Facebook Page</p>
                <p className="text-xs font-medium text-[#1877F2] mt-0.5 flex items-center">Brgy. San Isidro, Gigaquit <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" /></p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1877F2] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>
          </div>
        </div>
      </section>
      <div className="text-center py-4">
        <p className="text-xs font-medium text-slate-400">© {new Date().getFullYear()} Barangay San Isidro RMS, Gigaquit, Surigao del Norte. All rights reserved.</p>
      </div>
    </div>
  );
}