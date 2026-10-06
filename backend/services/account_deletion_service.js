const mongoose = require("mongoose");

class AccountDeletionError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "AccountDeletionError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function deleteStudentAccount({
  userId,
  password,
  User,
  PracticeSession,
  AIResponseReport,
  runTransaction = (work) => mongoose.connection.transaction(work),
}) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AccountDeletionError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }
  if (user.role !== "student") {
    throw new AccountDeletionError(
      "Lecturer and administrator accounts must be managed by an administrator.",
      403,
      "ADMIN_MANAGED_ACCOUNT"
    );
  }
  if (!password || !(await user.comparePassword(password))) {
    throw new AccountDeletionError("Password is incorrect.", 401, "INVALID_PASSWORD");
  }

  return runTransaction(async (session) => {
    const [practiceResult, reportResult] = await Promise.all([
      PracticeSession.deleteMany({ userId: user._id }, { session }),
      AIResponseReport.deleteMany({ userId: user._id }, { session }),
    ]);
    const userResult = await User.deleteOne({ _id: user._id }, { session });
    if (userResult.deletedCount !== 1) {
      throw new AccountDeletionError(
        "Account deletion could not be completed.",
        409,
        "ACCOUNT_DELETE_CONFLICT"
      );
    }
    return {
      deletedSessions: practiceResult.deletedCount || 0,
      deletedReports: reportResult.deletedCount || 0,
    };
  });
}

module.exports = { AccountDeletionError, deleteStudentAccount };
