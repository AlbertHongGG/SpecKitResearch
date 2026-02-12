import { test, expect } from "@playwright/test";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getCsrfToken(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/csrf");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { token: string };
  expect(typeof json.token).toBe("string");
  return json.token;
}

test("US2 reactions: reply + like/favorite idempotent", async ({ page }) => {
  const email = `${uniq("u")}@example.com`;
  const password = "password-1234";

  // Register (auto login)
  await page.goto("/register?returnTo=/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "註冊" }).click();
  await expect(page.getByRole("link", { name: "發文" })).toBeVisible();

  // Create published thread
  await page.goto("/threads/new");
  await page.getByLabel("看板").selectOption({ label: "General" });
  await page.getByLabel("標題").fill("US2 已發布主題");
  await page.getByLabel("內容").fill("這是一篇已發布內容（E2E）。");
  await page.getByRole("button", { name: "發布" }).click();

  await expect(page.getByText("狀態：published")).toBeVisible();
  const threadId = new URL(page.url()).pathname.split("/").pop();
  expect(threadId).toBeTruthy();

  // Reply
  await page.getByPlaceholder("輸入回覆內容").fill("第一則回覆（E2E）。");
  await page.getByRole("button", { name: "送出" }).click();
  await expect(page.getByText("第一則回覆（E2E）。")).toBeVisible();

  // Idempotent API calls: like twice
  const csrf = await getCsrfToken(page);
  const headers = { "x-csrf-token": csrf, origin: "http://localhost:3105" };

  const like1 = await page.request.post("/api/likes", {
    data: { targetType: "thread", targetId: threadId, action: "like" },
    headers,
  });
  expect(like1.ok()).toBeTruthy();

  const like2 = await page.request.post("/api/likes", {
    data: { targetType: "thread", targetId: threadId, action: "like" },
    headers,
  });
  expect(like2.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "取消讚" })).toBeVisible();

  const unlike1 = await page.request.post("/api/likes", {
    data: { targetType: "thread", targetId: threadId, action: "unlike" },
    headers,
  });
  expect(unlike1.ok()).toBeTruthy();

  const unlike2 = await page.request.post("/api/likes", {
    data: { targetType: "thread", targetId: threadId, action: "unlike" },
    headers,
  });
  expect(unlike2.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "讚" })).toBeVisible();

  // Favorite twice
  const fav1 = await page.request.post("/api/favorites", {
    data: { threadId, action: "favorite" },
    headers,
  });
  expect(fav1.ok()).toBeTruthy();

  const fav2 = await page.request.post("/api/favorites", {
    data: { threadId, action: "favorite" },
    headers,
  });
  expect(fav2.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "取消收藏" })).toBeVisible();

  const unfav1 = await page.request.post("/api/favorites", {
    data: { threadId, action: "unfavorite" },
    headers,
  });
  expect(unfav1.ok()).toBeTruthy();

  const unfav2 = await page.request.post("/api/favorites", {
    data: { threadId, action: "unfavorite" },
    headers,
  });
  expect(unfav2.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "收藏" })).toBeVisible();
});
