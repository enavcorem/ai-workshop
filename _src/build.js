// Single source of truth build script.
// Edit content.js, then run: node site/_src/build.js
// Regenerates: ../teacher.html (content block only) + ../u#-track.html (10 files, fully).
// Does NOT touch ../index.html (it has no dependency on unit content).

const fs = require("fs");
const path = require("path");

const { P10_20_10, UNITS } = require("./content.js");

const SITE_DIR = path.join(__dirname, "..");
const TRACK_LABEL = { hativa: "חטיבה", tichon: "תיכון" };

// After deploying site/_src/apps-script.gs.txt as a Google Apps Script Web App,
// paste the resulting URL here and rerun `node site/_src/build.js`.
const TEACHER_ENDPOINT = "";

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function escAttr(s){
  return esc(s).replace(/"/g,"&quot;");
}
function renderPromptHtml(s){
  return esc(s).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>');
}

/* ============================================================
   PART 1 — splice fresh content into teacher.html
   ============================================================ */
function updateTeacherApp(){
  const filePath = path.join(SITE_DIR, "teacher.html");
  const html = fs.readFileSync(filePath, "utf8");

  const START_MARK = "/* ============ CONTENT ============ */";
  const END_MARK = "/* ============ STATE ============ */";
  const startIdx = html.indexOf(START_MARK);
  const endIdx = html.indexOf(END_MARK);
  if(startIdx === -1 || endIdx === -1){
    throw new Error("teacher.html: content markers not found — did the file structure change? Expected " + START_MARK + " ... " + END_MARK);
  }

  const dataBlock = `${START_MARK}\nconst { P10_20_10, UNITS } = ${JSON.stringify({ P10_20_10, UNITS })};\n\n`;
  const updated = html.slice(0, startIdx) + dataBlock + html.slice(endIdx);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log("updated teacher.html (content block)");
}

/* ============================================================
   PART 2 — regenerate the 10 worksheet pages
   ============================================================ */
const ICON = {
  copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`,
  spark:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  print:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  send:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
};

let fillCounter = 0;
function fillbox(pageId, labelText){
  fillCounter++;
  const fid = pageId + "-f" + fillCounter;
  return `<div class="fillrow">
    <label class="fill-label" for="${fid}">${esc(labelText)}</label>
    <div class="fillbox" id="${fid}" contenteditable="true" data-placeholder="כתבו כאן..."></div>
  </div>`;
}

function promptCardHtml(promptText, label){
  return `<div class="prompt-card">
    <div class="prompt-card-head">
      <span class="prompt-card-label">${ICON.spark} ${label ? escAttr(label) : "להעתיק ל-Gemini"}</span>
      <button type="button" class="copy-btn no-print" data-copy="${escAttr(encodeURIComponent(promptText))}">${ICON.copy}<span>העתקה</span></button>
    </div>
    <div class="prompt-text">${renderPromptHtml(promptText)}</div>
  </div>`;
}

function stepHtml(pageId, step, i){
  let html = `<div class="step">
    <div class="step-head">
      <span class="step-num">${i+1}</span>
      <span class="step-title">${esc(step.title)}</span>
      <span class="step-dur">${esc(step.duration)}</span>
    </div>
    <div class="step-body">`;
  if(step.intro) html += `<div class="step-intro">${esc(step.intro)}</div>`;
  if(step.promptOptions){
    html += `<div class="prompt-options">` + step.promptOptions.map(o=>promptCardHtml(o.text, o.label)).join("") + `</div>`;
  } else if(step.prompt){
    html += promptCardHtml(step.prompt);
  }
  if(step.questions && step.questions.length){
    html += `<div class="fillgroup">` + step.questions.map(q => fillbox(pageId, q)).join("") + `</div>`;
  }
  html += `</div></div>`;
  return html;
}

function trackContentHtml(pageId, t){
  let html = "";
  if(t.background) html += `<div class="bg-note">${esc(t.background)}</div>`;
  html += `<div class="steps">` + t.steps.map((s,i)=>stepHtml(pageId, s, i)).join("") + `</div>`;
  return html;
}

function page(opts){
  const { fileId, trackKey, title, num, totalNote, subtitle, goal, equipment, bodyHtml } = opts;
  const trackLabel = TRACK_LABEL[trackKey];
  const trackClass = trackKey;
  const favicon = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>`)}">`;
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${favicon}
<title>${escAttr(title)} — ${escAttr(trackLabel)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700;800&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F3F5F8; --surface:#FFFFFF; --surface-2:#EAEEF4; --surface-3:#E1E7EF; --border:#D7DEE8;
    --ink:#1C2430; --ink-soft:#5A6373; --ink-faint:#8B93A3;
    --accent:#DD8A2E; --accent-ink:#8A5613; --accent-soft:#FBE9D2;
    --hativa:#D9584B; --hativa-soft:#FBE3DF; --tichon:#2A8A8A; --tichon-soft:#DFF1F1;
    --good:#2F8F5B;
    --shadow: 0 1px 2px rgba(28,36,48,.06), 0 8px 24px -12px rgba(28,36,48,.18);
    --font-display:'Rubik', system-ui, sans-serif; --font-body:'Heebo', system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --bg:#10141C; --surface:#171D27; --surface-2:#1E2531; --surface-3:#262F3D; --border:#2C3648;
      --ink:#EAEDF3; --ink-soft:#A7B0C0; --ink-faint:#6E7789;
      --accent:#F0A94D; --accent-ink:#F5C182; --accent-soft:#3A2C15;
      --hativa:#E8836B; --hativa-soft:#3A2320; --tichon:#4FB8B8; --tichon-soft:#1B3333;
      --good:#4CC188;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 28px -14px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="dark"]{
    --bg:#10141C; --surface:#171D27; --surface-2:#1E2531; --surface-3:#262F3D; --border:#2C3648;
    --ink:#EAEDF3; --ink-soft:#A7B0C0; --ink-faint:#6E7789;
    --accent:#F0A94D; --accent-ink:#F5C182; --accent-soft:#3A2C15;
    --hativa:#E8836B; --hativa-soft:#3A2320; --tichon:#4FB8B8; --tichon-soft:#1B3333;
    --good:#4CC188;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 28px -14px rgba(0,0,0,.6);
  }
  *{box-sizing:border-box;}
  body{background:var(--bg); color:var(--ink); font-family:var(--font-body); direction:rtl;}
  h1,h2,h3,.disp{font-family:var(--font-display); text-wrap:balance;}
  .page{max-width:760px; margin:0 auto; padding:34px 26px 90px;}
  .topbar{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:22px;}
  .brandline{display:flex; align-items:center; gap:8px; font-size:11.5px; color:var(--ink-faint); font-weight:600;}
  .brandline .mark{width:20px; height:20px; border-radius:6px; background:linear-gradient(155deg, var(--accent), var(--hativa)); flex:0 0 auto;}
  .track-tag{display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:999px; font-weight:700; font-size:13px;}
  .track-tag.hativa{background:var(--hativa-soft); color:var(--hativa);}
  .track-tag.tichon{background:var(--tichon-soft); color:var(--tichon);}

  .head{border-bottom:1px solid var(--border); padding-bottom:18px; margin-bottom:20px;}
  .eyebrow{font-family:'Rubik',monospace; font-size:12px; color:var(--ink-faint); margin-bottom:8px;}
  h1.title{font-size:25px; font-weight:800; margin:0 0 6px;}
  .subtitle{font-size:14px; color:var(--ink-soft); margin-bottom:10px;}
  .goal{font-size:13px; line-height:1.6; color:var(--ink-soft); max-width:62ch;}
  .equip{margin-top:10px; font-size:12px; color:var(--ink-faint);}

  .student-bar{display:flex; flex-wrap:wrap; gap:14px; margin:18px 0 26px; padding:14px 16px; background:var(--surface-2); border-radius:12px;}
  .student-field{flex:1; min-width:150px; display:flex; flex-direction:column; gap:4px;}
  .student-field label{font-size:11px; font-weight:700; color:var(--ink-faint);}
  .student-field input{border:none; border-bottom:1.5px solid var(--border); background:transparent; padding:4px 2px; font-size:14px; color:var(--ink); font-family:inherit;}
  .student-field input:focus{outline:none; border-color:var(--accent);}

  .session-section{margin-top:8px;}
  .session-head{display:flex; align-items:center; gap:10px; margin:30px 0 14px; padding-top:20px; border-top:2px dashed var(--border);}
  .session-section:first-of-type .session-head{border-top:none; padding-top:0; margin-top:8px;}
  .session-num{width:30px; height:30px; border-radius:9px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:14px; flex:0 0 auto;}
  .session-title{font-size:17px; font-weight:700; font-family:var(--font-display);}
  .session-tip{font-size:12px; color:var(--ink-faint); background:var(--surface-2); border-radius:8px; padding:8px 12px; margin-bottom:14px;}

  .bg-note{margin-bottom:14px; font-size:13px; line-height:1.6; color:var(--ink-soft); background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 14px;}

  .steps{display:flex; flex-direction:column; gap:16px;}
  .step{background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 20px; box-shadow:var(--shadow); break-inside:avoid;}
  .step-head{display:flex; align-items:center; gap:10px; margin-bottom:10px;}
  .step-num{width:22px; height:22px; border-radius:7px; background:var(--surface-3); color:var(--ink-soft); display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:700; flex:0 0 auto;}
  .step-title{flex:1; font-size:15px; font-weight:700; font-family:var(--font-display);}
  .step-dur{font-family:monospace; font-size:11px; color:var(--ink-faint); background:var(--surface-2); padding:3px 9px; border-radius:999px;}
  .step-body{display:flex; flex-direction:column; gap:12px;}
  .step-intro{font-size:13.5px; line-height:1.65; color:var(--ink-soft);}

  .prompt-options{display:flex; flex-direction:column; gap:10px;}
  .prompt-card{background:var(--surface-2); border:1px solid var(--border); border-radius:11px; overflow:hidden; break-inside:avoid;}
  .prompt-card-head{display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid var(--border); background:var(--surface-3);}
  .prompt-card-label{display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--ink-faint);}
  .prompt-card-label svg{width:12px; height:12px; color:var(--accent);}
  .copy-btn{display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:var(--ink-soft); background:var(--surface); border:1px solid var(--border); border-radius:7px; padding:5px 10px; cursor:pointer; font-family:inherit;}
  .copy-btn:hover{border-color:var(--accent); color:var(--accent-ink);}
  .copy-btn svg{width:12px; height:12px;}
  .copy-btn.copied{background:#DFF3E7; color:#2F8F5B; border-color:transparent;}
  .prompt-text{padding:13px 14px; font-size:13px; line-height:1.75; white-space:pre-wrap;}
  .prompt-text mark{background:var(--accent-soft); color:var(--accent-ink); border-radius:4px; padding:0 3px; font-weight:600;}

  .fillgroup{display:flex; flex-direction:column; gap:10px;}
  .fillrow{display:flex; flex-direction:column; gap:5px;}
  .fill-label{display:flex; gap:6px; font-size:13px; line-height:1.5; color:var(--ink); font-weight:600;}
  .fill-label::before{content:"✎"; color:var(--accent); flex:0 0 auto;}
  .fillbox{min-height:44px; border:1.5px solid var(--border); border-radius:9px; padding:9px 12px; font-size:13.5px; line-height:1.6; background:var(--surface); color:var(--ink);}
  .fillbox:focus{outline:none; border-color:var(--accent);}
  .fillbox:empty:before{content:attr(data-placeholder); color:var(--ink-faint);}

  .closing{margin-top:24px; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 20px; box-shadow:var(--shadow); break-inside:avoid;}
  .closing h3{font-size:14.5px; margin:0 0 10px; font-family:var(--font-display);}

  .toolbar-float{position:fixed; bottom:20px; left:20px; z-index:30; display:flex; flex-direction:column; align-items:flex-start; gap:6px; max-width:240px;}
  .toolbar-buttons{display:flex; gap:8px;}
  .save-btn, .send-btn{display:flex; align-items:center; gap:8px; border:none; border-radius:999px; padding:12px 18px; font-size:13.5px; font-weight:700; box-shadow:var(--shadow); cursor:pointer; font-family:inherit;}
  .save-btn{background:var(--accent); color:#fff;}
  .send-btn{background:var(--good); color:#fff;}
  .send-btn:disabled{opacity:.6; cursor:default;}
  .save-btn svg, .send-btn svg{width:16px; height:16px;}
  .save-hint{font-size:10.5px; color:var(--ink-faint); background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:5px 9px; line-height:1.5;}
  .send-status{font-size:11px; font-weight:700; padding:0 2px; min-height:14px;}
  .send-status.ok{color:var(--good);}
  .send-status.warn{color:var(--accent-ink);}
  .send-status.err{color:var(--hativa);}

  .no-print{}
  @media print{
    .no-print, .toolbar-float{display:none !important;}
    body{background:#fff;}
    .page{max-width:none; padding:0;}
    .step, .prompt-card, .closing{box-shadow:none;}
    .fillbox{border-color:#999;}
    @page{margin:14mm;}
  }
</style>
</head>
<body>


<div class="page" dir="rtl">
  <div class="topbar">
    <div class="brandline"><span class="mark"></span><span>מסלול ה-AI · תחנה ${num}${totalNote?` · ${totalNote}`:""}</span></div>
    <span class="track-tag ${trackClass}">${trackLabel}</span>
  </div>

  <div class="head">
    <div class="eyebrow">דף עבודה אישי</div>
    <h1 class="title">${esc(title)}</h1>
    <div class="subtitle">${esc(subtitle)}</div>
    <div class="goal">${esc(goal)}</div>
    ${equipment ? `<div class="equip">${esc(equipment)}</div>` : ""}
  </div>

  <div class="student-bar">
    <div class="student-field"><label>שם</label><input type="text" data-persist="name"></div>
    <div class="student-field"><label>תאריך</label><input type="text" data-persist="date"></div>
    <div class="student-field"><label>עבדתי בזוג עם (אם היה)</label><input type="text" data-persist="partner"></div>
  </div>

  ${bodyHtml}

  <div class="closing">
    <h3>מה למדתי בתחנה הזו? (רשות)</h3>
    ${fillbox(fileId, "רפלקציה חופשית")}
  </div>
</div>

<div class="toolbar-float no-print">
  <div class="send-status" id="sendStatus"></div>
  <div class="save-hint">"שלח למורה" שולח ישירות; "שמירה כ-PDF" היא גיבוי אישי (בחלון ההדפסה בחרו "Save as PDF").</div>
  <div class="toolbar-buttons">
    <button type="button" class="send-btn" id="sendBtn">${ICON.send}<span>שלח למורה</span></button>
    <button type="button" class="save-btn" id="saveBtn">${ICON.print}<span>PDF</span></button>
  </div>
</div>

<script>
(function(){
  "use strict";
  var PAGE_KEY = "aiWorksheet." + ${JSON.stringify(fileId)};

  function loadDraft(){
    try{ return JSON.parse(localStorage.getItem(PAGE_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveDraft(d){
    try{ localStorage.setItem(PAGE_KEY, JSON.stringify(d)); }catch(e){}
  }
  var draft = loadDraft();

  document.querySelectorAll(".fillbox").forEach(function(el){
    if(draft[el.id]) el.innerText = draft[el.id];
    el.addEventListener("input", function(){
      draft[el.id] = el.innerText;
      saveDraft(draft);
    });
  });
  document.querySelectorAll(".student-field input").forEach(function(el){
    var key = "field:" + el.dataset.persist;
    if(draft[key]) el.value = draft[key];
    el.addEventListener("input", function(){
      draft[key] = el.value;
      saveDraft(draft);
    });
  });

  // Cross-page identity: the student's name persists across every station on this device
  // (separate from the per-page draft above, which only remembers this one page).
  var IDENTITY_KEY = "aiTrail.identity";
  function loadIdentity(){
    try{ return JSON.parse(localStorage.getItem(IDENTITY_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveIdentity(id){
    try{ localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)); }catch(e){}
  }
  var identity = loadIdentity();
  var nameInput = document.querySelector('.student-field input[data-persist="name"]');
  if(nameInput){
    if(identity.name) nameInput.value = identity.name;
    nameInput.addEventListener("input", function(){
      identity.name = nameInput.value;
      saveIdentity(identity);
    });
  }

  document.querySelectorAll(".copy-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      var text = decodeURIComponent(btn.dataset.copy);
      var done = function(){
        btn.classList.add("copied");
        var label = btn.querySelector("span");
        var prev = label.textContent;
        label.textContent = "הועתק!";
        setTimeout(function(){ btn.classList.remove("copied"); label.textContent = prev; }, 1600);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done, function(){
          var ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try{ document.execCommand("copy"); }catch(e){}
          document.body.removeChild(ta);
          done();
        });
      }
    });
  });

  document.getElementById("saveBtn").addEventListener("click", function(){
    window.print();
  });

  var TEACHER_ENDPOINT = ${JSON.stringify(TEACHER_ENDPOINT)};
  var SUBMITTED_KEY = "aiTrail.submitted";
  function markSubmitted(){
    try{
      var s = JSON.parse(localStorage.getItem(SUBMITTED_KEY)) || {};
      s[${JSON.stringify(fileId)}] = true;
      localStorage.setItem(SUBMITTED_KEY, JSON.stringify(s));
    }catch(e){}
  }
  function collectAnswers(){
    var answers = [];
    document.querySelectorAll(".fillrow").forEach(function(row){
      var label = row.querySelector(".fill-label");
      var box = row.querySelector(".fillbox");
      if(label && box){
        answers.push({ question: label.textContent.trim(), answer: box.innerText.trim() });
      }
    });
    return answers;
  }

  var sendBtn = document.getElementById("sendBtn");
  var sendStatus = document.getElementById("sendStatus");
  sendBtn.addEventListener("click", function(){
    if(!TEACHER_ENDPOINT){
      sendStatus.textContent = "עדיין לא הוגדר יעד שליחה — בינתיים אפשר להשתמש ב\\"שמירה כ-PDF\\".";
      sendStatus.className = "send-status warn";
      return;
    }
    var nameVal = nameInput ? nameInput.value.trim() : "";
    if(!nameVal){
      sendStatus.textContent = "מלאו קודם את השם למעלה.";
      sendStatus.className = "send-status warn";
      if(nameInput) nameInput.focus();
      return;
    }
    var payload = {
      submissionId: Date.now() + "-" + Math.random().toString(36).slice(2,8),
      timestamp: new Date().toISOString(),
      name: nameVal,
      date: (document.querySelector('.student-field input[data-persist="date"]') || {}).value || "",
      partner: (document.querySelector('.student-field input[data-persist="partner"]') || {}).value || "",
      track: ${JSON.stringify(trackKey)},
      pageId: ${JSON.stringify(fileId)},
      pageTitle: ${JSON.stringify(title)},
      answers: collectAnswers()
    };
    sendBtn.disabled = true;
    sendStatus.textContent = "שולח...";
    sendStatus.className = "send-status";
    fetch(TEACHER_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function(){
      markSubmitted();
      sendStatus.textContent = "נשלח למורה!";
      sendStatus.className = "send-status ok";
      sendBtn.disabled = false;
    }).catch(function(){
      sendStatus.textContent = "השליחה נכשלה — בדקו אינטרנט, או השתמשו ב-PDF.";
      sendStatus.className = "send-status err";
      sendBtn.disabled = false;
    });
  });
})();
</script>

</body>
</html>
`;
}

function generateWorksheets(){
  UNITS.forEach(unit => {
    ["hativa","tichon"].forEach(trackKey => {
      const fileId = `${unit.id}-${trackKey}`;
      let bodyHtml = "";
      if(unit.sessions){
        bodyHtml = unit.sessions.map((sess, si) => {
          const t = sess.tracks[trackKey];
          const tip = si > 0 ? `<div class="session-tip">מה שכתבתם למעלה בעמוד הזה עדיין כאן — גללו למעלה כדי להעתיק ממנו במידת הצורך.</div>` : "";
          return `<div class="session-section">
          <div class="session-head"><span class="session-num">${sess.num}</span><span class="session-title">מפגש ${sess.num} · ${esc(sess.title)}</span></div>
          ${tip}
          <div class="track-subtitle-note" style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">${esc(t.subtitle)}</div>
          ${trackContentHtml(fileId + "-s" + sess.num, t)}
        </div>`;
        }).join("");
      } else {
        const t = unit.tracks[trackKey];
        bodyHtml = `<div class="track-subtitle-note" style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">${esc(t.subtitle)}${t.duration?` · ${esc(t.duration)}`:""}</div>` + trackContentHtml(fileId, t);
      }

      const html = page({
        fileId,
        trackKey,
        title: unit.title,
        num: unit.num,
        totalNote: unit.isCapstone ? "3 מפגשים" : null,
        subtitle: unit.sub,
        goal: unit.goal,
        equipment: unit.equipment,
        bodyHtml,
      });

      const outPath = path.join(SITE_DIR, `${unit.id}-${trackKey}.html`);
      fs.writeFileSync(outPath, html, "utf8");
      console.log("wrote", path.basename(outPath));
    });
  });
}

updateTeacherApp();
generateWorksheets();
console.log("\nBUILD DONE.");
