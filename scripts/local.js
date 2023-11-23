import http from "node:http";
import { handler } from "../index.js";

function handlerWrapper({ handler, event, res }) {
  handler(event)
    .then((resp) => {
      // Lambda allows bar JSON responses and looks for 'statusCode' to differentiate. We do the
      // same here.
      if (resp.statusCode === undefined) {
        resp = {
          statusCode: 200,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(resp),
        };
      }

      res.statusCode = resp.statusCode;
      for (const [k, v] of Object.entries(resp.headers)) {
        res.setHeader(k, v);
      }
      res.end(resp.body, "utf8");
    })
    .catch((err) => {
      throw err;
    });
}

const server = http.createServer((req, res) => {
  const requestedURL = new URL(req.url, "http://localhost");

  const queryStringParameters = {};
  for (const [key, value] of requestedURL.searchParams.entries()) {
    queryStringParameters[key] = value;
  }

  const requestContext = {
    headers: req.headers,
    http: {
      method: req.method,
      path: requestedURL.pathname,
    },
  };
  const event = { requestContext, queryStringParameters };

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requestContext.body = body;
      handlerWrapper({ handler, event, res });
    });
  } else {
    handlerWrapper({ handler, event, res });
  }
});
server.listen(8080);
console.log("Listening on port 8080");
