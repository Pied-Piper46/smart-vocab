'use client';

import { useSession } from 'next-auth/react';
import SessionManager from '@/components/learning/SessionManager';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SessionPage() {
  const { data: session, status } = useSession();

  // Show loading while checking session status
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // Allow both guest and authenticated users to access session
  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-20" />
        <SessionManager
          onSessionComplete={(stats, feedback) => {
            console.log('Session completed:', stats);
            if (feedback) {
              console.log('Session feedback:', feedback);
            }
            // Note: Don't redirect immediately to allow completion screen to show
            // User can manually navigate back using the feedback component buttons
          }}
        />
      </div>
    </div>
  );
}
