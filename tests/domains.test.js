import t from "tap";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { loadConfig } from "../src/lib/config.js";
import { domainCreateHandler } from "../src/handlers/domainCreateHandler.js";
import { generateJWT } from "../src/lib/helpers.js";

import {
  validateDomain,
  updateDomainIndexMetadata,
} from "../src/lib/domains.js";

t.test("validateDomain", (t) => {
  try {
    validateDomain({ name: "test", zoom: 8, access: "public", ttl: 123 });
    t.ok(true);
  } catch (e) {
    t.ok(false);
  }

  try {
    validateDomain({ name: "test", access: "foo", ttl: 123 });
    t.ok(false);
  } catch (e) {
    t.equal(e.statusCode, 400);
  }

  try {
    validateDomain({ name: "test", access: "public", ttl: "123" });
    t.ok(false);
  } catch (e) {
    t.equal(e.statusCode, 400);
  }

  t.end();
});

t.test("updateDomainIndexMetadata", async (t) => {
  const config = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(config.dynamodbClientConfig),
  );

  const authCookie = `auth=${await generateJWT({
    username: "test-username",
    jwtSecret: config.jwtSecret,
    maxage: 60,
  })}`;

  const domainId = "test-updateDomainIndexMetadata";

  await domainCreateHandler({
    params: { domain: domainId },
    event: {
      body: JSON.stringify({ name: domainId, access: "public", zoom: 12 }),
      headers: { "content-type": "application/json" },
      cookies: [authCookie],
    },
    ddbClient,
    config,
  });

  const resp1 = await updateDomainIndexMetadata({
    domainId,
    config,
    ddbClient,
    countDelta: 1,
    indexDelta: 1,
  });

  t.match(resp1.Attributes, { indexSize: 1, itemCount: 1 });

  const resp2 = await updateDomainIndexMetadata({
    domainId,
    config,
    ddbClient,
    countDelta: -1,
    indexDelta: -1,
  });

  t.match(resp2.Attributes, { indexSize: 0, itemCount: 0 });
});
