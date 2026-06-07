require("./config/env");
const http = require("node:http");
const { handleApi } = require("./routes");
const { sendJson } = require("./utils/http");
const { requireDatabaseUrl } = require("./db/client");

const port = Number(process.env.PORT) || 3000;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/") && (await handleApi(request, response, url))) return;
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, { error: error.message || "API request failed" });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

try {
  requireDatabaseUrl();
  server.listen(port, "0.0.0.0", () => {
    console.log(`Palabra Clara API is running at http://localhost:${port}`);
  });
} catch (error) {
  console.error(error.message);
  console.error("Set DATABASE_URL, then run: npm run db:init && npm run db:import");
  process.exitCode = 1;
}
