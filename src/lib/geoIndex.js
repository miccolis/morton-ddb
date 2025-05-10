import { ZCurve2 } from "@thi.ng/morton";
import { tiles } from "@mapbox/tile-cover";
import assert from "node:assert";

const zcurve = new ZCurve2(32);

/**
 * Return list of morton encoded tile indexes for a geojson feature at the requested zoom level
 *
 * @param {object} options
 * @param {object} options.feature - geojson feature
 * @param {number} options.zoom - zoom level
 * @return {Array<{morton: BigInt, x: number, y: number}>}
 */
export function buildTileIndex({ feature, zoom }) {
  assert.ok(feature.geometry);

  const tilelist = tiles(feature.geometry, { min_zoom: zoom, max_zoom: zoom });
  return tilelist.map(([x, y]) => ({
    morton: zcurve.encode([x, y]),
    x,
    y,
  }));
}

/**
 * Return morton encoded tile index for a specific location at the requested zoom level
 *
 * @param {number} z - zoom level resolution
 * @param {object} coords
 * @param {number} coords.x - longitude
 * @param {number} coords.y - latitude
 */
export function coordsToMorton(z, { x, y }) {
  const [tileX, tileY, tileZ] = tiles(
    { type: "Point", coordinates: [x, y] },
    { min_zoom: z, max_zoom: z },
  )[0];
  return {
    morton: zcurve.encode([tileX, tileY]),
    z: tileZ,
    x: tileX,
    y: tileY,
  };
}
