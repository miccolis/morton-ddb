import http from "node:http";
import { handler } from "../src/index.js";

function staticProxy({ event, res }) {
  const { path } = event.requestContext.http;
  http
    .get(`http://localhost:4000/${path}`, (resp) => {
      res.statusCode = resp.statusCode;
      for (const [k, v] of Object.entries(resp.headers)) {
        res.setHeader(k, v);
      }
      resp.pipe(res);
    })
    .on("error", (err) => {
      throw err;
    });
}

function handlerWrapper({ handler, event, res }) {
  const path = event.requestContext.http.path;

  // Matches cloudformation setup which routes all requests that start with /app
  // to the lambda.
  if (path.startsWith('/app')) {

    event.requestContext.http.path = path.substring(4);

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
        if (resp.cookies?.length > 0) {
          res.setHeader("Set-Cookie", resp.cookies);
        }
        res.end(resp.body, "utf8");
      })
      .catch((err) => {
        throw err;
      });
  } else {
    staticProxy({ event, res });
  }
}

const server = http.createServer((req, res) => {
  const requestedURL = new URL(req.url, "http://localhost");

  const queryStringParameters = {};
  for (const [key, value] of requestedURL.searchParams.entries()) {
    queryStringParameters[key] = value;
  }

  const { cookie, ...headers } = req.headers;

  const requestContext = {
    http: {
      method: req.method,
      path: requestedURL.pathname,
    },
  };
  const event = {
    requestContext,
    headers,
    cookies: (cookie ?? "").split(";"),
    queryStringParameters,
  };

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      event.body = body;
      handlerWrapper({ handler, event, res });
    });
  } else {
    handlerWrapper({ handler, event, res });
  }
});
server.listen(8080);
console.log("Listening on port 8080");
