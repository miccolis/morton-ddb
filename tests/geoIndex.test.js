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

// TODO fix these
t.skip("buildTileIndex - line", (t) => {
  const feature = {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-74.334, 40.928],
          [-74.334, 40.493],
        ],
      ],
      type: "LineString",
    },
  };

  {
    const resp = buildTileIndex({ feature, zoom: 8 });
    t.same(resp, [{ morton: "61869003898880", x: 75, y: 96 }]);
  }
  {
    const resp = buildTileIndex({ feature, zoom: 10 });
    t.same(resp, [
      {
        morton: 61869003898880,
        x: 300,
        y: 384,
      },
      {
        morton: 61869540769792,
        x: 300,
        y: 385,
      },
    ]);
  }
  t.end();
});

t.test("buildTileIndex - box", (t) => {
  const feature = {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-74.334, 40.928],
          [-74.334, 40.493],
          [-73.641, 40.493],
          [-73.641, 40.928],
          [-74.334, 40.928],
        ],
      ],
      type: "Polygon",
    },
  };

  {
    const resp = buildTileIndex({ feature, zoom: 8 });
    t.same(resp, [{ morton: "61869003898880", x: 75, y: 96 }]);
  }
  {
    const resp = buildTileIndex({ feature, zoom: 9 });
    t.same(resp, [
      {
        morton: 61869003898880,
        x: 150,
        y: 192,
      },
      {
        morton: 61870077640704,
        x: 151,
        y: 192,
      },
    ]);
  }
  t.end();
});
