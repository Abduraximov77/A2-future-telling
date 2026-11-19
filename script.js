/* ==========================================================
   Porchlight: lets neighbors add posts to the Porch and the Workshop.
   Posts show up right away and are saved in this browser (localStorage),
   so they are still there after a refresh.
   Workshop posts can also be marked as done once a neighbor has helped.
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Saving and loading ---------- */
  function loadPosts(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
      return [];
    }
  }

  function savePosts(key, posts) {
    try {
      localStorage.setItem(key, JSON.stringify(posts));
    } catch (error) {
      /* Saving is a bonus. The page still works without it. */
    }
  }

  /* ---------- Small helper to build elements safely ---------- */
  function makeElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text; /* textContent keeps user text safe */
    return element;
  }

  /* ---------- Card builders ---------- */
  function buildPorchCard(post) {
    var card = makeElement("article", "card");
    card.appendChild(makeElement("span", "tag", "New story"));
    card.appendChild(makeElement("h3", "", "A new lantern"));
    card.appendChild(makeElement("p", "byline", post.name));
    card.appendChild(makeElement("p", "", post.story));
    return card;
  }

  function buildWorkshopCard(post) {
    var card = makeElement("article", post.done ? "card card-done" : "card");

    if (post.done) {
      card.appendChild(makeElement("span", "tag done-tag", "Helped ✓"));
    } else {
      var isWanted = post.kind === "Wanted";
      card.appendChild(makeElement("span", isWanted ? "tag want" : "tag", post.kind));
    }

    card.appendChild(makeElement("h3", "", post.title));
    card.appendChild(makeElement("p", "byline", post.name));
    card.appendChild(makeElement("p", "", post.details));
    return card;
  }

  /* ---------- One function runs both boards ---------- */
  function setUpBoard(options) {
    var form = document.getElementById(options.formId);
    var list = document.getElementById(options.listId);
    if (!form || !list) return;

    /* Only the Workshop has a "Completed" list */
    var doneList = options.doneListId
      ? document.getElementById(options.doneListId)
      : null;

    var status = form.querySelector(".form-status");
    var posts = loadPosts(options.storageKey);

    function addCard(post, isFresh) {
      var card = options.buildCard(post);
      if (isFresh) card.classList.add("is-new");

      var actions = makeElement("div", "card-actions");

      /* Mark as done (or reopen) moves the card between the two lists */
      if (doneList) {
        var toggle = makeElement(
          "button",
          "card-toggle",
          post.done ? "Reopen" : "Mark as done"
        );
        toggle.type = "button";
        toggle.addEventListener("click", function () {
          post.done = !post.done;
          savePosts(options.storageKey, posts);
          card.remove();
          addCard(post, true);
        });
        actions.appendChild(toggle);
      }

      /* Neighbors can take their own post back down */
      var remove = makeElement("button", "card-remove", "Remove my post");
      remove.type = "button";
      remove.addEventListener("click", function () {
        posts = posts.filter(function (item) {
          return item.id !== post.id;
        });
        savePosts(options.storageKey, posts);
        card.remove();
      });
      actions.appendChild(remove);

      card.appendChild(actions);

      var target = post.done && doneList ? doneList : list;
      target.prepend(card); /* newest on top */
      return card;
    }

    /* Show posts saved from earlier visits (oldest first, so newest ends on top) */
    posts.forEach(function (post) {
      addCard(post, false);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = new FormData(form);
      var post = options.readForm(data);
      post.id = Date.now();
      post.done = false;

      posts.push(post);
      savePosts(options.storageKey, posts);

      var card = addCard(post, true);
      form.reset();

      if (status) status.textContent = options.thanks;
      card.scrollIntoView({ block: "center" });
    });
  }

  /* ---------- The Porch ---------- */
  setUpBoard({
    formId: "porch-form",
    listId: "lantern-list",
    storageKey: "porchlight-porch-posts",
    buildCard: buildPorchCard,
    thanks: "Your lantern is on the porch. Thank you for sharing.",
    readForm: function (data) {
      return {
        name: (data.get("name") || "").trim() || "A neighbor",
        story: (data.get("story") || "").trim()
      };
    }
  });

  /* ---------- The Workshop ---------- */
  setUpBoard({
    formId: "workshop-form",
    listId: "workbench-list",
    doneListId: "done-list",
    storageKey: "porchlight-workshop-posts",
    buildCard: buildWorkshopCard,
    thanks: "Your post is on the workbench. A neighbor will find it soon.",
    readForm: function (data) {
      return {
        name: (data.get("name") || "").trim() || "A neighbor",
        kind: data.get("kind") === "Wanted" ? "Wanted" : "Offering",
        title: (data.get("title") || "").trim(),
        details: (data.get("details") || "").trim()
      };
    }
  });
})();
