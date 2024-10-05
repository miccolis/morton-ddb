import t from "tap";

import { loadConfig } from "../src/lib/config.js";
import { generateJWT } from "../src/lib/helpers.js";

import { handler } from "../src/index.js";

const validCookie = await (async () => {
  const { jwtSecret } = loadConfig(true);
  const jwt = await generateJWT({
    username: "test-username",
    jwtSecret,
    maxage: 60,
  });
  return `auth=${jwt}`;
})();

/**
 * @param {String} method
 * @param {String} path
 * @param {object} body
 * @param {string?} sessionCookie
 */
function asRequestContext(method, path, body, sessionCookie) {
  return {
    requestContext: {
      http: {
        method,
        path,
      },
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
    cookies: [sessionCookie || validCookie],
  };
}

t.test("handler - no route", async (t) => {
  const resp = await handler(asRequestContext("GET", "/bad/path"));
  t.equal(resp.statusCode, 404);
});

t.test("handler - get domain route", async (t) => {
  const resp = await handler(asRequestContext("GET", "/d/test-domain"));
  t.equal(resp.statusCode, 404);
});

t.test("handler - domain lifecycle routes", async (t) => {
  const domainId = "handler-domain-lifecycle-routes";
  const { created, ...resp } = await handler(
    asRequestContext("PUT", `/app/d/${domainId}`, {
      name: "Test Domain",
      zoom: 12,
    }),
  );
  t.same(resp, {
    name: "Test Domain",
    domainId,
    owners: ["test-username"],
    version: 1,
    access: "private",
    ttl: 0,
    zoom: 12,
  });
  t.ok(new Date(created) != "Invalid Date");

  const resp2 = await handler(asRequestContext("GET", `/app/d/${domainId}`));
  t.same(JSON.parse(resp2.body), {
    domainId,
    name: "Test Domain",
    version: 1,
    access: "private",
    ttl: 0,
  });

  const resp3 = await handler(
    asRequestContext("PATCH", `/app/d/${domainId}`, {
      name: "Updated Domain",
      version: 1,
    }),
  );
  t.same(resp3, {
    domainId,
    name: "Updated Domain",
    version: 2,
    access: "private",
    ttl: 0,
  });

  const resp4 = await handler(
    asRequestContext("PATCH", `/app/d/${domainId}`, {
      name: "Updated Domain Again",
      version: 1,
    }),
  );
  t.equal(resp4.statusCode, 409);
});

t.test("handler - listing routes", async (t) => {
  const domainId = "handler-listing-route";
  await handler(
    asRequestContext("PUT", `/app/d/${domainId}`, {
      name: "Test Domain",
      zoom: 12,
    }),
  );

  const resp1 = await handler(asRequestContext("GET", `/app/domains`));
  t.equal(typeof JSON.parse(resp1.body).domains, "object");

  const resp2 = await handler(
    asRequestContext("GET", `/app/d/${domainId}/items`),
  );
  t.equal(
    resp2.body,
    JSON.stringify({
      query: { domain: domainId },
      type: "FeatureCollection",
      features: [],
    }),
  );
});

t.test("handler - item lifecycle routes", async (t) => {
  const domainId = "handler-item-lifecycle-routes";
  await handler(
    asRequestContext("PUT", `/app/d/${domainId}`, {
      name: "Test Domain",
      zoom: 12,
    }),
  );

  const resp = await handler(
    asRequestContext("DELETE", `/app/d/${domainId}/item/test-item`),
  );
  t.same(resp.statusCode, 404);

  const item = {
    type: "Feature",
    properties: {
      name: "Null island",
    },
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
  };
  const resp2 = await handler(
    asRequestContext("POST", `/app/d/${domainId}/item`, item),
  );
  const { itemId } = resp2;
  t.same(resp2, {
    domainId,
    itemId,
    version: 1,
    type: "Feature",
    properties: {
      name: "Null island",
    },
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
  });

  const resp3 = await handler(
    asRequestContext("GET", `/app/d/${domainId}/item/${itemId}`),
  );
  t.same(JSON.parse(resp3.body), {
    domainId,
    itemId,
    version: 1,
    type: "Feature",
    properties: {
      name: "Null island",
    },
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
  });

  const resp4 = await handler(
    asRequestContext("PATCH", `/app/d/${domainId}/item/${itemId}`, {
      version: 1,
      properties: {
        name: "Skull island",
      },
      geometry: {
        type: "Point",
        coordinates: [-45, 0],
      },
    }),
  );
  t.same(resp4, {
    domainId,
    itemId,
    version: 2,
    type: "Feature",
    properties: {
      name: "Skull island",
    },
    geometry: {
      type: "Point",
      coordinates: [-45, 0],
    },
  });

  const resp5 = await handler(
    asRequestContext("DELETE", `/app/d/${domainId}/item/${itemId}`),
  );
  t.same(resp5, {});
});

t.test("handler - query route", async (t) => {
  const domainId = "handler-query-route";
  await handler(
    asRequestContext("PUT", `/app/d/${domainId}`, {
      name: "Test Domain",
      zoom: 12,
    }),
  );

  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: `/app/d/${domainId}/query`,
      },
    },
    queryStringParameters: {
      bbox: "0,0,10,10",
    },
  });
  const body = JSON.parse(resp.body);
  t.same(body.query, {
    domain: domainId,
    bbox: "0,0,10,10",
  });
  t.ok(Array.isArray(body.features));
});

t.test("handles - account lifecycle routes", async (t) => {
  const resp1 = await handler(
    asRequestContext("POST", `/app/account`, {
      username: "test-created",
      email: "test-created@example.com",
      password: "abadpassword",
    }),
  );
  t.same(resp1.version, 1);

  const resp2 = await handler({
    requestContext: {
      http: {
        method: "POST",
        path: "/app/login",
      },
    },
    body: "username=test-created&password=abadpassword",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  t.same(resp2.statusCode, 303);

  const cookie = resp2.cookies
    .find((v) => v.startsWith("auth="))
    .split(";", 1)[0];

  // change password as test-created user
  const resp3 = await handler(
    asRequestContext(
      "PATCH",
      `/app/account/${resp1.username}`,
      {
        password: "asillypassword",
        version: resp1.version,
      },
      cookie,
    ),
  );
  t.same(resp3.version, 2);

  // login as a test-created user using the new password
  const resp4 = await handler({
    requestContext: {
      http: {
        method: "POST",
        path: "/app/login",
      },
    },
    body: "username=test-created&password=asillypassword",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  t.same(resp4.statusCode, 303);
});
