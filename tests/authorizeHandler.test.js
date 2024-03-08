import t from "tap";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { loadConfig } from "../lib/config.js";
import { generateJWT } from "../lib/helpers.js";

import { authorizeHandler } from "../lib/authorizeHandler.js";
import { accountCreateHandler } from "../lib/accountCreateHandler.js";

t.test("authorizeHandler - bad content type", async (t) => {
  const { dynamodbClientConfig, dynamodbTableName } = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );
  try {
    await authorizeHandler({
      event: { headers: { "content-type": "application/json" } },
      ddbClient,
      config: { dynamodbTableName },
    });
  } catch (e) {
    t.equal(e.statusCode, 415);
  }
  t.end();
});

t.test("authorizeHandler - missing creds", async (t) => {
  const { dynamodbClientConfig, dynamodbTableName } = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );
  try {
    await authorizeHandler({
      event: {
        headers: { "content-type": "application/x-www-form-urlencoded" },
      },
      ddbClient,
      config: { dynamodbTableName },
    });
  } catch (e) {
    t.equal(e.statusCode, 400);
  }
  t.end();
});

t.test("authorizeHandler - verify password", async (t) => {
  const config = loadConfig(true);
  const { dynamodbClientConfig, jwtSecret } = config;
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );

  const authCookie = `auth=${await generateJWT("test-username", jwtSecret)}`;

  await accountCreateHandler({
    event: {
      body: JSON.stringify({
        username: "test",
        password: "test",
        email: "test@example.com",
      }),
      headers: { "content-type": "application/json" },
      cookies: [ authCookie ],
    },
    ddbClient,
    config,
  });

  try {
    await authorizeHandler({
      event: {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "username=test&password=badpass",
      },
      ddbClient,
      config,
    });
  } catch (e) {
    t.equal(e.statusCode, 401);
  }

  const resp = await authorizeHandler({
    event: {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "username=test&password=test",
    },
    ddbClient,
    config,
  });
  t.equal(resp.statusCode, 200);
  t.same(resp.headers, { "content-type": "application/json" });
  t.same(JSON.parse(resp.body), {
    username: "test",
    email: "test@example.com",
  });
  t.ok(resp.cookies[0].startsWith("auth=")); // TODO check jwt payload
});
