---
title: Login
layout: default
localScripts:
  - login.js
---

<div class="modal is-active">
  <div class="modal-background"></div>
  <div class="modal-content">
    <p>Please enter your credentials</p>
    <form action="/app/authorize" method="post">
      <div class="mb-2">
        <input id="name" class="input" type="text" name="username" placeholder="Username"/>
      </div>
      <div class="mb-2">
        <input
          id="password"
          class="input"
          type="password"
          name="password"
          placeholder="Password"
        />
      </div>
      <div>
        <button id="submit" class="button" name="submit">Login</button>
      </div>
    </form>
  </div>
</div>
