import { match } from "path-to-regexp";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { HttpError } from "./src/lib/helpers.js";
import { loadConfig } from "./src/lib/config.js";

import { accountCreateHandler } from "./src/handlers/accountCreateHandler.js";
import { accountGetHandler } from "./src/handlers/accountGetHandler.js";
import { accountUpdateHandler } from "./src/handlers/accountUpdateHandler.js";
import { authorizeHandler } from "./src/handlers/authorizeHandler.js";
import { domainCreateHandler } from "./src/handlers/domainCreateHandler.js";
import { domainGetHandler } from "./src/handlers/domainGetHandler.js";
import { domainListHandler } from "./src/handlers/domainListHandler.js";
import { domainUpdateHandler } from "./src/handlers/domainUpdateHandler.js";
import { itemCreateHandler } from "./src/handlers/itemCreateHandler.js";
import { itemDeleteHandler } from "./src/handlers/itemDeleteHandler.js";
import { itemGetHandler } from "./src/handlers/itemGetHandler.js";
import { itemListHandler } from "./src/handlers/itemListHandler.js";
import { itemUpdateHandler } from "./src/handlers/itemUpdateHandler.js";
import { itemQueryHandler } from "./src/handlers/itemQueryHandler.js";
import { logoutHandler } from "./src/handlers/logoutHandler.js";

/**
 * @typedef {import('aws-lambda').APIGatewayProxyEventV2} Event
 *
 * @typedef {import('./src/types').HttpMethod} HttpMethod
 * @typedef {import('./src/types').PathHandler} PathHandler
 * @typedef {import('./src/types').Response} Response
 */

/** @type {Array<[PathHandler, HttpMethod, string]>} */
const pathHandlers = [
  [itemQueryHandler, "GET", "/d/:domain/query"],
  [itemCreateHandler, "POST", "/d/:domain/item"],
  [itemGetHandler, "GET", "/d/:domain/item/:item"],
  [itemUpdateHandler, "PATCH", "/d/:domain/item/:item"],
  [itemDeleteHandler, "DELETE", "/d/:domain/item/:item"],
  [itemListHandler, "GET", "/d/:domain/items"],
  [domainListHandler, "GET", "/domains"],
  [domainGetHandler, "GET", "/d/:domain"],
  [domainCreateHandler, "PUT", "/d/:domain"],
  [domainUpdateHandler, "PATCH", "/d/:domain"],
  [accountCreateHandler, "POST", "/account"],
  [accountGetHandler, "GET", "/account"],
  [accountUpdateHandler, "PATCH", "/account/:account"],
  [authorizeHandler, "POST", "/authorize"],
  [logoutHandler, "GET", "/logout"],
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
