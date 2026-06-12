import { test, expect } from "@playwright/test";

// Uses known seed data: product "dresses----10" with variants L/אדום (stock > 0)
test("select size + color then add to cart", async ({ page }) => {
  await page.goto("/products/dresses----10");
  await expect(page).toHaveURL(/dresses----10/);

  // Click the size "L" button
  const sizeBtn = page.getByRole("button", { name: "L", exact: true });
  await sizeBtn.click();
  await expect(sizeBtn).toHaveClass(/bg-gray-900/);

  // Click the color "אדום" button
  const colorBtn = page.getByRole("button", { name: "אדום", exact: true });
  await colorBtn.click();
  await expect(colorBtn).toHaveClass(/bg-gray-900/);

  // "הוסף לעגלה" button should now be enabled
  const addToCartBtn = page.getByRole("button", { name: "הוסף לעגלה" });
  await expect(addToCartBtn).toBeEnabled();

  // Add to cart and verify toast
  await addToCartBtn.click();
  await expect(page.getByText("נוסף לעגלה!")).toBeVisible({ timeout: 5000 });

  // Cart should not be empty
  await page.goto("/cart");
  await expect(page.getByText("עגלה ריקה")).not.toBeVisible();
  // Cart badge in navbar should show a number
  await expect(page.locator("header span").filter({ hasText: /^\d+$/ })).toBeVisible();
});
