---
title: Domains
layout: default
localScripts:
  - front-page.js
---

<div id="account-info" class="has-text-right" style="position: absolute; top: -45px; right: 0px">
  <span class="auth-hidden is-hidden">
    <!-- maybe make this a modal too -->
    <a class="button" href="/login.html">Login</a>
  </span>
  <span class="auth-required is-hidden">
    <a class="button" href="/app/logout">Logout</a>
  </span>
</div>

<div class="columns">
  <div class="column is-three-quarters is-size-4">
  <p>Collections of geographic data that are organized into a "domain." Indexed
  at a particular level and with a shared cache lifetime.</p>
  </div>
  <div class="column auth-required is-hidden has-text-centered">
    <a class="js-modal-trigger button is-light is-warning is-large"
    data-target="domain-create-modal">Create Domain</a>
  </div>
</div>

<div class="fixed-grid">
  <div id='target' class="grid">
    <div class="loader is-loading"></div>
  </div>
</div>

<div id="domain-create-modal" class="modal">
  <div class="modal-background"></div>
  <div class="modal-content box">
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
        <button id="create-domain-form-submit" class="button js-domain-create-form-submit" name="submit">
          Create
        </button>
      </div>
    </form>
  </div>
  <button class="modal-close is-large" aria-label="close"></button>
</div>

<div id="domain-edit-modal" class="modal">
  <div class="modal-background"></div>
  <div class="modal-content box">
  </div>
  <button class="modal-close is-large" aria-label="close"></button>
</div>

<template id="domain-card">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css">
  <div class='box'>
    <div class="columns mb-0">
      <div class="column is-four-fifths pb-0">
        <h2 class="is-size-4"><slot name="title-link"></slot></h2>
      </div>
      <div class="column domain-owner-required is-hidden has-text-right pb-0">
        <a
          class="js-modal-trigger button"
          data-target="domain-edit-modal"
        >Edit</a>
      </div>
    </div>
    <div>
      <p>Indexed at zoom <slot name="zoom"></slot></p>
      <p>Access: <slot name="access"></slot></p>
      <p>Cache TTL: <slot name="ttl"></slot></p>
      <p>Created on <slot name="created"></slot></p>
    </div>
  </div>
</template>

<template id="domain-edit-content">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css">
  <form id="create-edit-form">
    <div class="mb-2">
      <p>DomainId <slot name="domainId"></slot></p>
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
      <p>Zoom <slot name="zoom"></slot></p>
    </div>
    <div class="mb-2">
      <label for="ttl">TTL</label>
      <input class="input" type="number" name="ttl" placeholder="0" />
    </div>
    <div>
      <button
        id="create-domain-form-submit"
        class="button js-domain-form-submit"
        name="submit"
      >Update</button>
    </div>
  </form>
</template>
