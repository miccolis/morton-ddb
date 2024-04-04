import { match } from "path-to-regexp";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { HttpError } from "./lib/helpers.js";
import { loadConfig } from "./lib/config.js";

import { accountCreateHandler } from "./handlers/accountCreateHandler.js";
import { accountGetHandler } from "./handlers/accountGetHandler.js";
import { accountUpdateHandler } from "./handlers/accountUpdateHandler.js";
import { domainCreateHandler } from "./handlers/domainCreateHandler.js";
import { domainGetHandler } from "./handlers/domainGetHandler.js";
import { domainListHandler } from "./handlers/domainListHandler.js";
import { domainUpdateHandler } from "./handlers/domainUpdateHandler.js";
import { itemCreateHandler } from "./handlers/itemCreateHandler.js";
import { itemDeleteHandler } from "./handlers/itemDeleteHandler.js";
import { itemGetHandler } from "./handlers/itemGetHandler.js";
import { itemListHandler } from "./handlers/itemListHandler.js";
import { itemUpdateHandler } from "./handlers/itemUpdateHandler.js";
import { itemQueryHandler } from "./handlers/itemQueryHandler.js";
import { loginHandler } from "./handlers/loginHandler.js";
import { logoutHandler } from "./handlers/logoutHandler.js";

/**
 * @typedef {import('aws-lambda').APIGatewayProxyEventV2} Event
 *
 * @typedef {import('./types').HttpMethod} HttpMethod
 * @typedef {import('./types').PathHandler} PathHandler
 * @typedef {import('./types').Response} Response
 */

/** @type {Array<[PathHandler, HttpMethod, string]>} */
const pathHandlers = [
  [itemQueryHandler, "GET", "/app/d/:domain/query"],
  [itemCreateHandler, "POST", "/app/d/:domain/item"],
  [itemGetHandler, "GET", "/app/d/:domain/item/:item"],
  [itemUpdateHandler, "PATCH", "/app/d/:domain/item/:item"],
  [itemDeleteHandler, "DELETE", "/app/d/:domain/item/:item"],
  [itemListHandler, "GET", "/app/d/:domain/items"],
  [domainListHandler, "GET", "/app/domains"],
  [domainGetHandler, "GET", "/app/d/:domain"],
  [domainCreateHandler, "PUT", "/app/d/:domain"],
  [domainUpdateHandler, "PATCH", "/app/d/:domain"],
  [accountCreateHandler, "POST", "/app/account"],
  [accountGetHandler, "GET", "/app/account"],
  [accountUpdateHandler, "PATCH", "/app/account/:account"],
  [loginHandler, "POST", "/app/login"],
  [logoutHandler, "GET", "/app/logout"],
];

/**
 * @returns {Response}
 */
export const addCORS = function (resp) {
  if (resp.statusCode === undefined) {
    resp = {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(resp),
    };
  }
  resp.headers["Access-Control-Allow-Origin"] = "*";
  return resp;
};

/**
 * @returns {Response}
 */
function prepareErrorResp(err) {
  if (err instanceof HttpError) {
    return err.toJSON();
  } else {
    console.error(err);
    return new HttpError(500).toJSON();
  }
}

/** @type {Array<[PathHandler, HttpMethod, import('path-to-regexp').MatchFunction]>} */
const compiledPaths = pathHandlers.map(([handler, method, path]) => {
  if (method === "GET") {
    const originalHandler = handler;
    handler = async (options) =>
      originalHandler(options).then(
        (resp) => addCORS(resp),
        (err) => addCORS(prepareErrorResp(err)),
      );
  }
  // TODO setup OPTIONS for other endpoints
  return [handler, method, match(path, { decode: decodeURIComponent })];
});

/**
 * @param {Event} event
 * @returns {Promise<Response>}
 */
export const handler = async function (event /*, context */) {
  const { requestContext } = event;

  const { dynamodbClientConfig, ...config } = loadConfig(
    !!process.env.IS_TEST_RUN,
  );

  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );

  for (const [pathHandler, method, matcher] of compiledPaths) {
    if (method !== requestContext.http.method) continue;

    const matched = matcher(requestContext.http.path);

    if (matched) {
      /** @type {Record<string, string>} */
      const params = /** @type {undefined} */ (matched.params);

      try {
        return await pathHandler({
          params,
          event,
          ddbClient,
          config,
        });
      } catch (err) {
        return prepareErrorResp(err);
      }
    }
  }
  return new HttpError(404).toJSON();
};
