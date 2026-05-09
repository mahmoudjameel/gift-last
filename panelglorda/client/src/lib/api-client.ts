import { auth } from './firebase';

/**
 * API client wrapper that automatically adds Firebase auth token to requests
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiClient(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    let token: string | null = null;

    // Get Firebase ID token if user is authenticated
    if (user) {
        try {
            token = await user.getIdToken();
        } catch (error) {
            console.error('Failed to get ID token:', error);
        }
    }

    // Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Make request with auth header
    return fetch(url, {
        ...options,
        headers,
    });
}
