"use strict";

/**
 * Based on https://developer.mozilla.org/en-US/docs/Web/API/Web_Components/Using_templates_and_slots#creating_a_new_element-details_element_from_the_template
 */
function setupCustomElements() {
  customElements.define(
    "domain-card",
    class extends HTMLElement {
      constructor() {
        super();
        /** @type {HTMLTemplateElement} */
        let template =
          /** @type {undefined } */
          (document.getElementById("domain-card"));

        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(templateContent.cloneNode(true));
      }
    },
  );
}

/**
 *From https://bulma.io/documentation/components/modal/#javascript-implementation-example
 */
function setupModals() {
  // Functions to open and close a modal
  function openModal($el) {
    $el.classList.add("is-active");
  }

  function closeModal($el) {
    $el.classList.remove("is-active");
  }

  function closeAllModals() {
    (document.querySelectorAll(".modal") || []).forEach(($modal) => {
      closeModal($modal);
    });
  }
  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll(".js-modal-trigger") || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener("click", () => {
      openModal($target);
    });
  });

  // Add a click event on various child elements to close the parent modal
  (
    document.querySelectorAll(
      ".modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button",
    ) || []
  ).forEach(($close) => {
    const $target = $close.closest(".modal");

    $close.addEventListener("click", () => {
      closeModal($target);
    });
  });

  // Add a keyboard event to close all modals
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}

async function loadDomains() {
  const response = await fetch("http://localhost:8080/domains");
  if (response.status == 403) {
    window.location.pathname = "/login";
  } else {
    const { domains } = await response.json();

    document.getElementById("target").innerHTML = domains
      .map(
        (v) =>
          `<domain-card>
      <span slot="title-link"><a href="/map?d=${v.domainId}">${v.name}</a></span>
      <span slot="created">${v.created}</span>
      <span slot="version">${v.version}</span>
    </domain-card>`,
      )
      .join("");
  }
}

function setupCreateDomain() {
  // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects#using_a_formdata_event

  (document.querySelectorAll(".js-form-submit") || []).forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();

      const formEl = el.closest("form");
      const data = new FormData(formEl);

      let attributes = {};
      for (const [k, v] of data) {
        if (
          // Two elements are expected to be integers
          (k === "zoom" || k === "ttl") &&
          typeof v === "string" // Makes typechecking happy.
        ) {
          attributes[k] = parseInt(v);
        } else {
          attributes[k] = v;
        }
      }

      const { domainId, ...body } = attributes;

      // TODO disable form
      // show loading indicator

      fetch(`/d/${domainId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((resp) => {
          if (resp.ok && resp.status === 200) {
            location.reload();
          }
          // Validation errors will show like resp.ok = false, resp.status = 400
        })
        .catch((err) => {
          // TODO show unexpected error message
          console.error(err);
        });
    });
  });
}

window.addEventListener("DOMContentLoaded", (/* event */) => {
  setupCustomElements();
  setupModals();
  setupCreateDomain();
  loadDomains();
});
