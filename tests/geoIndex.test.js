import t from "tap";

import { buildTileIndex } from "../lib/geoIndex.js";

t.test("buildTileIndex - point", (t) => {
  const feature = {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [0, 0],
      type: "Point",
    },
  };
  const resp = buildTileIndex({ feature, zoom: 8 });
  t.same(resp, [{ morton: "211106232532992", x: 128, y: 128 }]);
  t.end();
});
