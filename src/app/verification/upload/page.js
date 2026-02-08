'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [documents, setDocuments] = useState({});
  const [previews, setPreviews] = useState({});

  // Fetch user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUser(data.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Document types required based on role
  const requiredDocs = {
    FARMER: [
      { type: 'AADHAAR', label: 'Aadhaar', description: 'Your 12-digit unique identity number' },
      { type: 'LAND_RECORD', label: 'Land Record', description: 'Deed, title, or ownership document' },
    ],
    COMPANY: [
      { type: 'PAN', label: 'PAN Certificate', description: 'Permanent Account Number certificate' },
      { type: 'GST_CERTIFICATE', label: 'GST Certificate', description: 'Goods and Services Tax registration' },
    ],
  };

  const handleFileChange = (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    setErrorMessage('');
    setDocuments((prev) => ({
      ...prev,
      [docType]: file,
    }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews((prev) => ({
          ...prev,
          [docType]: event.target?.result,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews((prev) => ({
        ...prev,
        [docType]: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const token = localStorage.getItem('token');
    const docs = requiredDocs[user?.role] || [];

    try {
      // Check all required documents are uploaded
      for (const doc of docs) {
        if (!documents[doc.type]) {
          setErrorMessage(`Please upload ${doc.label}`);
          setSubmitting(false);
          return;
        }
      }

      // Upload each document
      for (const doc of docs) {
        const file = documents[doc.type];
        const documentNumber = (document.getElementById(`number-${doc.type}`)?.value) || '';

        if (!documentNumber) {
          setErrorMessage(`Please enter ${doc.label} number`);
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', doc.type);
        formData.append('documentNumber', documentNumber);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || `Failed to upload ${doc.label}`);
          setSubmitting(false);
          return;
        }
      }

      setSuccessMessage('Documents submitted successfully! Redirecting to verification status...');
      setTimeout(() => {
        router.push('/verification-pending');
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  const docs = requiredDocs[user?.role] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">🌾</span>
            <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-10 border border-zinc-200">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">
              📄 Upload Documents
            </h1>
            <p className="text-zinc-600">
              Complete your verification by uploading required documents
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="font-medium text-blue-900 mb-2">📋 Account Type: {user?.role === 'FARMER' ? '🌱 Farmer' : '🏢 Company'}</h3>
            <p className="text-sm text-blue-800">
              {user?.role === 'FARMER'
                ? 'Please upload your Aadhaar and land ownership documents.'
                : 'Please upload your PAN and GST registration documents.'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8">
              <p className="text-sm text-red-700 font-medium">❌ {errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-8">
              <p className="text-sm text-green-700 font-medium">✅ {successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {docs.map((doc) => (
              <div key={doc.type} className="border border-zinc-200 rounded-lg p-6">
                {/* Document Header */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-zinc-900">{doc.label}</h3>
                  <p className="text-sm text-zinc-600 mt-1">{doc.description}</p>
                </div>

                {/* Document Number */}
                <div className="mb-6">
                  <label htmlFor={`number-${doc.type}`} className="block text-sm font-medium text-zinc-900 mb-2">
                    {doc.label} Number
                  </label>
                  <input
                    type="text"
                    id={`number-${doc.type}`}
                    placeholder={
                      doc.type === 'AADHAAR'
                        ? '1234 5678 9012'
                        : doc.type === 'LAND_RECORD'
                        ? 'Survey number or deed reference'
                        : doc.type === 'PAN'
                        ? 'ABCDE1234F'
                        : 'GSTIN123456789'
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-900 mb-3">
                    Upload File
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, doc.type)}
                      className="hidden"
                      id={`file-${doc.type}`}
                    />
                    <label htmlFor={`file-${doc.type}`} className="cursor-pointer block">
                      <div className="text-4xl mb-3">📤</div>
                      <p className="text-sm font-medium text-zinc-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        PDF, JPG or PNG (max 5MB)
                      </p>
                      {documents[doc.type] && (
                        <p className="text-sm text-green-600 font-medium mt-2">
                          ✓ {documents[doc.type].name}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {previews[doc.type] && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-zinc-900 mb-3">Preview</p>
                    <img
                      src={previews[doc.type]}
                      alt={doc.label}
                      className="max-w-xs max-h-48 rounded-lg border border-zinc-300"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Guidelines */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Document Guidelines</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Ensure documents are clear and readable</li>
                <li>• All four corners must be visible in the document</li>
                <li>• No blurring or redaction of important details</li>
                <li>• Recent documents (preferably within 6 months)</li>
                <li>• Documents must match your registered name</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '📤 Uploading Documents...' : '📤 Submit for Verification'}
            </button>
          </form>

          {/* Support */}
          <div className="mt-8 text-center text-sm text-zinc-600">
            <p className="mb-2">Having trouble uploading? Contact our support team</p>
            <a href="mailto:support@carbenbazaar.in" className="text-green-600 hover:text-green-700 font-medium">
              support@carbenbazaar.in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
