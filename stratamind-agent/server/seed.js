import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const seed = async () => {
    console.log("Seeding Database...");

    // Wait for schema init
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmail = 'sergioro.2007@gmail.com';

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 0. Ensure User Exists
            db.get(`SELECT id FROM profiles WHERE email = ?`, [userEmail], (err, row) => {
                if (err) {
                    console.error("User lookup error:", err);
                    return;
                }

                let userId = row ? row.id : uuidv4();

                const proceedToSeed = () => {
                    // 1. Create Institution
                    const instId = uuidv4();
                    db.run(`INSERT INTO institutions (id, user_id, name) VALUES (?, ?, ?)`, [instId, userId, "Fidelity"], (err) => {
                        if (err) {
                            console.log("Institution exists or error:", err.message);
                            // If institution exists, we might duplicate accounts, but for seed it's ok or we should check.
                            // For simplicity: continue.
                        }
                        console.log(`Created Institution: Fidelity for User: ${userId}`);

                        // 2. Create Account
                        const accId = uuidv4();
                        db.run(`INSERT INTO accounts (id, institution_id, name, type, total_value, cash_balance, margin) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [accId, instId, "Brokerage", "Brokerage", 150000, 10000, 0], (err) => {
                                if (err) {
                                    console.log("Account create error:", err.message);
                                    return;
                                }
                                console.log("Created Account: Brokerage");

                                // 3. Create Snapshot
                                const snapId = uuidv4();
                                const now = Date.now();
                                const yesterday = now - 86400000;

                                // Snapshot 1 (Yesterday)
                                db.run(`INSERT INTO performance_snapshots (id, account_id, timestamp, total_value, cash_balance, holdings_value, day_change, day_change_percent) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [uuidv4(), accId, yesterday, 148000, 10000, 138000, 0, 0]
                                );

                                // Snapshot 2 (Today)
                                db.run(`INSERT INTO performance_snapshots (id, account_id, timestamp, total_value, cash_balance, holdings_value, day_change, day_change_percent) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [snapId, accId, now, 150000, 10000, 140000, 2000, 1.35],
                                    (err) => {
                                        if (err) console.error("Snapshot error:", err);
                                        else console.log("Seeded Snapshots for Chart.");
                                        resolve();
                                    }
                                );
                            });
                    });
                };

                if (!row) {
                    // Create User if missing
                    db.run(`INSERT INTO profiles (id, email) VALUES (?, ?)`, [userId, userEmail], (err) => {
                        if (err) console.error("Create User Error", err);
                        else {
                            console.log("Created User Profile for " + userEmail);
                            proceedToSeed();
                        }
                    });
                } else {
                    console.log("User found (" + userId + "), appending data.");
                    proceedToSeed();
                }
            });
        });
    });
};

seed().catch(console.error);
