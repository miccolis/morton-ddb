"use strict";

function setupMap() {
  /** @type any */
  const mapboxgl = /** @type undefined */ (
    // @ts-ignore-next-line
    window.mapboxgl
  );

  // @ts-ignore-next-line
  mapboxgl.accessToken = window.mapboxAccessToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    zoom: 1.5,
    center: [30, 50],
  });

  const params = new URLSearchParams(window.location.search);
  const dataSet = params.get("d");
  const baseUrl = `/app/d/${dataSet}`;

  const addFeatures = async () => {
    const queryUrl = `${baseUrl}/items`;
    let response = await fetch(queryUrl);

    if (response.ok) {
      // if HTTP-status is 200-299

      const featureCollection = await response.json();

      map.addSource(dataSet, {
        type: "geojson",
        data: featureCollection,
      });
      map.addLayer({
        id: dataSet,
        type: "circle",
        source: dataSet,
        layout: {},
        paint: {
          "circle-color": "red",
          "circle-opacity": 0.8,
          "circle-blur": 0,
          "circle-radius": 8,
        },
      });

      map.on("mouseenter", dataSet, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      // Change it back to a pointer when it leaves.
      map.on("mouseleave", dataSet, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", dataSet, (e) => {
        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.name;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(description)
          .addTo(map);
      });
    } else {
      alert("HTTP-Error: " + response.status);
    }
  };

  map.on("load", () => {
    (async function () {
      // Set the default atmosphere style
      map.setFog({});
      addFeatures();
    })();
  });
}

window.addEventListener("DOMContentLoaded", (/* event */) => {
  setupMap();
});
