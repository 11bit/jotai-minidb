import { test as base, expect, Page } from "@playwright/test";

class ShowcaseController {
  constructor(public page: Page) {}

  async isLoaded() {
    await expect(this.page.getByText("Jotai-minidb example app")).toBeVisible();
  }

  async populate() {
    await this.page.getByRole("button", { name: "Populate" }).click();
  }

  async clear() {
    await this.page.getByRole("button", { name: "Clear" }).click();
  }

  async getItems() {
    this.page.locator("li");
  }

  async expectItems(itemNames: string[]) {
    const items = this.page.locator("li");
    await expect(items).toHaveCount(itemNames.length);
    expect(await items.allInnerTexts()).toEqual(itemNames);
  }
}

export const test = base.extend<{
  page1: ShowcaseController;
  page2: ShowcaseController;
}>({
  page1: async ({ page }, use) => {
    await page.goto("/");
    await use(new ShowcaseController(page));
  },
  page2: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto("/");
    await use(new ShowcaseController(page));
  },
});
