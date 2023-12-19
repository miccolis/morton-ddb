import { match } from "path-to-regexp";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { loadConfig } from "./lib/config.js";
import { domainCreateHandler } from "./lib/domainCreateHandler.js";
import { domainGetHandler } from "./lib/domainGetHandler.js";
import { itemCreateHandler } from "./lib/itemCreateHandler.js";
import { itemDeleteHandler } from "./lib/itemDeleteHandler.js";
import { itemListHandler } from "./lib/itemListHandler.js";
import { itemQueryHandler } from "./lib/itemQueryHandler.js";

/**
 * @typedef {import('aws-lambda').APIGatewayProxyEventV2} Event
 *
 * @typedef {import('./lib/types').PathHandler} PathHandler
 * @typedef {import('./lib/types').Response} Response
 */

/** @type {Array<[PathHandler, string, string]>} */
const pathHandlers = [
  [domainGetHandler, "GET", "/d/:domain"],
  [domainCreateHandler, "PUT", "/d/:domain"],
  [itemListHandler, "GET", "/d/:domain/item"],
  [itemCreateHandler, "POST", "/d/:domain/item"],
  [itemDeleteHandler, "DELETE", "/d/:domain/item/:item"],
  [itemQueryHandler, "GET", "/d/:domain/query"],
];

/** @type {Array<[PathHandler, string, import('path-to-regexp').MatchFunction]>} */
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
    process.env.IS_TEST_RUN,
  );

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
        console.error(err);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Internal Server Error" }),
          headers: {
            "content-type": "application/json",
          },
        };
      }
    }
  }
  return {
    statusCode: 404,
    body: JSON.stringify({ message: "Not Found" }),
    headers: {
      "content-type": "application/json",
    },
  };
};
