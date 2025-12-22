import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// GET /api/portfolio
// Returns the full tree of Institutions -> Accounts -> Strategies
app.get('/api/portfolio', (req, res) => {
    const sql = `
        SELECT 
            i.id as inst_id, i.name as inst_name,
            a.id as acc_id, a.name as acc_name, a.type as acc_type, a.total_value, a.cash_balance,
            s.id as slice_id, s.parent_id, s.type as slice_type, s.name as slice_name, s.symbol, s.target_allocation, s.current_value, s.strategy_prompt
        FROM institutions i
        LEFT JOIN accounts a ON a.institution_id = i.id
        LEFT JOIN portfolio_slices s ON s.account_id = a.id
        ORDER BY i.created_at, a.created_at, s.created_at
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Reconstruct Tree from flat rows
        // This is a naive reconstruction for MVP.
        // A better approach might be fetching tables separately and joining in memory or using JSON_GROUP_ARRAY if supported.
        // For simplicity, let's fetch institutions and then populate.

        // Actually, let's just use separate queries for clarity in this phase
        // Use separate queries to build the tree
        // Fetch Institutions
        db.all("SELECT * FROM institutions", [], (err, insts) => {
            if (err) return res.status(500).json({ error: err.message });

            let completed = 0;
            if (insts.length === 0) return res.json([]);

            // Map Institutions (no name change needed for 'name', 'id')
            const result = insts.map(inst => ({ ...inst, accounts: [] }));

            result.forEach(inst => {
                db.all("SELECT * FROM accounts WHERE institution_id = ?", [inst.id], (err, accs) => {
                    if (err) {
                        console.error("Error fetching accounts", err);
                        return; // Should probably handle better
                    }

                    // Map Accounts: snake_case -> camelCase
                    inst.accounts = accs.map(a => ({
                        id: a.id,
                        institutionId: a.institution_id,
                        name: a.name,
                        type: a.type,
                        totalValue: a.total_value || 0,
                        cashBalance: a.cash_balance || 0,
                        created_at: a.created_at,
                        strategies: []
                    }));

                    let accCompleted = 0;
                    if (inst.accounts.length === 0) {
                        completed++;
                        if (completed === result.length) res.json(result);
                        return;
                    }

                    inst.accounts.forEach(acc => {
                        db.all("SELECT * FROM portfolio_slices WHERE account_id = ?", [acc.id], (err, slices) => {
                            // Map Slices: snake_case -> camelCase
                            const mappedSlices = slices.map(s => ({
                                id: s.id,
                                parentId: s.parent_id,
                                type: s.type,
                                name: s.name,
                                symbol: s.symbol,
                                targetAllocation: s.target_allocation,
                                currentValue: s.current_value,
                                strategyPrompt: s.strategy_prompt,
                                children: []
                            }));

                            // Rehydrate Tree
                            const sliceMap = new Map();
                            const rootSlices = [];

                            mappedSlices.forEach(s => {
                                sliceMap.set(s.id, s);
                            });

                            mappedSlices.forEach(s => {
                                if (s.parentId) {
                                    const parent = sliceMap.get(s.parentId);
                                    if (parent) parent.children.push(s);
                                } else {
                                    rootSlices.push(s);
                                }
                            });

                            acc.strategies = rootSlices;

                            accCompleted++;
                            if (accCompleted === inst.accounts.length) {
                                completed++;
                                if (completed === result.length) res.json(result);
                            }
                        });
                    });
                });
            });
        });
    });
});

// POST /api/institutions
app.post('/api/institutions', (req, res) => {
    const { name, user_id = 'default_user' } = req.body;
    const id = uuidv4();
    const sql = `INSERT INTO institutions (id, user_id, name) VALUES (?, ?, ?)`;
    db.run(sql, [id, user_id, name], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name });
    });
});

// POST /api/accounts
app.post('/api/accounts', (req, res) => {
    const { institutionId, name, type, user_id = 'default_user' } = req.body;
    const id = uuidv4();
    const sql = `INSERT INTO accounts (id, institution_id, name, type, cash_balance) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [id, institutionId, name, type, 0], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name });
    });
});

