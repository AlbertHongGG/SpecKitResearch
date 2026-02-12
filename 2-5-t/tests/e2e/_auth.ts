import { expect, type Page } from "@playwright/test";

import { readSeed } from "./_seed";

async function login(page: Page, email: string, password: string) {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");

  await page.goto(`/login`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "登入" })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);

  const loginResponsePromise = page.waitForResponse((r) => {
    return r.url().includes("/api/auth/login") && r.request().method() === "POST";
  });

  await page.getByRole("button", { name: "登入" }).click();

  const loginRes = await loginResponsePromise;
  expect(loginRes.ok()).toBeTruthy();

  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((c) => c.name === "session" || c.name === "__Host-session");
    })
    .toBeTruthy();
}

export async function loginAsSeedUser(page: Page) {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");
  await login(page, seed.credentials.userEmail, seed.credentials.password);
}

export async function loginAsSeedMod(page: Page) {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");
  await login(page, seed.credentials.modEmail, seed.credentials.password);
}

export async function loginAsSeedAdmin(page: Page) {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");
  await login(page, seed.credentials.adminEmail, seed.credentials.password);
}
