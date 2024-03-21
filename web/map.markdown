---
title: map
layout: default
remoteScripts:
  - https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.js
---
<link
  href="https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.css"
  rel="stylesheet"
/>
<style>
  body {
    margin: 0;
    padding: 0;
  }
  #map {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
  }
  .mapboxgl-popup {
    max-width: 400px;
    font:
      12px/20px "Helvetica Neue",
      Arial,
      Helvetica,
      sans-serif;
  }
</style>
<div id="map"></div>

<script>
  mapboxgl.accessToken =
    "pk.eyJ1IjoibWljY29saXMiLCJhIjoiY2w2ZHlmODQ5MGZtdTNlcHN1eHVyZHo4dyJ9.c7_lC5E1dnQZnsb22QaKnA";
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    zoom: 1.5,
    center: [30, 50],
  });

  const params = new URLSearchParams(window.location.search);
  const dataSet = params.get('d');
  const baseUrl = `http://localhost:8080/d/${dataSet}`;

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
</script>
