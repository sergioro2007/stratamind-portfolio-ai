---
description: Critical safety rules for database operations - MUST follow before ANY database modification
---

# Database Safety Protocol

## 🚨 CRITICAL RULES - NO EXCEPTIONS

### Rule 1: NEVER Delete Without Permission
- **NEVER** run `rm`, `del`, or any delete command on `*.sqlite`, `*.db`, or any database file
- **ALWAYS** ask user for explicit permission before any deletion
- If you think deletion is necessary, you're probably wrong - use migration instead

### Rule 2: ALWAYS Backup First
Before ANY schema change, data migration, or risky operation:
```bash
# Create timestamped backup
cp server/database.sqlite server/database.sqlite.backup.$(date +%s)

# Verify backup exists
ls -lh server/database.sqlite*
```

### Rule 3: Use Migrations, Not Deletion
For schema changes, use SQL migrations:
```sql
-- ✅ CORRECT: Migrate existing data
ALTER TABLE table_name ADD COLUMN new_column TEXT;
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- ❌ WRONG: Never drop and recreate with data
DROP TABLE table_name;
CREATE TABLE table_name (...);
```

### Rule 4: Test Migrations on Backup
```bash
# 1. Create backup
cp database.sqlite database.test.sqlite

# 2. Test migration on backup
sqlite3 database.test.sqlite < migration.sql

# 3. Verify it worked
sqlite3 database.test.sqlite "SELECT * FROM table_name LIMIT 5;"

# 4. Only then apply to production (with another backup)
```

### Rule 5: Ask Before Destructive Operations
File patterns that require USER permission before modification:
- `*.sqlite`, `*.db` - Database files
- `*.env`, `*.env.*` - Environment/config files  
- `**/data/**` - Data directories
- User-created content directories

## Safe Schema Change Process

1. **Identify the issue** (e.g., schema mismatch)
2. **Create backup**: `cp database.sqlite database.backup.$(date +%s)`
3. **Write migration SQL** to ALTER existing schema
4. **Test on backup** first
5. **Ask user permission** before applying to production
6. **Apply migration** using SQL, not deletion
7. **Verify** data is intact

## Recovery Checklist (If Data Loss Occurs)

1. Check for `.backup` files in same directory
2. Check Time Machine (macOS) or system backups
3. Check if git tracks the file (unlikely for databases, but check)
4. Look for SQLite journal files (`.sqlite-journal`, `-wal`, `-shm`)
5. Check if database is in memory elsewhere (running processes)

## Remember

**Production data is SACRED. When in doubt, ask the user.**
