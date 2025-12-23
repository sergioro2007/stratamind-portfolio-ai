import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.resolve(__dirname, 'database.sqlite');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

const sqliteVerbose = sqlite3.verbose();
const { Database } = sqliteVerbose;

// Initialize Database
const db = new Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) console.error("Failed to enable Foreign Keys", err);
            else console.log("Foreign Keys Enabled");
        });
        initSchema();
    }
});

function initSchema() {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error initializing schema', err);
        } else {
            console.log('Schema initialized.');
        }
    });
}

export default db;
