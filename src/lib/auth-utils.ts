import { auth } from '@/lib/auth';

export async function getCurrentUser() {
  try {
    const session = await auth();
    
    if (!session || !session.user?.id) {
      return null;
    }
    
    return {
      id: session.user.id,
      email: session.user.email as string,
      name: session.user.name as string,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Unauthorized - Please log in',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}