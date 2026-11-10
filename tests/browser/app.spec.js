import { test, expect } from "@playwright/test";
test("полный локальный сценарий и сохранение", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Всё под контролем." }),
  ).toBeVisible();
  await page.goto("/#clients");
  await page
    .getByRole("button", { name: "Добавить клиента", exact: true })
    .first()
    .click();
  await page.locator("[name=name]").fill("Тестовый клиент");
  await page.locator("[name=email]").fill("test@example.com");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.goto("/#orders");
  await page
    .getByRole("button", { name: "Новый заказ", exact: false })
    .first()
    .click();
  await page.locator("[name=title]").fill("Тестовый проект");
  await page
    .locator("[name=client_id]")
    .selectOption({ label: "Тестовый клиент" });
  await page.locator("[name=cost]").fill("10000");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page
    .getByRole("link", { name: "Тестовый проект", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Техническое задание", exact: true })
    .click();
  await page.locator("[name=spec]").fill("Адаптивный сайт");
  await page.getByRole("button", { name: "Сохранить ТЗ" }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.locator("[name=text]").fill("Главная страница");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Добавить", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Финансы", exact: true }).click();
  await page.getByRole("button", { name: "Добавить платёж" }).click();
  await page.locator("[name=amount]").fill("3000");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.locator(".stat").filter({ hasText: "Получено" }),
  ).toContainText("3");
  await page.reload();
  await page
    .getByRole("button", { name: "Техническое задание", exact: true })
    .click();
  await expect(page.locator("[name=spec]")).toHaveValue("Адаптивный сайт");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Заметки", exact: true }).click();
  await page.getByRole("button", { name: "Добавить заметку" }).click();
  await page.locator("[name=text]").fill("<script>alert(1)</script>");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".note")).toContainText(
    "<script>alert(1)</script>",
  );
  await page.goto("/#time");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Таймер запущен" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Остановить" }).click();
  await expect(page.locator(".item-row")).toContainText("1 мин");
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "Демонстрационные данные", exact: true })
    .click();
  await page.getByRole("button", { name: "Выйти из демо" }).click();
  await page.goto("/#orders");
  await expect(
    page.getByRole("link", { name: "Тестовый проект", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("демо: все разделы и адаптивность", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Посмотреть демо" }).click();
  for (const path of [
    "dashboard",
    "orders",
    "clients",
    "finance",
    "time",
    "templates",
    "settings",
  ]) {
    await page.goto("/#" + path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "dashboard",
    "orders",
    "clients",
    "finance",
    "time",
    "templates",
    "settings",
  ]) {
    await page.goto("/#" + path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test("правки, шаблон, ручное время, поиск, экспорт и удаление с подтверждением", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Посмотреть демо" }).click();
  await page.goto("/#orders");
  await page.getByRole("link", { name: "Сайт для Forma", exact: true }).click();
  await page.locator("[name=quick-status]").selectOption("7");
  await expect(page.locator(".detail-strip .badge")).toHaveText("Готово");
  await page.getByRole("button", { name: "Правки", exact: true }).click();
  await page.getByRole("button", { name: "Добавить правку" }).click();
  await page.locator("[name=text]").fill("Обновить логотип");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.locator("[data-revision]").selectOption("Выполнена");
  await page.reload();
  await page.getByRole("button", { name: "Правки", exact: true }).click();
  await expect(page.locator("[data-revision]")).toHaveValue("Выполнена");
  await page.goto("/#templates");
  await page
    .getByRole("button", { name: "Применить к заказу" })
    .first()
    .click();
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  await page.goto("/#time");
  await page.getByRole("button", { name: "Добавить запись" }).click();
  await page.locator("[name=minutes]").fill("60");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".item-row").last()).toContainText("60 мин");
  await page.getByRole("button", { name: "Поиск" }).click();
  await page.locator("#global-search").fill("Forma");
  await expect(page.locator("#search-results")).toContainText("Сайт для Forma");
  await page.keyboard.press("Escape");
  await page.goto("/#settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON" }).click();
  expect((await download).suggestedFilename()).toBe("clientflow.json");
  await page.goto("/#orders");
  await page.getByRole("link", { name: "Сайт для Forma", exact: true }).click();
  await page.locator('[data-action^="delete-order:"]').click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Сайт для Forma", exact: true }),
  ).toBeVisible();
  await page.locator('[data-action^="delete-order:"]').click();
  await page
    .locator("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Сайт для Forma", exact: true }),
  ).toHaveCount(0);
});
