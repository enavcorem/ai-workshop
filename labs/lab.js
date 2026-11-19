// פאנל "🔧 פריצה" שמשותף לשלושת המשחקים הנתקעים.
// כל משחק מגדיר לפני הקובץ הזה: var LAB = { sliders: [{ key, label, min, max, step }] }
// ואת המספרים עצמם ב-var CFG = { ... } בתוך הקוד של המשחק.
// המשחק קורא ל-labStuck() כשהוא נתקע, ואז מופיע באנר.
// "העתק לגימני" מעתיק את קוד המשחק עם המספרים החדשים, בלי הפאנל (כל מה שבין LAB:START ל-LAB:END נמחק).
(function(){
  var GUARD = "חשוב: אל תמחק ואל תשנה שום דבר שכבר עובד במשחק. תחזיר את קובץ ה-HTML המלא והמעודכן, בלי הסברים ארוכים.";
  var broken = {};
  LAB.sliders.forEach(function(s){ broken[s.key] = CFG[s.key]; });

  var css = document.createElement("style");
  css.textContent =
    "#labBtn,#labBanner,#labPanel{font-family:system-ui,'Segoe UI',Arial,sans-serif;direction:rtl;z-index:50}" +
    "#labBtn{position:fixed;top:10px;left:10px;background:#111827;color:#fff;border:2px solid #fbbf24;border-radius:999px;padding:8px 14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}" +
    "#labBanner{position:fixed;top:58px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#111827;border-radius:14px;padding:10px 16px;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer;display:none;animation:labPulse 1s ease-in-out infinite alternate;max-width:calc(100vw - 32px);text-align:center}" +
    "@keyframes labPulse{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.06)}}" +
    "#labPanel{position:fixed;left:10px;top:58px;width:300px;max-width:calc(100vw - 20px);max-height:calc(100vh - 70px);overflow:auto;background:rgba(17,24,39,.96);color:#f9fafb;border:2px solid #fbbf24;border-radius:16px;padding:12px 14px;display:none;box-shadow:0 10px 30px rgba(0,0,0,.5)}" +
    "#labPanel h3{margin:0 0 4px;font-size:17px;color:#fbbf24}" +
    "#labPanel p{margin:0 0 10px;font-size:13px;line-height:1.5;color:#d1d5db}" +
    "#labPanel .ls{margin:10px 0}" +
    "#labPanel label{display:block;font-size:14px;font-weight:700;margin-bottom:2px}" +
    "#labPanel code{direction:ltr;display:inline-block;background:#000;color:#4ade80;border-radius:6px;padding:1px 6px;font-size:13px;font-family:Consolas,monospace}" +
    "#labPanel input[type=range]{width:100%;accent-color:#fbbf24}" +
    "#labPanel .lb{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}" +
    "#labPanel button{border:0;border-radius:10px;padding:9px 12px;font-size:14px;font-weight:700;cursor:pointer}" +
    "#labPanel .main{background:#fbbf24;color:#111827}#labPanel .ghost{background:#374151;color:#fff}" +
    "#labMsg{font-size:13px;color:#4ade80;margin-top:8px;min-height:1em}" +
    "@media (max-width:600px){#labPanel{top:auto;bottom:0;left:0;right:0;width:auto;max-width:none;max-height:55vh;border-radius:16px 16px 0 0}}";
  document.head.appendChild(css);

  var btn = el("button", "labBtn", "🔧 פריצה");
  var banner = el("div", "labBanner", "🔧 משהו פה שבור. פתחו את הפריצה ותקנו!");
  var panel = el("div", "labPanel",
    "<h3>🔧 פריצה למשחק</h3><p>המספרים האלה כתובים בתוך הקוד של המשחק. הזיזו אותם תוך כדי משחק, ותראו מה משתנה.</p>" +
    LAB.sliders.map(function(s){
      return '<div class="ls"><label>' + s.label + ' <code id="lv-' + s.key + '"></code></label>' +
        '<input type="range" data-k="' + s.key + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + CFG[s.key] + '"></div>';
    }).join("") +
    '<div class="lb"><button type="button" class="main" id="labCopy">📋 העתק לגימני</button><button type="button" class="ghost" id="labReset">↩️ חזרה לשבור</button><button type="button" class="ghost" id="labClose">✕ סגור</button></div>' +
    '<div id="labMsg"></div>');
  [btn, banner, panel].forEach(function(x){ document.body.appendChild(x); });

  // שהחצים והרווח בסליידר לא יזיזו את הדמות במשחק
  panel.addEventListener("keydown", function(e){ e.stopPropagation(); });
  panel.addEventListener("keyup", function(e){ e.stopPropagation(); });

  function show(){ CFGtoUI(); panel.style.display = "block"; banner.style.display = "none"; }
  btn.onclick = function(){ panel.style.display === "block" ? panel.style.display = "none" : show(); };
  banner.onclick = show;
  document.getElementById("labClose").onclick = function(){ panel.style.display = "none"; };
  document.getElementById("labReset").onclick = function(){ Object.keys(broken).forEach(function(k){ CFG[k] = broken[k]; }); CFGtoUI(); msg("חזרנו למספרים השבורים."); };
  panel.addEventListener("input", function(e){
    var k = e.target.dataset && e.target.dataset.k; if(!k) return;
    CFG[k] = +e.target.value; document.getElementById("lv-" + k).textContent = k + " = " + CFG[k];
  });

  function CFGtoUI(){
    LAB.sliders.forEach(function(s){
      panel.querySelector('[data-k="' + s.key + '"]').value = CFG[s.key];
      document.getElementById("lv-" + s.key).textContent = s.key + " = " + CFG[s.key];
    });
  }

  var shown = false;
  window.labStuck = function(){ if(shown || panel.style.display === "block") return; shown = true; banner.style.display = "block"; };

  // העתקה: קוד נקי, עם המספרים החדשים בתוך CFG
  document.getElementById("labCopy").onclick = function(){
    fetch(location.href).then(function(r){ return r.text(); }).then(function(src){
      src = src.replace(/<!-- LAB:START -->[\s\S]*?<!-- LAB:END -->\s*/g, "");
      src = src.replace(/var CFG = \{[\s\S]*?\};/, function(block){
        Object.keys(CFG).forEach(function(k){ block = block.replace(new RegExp("(\\b" + k + "\\s*:\\s*)-?[\\d.]+"), "$1" + CFG[k]); });
        return block;
      });
      var prompt = "זה הקוד של משחק HTML שעובד. כבר תיקנתי בו את המספרים בתוך CFG, אל תשנה אותם.\n" +
        "עכשיו אני רוצה: [מה להוסיף או לשנות. למשל: דמות אחרת, צליל כשמנצחים, שלב שני]\n\n" + GUARD + "\n\n" + src;
      return copy(prompt);
    }).then(function(){ msg("✓ הועתק! הדביקו בגימני והשלימו את מה שבסוגריים [ ]."); })
      .catch(function(){ msg("ההעתקה לא הצליחה. פתחו את המשחק מהאתר ונסו שוב."); });
  };

  function copy(t){
    if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    var ok = document.execCommand("copy"); ta.remove(); return ok ? Promise.resolve() : Promise.reject();
  }
  function msg(t){ var m = document.getElementById("labMsg"); m.textContent = t; }
  function el(tag, id, html){ var x = document.createElement(tag); x.id = id; x.innerHTML = html; if(tag === "button") x.type = "button"; return x; }
})();
