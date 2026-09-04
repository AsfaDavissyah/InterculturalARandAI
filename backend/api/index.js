const { app, connectDatabase } = require("../server");

module.exports = async function handler(req, res) {
  try {
    await connectDatabase({ throwOnError: true });
    return app(req, res);
  } catch (error) {
    console.error("Vercel database initialization error:", error.message);
    return res.status(503).json({
      error: true,
      message: "The database is temporarily unavailable.",
    });
  }
};
