import t from "tap";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { itemCreateHandler } from "../lib/itemCreateHandler.js";
import { domainCreateHandler } from "../lib/domainCreateHandler.js";
import { loadConfig } from "../lib/config.js";

import { itemQueryHandler } from "../lib/itemQueryHandler.js";

t.test("itemQueryHandler - fetch point", async (t) => {
  const { dynamodbClientConfig, dynamodbTableName, zooms } = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );
  const domain = "test-itemQueryHandler-fetchPoint";

  const features = [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-74, 40.7],
      },
      properties: {
        name: "New York City",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-3.7, 40.4],
      },
      properties: {
        name: "Madrid",
      },
    },
  ];

  await domainCreateHandler({
    params: { domain },
    event: {
      requestContext: {
        body: JSON.stringify({ name: domain, access: "public" }),
      },
    },
    ddbClient,
    config: { dynamodbTableName, zooms },
  });

  for (const f of features) {
    await itemCreateHandler({
      params: { domain },
      event: { requestContext: { body: JSON.stringify(f) } },
      ddbClient,
      config: { dynamodbTableName, zooms },
    });
  }

  const tests = [
    { bbox: "0,0,10,10", expected: [] },
    { bbox: "-80,35,-70,45", expected: ["New York City"] },
    { bbox: "-80,35,0,45", expected: ["Madrid", "New York City"] },
  ];

  for (const { bbox, expected } of tests) {
    const { features } = await itemQueryHandler({
      params: { domain },
      event: { queryStringParameters: { bbox } },
      ddbClient,
      config: { dynamodbTableName, zooms },
    });
    const actual = features.map((v) => v.properties.name);
    actual.sort();
    t.same(expected, actual);
  }

  t.end();
});
