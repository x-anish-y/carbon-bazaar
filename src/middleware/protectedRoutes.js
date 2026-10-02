'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin Protection HOC
 * Ensures only ADMIN users can access protected routes
 */
export function withAdminProtection(WrappedComponent) {
  return function AdminProtectedComponent(props) {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkAdminRole = async () => {
        try {
          const response = await fetch('/api/users/profile', {
            credentials: 'include',
          });

          if (!response.ok) {
            router.push('/auth/login');
            return;
          }

          const data = await response.json();
          if (data.data.role === 'ADMIN') {
            setIsAdmin(true);
          } else {
            router.push('/');
          }
        } catch (err) {
          console.error('Admin check failed:', err);
          router.push('/auth/login');
        } finally {
          setLoading(false);
        }
      };

      checkAdminRole();
    }, [router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying admin access...</p>
          </div>
        </div>
      );
    }

    if (!isAdmin) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Verification Protection HOC
 * Redirects unverified users to verification page
 */
export function withVerificationProtection(WrappedComponent) {
  return function VerificationProtectedComponent(props) {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkVerification = async () => {
        try {
          const response = await fetch('/api/documents/verify?action=status', {
            credentials: 'include',
          });

          if (!response.ok) {
            router.push('/auth/login');
            return;
          }

          const data = await response.json();
          if (data.data.isVerified) {
            setIsVerified(true);
          } else {
            router.push('/verification');
          }
        } catch (err) {
          console.error('Verification check failed:', err);
          router.push('/auth/login');
        } finally {
          setLoading(false);
        }
      };

      checkVerification();
    }, [router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking verification status...</p>
          </div>
        </div>
      );
    }

    if (!isVerified) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
