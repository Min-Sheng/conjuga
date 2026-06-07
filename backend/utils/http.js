async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

module.exports = { readJsonBody, sendJson };
