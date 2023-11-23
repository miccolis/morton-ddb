import t from "tap";

import { handler } from "../index.js";

t.test("handler - no route", async (t) => {
  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: "/bad/path",
      },
    },
  });
  t.equal(resp.statusCode, 404);
});

t.test("handler - listing route", async (t) => {
  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: "/d/test-domain/item",
      },
    },
  });
  t.equal(
    JSON.stringify(resp),
    JSON.stringify({
      query: { domain: "test-domain" },
      type: "FeatureCollection",
      features: [],
    }),
  );
});

t.test("handler - create route", async (t) => {
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

  const resp = await handler({
    requestContext: {
      http: {
        method: "POST",
        path: "/d/test-domain/item",
      },
      body: JSON.stringify(item),
    },
  });
  t.same(resp.properties, item.properties);
  t.same(resp.geometry, item.geometry);
  t.equal(resp.version, 1);
  t.ok(resp.itemId);
});

t.test("handler - delete route", async (t) => {
  const resp = await handler({
    requestContext: {
      http: {
        method: "DELETE",
        path: "/d/test-domain/item/test-item",
      },
    },
  });
  t.same(resp, {});
});

t.test("handler - query route", async (t) => {
  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: "/d/test-domain/query",
      },
    },
    queryStringParameters: {
      bbox: "0,0,10,10",
    },
  });
  t.same(resp.query, {
    domain: "test-domain",
    bbox: [0, 0, 10, 10],
  });
  t.ok(Array.isArray(resp.features));
});
