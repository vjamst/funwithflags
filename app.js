// ===== Storage helpers =====
const KEY = "fwf_stats_v1";
const loadStats = () => JSON.parse(localStorage.getItem(KEY) || "{}");
const saveStats = (s) => localStorage.setItem(KEY, JSON.stringify(s));
const stats = Object.assign(
  { plays:0, correct:0, attempts:0, bestStreak:0, coins:0 },
  loadStats()
);

// ===== Shortcuts =====
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const gameEl = $("#game");

// UI binds
const coinCountEl = $("#coinCount");
const playsEl = $("#statPlays");
const correctEl = $("#statCorrect");
const accEl = $("#statAcc");
const bestStreakEl = $("#statBestStreak");
const continentSelect = $("#continent");

// ===== Filtered data helpers =====
let currentContinent = "ALL";
function getPool(){
  if(currentContinent === "ALL") return window.COUNTRIES;
  return window.COUNTRIES.filter(c => c.continent === currentContinent);
}
// For MC we need at least 4 unique options. If pool too small, fallback to ALL.
function getSafePool(min=1){
  const p = getPool();
  if(p.length >= min) return p;
  return window.COUNTRIES;
}

// ===== UI =====
function updateUI(){
  coinCountEl.textContent = stats.coins ?? 0;
  playsEl.textContent = stats.plays ?? 0;
  correctEl.textContent = stats.correct ?? 0;
  const acc = (stats.attempts ? Math.round(100*stats.correct/stats.attempts) : 0) + "%";
  accEl.textContent = acc;
  bestStreakEl.textContent = stats.bestStreak ?? 0;
  saveStats(stats);
}
function toast(msg){
  const t = $(".toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1300);
}
updateUI();

// ===== Helpers =====
function pickRandom(arr, n=1){
  const copy = [...arr];
  const out = [];
  while(n-- && copy.length){
    out.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]);
  }
  return out.length===1 ? out[0] : out;
}
function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5); }

function makeFactBox(title, text){
  const box = document.createElement("div");
  box.className = "fact";
  box.innerHTML = `<div class="icon" aria-hidden="true">💡</div>
                   <div><strong>${title}</strong><div>${text}</div></div>`;
  return box;
}

