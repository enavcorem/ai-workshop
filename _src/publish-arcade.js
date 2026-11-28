// מפרסם משחקים מהארקייד כדפים סטטיים שגוגל יכול למצוא.
// הרצה (מתיקיית site): node _src/publish-arcade.js
//
// מה הוא עושה:
// 1. קורא מהגיליון (דרך ?op=public) את המשחקים המאושרים.
// 2. לכל משחק שרשום ב-arcade-google.json: מושך את ה-HTML (?op=game) וכותב arcade/<כתובת>/index.html
//    עם כותרת, תיאור, תגי שיתוף ופס קרדיט (כינוי בלבד).
// 3. בונה מחדש את arcade/index.html (רשימה) ואת sitemap.xml.
// 4. מוחק דפי משחקים שהוסרו מהרשימה.
// אחרי ההרצה: לעבור על הטקסטים שהודפסו (בלי שמות אמיתיים!), ואז commit + push.

const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..");
const ARCADE = path.join(SITE, "arcade");
const BASE = "https://enavcorem.github.io/ai-workshop/";
const MARK = "<!-- publish-arcade -->"; // מסמן דף שהסקריפט יצר, רק אותו מותר למחוק

const studioData = fs.readFileSync(path.join(SITE, "studio-data.js"), "utf8");
const ENDPOINT = (studioData.match(/endpoint:\s*"([^"]+)"/) || [])[1];
if (!ENDPOINT) { console.error("לא מצאתי endpoint ב-studio-data.js"); process.exit(1); }

const list = JSON.parse(fs.readFileSync(path.join(__dirname, "arcade-google.json"), "utf8"));
const entries = Object.keys(list).filter(k => !k.startsWith("_")).map(slug => Object.assign({ slug }, list[slug]));

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = new Date().toISOString().slice(0, 10);

async function getJson(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.json();
}

// כותב קובץ רק אם התוכן השתנה (כך התאריך ב-sitemap נשאר נכון)
function writeIfChanged(file, content) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (old === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return true;
}

