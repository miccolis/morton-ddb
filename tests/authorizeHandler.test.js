import t from "tap";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { loadConfig } from "../src/lib/config.js";
import { generateJWT } from "../src/lib/helpers.js";

import { loginHandler } from "../src/handlers/loginHandler.js";
import { accountCreateHandler } from "../src/handlers/accountCreateHandler.js";

t.test("loginHandler - bad content type", async (t) => {
  const { dynamodbClientConfig, dynamodbTableName } = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );
  try {
    await loginHandler({
      event: { headers: { "content-type": "application/json" } },
      ddbClient,
      config: { dynamodbTableName },
    });
  } catch (e) {
    t.equal(e.statusCode, 415);
  }
  t.end();
});

t.test("loginHandler - missing creds", async (t) => {
  const { dynamodbClientConfig, dynamodbTableName } = loadConfig(true);
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );
  try {
    await loginHandler({
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

t.test("loginHandler - verify password", async (t) => {
  const config = loadConfig(true);
  const { dynamodbClientConfig, jwtSecret } = config;
  const ddbClient = DynamoDBDocumentClient.from(
    new DynamoDBClient(dynamodbClientConfig),
  );

  const authCookie = `auth=${await generateJWT({
    username: "test-username",
    jwtSecret,
    maxage: 60,
  })}`;

  await accountCreateHandler({
    event: {
      body: JSON.stringify({
        username: "test",
        password: "test",
        email: "test@example.com",
      }),
      headers: { "content-type": "application/json" },
      cookies: [authCookie],
    },
    ddbClient,
    config,
  });

  try {
    await loginHandler({
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

  const resp = await loginHandler({
    event: {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "http://localhost:8080",
      },
      body: "username=test&password=test",
    },
    ddbClient,
    config,
  });
  t.equal(resp.statusCode, 303);
  t.same(resp.headers, {
    "content-type": "application/json",
    location: "http://localhost:8080",
  });
  t.ok(resp.cookies[0].startsWith("auth=")); // TODO check jwt payload
});
