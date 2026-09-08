/* Carga el panel YA autenticado (cookie puesta antes de navegar) */
import { chromium } from "playwright";

const B = process.env.BASE_URL || "https://3000-i60oa4soybzioe2205wvb.e2b.app";
const CLAVE = process.env.CLAVE || "nocta-demo-2026";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0,150)));

  // 1) login via fetch dentro de la propia página para setear la cookie httpOnly
  await page.goto(`${B}/agenda`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(async (clave) => {
    await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
  }, CLAVE);
  console.log("login hecho (cookie puesta en el contexto)");

  await page.goto(`${B}/panel`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes("…"),
    { timeout: 30000 }
  ).catch(()=>{});
  await page.waitForTimeout(2000);
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 250));
  console.log("PANTALLA AUTENTICADO:", txt.replace(/\n/g, " | "));
  console.log("ERRORES:", errs.length ? JSON.stringify(errs) : "NINGUNO");
  await page.screenshot({ path: "shot-authed.png", fullPage: true });
  await browser.close();
}
main().catch((e) => { console.error("FALLO:", e); process.exit(1); });
