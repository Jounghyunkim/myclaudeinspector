import { expect, test } from "@playwright/test";

test("첫 화면이 열리고 경로 입력 안내가 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("My Claude Inspector");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("My Claude Inspector");
  await expect(page.getByLabel("프로젝트 경로")).toBeVisible();
});
