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
  customElements.define(
    "domain-edit-content",
    class extends HTMLElement {
      constructor() {
        super();
        /** @type {HTMLTemplateElement} */
        let template =
          /** @type {undefined } */
          (document.getElementById("domain-edit-content"));

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

function setupCreateDomain() {
  // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects#using_a_formdata_event

  (document.querySelectorAll(".js-domain-create-form-submit") || []).forEach(
    (el) => {
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

        fetch(`/app/d/${domainId}`, {
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
    },
  );
}

async function loadDomains() {
  const response = await fetch("/app/domains");
  if (response.status == 200) {
    const { domains } = await response.json();

    document.getElementById("target").innerHTML = domains
      .map(
        (v) =>
          `<domain-card>
             <span slot="title-link"><a href="/map.html?d=${v.domainId}">${v.name}</a></span>
             <span slot="created">${v.created}</span>
             <span slot="version">${v.version}</span>
             <span slot="ttl">${v.ttl}</span>
             <span slot="access">${v.access}</span>
             <span slot="zoom">${v.zoom}</span>
           </domain-card>`,
      )
      .join("");

    (document.querySelectorAll("domain-card") || []).forEach((el) => {
      el.addEventListener("click", (event) => {
        if (event.originalTarget.dataset?.target === "domain-edit-modal")
          document.querySelector(
            "#domain-edit-modal .modal-content",
          ).innerHTML = `<domain-edit-content>
            </domain-edit-content>`;
        document.getElementById("domain-edit-modal").classList.add("is-active");
      });
    });

    const showEditLinks = (username) => {
      username;
      // TODO how to get into the right card?
    };

    /** @ts-ignore-next-line thinks Element doesn't have dataset */
    const username = document.querySelector("#account-info").dataset?.username;
    if (username) {
      showEditLinks(username);
    } else {
      document
        .querySelector("#account-info")
        .addEventListener("auth", (event) => {
          const {
            /** @ts-ignore-next-line doesn't think detail exists on Event */
            detail: { username },
          } = event;
          showEditLinks(username);
        });
    }
  } else {
    // do something with the error
  }
}

async function loadAccount() {
  const response = await fetch("/app/account");
  if (response.status !== 200) {
    return false;
  } else {
    return response.json();
  }
}

window.addEventListener("DOMContentLoaded", (/* event */) => {
  setupCustomElements();
  setupModals();
  setupCreateDomain();
  loadDomains();
  loadAccount().then(
    (account) => {
      /** @ts-ignore-next-line void sillyness */
      if (!account) {
        document.querySelectorAll(".auth-hidden.is-hidden").forEach((el) => {
          el.classList.remove("is-hidden");
        });
      } else {
        const { username } = account;
        // bind username into to a well known location
        const elem = document.querySelector("#account-info");

        /** @ts-ignore-next-line thinks Element doesn't have dataset */
        elem.dataset.username = username;

        document.querySelectorAll(".auth-required.is-hidden").forEach((el) => {
          el.classList.remove("is-hidden");
        });

        // Dispatch event that others can listen for
        elem.dispatchEvent(new CustomEvent("auth", { detail: { username } }));
      }
    },
    () => {},
  );
});