// ===== Modes =====
const Modes = {
  // --- Flipcards: toon vlag na “flip” + fun fact over de vlag ---
  flip(){
    const pool = getSafePool(1);
    stats.plays++; updateUI();
    const item = pickRandom(pool);

    const card = document.createElement("div");
    card.className = "card";

    const flag = document.createElement("div");
    flag.className = "flag";
    flag.textContent = "❓";

    const country = document.createElement("div");
    country.className = "country";
    country.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span class="badge">Flipcard</span><span>${item.code} · ${item.continent || "-"}</span>`;

    const factWrap = document.createElement("div"); // leeg tot flip

    const controls = document.createElement("div");
    controls.className = "controls";
    const revealBtn = document.createElement("button");
    revealBtn.className = "btn";
    revealBtn.textContent = "Toon vlag";
    revealBtn.setAttribute("aria-label", `Toon de vlag van ${item.name}`);

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn secondary";
    nextBtn.textContent = "Volgende";

    controls.append(revealBtn, nextBtn);
    card.append(flag, country, controls, factWrap, meta);
    gameEl.replaceChildren(card);

    let flipped = false;
    revealBtn.onclick = () => {
      if(flipped) return;
      flipped = true;
      flag.textContent = item.flag;
      stats.coins += 1; updateUI();
      toast("+1 Planet Coin 🌍");

      const fact = makeFactBox("Fun fact over de vlag", item.flagFact || "Deze vlag heeft een herkenbaar ontwerp!");
      factWrap.replaceChildren(fact);
    };
    nextBtn.onclick = () => Modes.flip();
  },

  // --- Multiple Choice: kies land bij vlag + fun fact over het land ---
  mc(){
    const pool = getSafePool(4);
    stats.plays++; updateUI();
    const correct = pickRandom(pool);
    const others = pool.filter(c=>c!==correct);
    const needed = 3;
    const distractors = (others.length >= needed)
      ? pickRandom(others, needed)
      : pickRandom(window.COUNTRIES.filter(c=>c!==correct), needed);
    const choices = shuffle([correct, ...distractors]);

    let streak = 0;

    const card = document.createElement("div");
    card.className = "card";

    const flag = document.createElement("div");
    flag.className = "flag";
    flag.textContent = correct.flag;
    flag.setAttribute("aria-label", `Welke vlag is dit?`);

    const options = document.createElement("div");
    options.className = "options";

    const factWrap = document.createElement("div"); // na antwoord

    choices.forEach(opt=>{
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = opt.name;
      btn.setAttribute("aria-label", `Kies ${opt.name}`);
      btn.onclick = () => {
        stats.attempts++;
        $$(".option", options).forEach(b=>b.disabled=true);

        if(opt===correct){
          btn.classList.add("correct");
          stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak);
          const reward = 2; stats.coins += reward; updateUI();
          toast(`Goed! +${reward} 🌍 (streak ${streak})`);

          const fact = makeFactBox("Fun fact over het land", correct.countryFact || "Dit land heeft een boeiende geschiedenis en cultuur.");
          factWrap.replaceChildren(fact);

          setTimeout(()=>Modes.mc(), 900);
        } else {
          btn.classList.add("wrong");
          streak = 0; updateUI();
          const correctBtn = $$(".option", options).find(b=>b.textContent===correct.name);
          if(correctBtn) correctBtn.classList.add("correct");

          const fact = makeFactBox("Wist je dat…", correct.countryFact || "Volgende keer beter! Onthoud dit weetje.");
          factWrap.replaceChildren(fact);

          toast("Mis. Probeer opnieuw!");
          setTimeout(()=>Modes.mc(), 1100);
        }
      };
      options.appendChild(btn);
    });

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span class="badge">Multiple Choice</span><span>${correct.code} · ${correct.continent || "-"}</span>`;

    card.append(flag, options, factWrap, meta);
    gameEl.replaceChildren(card);
  },

  // --- Ouders vs Kids: om de beurt MC, max 10 beurten, punten per team ---
  pk(){
    let maxTurns = 10;
    let turn = 1; // 1..maxTurns
    let teams = [
      { name: "Ouders", points: 0 },
      { name: "Kids", points: 0 }
    ];

    // Setup
    const setup = document.createElement("div");
    setup.className = "setup";
    setup.innerHTML = `
      <div class="row">
        <label>Team 1 naam (Ouders)
          <input id="t1" type="text" value="Ouders" />
        </label>
        <label>Team 2 naam (Kids)
          <input id="t2" type="text" value="Kids" />
        </label>
      </div>
      <div class="row">
        <label>Aantal beurten (max 10)
          <input id="turns" type="number" min="1" max="10" value="10" />
        </label>
      </div>
      <button class="btn" id="startPk">Start duel</button>
    `;
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.appendChild(setup);
    gameEl.replaceChildren(wrap);

    $("#startPk").onclick = () => {
      const n1 = $("#t1").value.trim() || "Ouders";
      const n2 = $("#t2").value.trim() || "Kids";
      const t = Math.max(1, Math.min(10, parseInt($("#turns").value || "10", 10)));
      teams[0].name = n1; teams[1].name = n2; maxTurns = t;
      round();
    };

    function renderHeader(){
      const head = document.createElement("div");
      const sb = document.createElement("div");
      sb.className = "scoreboard";

      const currentIdx = (turn % 2 === 1) ? 0 : 1;

      teams.forEach((tm,i)=>{
        const box = document.createElement("div");
        box.className = "team" + (i===currentIdx ? " active" : "");
        box.innerHTML = `<h3>${tm.name}</h3><div class="points">${tm.points}</div>`;
        sb.appendChild(box);
      });

      const meta = document.createElement("div");
      meta.className = "turnmeta";
      meta.innerHTML = `<span>Beurt <strong>${turn}</strong> / ${maxTurns}</span>
                        <span>Aan zet: <strong>${teams[currentIdx].name}</strong></span>`;

      head.append(sb, meta);
      return head;
    }

    function round(){
      stats.plays++; updateUI();

      const pool = getSafePool(4);
      const currentIdx = (turn % 2 === 1) ? 0 : 1;

      const correct = pickRandom(pool);
      const others = pool.filter(c=>c!==correct);
      const needed = 3;
      const distractors = (others.length >= needed)
        ? pickRandom(others, needed)
        : pickRandom(window.COUNTRIES.filter(c=>c!==correct), needed);
      const choices = shuffle([correct, ...distractors]);

      const card = document.createElement("div");
      card.className = "card";

      const head = renderHeader();

      const flag = document.createElement("div");
      flag.className = "flag";
      flag.textContent = correct.flag;

      const options = document.createElement("div");
      options.className = "options";

      const factWrap = document.createElement("div");

      choices.forEach(opt=>{
        const btn = document.createElement("button");
        btn.className = "option";
        btn.textContent = opt.name;
        btn.onclick = () => {
          stats.attempts++;
          $$(".option", options).forEach(b=>b.disabled=true);

          if(opt===correct){
            btn.classList.add("correct");
            stats.correct++; stats.coins += 2;
            teams[currentIdx].points += 1;
            updateUI();
            toast(`${teams[currentIdx].name}: goed! +1 punt · +2 🌍`);

            const fact = makeFactBox("Fun fact over het land", correct.countryFact || "Leuk weetje!");
            factWrap.replaceChildren(fact);
          } else {
            btn.classList.add("wrong");
            updateUI();
            const correctBtn = $$(".option", options).find(b=>b.textContent===correct.name);
            if(correctBtn) correctBtn.classList.add("correct");
            toast(`${teams[currentIdx].name}: mis!`);
            const fact = makeFactBox("Wist je dat…", correct.countryFact || "Onthoud dit weetje!");
            factWrap.replaceChildren(fact);
          }

          setTimeout(()=>{
            turn++;
            if(turn > maxTurns){
              endMatch();
            } else {
              round();
            }
          }, 1000);
        };
        options.appendChild(btn);
      });

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `<span class="badge">Ouders vs Kids</span><span>${correct.code} · ${correct.continent || "-"}</span>`;

      card.append(head, flag, options, factWrap, meta);
      gameEl.replaceChildren(card);
    }

    function endMatch(){
      let winnerText = "";
      if(teams[0].points > teams[1].points){
        winnerText = `🏆 ${teams[0].name} winnen met ${teams[0].points} – ${teams[1].points}!`;
      } else if(teams[1].points > teams[0].points){
        winnerText = `🏆 ${teams[1].name} winnen met ${teams[1].points} – ${teams[0].points}!`;
      } else {
        winnerText = `🤝 Gelijkspel: ${teams[0].points} – ${teams[1].points}`;
      }

      const card = document.createElement("div");
      card.className = "card";
      const head = document.createElement("div");
      head.className = "turnmeta";
      head.innerHTML = `<span>Ronde afgelopen</span><span>Totaal: ${teams[0].name} ${teams[0].points} – ${teams[1].points} ${teams[1].name}</span>`;

      const win = document.createElement("div");
      win.className = "winner";
      win.textContent = winnerText;

      const controls = document.createElement("div");
      controls.className = "controls";
      const again = document.createElement("button");
      again.className = "btn";
      again.textContent = "Nog een ronde";
      again.onclick = () => Modes.pk();

      const back = document.createElement("button");
      back.className = "btn secondary";
      back.textContent = "Terug naar modi";
      back.onclick = () => $$(".mode-btn")[0].click();

      controls.append(again, back);
      card.append(head, win, controls);
      gameEl.replaceChildren(card);
    }
  }
};

// ===== Mode & filter switching =====
$$(".mode-btn").forEach((btn,i,all)=>{
  btn.addEventListener("click", ()=>{
    const mode = btn.dataset.mode;
    all.forEach(b=>b.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    if(Modes[mode]) Modes[mode]();
  });
});

continentSelect.addEventListener("change", ()=>{
  currentContinent = continentSelect.value;
  // herstart huidige geselecteerde mode na filterwijziging
  const active = $$(".mode-btn").find(b=>b.getAttribute("aria-selected")==="true");
  const mode = active ? active.dataset.mode : "flip";
  if(Modes[mode]) Modes[mode]();
});

// Start default
Modes.flip();
