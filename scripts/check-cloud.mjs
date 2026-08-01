import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const [manifestText, backend, page, generatedJs, sourceJs, generatedCss, sourceCss] = await Promise.all([
  readFile(resolve(root, "apps-script/appsscript.json"), "utf8"),
  readFile(resolve(root, "apps-script/Code.gs"), "utf8"),
  readFile(resolve(root, "apps-script/Page.html"), "utf8"),
  readFile(resolve(root, "apps-script/JavaScript.html"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8"),
  readFile(resolve(root, "apps-script/Stylesheet.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8")
]);

const manifest = JSON.parse(manifestText);
if (manifest.webapp?.access !== "MYSELF" || manifest.webapp?.executeAs !== "USER_DEPLOYING") throw new Error("Apps Script web app is not owner-only");
if (!manifest.oauthScopes?.includes("https://www.googleapis.com/auth/spreadsheets")) throw new Error("Spreadsheet scope is missing");
new vm.Script(backend, { filename: "Code.gs" });
if (!page.includes("<?!= include('Stylesheet'); ?>") || !page.includes("<?!= include('JavaScript'); ?>")) throw new Error("Apps Script page includes are missing");
if (!generatedJs.includes(sourceJs.trim())) throw new Error("Generated Apps Script JavaScript is stale; run npm run build:gas");
if (!generatedCss.includes(sourceCss.trim())) throw new Error("Generated Apps Script stylesheet is stale; run npm run build:gas");

console.log("Cloud package checks passed");
