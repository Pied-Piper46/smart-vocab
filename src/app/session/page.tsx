'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SessionManager from '@/components/learning/SessionManager';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // Redirect to signin if not authenticated
  if (!session) {
    return null;
  }

  // Show learning session immediately (no difficulty selection)
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-10 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-lg float-animation"></div>
      <div className="absolute bottom-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-green-400/20 to-cyan-400/20 blur-lg float-animation" style={{ animationDelay: '1.5s' }}></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
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
