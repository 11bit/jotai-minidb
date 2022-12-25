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
