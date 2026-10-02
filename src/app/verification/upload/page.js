'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [existingDocs, setExistingDocs] = useState([]);
  const [docNumbers, setDocNumbers] = useState({});
  const [documents, setDocuments] = useState({});
  const [previews, setPreviews] = useState({});
  const [dragActive, setDragActive] = useState({});

  // Document definitions with role-specific metadata
  const docConfig = {
    SELLER: [
      {
        type: 'AADHAAR',
        label: 'Aadhaar Identity Card',
        badge: 'Government ID',
        placeholder: '12-digit Aadhaar (e.g., 2345 6789 1234)',
        description: 'Official 12-digit biometric identity card issued by UIDAI.',
        formatGuide: 'Enter 12 digits without spaces or dashes',
        icon: '🪪',
      },
      {
        type: 'LAND_RECORD',
        label: 'Land Title / 7/12 Extract / Deed',
        badge: 'Land Ownership Proof',
        placeholder: 'Survey / Khasra / Title deed reference number',
        description: 'Recent 7/12 extract, Patta, Jamabandi, or registered ownership deed.',
        formatGuide: 'Enter official survey number or registry folio',
        icon: '🌾',
      },
    ],
    FARMER: [
      {
        type: 'AADHAAR',
        label: 'Aadhaar Identity Card',
        badge: 'Government ID',
        placeholder: '12-digit Aadhaar (e.g., 2345 6789 1234)',
        description: 'Official 12-digit biometric identity card issued by UIDAI.',
        formatGuide: 'Enter 12 digits without spaces or dashes',
        icon: '🪪',
      },
      {
        type: 'LAND_RECORD',
        label: 'Land Title / 7/12 Extract / Deed',
        badge: 'Land Ownership Proof',
        placeholder: 'Survey / Khasra / Title deed reference number',
        description: 'Recent 7/12 extract, Patta, Jamabandi, or registered ownership deed.',
        formatGuide: 'Enter official survey number or registry folio',
        icon: '🌾',
      },
    ],
    BUYER: [
      {
        type: 'PAN',
        label: 'Corporate PAN Card',
        badge: 'Tax Identity',
        placeholder: '10-character PAN (e.g., ABCDE1234F)',
        description: 'Permanent Account Number certificate issued by the Income Tax Department.',
        formatGuide: 'Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
        icon: '🏢',
      },
      {
        type: 'GST_CERTIFICATE',
        label: 'GST Registration Certificate',
        badge: 'Business Registration',
        placeholder: '15-character GSTIN (e.g., 27ABCDE1234F1Z5)',
        description: 'Official Form GST REG-06 Certificate of Registration.',
        formatGuide: '15-digit state & PAN based GST identification number',
        icon: '📑',
      },
    ],
    COMPANY: [
      {
        type: 'PAN',
        label: 'Corporate PAN Card',
        badge: 'Tax Identity',
        placeholder: '10-character PAN (e.g., ABCDE1234F)',
        description: 'Permanent Account Number certificate issued by the Income Tax Department.',
        formatGuide: 'Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
        icon: '🏢',
      },
      {
        type: 'GST_CERTIFICATE',
        label: 'GST Registration Certificate',
        badge: 'Business Registration',
        placeholder: '15-character GSTIN (e.g., 27ABCDE1234F1Z5)',
        description: 'Official Form GST REG-06 Certificate of Registration.',
        formatGuide: '15-digit state & PAN based GST identification number',
        icon: '📑',
      },
    ],
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        // Fetch user profile
        const userRes = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userRes.ok) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        const userData = await userRes.json();
        const currentUser = userData.data;
        setUser(currentUser);

        // Fetch already uploaded documents
        const docsRes = await fetch('/api/documents/upload', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const list = docsData.data || [];
          setExistingDocs(list);

          // Pre-populate document numbers from existing submissions
          const initialNumbers = {};
          list.forEach((d) => {
            if (d.documentNumber) {
              initialNumbers[d.documentType] = d.documentNumber;
            }
          });
          setDocNumbers(initialNumbers);
        }
      } catch (err) {
        console.error('Error loading verification data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const isSeller = user?.role === 'SELLER' || user?.role === 'FARMER';
  const roleDocs = docConfig[user?.role] || docConfig.SELLER;

  const handleNumberChange = (type, val) => {
    // Auto-uppercase for PAN & GSTIN
    const formatted = (type === 'PAN' || type === 'GST_CERTIFICATE') ? val.toUpperCase().trim() : val;
    setDocNumbers((prev) => ({ ...prev, [type]: formatted }));
  };

  const handleFile = (file, docType) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(`${docType}: File size must be less than 5MB`);
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage(`${docType}: Only PDF, JPG, or PNG files are supported`);
      return;
    }

    setErrorMessage('');
    setDocuments((prev) => ({ ...prev, [docType]: file }));

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => ({ ...prev, [docType]: e.target?.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews((prev) => ({ ...prev, [docType]: 'PDF_FILE' }));
    }
  };

  const handleDrag = (e, type, active) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: active }));
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file, type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Validate inputs
      for (const doc of roleDocs) {
        const num = (docNumbers[doc.type] || '').trim();
        const existing = existingDocs.find((d) => d.documentType === doc.type);
        const hasApproved = existing?.verificationStatus === 'APPROVED';
        const file = documents[doc.type];

        if (!num) {
          setErrorMessage(`Please enter your ${doc.label} number.`);
          setSubmitting(false);
          return;
        }

        if (!hasApproved && !file && !existing) {
          setErrorMessage(`Please upload a document file for ${doc.label}.`);
          setSubmitting(false);
          return;
        }
      }

      // Upload each new/updated document
      let uploadedCount = 0;
      for (const doc of roleDocs) {
        const file = documents[doc.type];
        const documentNumber = (docNumbers[doc.type] || '').trim();

        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', doc.type);
          formData.append('documentNumber', documentNumber);

          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || `Failed to upload ${doc.label}`);
          }
          uploadedCount++;
        }
      }

      setSuccessMessage(
        uploadedCount > 0
          ? `Successfully submitted ${uploadedCount} document(s) for verification! Review takes 12–24 hours.`
          : 'Documents verified and up to date.'
      );

      setTimeout(() => {
        router.push('/verification-pending');
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while submitting documents.');
    } finally {
      setSubmitting(false);
    }
  };

  const dashboardHref = isSeller
    ? '/seller/dashboard'
    : user?.role === 'ADMIN'
    ? '/admin/dashboard'
    : '/buyer/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-xs font-semibold text-[#0B1F17]">Loading verification portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-sm">
              {isSeller ? '🌾' : '🏢'}
            </div>
            <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            <span className="text-[10px] bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20 hidden sm:inline">
              KYC Verification
            </span>
          </Link>

          <Link
            href={dashboardHref}
            className="btn-pill btn-pill-ghost text-xs !py-2 !px-4"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="eyebrow mb-1">Identity & Compliance Registry</span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              Submit Verification Documents
            </h1>
            <p className="text-zinc-600 text-sm mt-1 max-w-xl leading-relaxed">
              {isSeller
                ? 'Verify your agricultural seller credentials and land ownership to tokenize and sell verified carbon credits.'
                : 'Complete corporate entity onboarding to trade, procure, and retire certified carbon credits.'}
            </p>
          </div>

          <div className="bg-white border border-[#1B4332]/15 px-4 py-3 rounded-2xl shadow-xs shrink-0 text-left">
            <span className="text-[10px] font-bold text-[#606C38] uppercase tracking-wider block">
              Estimated Audit Time
            </span>
            <span className="text-xs font-bold text-[#0B1F17] flex items-center gap-1.5 mt-0.5">
              <span>⚡</span> 12 – 24 Business Hours
            </span>
          </div>
        </div>

        {/* Role Account Badge Banner */}
        <div className="bg-[#0B1F17] text-white rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#DDA15E]">
                {isSeller ? '🌾 Seller / Farmer Registry KYC' : '🏢 Corporate Buyer / Enterprise Onboarding'}
              </span>
              <h2 className="font-display text-xl font-bold text-white">
                Account: {user?.name || 'Verified User'} ({user?.email})
              </h2>
              <p className="text-xs text-white/70 leading-relaxed max-w-xl">
                {isSeller
                  ? 'Please upload your Aadhaar Card and 7/12 Land Title deed. This ensures high-integrity verification for all issued carbon batches.'
                  : 'Please upload your Corporate PAN and GST Registration Certificate to activate institutional trading and offset retirement.'}
              </p>
            </div>

            <div className="shrink-0 bg-white/10 px-3.5 py-2 rounded-xl border border-white/15 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                Verification Status
              </span>
              <span className="text-xs font-extrabold text-white">
                {user?.verified ? '✓ Verified Account' : '⏳ Pending KYC'}
              </span>
            </div>
          </div>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium flex items-center gap-2"
          >
            <span>❌</span>
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2"
          >
            <span>✅</span>
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {roleDocs.map((doc) => {
            const existing = existingDocs.find((d) => d.documentType === doc.type);
            const isApproved = existing?.verificationStatus === 'APPROVED';
            const isPending = existing?.verificationStatus === 'PENDING';
            const isRejected = existing?.verificationStatus === 'REJECTED';
            const selectedFile = documents[doc.type];
            const preview = previews[doc.type];

            return (
              <div
                key={doc.type}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1B4332]/10 shadow-sm space-y-6"
              >
                {/* Document Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF8F2] border border-[#1B4332]/15 flex items-center justify-center text-xl shadow-xs">
                      {doc.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-[#0B1F17]">
                          {doc.label}
                        </h3>
                        <span className="text-[10px] bg-[#FAF8F2] text-[#606C38] font-bold px-2 py-0.5 rounded-full border border-[#606C38]/20">
                          {doc.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{doc.description}</p>
                    </div>
                  </div>

                  {/* Document Status Tag */}
                  {existing && (
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-red-50 text-red-800 border-red-300'
                      }`}
                    >
                      {isApproved
                        ? '✓ Verified & Approved'
                        : isPending
                        ? '⏳ Under Admin Review'
                        : '✕ Rejected (Action Required)'}
                    </span>
                  )}
                </div>

                {/* Rejection Alert if any */}
                {isRejected && existing?.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <span>⚠️</span> Rejection Reason from Auditor:
                    </span>
                    <p className="text-red-700 pl-4">{existing.rejectionReason}</p>
                    <p className="text-[11px] text-red-600 pl-4 font-semibold">
                      Please upload a clear, revised copy below to resubmit.
                    </p>
                  </div>
                )}

                {/* Document Number Input */}
                <div>
                  <label
                    htmlFor={`num-${doc.type}`}
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5"
                  >
                    {doc.label} Number *
                  </label>
                  <input
                    type="text"
                    id={`num-${doc.type}`}
                    value={docNumbers[doc.type] || ''}
                    onChange={(e) => handleNumberChange(doc.type, e.target.value)}
                    placeholder={doc.placeholder}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F2] border border-[#1B4332]/20 text-xs font-semibold text-[#0B1F17] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30 focus:border-[#1B4332] transition"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    {doc.formatGuide}
                  </span>
                </div>

                {/* File Upload Dropzone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Upload Document File {existing ? '(Upload new file to replace)' : '*'}
                  </label>

                  <div
                    onDragEnter={(e) => handleDrag(e, doc.type, true)}
                    onDragOver={(e) => handleDrag(e, doc.type, true)}
                    onDragLeave={(e) => handleDrag(e, doc.type, false)}
                    onDrop={(e) => handleDrop(e, doc.type)}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer relative ${
                      dragActive[doc.type]
                        ? 'border-[#1B4332] bg-[#1B4332]/5'
                        : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-[#1B4332]/20 hover:border-[#1B4332] bg-[#FAF8F2]/50 hover:bg-[#FAF8F2]'
                    }`}
                  >
                    <input
                      type="file"
                      id={`file-${doc.type}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file, doc.type);
                      }}
                      className="hidden"
                    />
                    <label htmlFor={`file-${doc.type}`} className="cursor-pointer block">
                      <span className="text-3xl block mb-2">
                        {selectedFile ? '📄' : '📤'}
                      </span>
                      <p className="text-xs font-bold text-[#0B1F17]">
                        {selectedFile
                          ? selectedFile.name
                          : existing
                          ? `Current: ${existing.fileName} (Click to replace)`
                          : 'Click to upload or drag & drop document'}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Supported formats: PDF, JPG, or PNG (Max 5MB)
                      </p>
                      {selectedFile && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          ✓ File Selected ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* Preview if Image */}
                {preview && preview !== 'PDF_FILE' && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Document Preview:
                    </span>
                    <img
                      src={preview}
                      alt={doc.label}
                      className="max-h-40 rounded-xl border border-zinc-200 shadow-xs object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Document Verification Guidelines Card */}
          <div className="bg-[#FAF8F2] border border-[#1B4332]/15 rounded-3xl p-6 shadow-xs">
            <h4 className="font-display text-sm font-bold text-[#0B1F17] flex items-center gap-2 mb-3">
              <span>📋</span> Official Verification Guidelines
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600">
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Ensure high-resolution clarity with all four corners visible.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Document name must match your registered account identity.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Land records must display survey / 7/12 land registry numbers.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Corporate GSTIN & PAN must be active with the Ministry of Finance.</span>
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-pill btn-pill-solid !py-4 text-sm shadow-md font-bold text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Submitting Documents to Registry...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Submit Documents for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Support Footer */}
        <div className="text-center pt-4 pb-12 text-xs text-zinc-500 space-y-1">
          <p>Need assistance with document verification or registry guidelines?</p>
          <a
            href="mailto:support@carbonbazaar.in"
            className="font-bold text-[#1B4332] hover:underline"
          >
            support@carbonbazaar.in
          </a>
        </div>
      </main>
    </div>
  );
}
