import t from "tap";

import { handler } from "../index.js";

/**
 * @param {String} method
 * @param {String} path
 * @param {object} body
 */
function asRequestContext(method, path, body) {
  return {
    requestContext: {
      http: {
        method,
        path,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
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
  const resp = await handler(
    asRequestContext("PUT", `/d/${domainId}`, { name: "Test Domain" }),
  );
  t.same(resp, {
    name: "Test Domain",
    domainId,
    version: 1,
    access: "private",
    ttl: 0,
  });

  const resp2 = await handler(asRequestContext("GET", `/d/${domainId}`));
  t.same(resp2, {
    domainId,
    name: "Test Domain",
    version: 1,
    access: "private",
    ttl: 0,
  });

  const resp3 = await handler(
    asRequestContext("PATCH", `/d/${domainId}`, {
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
    asRequestContext("PATCH", `/d/${domainId}`, {
      name: "Updated Domain Again",
      version: 1,
    }),
  );
  t.equal(resp4.statusCode, 409);
});

t.test("handler - listing route", async (t) => {
  const domainId = "handler-listing-route";
  await handler(
    asRequestContext("PUT", `/d/${domainId}`, { name: "Test Domain" }),
  );

  const resp = await handler(asRequestContext("GET", `/d/${domainId}/item`));
  t.equal(
    JSON.stringify(resp),
    JSON.stringify({
      query: { domain: domainId },
      type: "FeatureCollection",
      features: [],
    }),
  );
});

t.test("handler - create route", async (t) => {
  const domainId = "handler-create-route";
  await handler(
    asRequestContext("PUT", `/d/${domainId}`, { name: "Test Domain" }),
  );

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

  const resp = await handler(
    asRequestContext("POST", `/d/${domainId}/item`, item),
  );
  t.same(resp.properties, item.properties);
  t.same(resp.geometry, item.geometry);
  t.equal(resp.version, 1);
  t.ok(resp.itemId);
});

t.test("handler - item lifecycle routes", async (t) => {
  const domainId = "handler-item-lifecycle-routes";
  await handler(
    asRequestContext("PUT", `/d/${domainId}`, { name: "Test Domain" }),
  );

  const resp = await handler(
    asRequestContext("DELETE", `/d/${domainId}/item/test-item`),
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
  const { itemId } = await handler(
    asRequestContext("POST", `/d/${domainId}/item`, item),
  );

  const resp3 = await handler(
    asRequestContext("GET", `/d/${domainId}/item/${itemId}`),
  );
  t.same(resp3, {
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
    asRequestContext("DELETE", `/d/${domainId}/item/${itemId}`),
  );
  t.same(resp4, {});
});

t.test("handler - query route", async (t) => {
  const domainId = "handler-query-route";
  await handler(
    asRequestContext("PUT", `/d/${domainId}`, { name: "Test Domain" }),
  );

  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: `/d/${domainId}/query`,
      },
    },
    queryStringParameters: {
      bbox: "0,0,10,10",
    },
  });
  t.same(resp.query, {
    domain: domainId,
    bbox: [0, 0, 10, 10],
  });
  t.ok(Array.isArray(resp.features));
});
