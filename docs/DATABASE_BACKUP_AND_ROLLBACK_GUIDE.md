# Database Backup and Seed Rollback Guide (Phase 0)

**Project:** Intercultural AR and AI Speaking Practice
**Date:** 2026-08-04
**Status:** Executable procedure verified during Phase 0

This document outlines the operational procedures for creating database backups before schema changes and executing rollbacks if issues occur during Phase 1-3 migrations.

---

## 1. Database Backup Instructions

The repository includes `backend/scripts/backup_database.js`. It reads `MONGODB_URI` from `backend/.env`, exports every non-system collection, calculates a SHA-256 digest for every JSON file, and writes a private and public manifest.

Run from the backend directory:

```powershell
node scripts/backup_database.js
```

Private backup data is written to `backend/backups/<backup_id>` and is excluded from Git. A redacted verification manifest is written to `docs/DATABASE_BACKUP_MANIFEST.json`.

Never commit collection exports because they can contain user identities, transcripts, and research scores.

### Option A: MongoDB Dump (`mongodump`)
For MongoDB instances (local or MongoDB Atlas), export the current database state:

```bash
# Backup full database
mongodump --uri="mongodb://localhost:27017/intercultural_db" --out="./backups/pre_topics_migration_$(date +%Y%m%d)"
```

### Option B: JSON Backup via Node.js Script
If running in an environment without `mongodump`, use the repository script above. The following snippet documents its underlying approach and is not the preferred command:

```bash
node -e "
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intercultural_db');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const dir = path.join(__dirname, 'backups', 'json_' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  for (const col of collections) {
    const data = await db.collection(col.name).find({}).toArray();
    fs.writeFileSync(path.join(dir, col.name + '.json'), JSON.stringify(data, null, 2));
    console.log('Backed up collection:', col.name, 'records:', data.length);
  }
  await mongoose.disconnect();
}
backup();
"
```

---

## 2. Seed Rollback Instructions

If migration or seed data for `Topics` or `Settings` needs to be rolled back without affecting legacy `scenarios` or `practice_sessions`:

### Step 1: Deactivate New Topics and Settings (Soft Rollback)
```javascript
// Run via mongo shell or Node script
db.topics.updateMany({}, { $set: { isActive: false } });
db.settings.updateMany({}, { $set: { isActive: false } });
```

### Step 2: Physical Removal of Seeded Data (Hard Rollback)
```javascript
// Remove seeded topics and settings by matching seed IDs
db.topics.deleteMany({ topicId: { $in: ["academic-communication", "social-communication", "professional-communication"] } });
db.settings.deleteMany({ settingId: { $regex: "^(ACADEMIC|SOCIAL|PROFESSIONAL)-" } });
```

### Step 3: Restore Database Snapshot
If a complete database restore is needed:
```bash
mongorestore --uri="mongodb://localhost:27017/intercultural_db" --drop ./backups/pre_topics_migration_YYYYMMDD/intercultural_db
```

---

## 3. Idempotent Seeding Rule

All new seed scripts created in Phase 2 MUST follow the `upsert` pattern to avoid duplicating data on redeployment:

```javascript
await Topic.updateOne(
  { topicId: topicData.topicId },
  { $set: topicData },
  { upsert: true }
);
```

---

## 4. Backup Verification Checklist

- Confirm the command exits with status `0`.
- Confirm the private manifest and every collection file exist.
- Confirm `collection_count` and `total_document_count` are greater than zero for a populated database.
- Recalculate at least one SHA-256 digest and compare it with the manifest.
- Keep `restore_tested` as `false` until a restore has been performed against a separate non-production database.
- Record the generated redacted manifest in Git with the Phase 0 commit.
