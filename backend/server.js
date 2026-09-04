const { app, connectDatabase } = require("./backend_core");

if (require.main === module) {
  connectDatabase().finally(() =>
    app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
    })
  );
}

module.exports = async function engoraServer(req, res, next) {
  try {
    await connectDatabase({ throwOnError: true });
    return app(req, res, next);
  } catch (error) {
    console.error("Serverless database initialization error:", error.message);
    return res.status(503).json({
      error: true,
      message: "The database is temporarily unavailable.",
    });
  }
};
