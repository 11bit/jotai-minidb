import { expect } from "@playwright/test";
import { test } from "../setup.ts";

test("Initialization", async ({ page1, page2 }) => {
  await page1.isLoaded();
  await page2.isLoaded();
});

test("Import", async ({ page2, page1 }) => {
  const expectedItems = Array.from({ length: 10 }).map(
    (_, i) => `item ${i + 1}`
  );
  await page2.populate();

  await page1.expectItems(expectedItems);
  await page2.expectItems(expectedItems);
});

test("Clear", async ({ page1, page2 }) => {
  await page1.populate();
  await page1.clear();

  await page1.expectItems([]);
  await page2.expectItems([]);
});

test("Migration handler", async ({ page1, context }) => {
  await page1.populate();
  const pageWithMigration = await context.newPage();
  await pageWithMigration.goto("/?version=2");

  await expect(
    pageWithMigration.getByText("Item 1(migrated to v1)(migrated to v2)")
  ).toBeVisible();
  await page1.isMigrated();
});

test("Migration missmatch error", async ({ page1, context }) => {
  await page1.populate();
  await page1.page.goto("/?version=1");

  const oldVersionPage = await context.newPage();
  await oldVersionPage.goto("/");
  await expect(
    oldVersionPage.getByText("Client version is too old")
  ).toBeVisible();
});
