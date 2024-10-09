---
title: Map
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
<script>
  window.mapboxAccessToken = "{{ site.mapboxAccessToken }}";
</script>
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
    height: 500px;
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

<div class="has-text-right" style="position: absolute; top: -45px; right: 0px">
  <a href="/">Back to list</a>
</div>

<div id="map"></div>
