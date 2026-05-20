// Connessioni Italiane — UI helpers per autenticazione
// Renderizza l'area utente nell'header e gestisce login/signup/logout.

(function () {
  "use strict";

  function renderHeader(user, profile) {
    const slot = document.getElementById("user-area");
    if (!slot) return;
    slot.innerHTML = "";

    if (!window.cloud || !window.cloud.ready) {
      // Cloud not configured — hide the user area entirely
      slot.style.display = "none";
      return;
    }

    if (user && profile) {
      const wrap = document.createElement("div");
      wrap.className = "user-area logged-in";
      wrap.innerHTML =
        '<a class="user-name" href="profilo.html">' + escapeHtml(profile.username) + "</a>" +
        '<button class="btn-link" id="btn-logout">Esci</button>';
      slot.appendChild(wrap);
      document.getElementById("btn-logout").addEventListener("click", async () => {
        await window.cloud.signOut();
        window.location.href = "index.html";
      });
    } else {
      const wrap = document.createElement("div");
      wrap.className = "user-area logged-out";
      wrap.innerHTML =
        '<a class="btn-link" href="login.html">Accedi</a>' +
        '<a class="btn-link primary-link" href="signup.html">Registrati</a>';
      slot.appendChild(wrap);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---- Form handlers (used by login.html / signup.html) ----

  window.bindSignupForm = function (formId, errorId) {
    const form = document.getElementById(formId);
    const errEl = document.getElementById(errorId);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const username = form.username.value.trim();
      const password = form.password.value;
      const password2 = form.password2 ? form.password2.value : password;
      if (password !== password2) {
        errEl.textContent = "Le password non coincidono.";
        return;
      }
      try {
        form.querySelector("button[type=submit]").disabled = true;
        await window.cloud.signUp(username, password);
        window.location.href = "index.html";
      } catch (err) {
        errEl.textContent = err.message;
        form.querySelector("button[type=submit]").disabled = false;
      }
    });
  };

  window.bindLoginForm = function (formId, errorId) {
    const form = document.getElementById(formId);
    const errEl = document.getElementById(errorId);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      try {
        form.querySelector("button[type=submit]").disabled = true;
        await window.cloud.signIn(form.username.value.trim(), form.password.value);
        window.location.href = "index.html";
      } catch (err) {
        errEl.textContent = err.message;
        form.querySelector("button[type=submit]").disabled = false;
      }
    });
  };

  // ---- Boot ----
  function init() {
    if (window.cloud) {
      window.cloud.onAuthChange(renderHeader);
    } else {
      renderHeader(null, null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
