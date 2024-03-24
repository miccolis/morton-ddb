"use strict";

async function loadAccount() {
  const response = await fetch("http://localhost:8080/account");
  const body = await response.json();
  if (body.username !== undefined) {
    window.location.pathname = "/";
  }
}

window.addEventListener("DOMContentLoaded", (/* event */) => {
  loadAccount();
});
