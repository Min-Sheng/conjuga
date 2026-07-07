const MAX_BODY_BYTES = 1024 * 1024; // 1MB

async function readJsonBody(request) {
  let body = "";
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    body += chunk;
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (error) {
    const parseError = new Error("Invalid JSON body");
    parseError.statusCode = 400;
    throw parseError;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

module.exports = { readJsonBody, sendJson };