// PUT /api/institutions/:id (Rename)
app.put('/api/institutions/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.run("UPDATE institutions SET name = ? WHERE id = ?", [name, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// PUT /api/accounts/:id (Deep Update)
// Expects: { name, type, totalValue, cashBalance, strategies: [ ...tree... ] }
app.put('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, totalValue, cashBalance, strategies } = req.body;

    // 1. Update Account Metadata
    const updateSql = `UPDATE accounts SET name = ?, type = ?, total_value = ?, cash_balance = ? WHERE id = ?`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(updateSql, [name, type, totalValue, cashBalance, id], (err) => {
            if (err) {
                console.error("Error updating account meta", err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            // 2. Wipe existing slices for this account
            db.run(`DELETE FROM portfolio_slices WHERE account_id = ?`, [id], (err) => {
                if (err) {
                    console.error("Error clearing slices", err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // 3. Recursively Insert New Slices
                const stmt = db.prepare(`INSERT INTO portfolio_slices (id, account_id, parent_id, type, name, symbol, target_allocation, current_value, strategy_prompt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                const insertSlice = (slice, parentId = null) => {
                    stmt.run([
                        slice.id,
                        id,
                        parentId,
                        slice.type,
                        slice.name,
                        slice.symbol || null,
                        slice.targetAllocation,
                        slice.currentValue,
                        slice.strategyPrompt || null
                    ]);

                    if (slice.children && slice.children.length > 0) {
                        slice.children.forEach(child => insertSlice(child, slice.id));
                    }
                };

                try {
                    if (strategies && strategies.length > 0) {
                        strategies.forEach(s => insertSlice(s));
                    }
                    stmt.finalize();

                    db.run('COMMIT', () => {
                        res.json({ success: true });
                    });
                } catch (insertErr) {
                    console.error("Error inserting slices", insertErr);
                    db.run('ROLLBACK');
                    res.status(500).json({ error: "Failed to insert strategies" });
                }
            });
        });
    });
});

// DELETE /api/institutions/:id
app.delete('/api/institutions/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM institutions WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE /api/accounts/:id
app.delete('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM accounts WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// === Performance Tracking Endpoints ===

// POST /api/performance/snapshot
// Record a performance snapshot
app.post('/api/performance/snapshot', (req, res) => {
    const { accountId, totalValue, cashBalance, holdingsValue, dayChange, dayChangePercent } = req.body;
    const id = uuidv4();
    const timestamp = Date.now();
    
    const sql = `INSERT INTO performance_snapshots 
        (id, account_id, timestamp, total_value, cash_balance, holdings_value, day_change, day_change_percent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [id, accountId, timestamp, totalValue, cashBalance, holdingsValue, dayChange || null, dayChangePercent || null], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, timestamp });
    });
});

// GET /api/performance/:accountId
// Get performance history for an account
app.get('/api/performance/:accountId', (req, res) => {
    const { accountId } = req.params;
    const { range } = req.query; // Optional time range filter
    
    const sql = `SELECT * FROM performance_snapshots WHERE account_id = ? ORDER BY timestamp ASC`;
    
    db.all(sql, [accountId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Map to camelCase
        const snapshots = rows.map(r => ({
            id: r.id,
            accountId: r.account_id,
            timestamp: r.timestamp,
            totalValue: r.total_value,
            cashBalance: r.cash_balance,
            holdingsValue: r.holdings_value,
            dayChange: r.day_change,
            dayChangePercent: r.day_change_percent
        }));
        
        res.json(snapshots);
    });
});

// GET /api/performance/:accountId/stats
// Get performance statistics for an account
app.get('/api/performance/:accountId/stats', (req, res) => {
    const { accountId } = req.params;
    
    const sql = `SELECT * FROM performance_snapshots WHERE account_id = ? ORDER BY timestamp ASC`;
    
    db.all(sql, [accountId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (rows.length === 0) {
            return res.json({
                current: 0,
                dayChange: 0,
                dayChangePercent: 0,
                weekChange: 0,
                weekChangePercent: 0,
                monthChange: 0,
                monthChangePercent: 0,
                allTimeHigh: 0,
                allTimeLow: 0
            });
        }
        
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;
        const WEEK_MS = 7 * DAY_MS;
        const MONTH_MS = 30 * DAY_MS;
        
        const current = rows[rows.length - 1].total_value;
       const dayAgo = rows.find(r => r.timestamp >= now - DAY_MS);
        const weekAgo = rows.find(r => r.timestamp >= now - WEEK_MS);
        const monthAgo = rows.find(r => r.timestamp >= now - MONTH_MS);
        
        const allTimeHigh = Math.max(...rows.map(r => r.total_value));
        const allTimeLow = Math.min(...rows.map(r => r.total_value));
        
        const stats = {
            current,
            dayChange: dayAgo ? current - dayAgo.total_value : 0,
            dayChangePercent: dayAgo && dayAgo.total_value > 0 ? ((current - dayAgo.total_value) / dayAgo.total_value) * 100 : 0,
            weekChange: weekAgo ? current - weekAgo.total_value : 0,
            weekChangePercent: weekAgo && weekAgo.total_value > 0 ? ((current - weekAgo.total_value) / weekAgo.total_value) * 100 : 0,
            monthChange: monthAgo ? current - monthAgo.total_value : 0,
            monthChangePercent: monthAgo && monthAgo.total_value > 0 ? ((current - monthAgo.total_value) / monthAgo.total_value) * 100 : 0,
            allTimeHigh,
            allTimeLow
        };
        
        res.json(stats);
    });
});
