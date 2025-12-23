import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loginUser, requireAuth, getCurrentUser } from '../auth.js';
import db from '../db.js';

// Promisify loginUser for easier testing
function loginUserPromise(email) {
    return new Promise((resolve, reject) => {
        loginUser(email, (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
    });
}

// Promisify db.run for easier cleanup
function dbRun(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

describe('Auth Service', () => {
    beforeEach(async () => {
        // Clean up test data
        await dbRun('DELETE FROM profiles');
    });

    afterEach(async () => {
        await dbRun('DELETE FROM profiles');
    });

    describe('loginUser', () => {
        it('should create a new user profile if email does not exist', async () => {
            const user = await loginUserPromise('newuser@example.com');
            expect(user).toBeDefined();
            expect(user.email).toBe('newuser@example.com');
            expect(user.id).toBeDefined();
        });

        it('should return existing user profile if email already exists', async () => {
            const user1 = await loginUserPromise('existing@example.com');
            const userId1 = user1.id;

            const user2 = await loginUserPromise('existing@example.com');
            expect(user2.id).toBe(userId1);
            expect(user2.email).toBe('existing@example.com');
        });

        it('should handle invalid email gracefully', async () => {
            await expect(loginUserPromise('')).rejects.toThrow('Invalid email');
        });
    });

    describe('requireAuth middleware', () => {
        it('should block requests without user session', () => {
            const req = { headers: {} };
            const res = {
                status: (code) => {
                    expect(code).toBe(401);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Unauthorized');
                        }
                    };
                }
            };
            const next = () => {
                throw new Error('next() should not be called');
            };

            requireAuth(req, res, next);
        });

        it('should allow requests with valid user session', () => {
            const req = {
                headers: {
                    'x-user-id': 'test-user-id'
                }
            };
            const res = {};
            let nextCalled = false;
            const next = () => {
                nextCalled = true;
            };

            requireAuth(req, res, next);
            expect(nextCalled).toBe(true);
        });
    });

    describe('getCurrentUser', () => {
        it('should extract user ID from request headers', () => {
            const req = {
                headers: {
                    'x-user-id': 'my-user-123'
                }
            };
            const userId = getCurrentUser(req);
            expect(userId).toBe('my-user-123');
        });

        it('should return null if no user ID in headers', () => {
            const req = { headers: {} };
            const userId = getCurrentUser(req);
            expect(userId).toBeNull();
        });
    });
});
