---
title: Domains
layout: default
localScripts:
  - front-page.js
---

<span class="js-modal-trigger" data-target="domain-create-modal">Add</span>
<div class="fixed-grid">
  <div id='target' class="grid">
    <p>Loading</p>
    <!-- todo loading modal -->
  </div>
</div>

<template id="domain-card">
 <div>
   <h2><slot name="title-link"></slot></h2>
   <p>created <slot name="created"></slot></p>
   <p>version <slot name="version"></slot></p>
 </div>
</template>

<div id="domain-create-modal" class="modal">
  <div class="modal-background"></div>
  <div class="modal-content">
    <p>fill out the form</p>
    <form id="create-domain-form">
      <div class="mb-2">
        <label for="domainId">Domain ID</label>
        <input class="input" type="text" name="domainId" placeholder="my-domain-id"/>
      </div>
      <div class="mb-2">
        <label for="name">Name</label>
        <input class="input" type="text" name="name" placeholder="Name"/>
      </div>
      <div class="mb-2">
        <label for="access">Access</label>
        <select class="input" name="access">
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>
      <div class="mb-2">
        <label for="zoom">Zoom</label>
        <input class="input" type="number" name="zoom" placeholder="14" min="1" max="24" />
      </div>
      <div class="mb-2">
        <label for="ttl">TTL</label>
        <input class="input" type="number" name="ttl" placeholder="0" />
      </div>
      <div>
        <button id="create-domain-form-submit" class="button js-form-submit" name="submit">
          Create
        </button>
      </div>
    </form>
  </div>
  <button class="modal-close is-large" aria-label="close"></button>
</div>
