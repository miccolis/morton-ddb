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

t.test("handler - get domain route", async (t) => {
  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: "/d/test-domain",
      },
    },
  });
  t.equal(resp.statusCode, 404);
});

t.test("handler - create domain route", async (t) => {
  const domainId = "handler-create-domain-route";
  const resp = await handler({
    requestContext: {
      http: {
        method: "PUT",
        path: `/d/${domainId}`,
      },
      body: JSON.stringify({ name: "Test Domain" }),
    },
  });
  t.same(resp.name, "Test Domain");
  t.equal(resp.domainId, domainId);
  t.equal(resp.version, 1);

  const resp2 = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: `/d/${domainId}`,
      },
    },
  });
  t.same(resp2, { domainId, name: "Test Domain", version: 1 });
});

t.test("handler - listing route", async (t) => {
  const domainId = "handler-listing-route";
  await handler({
    requestContext: {
      http: {
        method: "PUT",
        path: `/d/${domainId}`,
      },
      body: JSON.stringify({ name: "Test Domain" }),
    },
  });

  const resp = await handler({
    requestContext: {
      http: {
        method: "GET",
        path: `/d/${domainId}/item`,
      },
    },
  });
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
  await handler({
    requestContext: {
      http: {
        method: "PUT",
        path: `/d/${domainId}`,
      },
      body: JSON.stringify({ name: "Test Domain" }),
    },
  });

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
        path: `/d/${domainId}/item`,
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
  const domainId = "handler-query-route";
  await handler({
    requestContext: {
      http: {
        method: "PUT",
        path: `/d/${domainId}`,
      },
      body: JSON.stringify({ name: "Test Domain" }),
    },
  });

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
