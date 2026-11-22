// Encrypts private/itinerary.json with the tour passcode and writes index.html + sw.js.
// Usage:  TOUR_PIN=123456 TOUR_LINK_KEY=<code from the band link, after #k=> node build.mjs
// Leave TOUR_LINK_KEY out to generate a new link code (old links then stop working).
// The readable itinerary (private/) is never committed; only the encrypted index.html is.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto, createHash } from "node:crypto";

const pin = (process.env.TOUR_PIN || "").trim();
if (pin.length < 4) { console.error("Set TOUR_PIN (4+ characters)."); process.exit(1); }
let link = (process.env.TOUR_LINK_KEY || "").trim();
if (link && !/^[A-Za-z0-9_-]{16,}$/.test(link)) { console.error("TOUR_LINK_KEY looks wrong – use the part after #k= in the band link."); process.exit(1); }
const newLink = !link;
if (newLink) link = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
const pass = pin.normalize("NFC") + ":" + link;
const ITER = 600000;
const data = readFileSync(new URL("./private/itinerary.json", import.meta.url), "utf8");
JSON.parse(data); // fail fast on bad JSON

// Salt is derived from the secret link code so the key stays the same across updates
// (phones stay signed in after an itinerary update). The IV is fresh every build.
const salt = new Uint8Array(createHash("sha256").update("cbb-salt:" + link).digest()).slice(0, 16);
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(JSON.parse(data)))));
const b64 = u => Buffer.from(u).toString("base64");
const payload = { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct), built: new Date().toISOString() };

const tpl = readFileSync(new URL("./src/template.html", import.meta.url), "utf8");
if (!tpl.includes("/*__PAYLOAD__*/null")) throw new Error("payload marker missing in template");
const html = tpl.replace("/*__PAYLOAD__*/null", JSON.stringify(payload));
writeFileSync(new URL("./index.html", import.meta.url), html);

const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
const sw = readFileSync(new URL("./src/sw.template.js", import.meta.url), "utf8").replace("__VERSION__", version);
writeFileSync(new URL("./sw.js", import.meta.url), sw);
console.log(newLink ? `NEW link code: ${link}\nBand link: https://<user>.github.io/<repo>/#k=${link}` : "Using existing link code.");
console.log(`Built index.html (${(html.length / 1024).toFixed(0)} KB), cache version ${version}`);
