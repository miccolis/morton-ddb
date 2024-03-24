---
title: map
layout: default
remoteScripts:
  - https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.js
localScripts:
  - map.js
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
