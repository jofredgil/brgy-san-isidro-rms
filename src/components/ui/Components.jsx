import React from 'react';
import { Camera } from 'lucide-react';

export const FormInput = ({ label, required, type="text", ...props }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} required={required} className="cursor-text w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-sm" {...props} />
  </div>
);

export const FormSelect = ({ label, required, children, ...props }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
    <select required={required} className="cursor-pointer w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-sm" {...props}>{children}</select>
  </div>
);

export const FloatingInput = ({ label, id, type="text", required, ...props }) => (
  <div className="relative">
    <input type={type} required={required} id={id} className="block w-full px-4 pt-6 pb-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-white text-sm font-medium peer cursor-text" placeholder=" " {...props} />
    <label htmlFor={id} className="absolute text-slate-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 font-bold text-xs uppercase tracking-wider cursor-text pointer-events-none">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

export function InitialsAvatar({ name = '', size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
    
  const sizes = {
    sm:  'w-7 h-7 text-[10px]',
    md:  'w-9 h-9 text-xs',
    lg:  'w-12 h-12 text-sm',
    xl:  'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-4xl',
  };
  
  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white font-extrabold flex items-center justify-center flex-shrink-0 select-none border-2 border-white shadow-sm ${sizes[size] ?? sizes.md} ${className}`}>
      {initials || 'U'}
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = { 'Pending': 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]', 'Approved': 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]', 'Rejected': 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]' };
  return <span className={`px-3 py-1 rounded-md text-[10px] font-extrabold border tracking-wider uppercase ${styles[status] || 'bg-slate-100'}`}>{status}</span>;
}

// Keep this ONLY for the Admin Officials form later
export const handleImageResize = (file, callback) => {
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
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

export function FacebookIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

export function IconMale({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>♂️</div>; }
export function IconFemale({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>♀️</div>; }
export function IconAdult({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>🧑</div>; }
export function IconMinor({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>👶</div>; }
export function IconSenior({ className }) { return <div className={`${className} flex items-center justify-start text-2xl not-italic`}>🧓</div>; }

export function ProgressBar({ label, value, total, color, onClick }) {
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