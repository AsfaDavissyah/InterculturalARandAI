const { app, connectDatabase } = require("./backend_core");

if (require.main === module) {
  connectDatabase().finally(() =>
    app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
    })
  );
}

module.exports = app;
