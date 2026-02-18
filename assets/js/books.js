(async function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const searchInput = $("#search");
  const chipsWrap = $("#chips");
  const grid = $("#booksGrid");
  const countEl = $("#count");
  const prevBtn = $("#prevPage");
  const nextBtn = $("#nextPage");
  const pageInfo = $("#pageInfo");

  function pageSize(){
    // 4 items per page keeps the grid tidy; adjust only on very wide screens.
    return (window.innerWidth >= 1100) ? 8 : 4;
  }

  function norm(s){ return (s||"").toString().toLowerCase(); }

  const resp = await fetch("/books.json", {cache:"no-store"}).catch(()=>fetch("/ebooks/books.json",{cache:"no-store"}));
  const books = await resp.json();

  // Build filter set (use 'filter' field first, fall back to tags)
  const filters = new Set();
  books.forEach(b => {
    if (b.filter) filters.add(b.filter);
  });

  const state = { q:"", filter:"All", page:1 };

  function makeChip(label){
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", label === state.filter ? "true" : "false");
    btn.addEventListener("click", () => {
      state.filter = label;
      state.page = 1;
      $$(".chip", chipsWrap).forEach(c => c.setAttribute("aria-pressed", c.textContent === label ? "true":"false"));
      render();
    });
    return btn;
  }

  // chips
  chipsWrap.appendChild(makeChip("All"));
  Array.from(filters).sort((a,b)=>a.localeCompare(b)).forEach(f => chipsWrap.appendChild(makeChip(f)));

  function matches(book){
    if (state.filter !== "All" && norm(book.filter) !== norm(state.filter)) return false;
    const hay = [
      book.title, book.short,
      (book.tags||[]).join(" "),
      book.keywords || "",
      book.slug || ""
    ].map(norm).join(" | ");
    const q = norm(state.q).trim();
    if (!q) return true;
    // simple multi-term AND matching
    return q.split(/\s+/).every(term => hay.includes(term));
  }

  function card(book){
    const a = document.createElement("article");
    a.className = "card";
    a.setAttribute("aria-label", book.title);

    const img = document.createElement("img");
    img.className = "cover";
    img.loading = "lazy";
    img.alt = book.title;
    img.src = book.cover;

    const h = document.createElement("h2");
    h.textContent = book.title;

    const p = document.createElement("p");
    p.textContent = book.short;

    const tags = document.createElement("div");
    tags.className = "tags";
    (book.tags||[]).slice(0,4).forEach(t=>{
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      tags.appendChild(s);
    });

    const more = document.createElement("details");
    more.className = "more";
    const sum = document.createElement("summary");
    sum.textContent = "More details";
    const moreText = document.createElement("div");
    moreText.className = "meta";
    moreText.innerHTML = `Read the full description, then check the latest price on Amazon.`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const btnDetail = document.createElement("a");
    btnDetail.className = "button secondary";
    btnDetail.href = `/book/${book.id}/detail.html`;
    btnDetail.textContent = "Full description";
    const btnBuy = document.createElement("a");
    btnBuy.className = "button";
    btnBuy.href = book.buy_url || "#";
    btnBuy.target = "_blank";
    btnBuy.rel = "noopener noreferrer";
    btnBuy.textContent = "View on Amazon";

    actions.appendChild(btnDetail);
    actions.appendChild(btnBuy);

    more.appendChild(sum);
    more.appendChild(moreText);
    more.appendChild(actions);

    a.appendChild(img);
    a.appendChild(h);
    a.appendChild(p);
    a.appendChild(tags);
    a.appendChild(more);

    return a;
  }

  function render(){
    grid.innerHTML = "";
    const filtered = books.filter(matches);

    const ps = pageSize();
    const pages = clampPage(filtered.length);
    const startIdx = (state.page - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    pageItems.forEach(b => grid.appendChild(card(b)));

    countEl.textContent = `${filtered.length} of ${books.length} books`;
    wirePager(filtered.length);
  }

  searchInput.addEventListener("input", (e)=>{ state.q = e.target.value; state.page = 1; render(); });

  function clampPage(total){
    const ps = pageSize();
    const pages = Math.max(1, Math.ceil(total / ps));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    return pages;
  }

  function wirePager(total){
    if (pager) pager.style.display = "flex";
    const pages = clampPage(total);
    const ps = pageSize();
    const start = (state.page - 1) * ps + 1;
    const end = Math.min(total, state.page * ps);

    pageInfo.textContent = `Showing ${total ? start : 0}–${total ? end : 0} of ${total} (page ${state.page}/${pages})`;
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= pages;
  }

  prevBtn.addEventListener("click", ()=>{ state.page -= 1; render(); });
  nextBtn.addEventListener("click", ()=>{ state.page += 1; render(); });

  window.addEventListener("resize", ()=>{ render(); });

  render();
})();