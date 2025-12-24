-- Migration 001: Add margin column to accounts table
-- This migration adds the margin field to existing accounts
-- Date: 2025-12-23

-- Add margin column with default value of 0
ALTER TABLE accounts ADD COLUMN margin REAL DEFAULT 0;

-- Verify the column was added
SELECT COUNT(*) as accounts_updated FROM accounts WHERE margin = 0;
