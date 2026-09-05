const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function purgeNonAdminUsers({ apply = false } = {}) {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  try {
    const users = mongoose.connection.db.collection("users");
    const [adminCount, studentCount, lecturerCount, nonAdminUsers] =
      await Promise.all([
        users.countDocuments({ role: "admin" }),
        users.countDocuments({ role: "student" }),
        users.countDocuments({ role: "lecturer" }),
        users.find({ role: { $ne: "admin" } }).toArray(),
      ]);

    console.log(`Admins preserved: ${adminCount}`);
    console.log(`Students matched: ${studentCount}`);
    console.log(`Lecturers matched: ${lecturerCount}`);
    console.log(`Total non-admin accounts matched: ${nonAdminUsers.length}`);

    if (adminCount < 1) {
      throw new Error("Safety check failed: no admin account exists");
    }

    if (!apply) {
      console.log("Dry run only. Re-run with --apply to delete matched accounts.");
      return { adminCount, matchedCount: nonAdminUsers.length, deletedCount: 0 };
    }

    const createdAt = new Date();
    const backupId = `pre_non_admin_user_purge_${safeTimestamp(createdAt)}`;
    const outputRoot = path.join(__dirname, "..", "backups", backupId);
    fs.mkdirSync(outputRoot, { recursive: true });

    const backupPayload = JSON.stringify(nonAdminUsers, null, 2);
    const usersPath = path.join(outputRoot, "non_admin_users.json");
    fs.writeFileSync(usersPath, backupPayload, { mode: 0o600 });
    fs.writeFileSync(
      path.join(outputRoot, "manifest.json"),
      JSON.stringify(
        {
          backup_id: backupId,
          created_at: createdAt.toISOString(),
          database_name: mongoose.connection.db.databaseName,
          filter: { role: { $ne: "admin" } },
          account_count: nonAdminUsers.length,
          sha256: sha256(backupPayload),
          contains_sensitive_data: true,
        },
        null,
        2
      ),
      { mode: 0o600 }
    );

    const result = await users.deleteMany({ role: { $ne: "admin" } });
    const remainingNonAdmins = await users.countDocuments({
      role: { $ne: "admin" },
    });

    if (remainingNonAdmins !== 0) {
      throw new Error(
        `Verification failed: ${remainingNonAdmins} non-admin accounts remain`
      );
    }

    console.log(`Backup completed: ${backupId}`);
    console.log(`Deleted non-admin accounts: ${result.deletedCount}`);
    console.log(`Remaining admin accounts: ${await users.countDocuments({ role: "admin" })}`);

    return {
      adminCount,
      matchedCount: nonAdminUsers.length,
      deletedCount: result.deletedCount,
      backupId,
    };
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  purgeNonAdminUsers({ apply: process.argv.includes("--apply") }).catch(
    (error) => {
      console.error(`Non-admin user purge failed: ${error.message}`);
      process.exitCode = 1;
    }
  );
}

module.exports = { purgeNonAdminUsers };
