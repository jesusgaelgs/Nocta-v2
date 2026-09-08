/* Prueba tu producción exacta con navegador real: login y captura de errores */
import { chromium } from "playwright";

const URL = process.env.URL || "https://nocta.tecnosofia.xyz/panel";
const CLAVE = process.env.CLAVE || "valentina-2026";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const erroresJs = [];
  page.on("console", (m) => { if (m.type() === "error") erroresJs.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => erroresJs.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => erroresJs.push(`request failed: ${r.url().slice(0,80)}`));

  const resp = await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  console.log("HTTP:", resp.status(), "URL final:", page.url());
  // dar margen amplio para el cold start (el login o "…")
  await page.waitForFunction(
    () => !document.body.innerText.includes("…") || document.body.innerText.includes("Entrar"),
    { timeout: 40000 }
  );
  await page.waitForTimeout(1000);

  // Pantalla de login
  const titulo = await page.evaluate(() => document.body.innerText.slice(0, 120));
  console.log("TEXTO EN PANTALLA:", titulo.replace(/\n/g, " | "));

  // Escribir clave y entrar
  await page.fill('input[type="password"]', CLAVE);
  await page.click('button:has-text("Entrar")');
  await page.waitForTimeout(4000);

  const despues = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log("DESPUÉS DE LOGIN:", despues.replace(/\n/g, " | "));

  console.log("ERRORES JS:", erroresJs.length ? JSON.stringify(erroresJs, null, 2) : "NINGUNO");
  await page.screenshot({ path: "shot-prod-panel.png", fullPage: true });
  await browser.close();
}
main().catch((e) => { console.error("FALLÓ:", e); process.exit(1); });
