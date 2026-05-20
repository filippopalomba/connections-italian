// Connessioni Italiane — gameplay logic
// Lavora sia in modalità ospite (localStorage) sia con utente loggato
// (sincronizza progressi, ratings e achievement su Supabase).

(function () {
  "use strict";

  const MAX_MISTAKES = 4;
  const STORAGE_KEY = "connessioni-italiane.v1";

  // ---- Local storage helpers ----
  function loadAllProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveLocalProgress(date, state) {
    const all = loadAllProgress();
    all[date] = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function getLocalProgress(date) {
    return loadAllProgress()[date] || null;
  }

  // Exposed for archive page
  window.getProgress = getLocalProgress;

  // ---- Utilities ----
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showToast(msg, ms) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), ms || 1800);
  }

  function showAchievementToast(a) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerHTML = "🏆 Achievement sbloccato: <strong>" + a.title + "</strong>";
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ---- Game init ----
  function getDateParam() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("date");
    if (requested && window.getPuzzleByDate(requested)) return requested;
    return window.getTodayPuzzle().date;
  }

  let gameState = null; // exposed via closure to handlers

  async function initGame() {
    // Only initialize on pages that actually host the game board.
    if (!document.getElementById("grid")) return;

    const date = getDateParam();
    const puzzle = window.getPuzzleByDate(date);
    if (!puzzle) {
      document.getElementById("game-root").innerHTML =
        "<p style='text-align:center;color:#6b7280;padding:40px 0;'>Puzzle non trovato.</p>";
      return;
    }

    document.getElementById("puzzle-number").textContent = "#" + puzzle.number;
    document.getElementById("puzzle-date").textContent = window.formatItalianDate(puzzle.date);

    // Prefer cloud progress if logged in; otherwise local.
    let previous = null;
    if (window.cloud && window.cloud.ready && window.cloud.user) {
      previous = await window.cloud.loadProgress(date);
    }
    if (!previous) previous = getLocalProgress(date);
    if (!previous) {
      previous = { solvedLevels: [], mistakes: 0, done: false, result: null, remaining: null };
    }

    const todayDate = window.getTodayPuzzle().date;
    const fromArchive = date !== todayDate;

    const allWords = puzzle.groups.flatMap(g => g.words);
    const solvedLevels = previous.solvedLevels || [];
    const solvedWords = new Set(
      puzzle.groups
        .filter(g => solvedLevels.includes(g.level))
        .flatMap(g => g.words)
    );

    let remainingOrder;
    if (previous.remaining && previous.remaining.every(w => allWords.includes(w))) {
      remainingOrder = previous.remaining.filter(w => !solvedWords.has(w));
    } else {
      remainingOrder = shuffle(allWords.filter(w => !solvedWords.has(w)));
    }

    gameState = {
      puzzle: puzzle,
      date: date,
      fromArchive: fromArchive,
      selected: new Set(),
      solvedLevels: solvedLevels,
      mistakes: previous.mistakes || 0,
      remaining: remainingOrder,
      done: !!previous.done,
      result: previous.result || null,
      achievementsChecked: false,
    };

    persist(gameState);
    render(gameState);
    bindActions(gameState);

    // If user logs in/out mid-session, reload progress
    if (window.cloud) {
      window.cloud.onAuthChange((user) => {
        if (user) {
          // Re-load from cloud (may have progress from another device)
          window.cloud.loadProgress(date).then(cloudProg => {
            if (cloudProg) {
              applyCloudProgress(gameState, cloudProg);
              render(gameState);
            } else {
              // Push current local state to cloud
              window.cloud.saveProgress(date, gameState);
            }
          });
        }
      });
    }

    if (gameState.done) {
      onGameEnd(gameState);
    }
  }

  function applyCloudProgress(state, cloud) {
    state.solvedLevels = cloud.solvedLevels || [];
    state.mistakes = cloud.mistakes || 0;
    state.done = !!cloud.done;
    state.result = cloud.result || null;
    const allWords = state.puzzle.groups.flatMap(g => g.words);
    const solvedWords = new Set(
      state.puzzle.groups
        .filter(g => state.solvedLevels.includes(g.level))
        .flatMap(g => g.words)
    );
    state.remaining = cloud.remaining && cloud.remaining.every(w => allWords.includes(w))
      ? cloud.remaining.filter(w => !solvedWords.has(w))
      : shuffle(allWords.filter(w => !solvedWords.has(w)));
    state.selected.clear();
  }

  function persist(state) {
    const snapshot = {
      solvedLevels: state.solvedLevels,
      mistakes: state.mistakes,
      done: state.done,
      result: state.result,
      remaining: state.remaining,
    };
    saveLocalProgress(state.date, snapshot);
    if (window.cloud && window.cloud.ready && window.cloud.user) {
      window.cloud.saveProgress(state.date, snapshot).catch(() => {});
    }
  }

  // ---- Render ----
  function render(state) {
    renderSolvedRows(state);
    renderGrid(state);
    renderMistakes(state);
    renderActions(state);
    renderBanner(state);
    if (state.done) renderRatingWidget(state);
  }

  function renderSolvedRows(state) {
    const container = document.getElementById("solved-rows");
    container.innerHTML = "";
    state.solvedLevels.forEach(level => {
      const group = state.puzzle.groups.find(g => g.level === level);
      if (!group) return;
      const row = document.createElement("div");
      row.className = "solved-row " + level;
      row.innerHTML =
        '<div class="theme">' + group.theme + "</div>" +
        '<div class="members">' + group.words.join(", ") + "</div>";
      container.appendChild(row);
    });
  }

  function renderGrid(state) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    state.remaining.forEach(word => {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.textContent = word;
      tile.dataset.word = word;
      if (state.selected.has(word)) tile.classList.add("selected");
      if (state.done) tile.classList.add("locked");
      tile.addEventListener("click", () => onTileClick(state, word, tile));
      grid.appendChild(tile);
    });
  }

  function renderMistakes(state) {
    const dots = document.getElementById("mistake-dots");
    dots.innerHTML = "";
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < state.mistakes ? " spent" : "");
      dots.appendChild(dot);
    }
  }

  function renderActions(state) {
    const submitBtn = document.getElementById("btn-submit");
    const deselectBtn = document.getElementById("btn-deselect");
    const shuffleBtn = document.getElementById("btn-shuffle");
    submitBtn.disabled = state.selected.size !== 4 || state.done;
    deselectBtn.disabled = state.selected.size === 0 || state.done;
    shuffleBtn.disabled = state.done;
  }

  function renderBanner(state) {
    const banner = document.getElementById("banner");
    banner.innerHTML = "";
    banner.className = "";
    if (!state.done) return;
    if (state.result === "win") {
      banner.className = "banner win";
      banner.textContent = "Hai vinto! Complimenti, hai trovato tutti i gruppi.";
    } else if (state.result === "lose") {
      banner.className = "banner lose";
      banner.textContent = "Niente da fare oggi. Riprova domani con una nuova sfida!";
    }
  }

  // ---- Rating widget ----
  async function renderRatingWidget(state) {
    let widget = document.getElementById("rating-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "rating-widget";
      widget.className = "rating-widget";
      const banner = document.getElementById("banner");
      banner.parentNode.insertBefore(widget, banner.nextSibling);
    }

    if (!window.cloud || !window.cloud.ready) {
      widget.innerHTML = "";
      return;
    }
    if (!window.cloud.user) {
      widget.innerHTML =
        '<p class="rating-title">Ti è piaciuto questo puzzle?</p>' +
        '<p class="rating-sub"><a href="login.html">Accedi</a> per votare.</p>';
      return;
    }

    const summary = await window.cloud.getRatingSummary(state.date);
    const mine = summary.mine;
    const avgText = summary.count > 0
      ? "Media: " + summary.avg.toFixed(1) + " ⭐ (" + summary.count + (summary.count === 1 ? " voto" : " voti") + ")"
      : "Nessun voto ancora";

    const titleText = mine ? "Hai dato " + mine + " " + (mine === 1 ? "stella" : "stelle") + " a questo puzzle"
                          : "Valuta questo puzzle";

    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
      const filled = mine && i <= mine;
      starsHtml += '<button class="star ' + (filled ? "filled" : "") + '" data-stars="' + i + '">★</button>';
    }
    widget.innerHTML =
      '<p class="rating-title">' + titleText + '</p>' +
      '<div class="stars-row"><span class="stars-label">Difficoltà</span>' + starsHtml + "</div>" +
      '<p class="rating-sub">' + avgText + "</p>";

    widget.querySelectorAll(".star").forEach(btn => {
      btn.addEventListener("click", async () => {
        const stars = parseInt(btn.dataset.stars, 10);
        try {
          await window.cloud.rate(state.date, stars);
          showToast("Voto registrato: " + stars + (stars === 1 ? " stella" : " stelle"));
          renderRatingWidget(state);
        } catch (err) {
          showToast(err.message);
        }
      });
      btn.addEventListener("mouseenter", () => {
        const n = parseInt(btn.dataset.stars, 10);
        widget.querySelectorAll(".star").forEach((s, idx) => {
          s.classList.toggle("hover", idx < n);
        });
      });
      btn.addEventListener("mouseleave", () => {
        widget.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
      });
    });
  }

  // ---- Interaction ----
  function onTileClick(state, word, tileEl) {
    if (state.done) return;
    if (state.selected.has(word)) {
      state.selected.delete(word);
      tileEl.classList.remove("selected");
    } else {
      if (state.selected.size >= 4) return;
      state.selected.add(word);
      tileEl.classList.add("selected");
    }
    renderActions(state);
  }

  function bindActions(state) {
    document.getElementById("btn-submit").addEventListener("click", () => onSubmit(state));
    document.getElementById("btn-deselect").addEventListener("click", () => {
      state.selected.clear();
      render(state);
    });
    document.getElementById("btn-shuffle").addEventListener("click", () => {
      state.remaining = shuffle(state.remaining);
      state.selected.clear();
      persist(state);
      render(state);
    });
  }

  function onSubmit(state) {
    if (state.selected.size !== 4 || state.done) return;
    const selected = Array.from(state.selected);

    let matchedGroup = null;
    let bestOverlap = 0;
    state.puzzle.groups.forEach(g => {
      if (state.solvedLevels.includes(g.level)) return;
      const overlap = selected.filter(w => g.words.includes(w)).length;
      if (overlap === 4) matchedGroup = g;
      if (overlap > bestOverlap) bestOverlap = overlap;
    });

    if (matchedGroup) {
      animateTiles(selected, "jump", () => {
        state.solvedLevels.push(matchedGroup.level);
        state.remaining = state.remaining.filter(w => !matchedGroup.words.includes(w));
        state.selected.clear();
        if (state.solvedLevels.length === 4) {
          state.done = true;
          state.result = "win";
        }
        persist(state);
        render(state);
        if (state.done) onGameEnd(state);
      });
    } else {
      animateTiles(selected, "shake", () => {
        state.mistakes += 1;
        if (bestOverlap === 3) showToast("Quasi! Una sola sbagliata.");
        else showToast("Non è il gruppo giusto.");
        if (state.mistakes >= MAX_MISTAKES) {
          const unsolved = state.puzzle.groups.filter(g => !state.solvedLevels.includes(g.level));
          unsolved.forEach(g => state.solvedLevels.push(g.level));
          state.remaining = [];
          state.selected.clear();
          state.done = true;
          state.result = "lose";
        } else {
          state.selected.clear();
        }
        persist(state);
        render(state);
        if (state.done) onGameEnd(state);
      });
    }
  }

  function animateTiles(words, className, done) {
    const tiles = Array.from(document.querySelectorAll(".tile")).filter(t =>
      words.includes(t.dataset.word)
    );
    tiles.forEach((t, i) => setTimeout(() => t.classList.add(className), i * 80));
    setTimeout(done, tiles.length * 80 + 480);
  }

  // ---- End of game: trigger achievements ----
  async function onGameEnd(state) {
    if (state.achievementsChecked) return;
    state.achievementsChecked = true;
    if (!window.cloud || !window.cloud.ready || !window.cloud.user) return;
    try {
      const [allProgress, ratings] = await Promise.all([
        window.cloud.listAllProgress(),
        window.cloud.client
          .from("ratings")
          .select("puzzle_date", { count: "exact", head: true })
          .eq("user_id", window.cloud.user.id),
      ]);
      const ratingsCount = ratings.count || 0;
      const newly = await window.checkAchievements({
        state: state,
        puzzle: state.puzzle,
        fromArchive: state.fromArchive,
        allProgress: allProgress,
        ratingsCount: ratingsCount,
      });
      newly.forEach((a, i) => {
        setTimeout(() => showAchievementToast(a), i * 3400);
      });
    } catch (e) {
      // silent — achievements are non-critical
    }
  }

  // ---- Boot ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
  } else {
    initGame();
  }
})();
