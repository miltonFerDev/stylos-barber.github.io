import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