// הטקסטים העבריים שמופיעים במשחק, כדי לבדוק שאין שמות אמיתיים
function visibleTexts(html) {
  const h = html.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [...new Set((h.match(/[֐-׿][֐-׿0-9 '"\-!?.,:]{1,60}/g) || []).map(s => s.trim()))];
}

function headTags(g, slug, desc) {
  const url = BASE + "arcade/" + slug + "/";
  const title = g.title + " – משחק של " + g.by + " | סטודיו המשחקים";
  const ld = { "@context": "https://schema.org", "@type": "VideoGame", name: g.title, url: url, description: desc,
    inLanguage: "he", genre: g.genre || undefined, gamePlatform: "Web browser", author: { "@type": "Person", name: g.by } };
  return "\n" + MARK + "\n<title>" + esc(title) + "</title>"
    + '\n<meta name="description" content="' + esc(desc) + '">'
    + '\n<link rel="canonical" href="' + url + '">'
    + '\n<meta property="og:type" content="website">'
    + '\n<meta property="og:title" content="' + esc(title) + '">'
    + '\n<meta property="og:description" content="' + esc(desc) + '">'
    + '\n<meta property="og:url" content="' + url + '">'
    + '\n<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>\n";
}

// פס קרדיט קטן. כינוי בלבד. אחרי 6 שניות או בלחיצה הראשונה על מקש הוא מתקפל ללשונית קטנה בצד, כדי שלא יסתיר את המשחק
function creditBar(g) {
  return '\n<style>#sa-credit{position:fixed;bottom:8px;left:8px;z-index:2147483647;display:flex;align-items:center;gap:8px;'
    + 'max-width:calc(100vw - 16px);padding:5px 12px;border-radius:999px;background:rgba(12,10,32,.85);color:#fff;'
    + 'font:600 12px/1.3 system-ui,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:auto;-webkit-user-select:auto;cursor:default}'
    + '#sa-credit a{color:#ffd23f;text-decoration:underline;white-space:nowrap}'
    + '#sa-credit .sa-i{display:none}'
    + '#sa-credit.min{bottom:auto;top:50%;left:0;transform:translateY(-50%);padding:6px 7px;border-radius:0 10px 10px 0;cursor:pointer;opacity:.75}'
    + '#sa-credit.min>*{display:none}#sa-credit.min .sa-i{display:inline}</style>'
    + '<div id="sa-credit" dir="rtl" title="מי בנה את המשחק"><span class="sa-i">🏷️</span>'
    + (g.wip ? "<span>🚧 בבנייה ·</span>" : "")
    + "<span>נבנה ע״י <b>" + esc(g.by) + "</b> בסטודיו המשחקים</span>"
    + '<a href="../">עוד משחקים</a></div>'
    + '<script>(function(){var c=document.getElementById("sa-credit");function m(){c.classList.add("min")}'
    + 'setTimeout(m,6000);addEventListener("keydown",m,{once:true});'
    + 'c.addEventListener("click",function(e){if(c.classList.contains("min")){e.preventDefault();c.classList.remove("min");setTimeout(m,5000)}})})()</script>\n';
}

function gamePage(g, slug, html) {
  const origTitle = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const about = g.proud || origTitle;
  const desc = g.title + (about && about !== g.title ? ": " + about : "") + ". משחק דפדפן שנבנה ע״י " + g.by
    + " בסטודיו המשחקים. משחקים בחינם, בלי התקנה.";
  let out = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, "");
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, m => m + headTags(g, slug, desc))
                                  : headTags(g, slug, desc) + out;
  if (!/<html[^>]*\blang=/i.test(out)) out = out.replace(/<html/i, '<html lang="he" dir="rtl"');
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>(?![\s\S]*<\/body>)/i, creditBar(g) + "</body>") : out + creditBar(g);
  return out;
}

function pausedPage(g, slug) {
  return '<!DOCTYPE html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + headTags(g, slug, g.title + ": המשחק בתיקונים וחוזר בקרוב. משחק של " + g.by + " מסטודיו המשחקים.")
    + "<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14112a;color:#f4f1ff;font-family:system-ui,Arial,sans-serif;text-align:center;padding:16px}"
    + "a{color:#ffd23f}</style>\n</head>\n<body><main><div style=\"font-size:64px\">🛠️</div><h1>" + esc(g.title) + "</h1>"
    + "<p>המשחק בתיקונים וחוזר בקרוב, עם פחות באגים 😉</p><p><a href=\"../\">בינתיים: עוד משחקים מהסטודיו ←</a></p></main></body>\n</html>\n";
}

function arcadeIndex(items) {
  const cards = items.map(it => {
    const g = it.g;
    return '<a class="card" href="' + it.slug + '/"><div class="cover">' + esc(g.emoji || "🎮")
      + (g.wip ? '<span class="wip">🚧 בבנייה</span>' : "") + (it.paused ? '<span class="wip">🛠️ בתיקונים</span>' : "")
      + '</div><div class="body"><h2>' + esc(g.title) + "</h2><div class=\"by\">מאת " + esc(g.by) + "</div>"
      + (g.forWho ? '<div class="who">🎯 ' + esc(g.forWho) + "</div>" : g.genre ? '<div class="who">' + esc(g.genre) + "</div>" : "")
      + '<span class="play">▶ לשחק</span></div></a>';
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${MARK}
<title>הארקייד של סטודיו המשחקים – משחקים שתלמידים בנו</title>
<meta name="description" content="משחקי דפדפן שתלמידי חטיבת הביניים בנו בסטודיו המשחקים, בעזרת AI. משחקים בחינם, בלי התקנה.">
<link rel="canonical" href="${BASE}arcade/">
<meta property="og:title" content="הארקייד של סטודיו המשחקים">
<meta property="og:description" content="משחקי דפדפן שתלמידים בנו בעזרת AI.">
<meta name="theme-color" content="#14112a">
<style>
  /* הארקייד הציבורי: נוצר ע"י _src/publish-arcade.js, לא לערוך ידנית */
  :root{ --bg:#14112a; --surface:#221d45; --border:#3a3370; --text:#f4f1ff; --muted:#b9b2e6; --accent:#ffd23f; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--text); font-family:system-ui,"Segoe UI",Arial,sans-serif; line-height:1.5; }
  header,main,footer{ max-width:960px; margin:0 auto; padding:0 16px; }
  header{ padding-top:32px; padding-bottom:8px; }
  h1{ margin:0 0 6px; font-size:clamp(26px,6vw,38px); }
  header p{ margin:0; color:var(--muted); }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; padding:20px 0 32px; }
  .card{ display:flex; flex-direction:column; background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; color:inherit; text-decoration:none; transition:transform .15s; }
  .card:hover,.card:focus-visible{ transform:translateY(-3px); outline:2px solid var(--accent); outline-offset:2px; }
  .cover{ position:relative; height:120px; display:grid; place-items:center; font-size:56px; background:linear-gradient(135deg,#3fd8ff,#4ee39a); }
  .card:nth-child(2n) .cover{ background:linear-gradient(135deg,#ff5fa2,#a78bfa); }
  .card:nth-child(3n) .cover{ background:linear-gradient(135deg,#ffd23f,#ff9f43); }
  .wip{ position:absolute; top:8px; inset-inline-start:8px; font-size:12px; font-weight:700; background:rgba(0,0,0,.55); color:#fff; padding:2px 8px; border-radius:999px; }
  .body{ padding:12px 14px 14px; display:flex; flex-direction:column; gap:4px; flex:1; }
  h2{ margin:0; font-size:19px; }
  .by,.who{ color:var(--muted); font-size:14px; }
  .play{ margin-top:auto; padding-top:8px; font-weight:800; color:var(--accent); }
  footer{ color:var(--muted); font-size:13px; padding-bottom:32px; }
</style>
</head>
<body>
<header>
  <h1>🕹️ הארקייד של סטודיו המשחקים</h1>
  <p>משחקים שתלמידים בנו בעזרת AI. כל משחק רץ בדפדפן, בחינם ובלי התקנה. משחק עם 🚧 עוד בבנייה, אז יכול להיות שיש בו באגים.</p>
</header>
<main><div class="grid">
${cards}
</div></main>
<footer>היוצרים מופיעים בכינוי בלבד.</footer>
</body>
</html>
`;
}

function sitemap(slugs) {
  const urls = [{ loc: BASE, file: path.join(SITE, "index.html") }, { loc: BASE + "arcade/", file: path.join(ARCADE, "index.html") }]
    .concat(slugs.map(s => ({ loc: BASE + "arcade/" + s + "/", file: path.join(ARCADE, s, "index.html") })));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => "  <url><loc>" + encodeURI(u.loc) + "</loc><lastmod>" + fs.statSync(u.file).mtime.toISOString().slice(0, 10) + "</lastmod></url>").join("\n")
    + "\n</urlset>\n";
}

(async function main() {
  const pub = await getJson(ENDPOINT + "?op=public");
  const games = pub.games || [];
  const done = [], problems = [];

  for (const e of entries) {
    const g = games.find(x => x.key === e.key);
    if (!g) { problems.push("⚠️ " + e.slug + ": לא מצאתי בגיליון משחק מאושר עם key = " + e.key + " (שינו שם? הסטטוס לא 'מאושר'?)"); continue; }
    const file = path.join(ARCADE, e.slug, "index.html");
    let content;
    if (e.paused) content = pausedPage(g, e.slug);
    else {
      const j = await getJson(ENDPOINT + "?op=game&id=" + encodeURIComponent(g.id));
      if (!j.ok || !j.html) { problems.push("⚠️ " + e.slug + ": לא הצלחתי למשוך את קובץ המשחק (id " + g.id + ")"); continue; }
      content = gamePage(g, e.slug, j.html);
      console.log("\n📝 " + g.title + " (" + g.by + ") – טקסטים במשחק. לעבור ולוודא שאין שמות אמיתיים:\n   " + visibleTexts(j.html).join(" | "));
    }
    const changed = writeIfChanged(file, content);
    done.push({ slug: e.slug, g, paused: !!e.paused, changed });
  }

  // מחיקת דפים שהוסרו מהרשימה (רק דפים שהסקריפט יצר)
  if (fs.existsSync(ARCADE)) for (const d of fs.readdirSync(ARCADE)) {
    const f = path.join(ARCADE, d, "index.html");
    if (entries.some(e => e.slug === d) || !fs.existsSync(f) || !fs.readFileSync(f, "utf8").includes(MARK)) continue;
    fs.rmSync(path.join(ARCADE, d), { recursive: true });
    console.log("🗑️ נמחק: arcade/" + d + "/ (כבר לא ברשימה. גוגל יוריד אותו לבד)");
  }

  // משחק שנכשל בהרצה הזו, אבל הדף שלו כבר קיים, נשאר ברשימה
  const kept = entries.filter(e => !done.some(d => d.slug === e.slug) && fs.existsSync(path.join(ARCADE, e.slug, "index.html")));
  writeIfChanged(path.join(ARCADE, "index.html"), arcadeIndex(done));
  writeIfChanged(path.join(SITE, "sitemap.xml"), sitemap(done.map(d => d.slug).concat(kept.map(e => e.slug))));

  console.log("\n✅ דפים:");
  done.forEach(d => console.log("   " + (d.changed ? "עודכן " : "ללא שינוי ") + BASE + "arcade/" + d.slug + "/" + (d.paused ? "  (בתיקונים)" : "")));
  problems.forEach(p => console.log(p));
  console.log("\nהלאה: לעבור על הטקסטים למעלה → git add arcade sitemap.xml → commit → push → ב-Search Console: בדיקת URL → בקשת הוספה לאינדקס.");
})().catch(err => { console.error("❌ " + err.message); process.exit(1); });
