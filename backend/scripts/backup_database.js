const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

async function backupDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required in backend/.env");
  }

  const createdAt = new Date();
  const backupId = `pre_topics_migration_${safeTimestamp(createdAt)}`;
  const outputRoot = path.join(__dirname, "..", "backups", backupId);
  const collectionsDir = path.join(outputRoot, "collections");
  fs.mkdirSync(collectionsDir, { recursive: true });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  try {
    const db = mongoose.connection.db;
    const collections = (await db.listCollections().toArray())
      .map((item) => item.name)
      .filter((name) => !name.startsWith("system."))
      .sort();
    const manifestCollections = [];

    for (const collectionName of collections) {
      const documents = await db.collection(collectionName).find({}).toArray();
      const fileName = `${collectionName}.json`;
      const filePath = path.join(collectionsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      manifestCollections.push({
        name: collectionName,
        document_count: documents.length,
        file: path.posix.join("collections", fileName),
        bytes: fs.statSync(filePath).size,
        sha256: sha256(filePath),
      });
    }

    const manifest = {
      schema_version: 1,
      backup_id: backupId,
      purpose: "Pre-Topic and Setting migration backup for Phase 0",
      created_at: createdAt.toISOString(),
      database_name: db.databaseName,
      collection_count: manifestCollections.length,
      total_document_count: manifestCollections.reduce(
        (total, collection) => total + collection.document_count,
        0
      ),
      collections: manifestCollections,
      contains_sensitive_data: true,
      restore_tested: false,
    };
    const manifestPath = path.join(outputRoot, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const publicManifest = {
      ...manifest,
      database_name: "redacted",
      collections: manifest.collections.map(
        ({ name, document_count, bytes, sha256: digest }) => ({
          name,
          document_count,
          bytes,
          sha256: digest,
        })
      ),
      backup_storage: "backend/backups (gitignored)",
    };
    const publicManifestPath = path.join(
      __dirname,
      "..",
      "..",
      "docs",
      "DATABASE_BACKUP_MANIFEST.json"
    );
    fs.writeFileSync(
      publicManifestPath,
      JSON.stringify(publicManifest, null, 2)
    );

    console.log(`Backup completed: ${backupId}`);
    console.log(`Collections: ${manifest.collection_count}`);
    console.log(`Documents: ${manifest.total_document_count}`);
    console.log(`Manifest: ${manifestPath}`);
  } finally {
    await mongoose.disconnect();
  }
}

backupDatabase().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});
