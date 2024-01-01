import t from "tap";

import { validateDomain } from "../lib/domains.js";

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
