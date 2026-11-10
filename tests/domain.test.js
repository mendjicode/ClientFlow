import test from "node:test";
import assert from "node:assert/strict";
import {
  empty,
  demo,
  totals,
  validateOrder,
  hours,
  csv,
} from "../src/js/domain.js";
test("финансы считаются по платежам, остатки не взаимозачитывают переплаты", () => {
  const d = empty();
  d.orders = [
    { id: "a", cost: 100 },
    { id: "b", cost: 100 },
  ];
  d.payments = [{ order_id: "a", amount: 150 }];
  assert.deepEqual(totals(d), { cost: 200, paid: 150, due: 100 });
  assert.equal(totals(d, [d.orders[1]]).paid, 0);
});
test("пустое пространство не содержит фиктивных показателей", () => {
  assert.deepEqual(totals(empty()), { cost: 0, paid: 0, due: 0 });
  assert.equal(hours(empty()), 0);
});
test("валидация бюджета и клиента", () => {
  assert.throws(() => validateOrder({ title: " ", cost: 0 }));
  assert.throws(() => validateOrder({ title: "A", client_id: "c", cost: -1 }));
  assert.throws(() =>
    validateOrder({ title: "A", client_id: "c", cost: 1, prepayment: 2 }),
  );
  assert.doesNotThrow(() =>
    validateOrder({ title: "A", client_id: "c", cost: 10, prepayment: 2 }),
  );
});
test("демоданные связаны и независимы", () => {
  const a = demo(),
    b = demo();
  assert.notEqual(a.orders[0].id, b.orders[0].id);
  assert.ok(a.orders.every((o) => a.clients.some((c) => c.id === o.client_id)));
  assert.equal(hours(a, a.orders[0].id), 4);
  assert.equal(a.task_templates.length, 5);
});
test("CSV экранирует кавычки и переводы строк", () =>
  assert.equal(csv([['a"b', "a\nb"]]), '\ufeff"a""b";"a\nb"'));
