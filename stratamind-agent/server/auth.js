import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Login user with email (simple authentication)
 * Creates new profile if email doesn't exist, returns existing if it does
 */
export function loginUser(email, callback) {
    // Validate email
    if (!email || !email.includes('@')) {
        return callback(new Error('Invalid email'), undefined);
    }

    // Check if user exists
    db.get('SELECT * FROM profiles WHERE email = ?', [email], (err, user) => {
        if (err) {
            return callback(err, undefined);
        }

        if (user) {
            // User exists, return it
            return callback(null, user);
        }

        // User doesn't exist, create new profile
        const userId = uuidv4();
        db.run(
            'INSERT INTO profiles (id, email) VALUES (?, ?)',
            [userId, email],
            function (err) {
                if (err) {
                    return callback(err, undefined);
                }
                callback(null, { id: userId, email });
            }
        );
    });
}

/**
 * Express middleware to require authentication
 */
export function requireAuth(req, res, next) {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Attach user ID to request for use in handlers
    req.userId = userId;
    next();
}

/**
 * Get current user ID from request
 */
export function getCurrentUser(req) {
    return req.headers['x-user-id'] || null;
}
