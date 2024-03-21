'use strict';

async function loadDomains() {
  const response = await fetch("http://localhost:8080/domains");
  if (response.status == 403) {
    window.location.pathname = '/login';
  } else {
    const { domains } = await response.json();

    document.getElementById('target').innerHTML = domains.map(v => {
      return `<div>
        <h2><a href="/map?d=${v.domainId}">${v.name}</a></h2>
        <p>${v.domainId}</p>
        <p>created ${v.created}</p>
        <p>version ${v.version}</p>
      `;
    });
  }
}

window.addEventListener('DOMContentLoaded', (/* event */) => {
  loadDomains();
});
