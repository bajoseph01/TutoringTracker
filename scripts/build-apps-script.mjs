import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "apps-script");
await mkdir(output, { recursive: true });

const [pageSource, styles, javascript] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8")
]);

const page = pageSource
  .replace("<head>", '<head>\n  <base target="_top">')
  .replace(/\s*<link rel="stylesheet" href="styles\.css">/, "\n  <?!= include('Stylesheet'); ?>")
  .replace(/\s*<script src="app\.js"><\/script>/, "\n  <?!= include('JavaScript'); ?>");

await Promise.all([
  writeFile(resolve(output, "Page.html"), page, "utf8"),
  writeFile(resolve(output, "Stylesheet.html"), `<style>\n${styles}\n</style>\n`, "utf8"),
  writeFile(resolve(output, "JavaScript.html"), `<script>\n${javascript.replace(/<\/script>/gi, "<\\/script>")}\n</script>\n`, "utf8")
]);

console.log("Built Apps Script HTML files in apps-script/");
