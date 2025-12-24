export interface User {
    id: string;
    email: string;
}

const API_BASE = '';
const STORAGE_KEY = 'currentUser';

/**
 * Login with email (simple authentication)
 */
export async function login(email: string): Promise<User> {
    // Validate email format
    if (!email || !email.includes('@')) {
        throw new Error('Invalid email');
    }

    const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        throw new Error('Login failed');
    }

    const user: User = await response.json();

    // Store user in localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return user;
}

/**
 * Logout current user
 */
export function logout(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
    try {
        const userJson = localStorage.getItem(STORAGE_KEY);
        if (!userJson) {
            return null;
        }
        return JSON.parse(userJson);
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        return null;
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return getCurrentUser() !== null;
}
