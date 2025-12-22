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
