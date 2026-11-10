export const stages = [
  "Новый заказ",
  "Обсуждение",
  "Ожидание ТЗ",
  "ТЗ согласовано",
  "В разработке",
  "На проверке",
  "Правки",
  "Готово",
  "Оплачено и закрыто",
];
export const uid = () => crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);
export const empty = () => ({
  clients: [],
  orders: [],
  order_requirements: [],
  revisions: [],
  notes: [],
  payments: [],
  time_entries: [],
  task_templates: [],
  task_template_items: [],
  attachments: [],
  activity_logs: [],
  profile: {
    name: "Моё пространство",
    currency: "RUB",
    timezone: "Europe/Moscow",
    theme: "dark",
  },
  timer: null,
});
export function totals(data, orders = data.orders) {
  const ids = new Set(orders.map((o) => o.id));
  const cost = orders.reduce((s, o) => s + Number(o.cost), 0);
  const paid = data.payments
    .filter((p) => ids.has(p.order_id))
    .reduce((s, p) => s + Number(p.amount), 0);
  return {
    cost,
    paid,
    due: orders.reduce(
      (s, o) =>
        s +
        Math.max(
          0,
          Number(o.cost) -
            data.payments
              .filter((p) => p.order_id === o.id)
              .reduce((a, p) => a + Number(p.amount), 0),
        ),
      0,
    ),
  };
}
export const hours = (data, id) =>
  data.time_entries
    .filter((t) => !id || t.order_id === id)
    .reduce((s, t) => s + Number(t.minutes) / 60, 0);
export function validateOrder(o) {
  if (!o.title?.trim()) throw Error("Укажите название заказа");
  if (!o.client_id) throw Error("Выберите клиента");
  if (!Number.isFinite(Number(o.cost)) || Number(o.cost) < 0)
    throw Error("Стоимость должна быть неотрицательной");
  if (Number(o.prepayment) < 0 || Number(o.prepayment) > Number(o.cost))
    throw Error("Предоплата должна быть от 0 до стоимости заказа");
}
export function demo() {
  const d = empty();
  const date = (n) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  };
  d.clients = [
    ["Анна Смирнова", "anna@studio.example", "Студия Forma"],
    ["Марк Волков", "mark@north.example", "North Coffee"],
    ["Елена Ким", "elena@bloom.example", "Bloom Studio"],
  ].map(([name, email, description]) => ({
    id: uid(),
    name,
    email,
    description,
    contact: "",
    links: "",
    notes: "",
    created_at: new Date().toISOString(),
  }));
  d.orders = [
    ["Сайт для Forma", 0, 180000, 4, 5, "Разработка сайта"],
    ["Айдентика North Coffee", 1, 85000, 5, 2, "Дизайн интерфейса"],
    ["Лендинг Bloom Studio", 2, 65000, 1, 12, "Создание лендинга"],
    ["Осенняя кампания", 0, 45000, 6, -2, "Монтаж видео"],
    ["Музыка для бренда", 1, 30000, 8, -8, "Музыкальный продукт"],
  ].map(([title, c, cost, status, days, type], i) => ({
    id: uid(),
    title,
    client_id: d.clients[c].id,
    cost,
    prepayment: cost / 2,
    status,
    deadline: date(days),
    type,
    priority: i === 3 ? "Высокий" : "Обычный",
    complexity: "Средняя",
    description:
      "Создать выразительный продукт, который помогает бизнесу расти.",
    spec: "Цель проекта: обновить визуальную коммуникацию.\nАудитория: клиенты бренда.\nРезультат: готовые к запуску материалы.",
    created_at: new Date().toISOString(),
  }));
  d.payments = d.orders
    .filter((o, i) => i !== 2)
    .map((o) => ({
      id: uid(),
      order_id: o.id,
      amount: o.status === 8 ? o.cost : o.cost / 2,
      date: date(-4),
      description: "Оплата по проекту",
    }));
  d.notes = [
    {
      id: uid(),
      order_id: d.orders[0].id,
      text: "Обсудить первый вариант на следующей встрече.",
      created_at: new Date().toISOString(),
    },
  ];
  d.order_requirements = [
    {
      id: uid(),
      order_id: d.orders[0].id,
      text: "Согласовать структуру страниц",
      done: true,
    },
    {
      id: uid(),
      order_id: d.orders[0].id,
      text: "Подготовить адаптивные макеты",
      done: false,
    },
  ];
  d.time_entries = [
    {
      id: uid(),
      order_id: d.orders[0].id,
      minutes: 240,
      date: date(-1),
      description: "Проектирование структуры",
    },
  ];
  d.task_templates = [
    "Разработка сайта",
    "Создание лендинга",
    "Дизайн интерфейса",
    "Монтаж видео",
    "Создание музыкального продукта",
  ].map((name) => ({
    id: uid(),
    name,
    body: "Цель проекта:\nЦелевая аудитория:\nОбъём работ:\nМатериалы:\nКритерии приёмки:\nСроки:",
  }));
  return d;
}
export function csv(rows) {
  return (
    "\ufeff" +
    rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(
                /^[=+@\-\t\r]/.test(String(v ?? "")) ? "'" + v : (v ?? ""),
              ).replaceAll('"', '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
