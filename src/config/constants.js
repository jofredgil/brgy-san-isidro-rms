export const BRANDING = {
  appName: "Barangay San Isidro RMS",
  appLocation: "Gigaquit, Surigao del Norte",
  appShortName: "Brgy San Isidro",
  appShortLocation: "Gigaquit, SDN",
  logo1: "/gakit.jpg",
  logo2: "/san isidro logo.jpg",
  landingBackground: "/bg1.jpg",
  contact: {
    address: "Brgy Hall, San Isidro, Gigaquit, Surigao del Norte",
    mapUrl: "https://maps.app.goo.gl/LWpm39PYfgN855267",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
    fbLink: "https://www.facebook.com/barangay.san.isidro.244635"
  }
};

export const PUROKS = ["Sikat", "Kanipaan", "Makugihon", "Magbabaol", "Kalubihan", "Malipayon", "Makiangayon"];
export const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];
export const GENDERS = ['Male', 'Female'];
export const EDU_OPTIONS = ['Select...', 'Elementary Level', 'Elementary Graduate', 'High School Level', 'High School Graduate', 'College Level', 'College Graduate', 'Vocational', 'Post-Graduate'];
export const DOC_TYPES = ["Certificate of Indigency", "Certificate of First Time Job Seeker", "Certificate of Barangay Clearance", "Certificate of Business Permit/Clearance", "Certificate of Residency"];

export const CERTIFICATES = [
  { type: "Certificate of Indigency", icon: "🏠", color: "blue", purpose: "Certifies that a resident belongs to a low-income or indigent family.", uses: ["Free legal aid / PAO assistance", "Hospital & medical fee reduction", "Scholarship applications", "Government financial assistance programs"], requirements: ["Valid ID (any government-issued)", "Proof of residency (utility bill or cedula)", "Accomplished request form"] },
  { type: "Certificate of First Time Job Seeker", icon: "💼", color: "emerald", purpose: "Issued to first-time job applicants under RA 11261 to exempt them from paying fees.", uses: ["NBI Clearance (fee exemption)", "Police Clearance (fee exemption)", "Civil Service Exam (fee exemption)", "Other government fees waiver"], requirements: ["Valid ID or PSA Birth Certificate", "Proof of no previous employment (affidavit or sworn statement)", "Accomplished request form"] },
  { type: "Certificate of Barangay Clearance", icon: "✅", color: "violet", purpose: "Confirms that a resident has no derogatory records within the barangay.", uses: ["Employment requirements", "Loan applications", "Rental/housing requirements", "General legal transactions"], requirements: ["Valid government-issued ID", "Community Tax Certificate (Cedula)", "Proof of residency", "Accomplished request form"] },
  { type: "Certificate of Business Permit/Clearance", icon: "🏪", color: "amber", purpose: "Required for businesses operating within the barangay before securing a Mayor's Permit.", uses: ["Business registration with LGU", "Annual business permit renewal", "DTI/SEC registration support"], requirements: ["Valid ID of business owner", "Business name & description", "Location/address of business", "Accomplished request form"] },
  { type: "Certificate of Residency", icon: "🏡", color: "rose", purpose: "Confirms that a person is an official resident of Barangay San Isidro.", uses: ["School enrollment & transfer", "Bank account opening", "Government benefit applications", "General proof of address"], requirements: ["Valid government-issued ID", "Proof of address (utility bill, lease contract)", "Accomplished request form"] }
];
 
export const COLOR_MAP = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500",   ring: "ring-blue-200"   },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700",badge: "bg-emerald-100 text-emerald-700",dot:"bg-emerald-500",ring: "ring-emerald-200"},
  violet:  { bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500",  ring: "ring-violet-200"  },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500",   ring: "ring-amber-200"   },
  rose:    { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",   badge: "bg-rose-100 text-rose-700",    dot: "bg-rose-500",    ring: "ring-rose-200"    },
};
 
export const PROCEDURE_STEPS = [
  { step: "01", title: "Log In & Request", desc: "Sign in to your account and go to 'Request Documents'. Fill out the form with your document type, personal details, and purpose." },
  { step: "02", title: "Submit Request", desc: "Click 'Submit Request'. Your application is instantly recorded and marked as Pending in our system." },
  { step: "03", title: "Processing", desc: "Barangay staff reviews and processes your request. You can monitor the status in 'My Requests' anytime." },
  { step: "04", title: "Notification", desc: "Once your document is approved, check 'My Requests' for the status update and admin message." },
  { step: "05", title: "Claim Document", desc: "Visit the Barangay Hall during office hours with a valid ID. Present your request reference to claim your document." },
];
 
export const TIPS = [
  { icon: "📋", title: "Prepare All Requirements in Advance", desc: "Gather all required documents before visiting the barangay hall to avoid delays. Keep digital or physical copies of your valid IDs and supporting documents." },
  { icon: "⏰", title: "Visit During Office Hours", desc: "The barangay hall is open Monday to Friday, 8:00 AM – 5:00 PM. Avoid peak hours (10 AM–12 PM & 2–4 PM) for faster service." },
  { icon: "📱", title: "Check the System for Updates", desc: "Use this portal to monitor your request status in real time. You'll see admin messages under 'My Requests' so you always know what's happening." },
  { icon: "✍️", title: "Fill Out Forms Accurately", desc: "Ensure all information matches your official IDs. Mismatched names or dates can delay or invalidate your certificate." },
];
 
export const BENEFITS = [
  { icon: "🚀", title: "Save Time", desc: "No more repeated trips to the barangay hall just to check your request status." },
  { icon: "📊", title: "Full Transparency", desc: "Track every request in real time, with messages straight from barangay staff." },
  { icon: "🔒", title: "Secure Records", desc: "Your personal data is stored safely on a private, authenticated cloud database." },
  { icon: "📲", title: "Accessible Anywhere", desc: "Access your records and request documents from any device, anytime, anywhere." },
  { icon: "🏘️", title: "Community Connected", desc: "Stay informed about barangay officials and community demographics." },
  { icon: "✅", title: "Paperless & Efficient", desc: "Reduce paperwork and streamline barangay operations for everyone." },
];