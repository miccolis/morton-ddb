import { match } from "path-to-regexp";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { HttpError } from "./lib/helpers.js";
import { loadConfig } from "./lib/config.js";
import { domainCreateHandler } from "./lib/domainCreateHandler.js";
import { domainGetHandler } from "./lib/domainGetHandler.js";
import { domainUpdateHandler } from "./lib/domainUpdateHandler.js";
import { itemCreateHandler } from "./lib/itemCreateHandler.js";
import { itemDeleteHandler } from "./lib/itemDeleteHandler.js";
import { itemGetHandler } from "./lib/itemGetHandler.js";
import { itemListHandler } from "./lib/itemListHandler.js";
import { itemUpdateHandler } from "./lib/itemUpdateHandler.js";
import { itemQueryHandler } from "./lib/itemQueryHandler.js";

/**
 * @typedef {import('aws-lambda').APIGatewayProxyEventV2} Event
 *
 * @typedef {import('./lib/types').HttpMethod} HttpMethod
 * @typedef {import('./lib/types').PathHandler} PathHandler
 * @typedef {import('./lib/types').Response} Response
 */

/** @type {Array<[PathHandler, HttpMethod, string]>} */
const pathHandlers = [
  [itemQueryHandler, "GET", "/d/:domain/query"],
  [itemCreateHandler, "POST", "/d/:domain/item"],
  [itemGetHandler, "GET", "/d/:domain/item/:item"],
  [itemUpdateHandler, "PATCH", "/d/:domain/item/:item"],
  [itemDeleteHandler, "DELETE", "/d/:domain/item/:item"],
  [itemListHandler, "GET", "/d/:domain/item"],
  [domainGetHandler, "GET", "/d/:domain"],
  [domainCreateHandler, "PUT", "/d/:domain"],
  [domainUpdateHandler, "PATCH", "/d/:domain"],
];

/** @type {Array<[PathHandler, HttpMethod, import('path-to-regexp').MatchFunction]>} */
const compiledPaths = pathHandlers.map(([handler, method, path]) => {
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

  if (config.mode !== "read_write" && requestContext.http.method !== "GET") {
    return new HttpError(403).value();
  }

  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );

  for (const [pathHandler, method, matcher] of compiledPaths) {
    if (method !== requestContext.http.method) continue;

    const matched = matcher(requestContext.http.path);

    if (matched) {
      try {
        return await pathHandler({
          params: matched.params,
          event,
          ddbClient,
          config,
        });
      } catch (err) {
        if (err instanceof HttpError) {
          return err.value();
        } else {
          console.error(err);
          return new HttpError(500).value();
        }
      }
    }
  }
  return new HttpError(404).value();
};
