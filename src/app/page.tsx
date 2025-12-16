'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all users (guest and authenticated) to dashboard
    router.push('/dashboard');
  }, [router]);

  return <LoadingSpinner />;
}
