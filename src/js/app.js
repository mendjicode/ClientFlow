import * as S from "./store.js";
import {
  stages,
  uid,
  today,
  totals,
  hours,
  validateOrder,
  demo,
  csv,
} from "./domain.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let view = "cards",
  tab = "overview",
  filter = {
    q: "",
    status: "",
    complexity: "",
    deadline: "",
    sort: "created_at",
  },
  search = "";
const d = () => S.get(),
  money = (n) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: d().profile.currency || "RUB",
      maximumFractionDigits: 0,
    }).format(n || 0),
  date = (v) =>
    v
      ? new Intl.DateTimeFormat("ru-RU", {
          timeZone: d().profile.timezone,
        }).format(new Date(v))
      : "Без срока";
const icon = (n) => `<i class="bi bi-${n}" aria-hidden="true"></i>`,
  btn = (text, action, cls = "secondary") =>
    `<button class="btn btn-${cls}" data-action="${action}">${text}</button>`;
const client = (id) => d().clients.find((c) => c.id === id),
  order = (id) => d().orders.find((o) => o.id === id),
  badge = (o) =>
    `<span class="badge stage-${o.status}">${stages[o.status]}</span>`,
  late = (o) => o.deadline && o.deadline < today() && o.status < 7;
function notify(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 4000);
}
function fail(e) {
  console.error(e);
  notify(e.message || "Не удалось выполнить действие");
}
const nav = [
  ["dashboard", "grid-1x2", "Обзор"],
  ["orders", "collection", "Заказы"],
  ["clients", "people", "Клиенты"],
  ["finance", "wallet2", "Финансы"],
  ["time", "stopwatch", "Учёт времени"],
  ["templates", "files", "Шаблоны"],
];
function route() {
  return (location.hash.slice(1) || "dashboard").split("/");
}
function shell() {
  document.documentElement.dataset.bsTheme = d().profile.theme || "dark";
  const [page, id] = route();
  $("#app").innerHTML =
    `<aside class="sidebar"><a class="brand" href="#dashboard"><span class="brand-icon">${icon("layers-fill")}</span>ClientFlow<span class="brand-dot">.</span></a><div class="workspace"><span class="avatar">${esc(d().profile.name.slice(0, 1))}</span><div>${esc(d().profile.name)}<small>Личное пространство</small></div></div><div class="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav>${nav.map(([key, i, t]) => `<a href="#${key}" class="${page === key ? "active" : ""}">${icon(i)}${t}${key === "orders" ? `<span class="nav-count">${d().orders.filter((o) => o.status < 7).length}</span>` : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><div class="small-label">${S.mode === "demo" ? "ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ" : S.mode === "cloud" ? "SUPABASE ПОДКЛЮЧЁН" : "ЛОКАЛЬНОЕ ХРАНЕНИЕ"}</div><p>Всё важное.<br>В одном потоке.</p><a href="#settings">${icon("gear")} Настройки</a><button data-action="auth" class="profile-btn">${icon("person-circle")} ${S.user ? esc(S.user.email) : "Войти в аккаунт"} ${icon("arrow-up-right")}</button></div></aside><main><header class="topbar"><button class="mobile-menu" data-action="menu" aria-label="Меню">${icon("list")}</button><span>${nav.find((n) => n[0] === page)?.[2] || "Настройки"} <span class="muted">/ Рабочее пространство</span></span><div><button class="search-trigger" data-action="search">${icon("search")} Поиск <kbd>⌘ K</kbd></button><span class="today">${date(today())}</span><span class="avatar small">${esc(d().profile.name.slice(0, 1))}</span></div></header><div class="content">${S.mode !== "cloud" ? `<div class="mode-banner">${icon(S.mode === "demo" ? "beaker" : "hdd")} ${S.mode === "demo" ? "Деморежим · отдельный набор примеров" : "Локальный режим · данные сохраняются только в этом браузере"} ${btn(S.mode === "demo" ? "Выйти из демо" : "Посмотреть демо", S.mode === "demo" ? "exit-demo" : "demo", "link")}</div>` : ""}<div id="page"></div></div></main>`;
  const renderers = {
    dashboard,
    orders,
    clients,
    finance,
    time,
    templates,
    settings,
  };
  if (page === "orders" && id && order(id)) details(order(id));
  else if (page === "clients" && id && client(id)) clientDetails(client(id));
  else (renderers[page] || dashboard)();
}
function heading(kicker, title, subtitle, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${actions}</div></div>`;
}
function empty(text, action = "") {
  return `<div class="empty">${icon("inbox")}<h3>${text}</h3><p>Здесь появятся данные вашего рабочего пространства.</p>${action}</div>`;
}
function stats(items) {
  return `<div class="stats">${items.map(([label, value, sub, i]) => `<div class="stat"><div>${label}${icon(i || "arrow-up-right")}</div><strong>${value}</strong><small>${sub}</small></div>`).join("")}</div>`;
}
function card(o) {
  const t = totals(d(), [o]);
  return `<article class="order-card"><div class="card-top"><span class="project-icon">${icon(o.type?.includes("Дизайн") ? "palette" : "code-slash")}</span>${badge(o)}<button class="icon-btn" data-action="edit-order:${o.id}" aria-label="Редактировать заказ">${icon("three-dots")}</button></div><a href="#orders/${o.id}" class="order-title">${esc(o.title)}</a><p>${esc(client(o.client_id)?.name || "Клиент")}</p><div class="progress"><div style="width:${(o.status / 8) * 100}%"></div></div><div class="card-footer-line"><span class="${late(o) ? "danger" : ""}">${icon("calendar3")} ${date(o.deadline)}</span><strong>${money(t.cost)}</strong></div></article>`;
}
function tableOrders(rows) {
  return rows.length
    ? `<div class="table-responsive"><table class="table"><thead><tr><th>Проект / клиент</th><th>Этап</th><th>Дедлайн</th><th>Стоимость</th><th>Получено</th></tr></thead><tbody>${rows.map((o) => `<tr><td><a href="#orders/${o.id}">${esc(o.title)}</a><small>${esc(client(o.client_id)?.name)}</small></td><td>${badge(o)}</td><td class="${late(o) ? "danger" : ""}">${date(o.deadline)}</td><td>${money(o.cost)}</td><td>${money(totals(d(), [o]).paid)}</td></tr>`).join("")}</tbody></table></div>`
    : empty("Заказов пока нет", btn("Создать заказ", "new-order", "primary"));
}
function chart() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const x = new Date();
    x.setMonth(x.getMonth() - 5 + i, 1);
    return {
      key: x.toISOString().slice(0, 7),
      label: x.toLocaleDateString("ru-RU", { month: "short" }),
    };
  });
  const values = months.map((m) =>
    d()
      .payments.filter((p) => p.date.startsWith(m.key))
      .reduce((s, p) => s + Number(p.amount), 0),
  );
  const max = Math.max(...values, 1);
  return `<div class="chart">${months.map((m, i) => `<div class="bar-group"><span>${money(values[i])}</span><div class="bar-track"><div class="bar" style="height:${(values[i] / max) * 100}%" title="${money(values[i])}"></div></div><small>${m.label}</small></div>`).join("")}</div>`;
}
function dashboard() {
  const active = d().orders.filter((o) => o.status < 7),
    t = totals(d());
  $("#page").innerHTML =
    heading(
      "ВАШ РАБОЧИЙ РИТМ",
      'Всё под контролем<span class="accent">.</span>',
      "Проекты, клиенты и финансы — в одном рабочем пространстве.",
      btn(`${icon("plus-lg")} Новый заказ`, "new-order", "primary"),
    ) +
    stats([
      [
        "Активные заказы",
        active.length,
        `${d().orders.filter((o) => [1, 2, 5].includes(o.status)).length} ожидают ответа клиента`,
        "collection",
      ],
      [
        "Стоимость проектов",
        money(t.cost),
        "Все сохранённые заказы",
        "briefcase",
      ],
      ["Получено", money(t.paid), "По истории платежей", "arrow-down-left"],
      [
        "Ожидается",
        money(t.due),
        `${d().orders.filter(late).length} просроченных заказов`,
        "hourglass-split",
      ],
    ]) +
    `<div class="dashboard-grid"><section class="panel"><div class="section-title"><h2>Финансовый поток</h2><span class="muted">Последние 6 месяцев</span></div><div class="chart-summary">${money(t.paid)} <small>получено за всё время</small></div>${chart()}</section><section class="panel"><div class="section-title"><h2>Этапы проектов</h2><span class="muted">${d().orders.length} всего</span></div><div class="stage-list">${
      stages
        .map((s, i) => {
          const count = d().orders.filter((o) => o.status === i).length;
          return count
            ? `<div><span><b class="stage-dot stage-${i}"></b>${s}</span><strong>${count}</strong><div class="stage-track"><div style="width:${(count / Math.max(d().orders.length, 1)) * 100}%"></div></div></div>`
            : "";
        })
        .join("") || empty("Нет проектов")
    }</div></section></div><section class="panel"><div class="section-title"><h2>Последние заказы <span class="muted">${d().orders.length}</span></h2><a href="#orders">Все заказы ${icon("arrow-right")}</a></div>${tableOrders([...d().orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4))}</section><div class="dashboard-grid"><section class="panel"><div class="section-title"><h2>Ближайшие дедлайны</h2>${icon("calendar3")}</div>${
      [...active]
        .filter((o) => o.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 4)
        .map(
          (o) =>
            `<a class="deadline-row" href="#orders/${o.id}"><span class="date-block ${late(o) ? "danger" : ""}">${new Date(o.deadline).getDate()}<small>${new Date(o.deadline).toLocaleDateString("ru-RU", { month: "short" })}</small></span><span><strong>${esc(o.title)}</strong><small>${esc(client(o.client_id)?.name)}</small></span>${badge(o)}</a>`,
        )
        .join("") || empty("Нет ближайших сроков")
    }</section><section class="panel"><div class="section-title"><h2>Последние действия</h2>${icon("activity")}</div>${activity(d().activity_logs.slice(-5).reverse())}</section></div>`;
}
function activity(rows) {
  return (
    rows
      .map(
        (a) =>
          `<div class="activity-row">${icon("check2-circle")}<div>${esc(a.text)}<small>${date(a.created_at)}</small></div></div>`,
      )
      .join("") || '<p class="muted">Действия с проектами появятся здесь.</p>'
  );
}
function options(values, selected) {
  return values
    .map((v, i) => {
      const [key, label] = Array.isArray(v) ? v : [v, v];
      return `<option value="${esc(key)}" ${String(key) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("");
}
function orders() {
  let rows = d().orders.filter(
    (o) =>
      (o.title + " " + (client(o.client_id)?.name || ""))
        .toLowerCase()
        .includes(filter.q.toLowerCase()) &&
      (!filter.status || String(o.status) === filter.status) &&
      (!filter.complexity || o.complexity === filter.complexity) &&
      (!filter.deadline ||
        (filter.deadline === "late"
          ? late(o)
          : o.deadline &&
            o.deadline >= today() &&
            o.deadline <=
              new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10))),
  );
  rows.sort((a, b) =>
    filter.sort === "cost"
      ? b.cost - a.cost
      : filter.sort === "deadline"
        ? (a.deadline || "9999").localeCompare(b.deadline || "9999")
        : b.created_at.localeCompare(a.created_at),
  );
  $("#page").innerHTML =
    heading(
      "ПРОЕКТЫ В ДВИЖЕНИИ",
      "Заказы",
      `${d().orders.length} проектов в вашем пространстве`,
      btn(`${icon("plus-lg")} Новый заказ`, "new-order", "primary"),
    ) +
    `<div class="filters"><input class="form-control" placeholder="Найти заказ или клиента…" aria-label="Поиск заказов" data-filter="q" value="${esc(filter.q)}"><select class="form-select" data-filter="status" aria-label="Статус">${options([["", "Все этапы"], ...stages.map((s, i) => [i, s])], filter.status)}</select><select class="form-select" data-filter="complexity" aria-label="Сложность">${options(
      ["", "Низкая", "Средняя", "Высокая", "Очень высокая"].map((v) => [
        v,
        v || "Любая сложность",
      ]),
      filter.complexity,
    )}</select><select class="form-select" data-filter="deadline" aria-label="Срок">${options(
      [
        ["", "Любые сроки"],
        ["late", "Просрочены"],
        ["week", "На этой неделе"],
      ],
      filter.deadline,
    )}</select><select class="form-select" data-filter="sort" aria-label="Сортировка">${options(
      [
        ["created_at", "Сначала новые"],
        ["deadline", "По дедлайну"],
        ["cost", "По стоимости"],
      ],
      filter.sort,
    )}</select><div class="view-switch">${[
      ["cards", "grid"],
      ["list", "list-ul"],
      ["kanban", "kanban"],
    ]
      .map(([v, i]) =>
        btn(icon(i), `view:${v}`, v === view ? "primary" : "secondary"),
      )
      .join("")}</div></div>${
      view === "list"
        ? `<section class="panel">${tableOrders(rows)}</section>`
        : view === "kanban"
          ? `<div class="kanban">${stages
              .map(
                (s, i) =>
                  `<section class="kanban-column" data-drop="${i}"><h3>${s} <span>${rows.filter((o) => o.status === i).length}</span></h3>${rows
                    .filter((o) => o.status === i)
                    .map(
                      (o) =>
                        `<div draggable="true" data-drag="${o.id}">${card(o)}</div>`,
                    )
                    .join(
                      "",
                    )}<small class="muted">Перетащите заказ сюда</small></section>`,
              )
              .join("")}</div>`
          : rows.length
            ? `<div class="orders-grid">${rows.map(card).join("")}</div>`
            : empty(
                "Ничего не найдено",
                btn("Создать заказ", "new-order", "primary"),
              )
    }`;
}
function field(label, name, value = "", type = "text", attrs = "") {
  return `<label class="field">${label}<input class="form-control" type="${type}" name="${name}" value="${esc(value)}" ${attrs}></label>`;
}
function area(label, name, value = "", attrs = "") {
  return `<label class="field">${label}<textarea class="form-control" name="${name}" rows="5" ${attrs}>${esc(value)}</textarea></label>`;
}
function select(label, name, values, value = "") {
  return `<label class="field">${label}<select class="form-select" name="${name}">${options(values, value)}</select></label>`;
}
function modal(title, body, submit, onSubmit) {
  const el = $("#modal");
  el.innerHTML = `<form id="dialog-form"><div class="modal-head"><h2>${title}</h2><button type="button" class="icon-btn" data-action="close" aria-label="Закрыть">${icon("x-lg")}</button></div>${body}<p class="form-error" role="alert"></p><div class="modal-actions">${btn("Отмена", "close")}${submit ? `<button type="submit" class="btn btn-primary">${submit}</button>` : ""}</div></form>`;
  if (!el.open) el.showModal();
  $("#dialog-form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    if (b) b.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(e.target)));
      el.close();
      shell();
    } catch (error) {
      el.querySelector(".form-error").textContent = error.message;
    } finally {
      if (b) b.disabled = false;
    }
  };
}
function orderForm(id) {
  const o = order(id) || {
    status: 0,
    cost: 0,
    prepayment: 0,
    priority: "Обычный",
    complexity: "Средняя",
  };
  modal(
    id ? "Редактировать заказ" : "Новый заказ",
    `<div class="form-grid">${field("Название проекта", "title", o.title, "text", 'required maxlength="160"')}${select("Клиент", "client_id", [["", "Выберите клиента"], ...d().clients.map((c) => [c.id, c.name])], o.client_id)}${field("Тип проекта", "type", o.type)}${field("Дедлайн", "deadline", o.deadline, "date")}${field("Стоимость", "cost", o.cost, "number", 'min="0" step="0.01" required')}${field("Плановая предоплата", "prepayment", o.prepayment, "number", 'min="0" step="0.01"')}${select(
      "Этап",
      "status",
      stages.map((s, i) => [i, s]),
      o.status,
    )}${select("Приоритет", "priority", ["Низкий", "Обычный", "Высокий"], o.priority)}${select("Сложность", "complexity", ["Низкая", "Средняя", "Высокая", "Очень высокая"], o.complexity)}${!id ? select("Шаблон ТЗ", "template_id", [["", "Без шаблона"], ...d().task_templates.map((t) => [t.id, t.name])]) : ""}</div>${area("Описание", "description", o.description)}${!d().clients.length ? '<p class="warning">Сначала создайте клиента в разделе «Клиенты».</p>' : ""}`,
    "Сохранить",
    async (v) => {
      validateOrder(v);
      const template = d().task_templates.find((t) => t.id === v.template_id);
      delete v.template_id;
      const saved = await S.save("orders", {
        ...o,
        ...v,
        cost: Number(v.cost),
        prepayment: Number(v.prepayment),
        status: Number(v.status),
        spec: o.spec || template?.body || "",
        created_at: o.created_at || new Date().toISOString(),
      });
      await S.log(
        saved.id,
        id
          ? `Обновлён заказ «${v.title}»: этап, стоимость или срок`
          : `Создан заказ «${v.title}»`,
      );
      notify("Заказ сохранён");
    },
  );
}
function clients() {
  $("#page").innerHTML =
    heading(
      "ЛЮДИ И КОМАНДЫ",
      "Клиенты",
      "Хорошие проекты начинаются с хороших отношений.",
      btn(`${icon("plus-lg")} Добавить клиента`, "new-client", "primary"),
    ) +
    (d().clients.length
      ? `<div class="orders-grid">${d()
          .clients.map((c) => {
            const os = d().orders.filter((o) => o.client_id === c.id),
              t = totals(d(), os);
            return `<article class="panel client-card"><span class="avatar">${esc(c.name.slice(0, 1))}</span><h2><a href="#clients/${c.id}">${esc(c.name)}</a></h2><p>${esc(c.description)}</p><p class="muted">${esc(c.email)}</p><div class="card-footer-line"><span>${os.length} заказов</span><strong>${money(t.cost)}</strong></div>${btn("Редактировать", `edit-client:${c.id}`)}</article>`;
          })
          .join("")}</div>`
      : empty(
          "Добавьте первого клиента",
          btn("Добавить клиента", "new-client", "primary"),
        ));
}
function clientForm(id) {
  const c = client(id) || {};
  modal(
    id ? "Редактировать клиента" : "Новый клиент",
    field(
      "Имя или компания",
      "name",
      c.name,
      "text",
      'required maxlength="160"',
    ) +
      field("Email", "email", c.email, "email") +
      field("Telegram / контакт", "contact", c.contact) +
      field("Ссылки на сайты и соцсети", "links", c.links) +
      area("Описание", "description", c.description) +
      area("Заметки", "notes", c.notes),
    "Сохранить",
    async (v) => {
      await S.save("clients", {
        ...c,
        ...v,
        created_at: c.created_at || new Date().toISOString(),
      });
      notify("Клиент сохранён");
    },
  );
}
function clientDetails(c) {
  const os = d().orders.filter((o) => o.client_id === c.id),
    t = totals(d(), os);
  $("#page").innerHTML =
    heading(
      "КЛИЕНТ",
      esc(c.name),
      esc(c.email || c.contact || "Контакты не указаны"),
      btn("Редактировать", `edit-client:${c.id}`) +
        btn("Удалить", `delete-client:${c.id}`, "outline-danger"),
    ) +
    stats([
      ["Стоимость заказов", money(t.cost), "Все проекты"],
      ["Получено", money(t.paid), "Фактические платежи"],
      ["Задолженность", money(t.due), "Осталось получить"],
      ["Проектов", os.length, "За всё время"],
    ]) +
    `<section class="panel"><p>${esc(c.description)}</p><p>${esc(c.contact)}</p><p>${esc(c.links)}</p><p>${esc(c.notes)}</p><small>Добавлен ${date(c.created_at)}</small></section><section class="panel"><h2>Заказы клиента</h2>${tableOrders(os)}</section><section class="panel"><h2>История взаимодействия</h2>${activity(
      d()
        .activity_logs.filter((a) => os.some((o) => o.id === a.order_id))
        .reverse(),
    )}</section>`;
}
const detailTabs = [
  ["overview", "Обзор"],
  ["spec", "Техническое задание"],
  ["revisions", "Правки"],
  ["payments", "Финансы"],
  ["notes", "Заметки"],
  ["history", "История"],
];
function details(o) {
  const t = totals(d(), [o]);
  $("#page").innerHTML =
    heading(
      "ЗАКАЗ / " + esc(client(o.client_id)?.name),
      esc(o.title),
      `${date(o.created_at)} · ${esc(o.type || "Проект")}`,
      btn("Коммерческое предложение", `proposal:${o.id}`) +
        btn("Редактировать", `edit-order:${o.id}`, "primary") +
        btn(icon("trash"), `delete-order:${o.id}`, "outline-danger"),
    ) +
    `<div class="detail-strip">${badge(o)}<span class="${late(o) ? "danger" : ""}">${icon("calendar3")} ${date(o.deadline)}</span><span>${money(o.cost)}</span>${select(
      "Изменить этап",
      "quick-status",
      stages.map((s, i) => [i, s]),
      o.status,
    )}</div><div class="tabs">${detailTabs.map(([key, label]) => btn(label, `tab:${key}`, tab === key ? "primary" : "secondary")).join("")}</div><section class="panel detail-panel">${
      tab === "overview"
        ? `<div class="detail-overview"><div><h2>О проекте</h2><p class="prewrap">${esc(o.description || "Добавьте описание проекта.")}</p><h3>Прогресс по этапам · ${Math.round((o.status / 8) * 100)}%</h3><div class="progress"><div style="width:${(o.status / 8) * 100}%"></div></div><p>Приоритет: ${esc(o.priority)} · Сложность: ${esc(o.complexity)}</p><a href="#clients/${o.client_id}">${esc(client(o.client_id)?.name)}</a></div><div class="project-summary"><p>Получено <strong>${money(t.paid)}</strong></p><p>Остаток <strong>${money(t.due)}</strong></p><p>Время <strong>${hours(d(), o.id).toFixed(1)} ч</strong></p><p>Ставка по стоимости <strong>${hours(d(), o.id) ? money(o.cost / hours(d(), o.id)) + "/ч" : "—"}</strong></p>${btn("Запустить таймер", `start:${o.id}`)}</div></div>`
        : tab === "spec"
          ? `<form id="spec-form">${area("Техническое задание · текстовый редактор", "spec", o.spec)}<div class="editor-tools">${btn("Добавить заголовок", "spec-heading")}${btn("Добавить список", "spec-list")}</div><button class="btn btn-primary">Сохранить ТЗ</button></form><hr><div class="section-title"><h2>Требования</h2>${btn("Добавить", `add-requirement:${o.id}`)}</div>${d()
              .order_requirements.filter((r) => r.order_id === o.id)
              .map(
                (r) =>
                  `<div class="item-row"><label><input type="checkbox" data-requirement="${r.id}" ${r.done ? "checked" : ""}> <span class="${r.done ? "done" : ""}">${esc(r.text)}</span></label>${btn(icon("trash"), `delete-order_requirements:${r.id}`)}</div>`,
              )
              .join(
                "",
              )}<hr><div class="section-title"><h2>Материалы и вложения</h2>${btn("Добавить ссылку", `add-link:${o.id}`)}</div><label class="field">Прикрепить файл <input type="file" class="form-control" id="file-upload"></label>${d()
              .attachments.filter((a) => a.order_id === o.id)
              .map(
                (a) =>
                  `<div class="item-row"><span>${icon("paperclip")} ${esc(a.name)}</span><span>${btn("Открыть", `attachment:${a.id}`)}${btn(icon("trash"), `delete-attachments:${a.id}`)}</span></div>`,
              )
              .join("")}`
          : tab === "revisions"
            ? `<div class="section-title"><h2>Правки · ${
                new Set(
                  d()
                    .revisions.filter((r) => r.order_id === o.id)
                    .map((r) => r.round),
                ).size
              } раундов</h2>${btn("Добавить правку", `revision:${o.id}`, "primary")}</div>${
                d()
                  .revisions.filter((r) => r.order_id === o.id)
                  .map(
                    (r) =>
                      `<div class="item-row"><div><strong>${esc(r.text)}</strong><small>Раунд ${r.round} · ${esc(r.priority)} · ${date(r.created_at)}</small></div><select class="form-select compact" data-revision="${r.id}">${options(["Новая", "В работе", "Выполнена"], r.status)}</select>${btn(icon("trash"), `delete-revisions:${r.id}`)}</div>`,
                  )
                  .join("") || empty("Правок пока нет")
              }`
            : tab === "payments"
              ? stats([
                  ["Стоимость", money(t.cost), "Согласованный бюджет"],
                  ["Предоплата", money(o.prepayment), "План, не платёж"],
                  ["Получено", money(t.paid), "Фактические платежи"],
                  ["Остаток", money(t.due), "К оплате"],
                ]) +
                btn("Добавить платёж", `payment:${o.id}`, "primary") +
                paymentTable(d().payments.filter((p) => p.order_id === o.id))
              : tab === "notes"
                ? `<div class="section-title"><h2>Заметки</h2>${btn("Добавить заметку", `note:${o.id}`, "primary")}</div>${
                    d()
                      .notes.filter((n) => n.order_id === o.id)
                      .map(
                        (n) =>
                          `<article class="note"><p class="prewrap">${esc(n.text)}</p><small>${date(n.created_at)}</small><div>${btn("Изменить", `edit-note:${n.id}`)}${btn("Удалить", `delete-notes:${n.id}`)}</div></article>`,
                      )
                      .join("") || empty("Запишите важные детали")
                  }`
                : activity(
                    d()
                      .activity_logs.filter((a) => a.order_id === o.id)
                      .reverse(),
                  )
    }</section>`;
  const f = $("#spec-form");
  if (f)
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await S.save("orders", { ...o, spec: new FormData(f).get("spec") });
        await S.log(o.id, "Обновлено техническое задание");
        notify("ТЗ сохранено");
      } catch (e) {
        fail(e);
      }
    };
  const file = $("#file-upload");
  if (file)
    file.onchange = async () => {
      try {
        if (file.files[0]) await S.upload(file.files[0], o.id);
        shell();
        notify("Файл сохранён");
      } catch (e) {
        fail(e);
      }
    };
}
function paymentTable(rows) {
  return rows.length
    ? `<div class="table-responsive"><table class="table"><thead><tr><th>Дата</th><th>Заказ</th><th>Описание</th><th>Сумма</th><th></th></tr></thead><tbody>${[
        ...rows,
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (p) =>
            `<tr><td>${date(p.date)}</td><td><a href="#orders/${p.order_id}">${esc(order(p.order_id)?.title)}</a></td><td>${esc(p.description)}</td><td class="accent">${money(p.amount)}</td><td>${btn(icon("trash"), `delete-payments:${p.id}`)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : empty("Платежей пока нет");
}
function finance() {
  const t = totals(d());
  $("#page").innerHTML =
    heading(
      "ДЕНЬГИ В ПОРЯДКЕ",
      "Финансы",
      "Согласованная стоимость и реальные поступления — отдельно.",
      btn("Добавить платёж", "payment", "primary"),
    ) +
    stats([
      ["Стоимость заказов", money(t.cost), "Согласованные бюджеты"],
      ["Получено", money(t.paid), "Реальные поступления"],
      ["Ожидается", money(t.due), "Неоплаченные остатки"],
      ["Платежей", d().payments.length, "За всё время"],
    ]) +
    `<section class="panel"><h2>Поступления по месяцам</h2>${chart()}</section><section class="panel"><h2>Доход по заказам</h2>${tableOrders(d().orders)}</section><section class="panel"><h2>История платежей</h2>${paymentTable(d().payments)}</section>`;
}
function paymentForm(id) {
  modal(
    "Добавить платёж",
    select(
      "Заказ",
      "order_id",
      d().orders.map((o) => [o.id, o.title]),
      id,
    ) +
      field(
        "Сумма",
        "amount",
        "",
        "number",
        'required min="0.01" step="0.01"',
      ) +
      field("Дата", "date", today(), "date", "required") +
      field("Назначение", "description"),
    "Сохранить",
    async (v) => {
      if (!order(v.order_id))
        throw Error("Создайте заказ перед добавлением платежа");
      if (Number(v.amount) <= 0) throw Error("Сумма должна быть больше нуля");
      await S.save("payments", { ...v, amount: Number(v.amount) });
      await S.log(v.order_id, `Добавлен платёж ${money(v.amount)}`);
      notify("Платёж добавлен");
    },
  );
}
function time() {
  const t = S.timer();
  $("#page").innerHTML =
    heading(
      "ЦЕННОСТЬ ВАШЕГО ВРЕМЕНИ",
      "Учёт времени",
      "Понимайте, сколько на самом деле занимает работа.",
      btn("Добавить запись", "time-entry", "primary"),
    ) +
    `<section class="panel timer-panel"><span class="project-icon">${icon("stopwatch")}</span><div><h2>${t ? "Таймер запущен" : "Сосредоточьтесь на главном"}</h2><p>${t ? esc(order(t.order_id)?.title) : "Выберите заказ и начните отсчёт"}</p><strong id="timer-clock">${t ? elapsed(t.started) : "00:00:00"}</strong></div>${t ? btn("Остановить", "stop", "primary") : `<select id="timer-order" class="form-select compact">${options(d().orders.map((o) => [o.id, o.title]))}</select>${btn("Начать", "start", "primary")}`}</section>` +
    stats([
      ["Всего времени", hours(d()).toFixed(1) + " ч", "Сохранённые записи"],
      ["Записей", d().time_entries.length, "Рабочие сессии"],
    ]) +
    `<section class="panel"><h2>История работы</h2>${
      d()
        .time_entries.map(
          (t) =>
            `<div class="item-row"><div><a href="#orders/${t.order_id}">${esc(order(t.order_id)?.title)}</a><small>${esc(t.description)} · ${date(t.date)}</small></div><strong>${t.minutes} мин</strong>${btn(icon("trash"), `delete-time_entries:${t.id}`)}</div>`,
        )
        .join("") || empty("Начните первую рабочую сессию")
    }</section>`;
}
function elapsed(start) {
  const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
setInterval(() => {
  const t = S.timer();
  if (t && $("#timer-clock"))
    $("#timer-clock").textContent = elapsed(t.started);
}, 1000);
function timeForm() {
  modal(
    "Добавить время",
    select(
      "Заказ",
      "order_id",
      d().orders.map((o) => [o.id, o.title]),
    ) +
      field("Минуты", "minutes", "", "number", 'required min="1" step="1"') +
      field("Дата", "date", today(), "date", "required") +
      field("Что сделано", "description"),
    "Сохранить",
    async (v) => {
      if (!order(v.order_id)) throw Error("Выберите заказ");
      await S.save("time_entries", { ...v, minutes: Number(v.minutes) });
      notify("Время сохранено");
    },
  );
}
function templates() {
  $("#page").innerHTML =
    heading(
      "МЕНЬШЕ РУТИНЫ",
      "Шаблоны",
      "Сохраняйте удачные брифы и начинайте проекты быстрее.",
      btn("Создать шаблон", "template", "primary"),
    ) +
    (d().task_templates.length
      ? `<div class="orders-grid">${d()
          .task_templates.map(
            (t) =>
              `<article class="panel"><span class="project-icon">${icon("file-earmark-text")}</span><h2>${esc(t.name)}</h2><p class="prewrap muted">${esc(t.body.slice(0, 220))}</p>${btn("Редактировать", `template:${t.id}`)} ${btn("Применить к заказу", `apply-template:${t.id}`)} ${btn(icon("trash"), `delete-task_templates:${t.id}`)}</article>`,
          )
          .join("")}</div>`
      : empty(
          "Создайте первый шаблон",
          btn("Добавить пять примеров", "seed-templates", "primary"),
        ));
}
function templateForm(id) {
  const t = d().task_templates.find((t) => t.id === id) || {};
  modal(
    "Шаблон технического задания",
    field("Название", "name", t.name, "text", "required") +
      area("Текст брифа", "body", t.body, "required"),
    "Сохранить",
    async (v) => {
      await S.save("task_templates", { ...t, ...v });
      notify("Шаблон сохранён");
    },
  );
}
function settings() {
  $("#page").innerHTML =
    heading(
      "ВАШЕ ПРОСТРАНСТВО",
      "Настройки",
      "Настройте ClientFlow под свой рабочий ритм.",
    ) +
    `<section class="panel settings-panel"><h2>Профиль и оформление</h2><form id="settings-form"><div class="form-grid">${field("Имя", "name", d().profile.name, "text", "required")}${field("Email", "email", d().profile.email || S.user?.email, "email")}${select("Валюта", "currency", ["RUB", "USD", "EUR", "GBP", "KZT"], d().profile.currency)}${select("Часовой пояс", "timezone", ["Europe/Moscow", "Europe/London", "Europe/Berlin", "Asia/Almaty", "Asia/Dubai", "America/New_York", "Etc/UTC"], d().profile.timezone)}${select(
      "Тема",
      "theme",
      [
        ["dark", "Тёмная"],
        ["light", "Светлая"],
      ],
      d().profile.theme,
    )}</div><button class="btn btn-primary">Сохранить настройки</button></form></section><section class="panel settings-panel"><h2>Данные и подключение</h2><p>${S.supabase ? "Supabase настроен. Войдите для работы в облаке." : "Supabase не подключён. Укажите SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY в .env и пересоберите приложение."}</p><div class="actions">${btn(S.user ? "Выйти из аккаунта" : "Войти / регистрация", S.user ? "logout" : "auth")}${btn("Экспорт JSON", "export-json")}${btn("Заказы CSV", "export-csv")}${btn("Демонстрационные данные", "demo")}${S.mode === "demo" ? btn("Удалить демоданные", "clear-demo", "outline-danger") : ""}</div><p class="muted mt-3">Email профиля — контактное поле. Для изменения адреса входа используйте настройки Supabase Auth.</p></section>`;
  $("#settings-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await S.profile(Object.fromEntries(new FormData(e.target)));
      shell();
      notify("Настройки сохранены");
    } catch (e) {
      fail(e);
    }
  };
}
function authForm(kind = "login") {
  if (!S.supabase) {
    modal(
      "Облачное подключение",
      `<p>Для авторизации создайте проект Supabase, примените SQL из <code>supabase/schema.sql</code>, заполните <code>.env</code> по примеру <code>.env.example</code> и выполните сборку.</p><p>Пока можно пользоваться локальным пространством или деморежимом.</p>`,
    );
    return;
  }
  modal(
    kind === "signup"
      ? "Регистрация"
      : kind === "reset"
        ? "Восстановление доступа"
        : kind === "update"
          ? "Новый пароль"
          : "Вход в ClientFlow",
    (kind !== "update"
      ? field("Email", "email", "", "email", "required")
      : "") +
      (kind !== "reset"
        ? field("Пароль", "password", "", "password", 'required minlength="8"')
        : "") +
      `<div class="actions">${btn("Войти", "auth-login", "link")}${btn("Регистрация", "auth-signup", "link")}${btn("Забыли пароль?", "auth-reset", "link")}</div>`,
    "Продолжить",
    async (v) => {
      let result;
      if (kind === "signup") result = await S.supabase.auth.signUp(v);
      else if (kind === "reset")
        result = await S.supabase.auth.resetPasswordForEmail(v.email, {
          redirectTo: location.origin,
        });
      else if (kind === "update")
        result = await S.supabase.auth.updateUser({ password: v.password });
      else result = await S.supabase.auth.signInWithPassword(v);
      if (result.error) throw result.error;
      if (result.data?.session || kind === "update") {
        await S.init();
        notify("Вы вошли в аккаунт");
      } else notify("Проверьте почту для продолжения");
    },
  );
}
function download(content, name, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function searchModal() {
  modal(
    "Поиск по пространству",
    `<input id="global-search" class="form-control" placeholder="Заказы, клиенты, заметки…" aria-label="Глобальный поиск"><div id="search-results"></div>`,
  );
  $("#global-search").oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    $("#search-results").innerHTML = q
      ? [
          ...d()
            .orders.filter((o) =>
              (o.title + " " + o.description + " " + o.spec)
                .toLowerCase()
                .includes(q),
            )
            .map((o) => ["orders/" + o.id, o.title, "Заказ"]),
          ...d()
            .clients.filter((c) =>
              (c.name + " " + c.email + " " + c.notes)
                .toLowerCase()
                .includes(q),
            )
            .map((c) => ["clients/" + c.id, c.name, "Клиент"]),
          ...d()
            .notes.filter((n) => n.text.toLowerCase().includes(q))
            .map((n) => ["orders/" + n.order_id, n.text, "Заметка"]),
        ]
          .map(
            ([url, text, type]) =>
              `<a class="search-result" data-action="close" href="#${url}"><small>${type}</small>${esc(text)}</a>`,
          )
          .join("") || "<p>Ничего не найдено</p>"
      : "";
  };
  $("#global-search").focus();
}
async function confirmRemove(table, id) {
  const labels = {
    orders: "заказ и связанные записи",
    clients: "клиента",
    payments: "платёж",
    notes: "заметку",
    attachments: "вложение",
    task_templates: "шаблон",
  };
  if (table === "clients" && d().orders.some((o) => o.client_id === id))
    throw Error("Сначала переназначьте заказы этого клиента");
  modal(
    "Подтвердите удаление",
    `<p>Удалить ${labels[table] || "запись"}? Это действие нельзя отменить.</p>`,
    "Удалить",
    async () => {
      await S.remove(table, id);
      if (["orders", "clients"].includes(table)) location.hash = table;
      notify("Запись удалена");
    },
  );
}
async function action(value) {
  const [a, id] = value.split(":");
  const o = order(route()[1]);
  switch (a) {
    case "menu":
      $(".sidebar").classList.toggle("mobile-open");
      break;
    case "close":
      $("#modal").close();
      break;
    case "new-order":
      orderForm();
      break;
    case "edit-order":
      orderForm(id);
      break;
    case "new-client":
      clientForm();
      break;
    case "edit-client":
      clientForm(id);
      break;
    case "view":
      view = id;
      orders();
      break;
    case "tab":
      tab = id;
      shell();
      break;
    case "auth":
      authForm();
      break;
    case "auth-login":
      authForm("login");
      break;
    case "auth-signup":
      authForm("signup");
      break;
    case "auth-reset":
      authForm("reset");
      break;
    case "logout": {
      const { error } = await S.supabase.auth.signOut();
      if (error) throw error;
      await S.init();
      shell();
      break;
    }
    case "demo":
      if (localStorage.getItem("clientflow-v1-demo"))
        await S.switchMode("demo");
      else await S.setDemo(demo());
      shell();
      notify("Открыт отдельный демонстрационный набор");
      break;
    case "exit-demo":
      await S.switchMode(S.user ? "cloud" : "local");
      shell();
      break;
    case "clear-demo":
      modal(
        "Удалить демоданные?",
        "<p>Будет очищен только отдельный демонстрационный набор.</p>",
        "Удалить",
        async () => {
          await S.setDemo((await import("./domain.js")).empty());
          notify("Демоданные удалены");
        },
      );
      break;
    case "search":
      searchModal();
      break;
    case "payment":
      paymentForm(id);
      break;
    case "time-entry":
      timeForm();
      break;
    case "start": {
      if (S.timer()) throw Error("Сначала остановите текущий таймер");
      const target = id || $("#timer-order")?.value;
      if (!order(target)) throw Error("Сначала создайте заказ");
      await S.setTimer({ order_id: target, started: Date.now() });
      shell();
      notify("Таймер запущен");
      break;
    }
    case "stop": {
      const t = S.timer();
      if (t) {
        await S.save("time_entries", {
          order_id: t.order_id,
          minutes: Math.max(1, Math.round((Date.now() - t.started) / 60000)),
          description: "Рабочая сессия по таймеру",
          date: today(),
        });
        await S.setTimer(null);
        shell();
      }
      break;
    }
    case "template":
      templateForm(id);
      break;
    case "seed-templates":
      for (const t of demo().task_templates) await S.save("task_templates", t);
      shell();
      break;
    case "apply-template":
      modal(
        "Применить шаблон",
        select(
          "Заказ",
          "order_id",
          d().orders.map((o) => [o.id, o.title]),
        ) + "<p>Текст шаблона будет добавлен в конец ТЗ.</p>",
        "Применить",
        async (v) => {
          const target = order(v.order_id);
          if (!target) throw Error("Выберите заказ");
          await S.save("orders", {
            ...target,
            spec:
              (target.spec || "") +
              "\n" +
              d().task_templates.find((t) => t.id === id).body,
          });
          await S.log(target.id, "Применён шаблон ТЗ");
        },
      );
      break;
    case "spec-heading":
    case "spec-list": {
      const el = $('[name="spec"]');
      el.setRangeText(
        a === "spec-heading" ? "\n## Заголовок\n" : "\n• Пункт списка\n",
        el.selectionStart,
        el.selectionEnd,
        "end",
      );
      el.focus();
      break;
    }
    case "add-requirement":
      modal(
        "Новое требование",
        field("Требование", "text", "", "text", "required"),
        "Добавить",
        async (v) => {
          await S.save("order_requirements", {
            order_id: id,
            text: v.text,
            done: false,
          });
          await S.log(id, "Добавлено требование");
        },
      );
      break;
    case "revision":
      modal(
        "Добавить правку",
        area("Описание", "text", "", "required") +
          select("Приоритет", "priority", ["Обычный", "Высокий", "Низкий"]) +
          field("Раунд", "round", 1, "number", 'min="1" step="1" required'),
        "Сохранить",
        async (v) => {
          await S.save("revisions", {
            ...v,
            round: Number(v.round),
            order_id: id,
            status: "Новая",
            created_at: new Date().toISOString(),
          });
          await S.log(id, "Добавлена правка");
        },
      );
      break;
    case "note":
    case "edit-note": {
      const n = d().notes.find((n) => n.id === id);
      modal(
        n ? "Редактировать заметку" : "Новая заметка",
        area("Текст", "text", n?.text, "required"),
        "Сохранить",
        async (v) => {
          await S.save("notes", {
            ...n,
            ...v,
            order_id: n?.order_id || id,
            created_at: n?.created_at || new Date().toISOString(),
          });
          await S.log(n?.order_id || id, "Сохранена заметка");
        },
      );
      break;
    }
    case "add-link":
      modal(
        "Ссылка на материалы",
        field("Название", "name", "", "text", "required") +
          field("Ссылка", "url", "", "url", "required"),
        "Добавить",
        async (v) => {
          if (!/^https?:\/\//i.test(v.url))
            throw Error("Используйте ссылку https:// или http://");
          await S.save("attachments", {
            order_id: id,
            name: v.name,
            url: v.url,
          });
        },
      );
      break;
    case "attachment": {
      const f = d().attachments.find((a) => a.id === id);
      if (f.url) window.open(f.url, "_blank", "noopener,noreferrer");
      else if (f.content) {
        const a = document.createElement("a");
        a.href = f.content;
        a.download = f.name;
        a.click();
      } else {
        const { data, error } = await S.supabase.storage
          .from("attachments")
          .createSignedUrl(f.path, 60);
        if (error) throw error;
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
      break;
    }
    case "export-json":
      download(
        JSON.stringify(d(), null, 2),
        "clientflow.json",
        "application/json",
      );
      break;
    case "export-csv":
      download(
        csv([
          [
            "Заказ",
            "Клиент",
            "Этап",
            "Стоимость",
            "Получено",
            "Остаток",
            "Дедлайн",
          ],
          ...d().orders.map((o) => [
            o.title,
            client(o.client_id)?.name,
            stages[o.status],
            o.cost,
            totals(d(), [o]).paid,
            totals(d(), [o]).due,
            o.deadline,
          ]),
        ]),
        "clientflow-orders.csv",
        "text/csv",
      );
      break;
    case "proposal": {
      const target = order(id);
      modal(
        "Коммерческое предложение",
        `<article id="proposal"><div class="eyebrow">CLIENTFLOW / ПРЕДЛОЖЕНИЕ</div><h1>${esc(target.title)}</h1><p>Для ${esc(client(target.client_id)?.name)}</p><p class="prewrap">${esc(target.description)}</p><h3>Состав работ</h3><p class="prewrap">${esc(target.spec)}</p><p>Срок: ${date(target.deadline)}</p><h2>${money(target.cost)}</h2><p>Предоплата: ${money(target.prepayment)}. Остаток — после приёмки.</p></article><p class="no-print">Выберите «Сохранить как PDF» в окне печати браузера.</p>${btn("Печать / PDF", "print", "primary")}`,
      );
      break;
    }
    case "print":
      window.print();
      break;
    default:
      if (a.startsWith("delete-")) await confirmRemove(a.slice(7), id);
  }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el) {
    if (el.tagName === "BUTTON") e.preventDefault();
    Promise.resolve(action(el.dataset.action)).catch(fail);
  }
});
document.addEventListener("change", async (e) => {
  try {
    const el = e.target;
    if (el.dataset.filter) {
      filter[el.dataset.filter] = el.value;
      orders();
    }
    if (el.name === "quick-status") {
      const o = order(route()[1]);
      await S.save("orders", { ...o, status: Number(el.value) });
      await S.log(o.id, `Этап изменён: ${stages[el.value]}`);
      shell();
      notify("Этап обновлён");
    }
    if (el.dataset.requirement) {
      const r = d().order_requirements.find(
        (r) => r.id === el.dataset.requirement,
      );
      await S.save("order_requirements", { ...r, done: el.checked });
      shell();
    }
    if (el.dataset.revision) {
      const r = d().revisions.find((r) => r.id === el.dataset.revision);
      await S.save("revisions", { ...r, status: el.value });
      await S.log(r.order_id, "Изменён статус правки");
      shell();
    }
  } catch (error) {
    fail(error);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.dataset.filter === "q") {
    const pos = e.target.selectionStart;
    filter.q = e.target.value;
    orders();
    const input = $('[data-filter="q"]');
    input.focus();
    input.setSelectionRange(pos, pos);
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    searchModal();
  }
});
document.addEventListener("dragstart", (e) => {
  const el = e.target.closest("[data-drag]");
  if (el) e.dataTransfer.setData("text/plain", el.dataset.drag);
});
document.addEventListener("dragover", (e) => {
  if (e.target.closest("[data-drop]")) e.preventDefault();
});
document.addEventListener("drop", async (e) => {
  const target = e.target.closest("[data-drop]");
  if (!target) return;
  e.preventDefault();
  try {
    const o = order(e.dataTransfer.getData("text/plain"));
    if (o) {
      await S.save("orders", { ...o, status: Number(target.dataset.drop) });
      await S.log(o.id, `Этап изменён: ${stages[target.dataset.drop]}`);
      shell();
    }
  } catch (error) {
    fail(error);
  }
});
window.addEventListener("hashchange", () => {
  tab = "overview";
  shell();
});
try {
  await S.init();
  shell();
  if (S.supabase)
    S.supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY")
        setTimeout(() => authForm("update"), 0);
    });
} catch (error) {
  $("#app").innerHTML =
    '<main class="startup-error"><h1>Не удалось загрузить пространство</h1><p>Проверьте соединение и настройку базы Supabase, затем обновите страницу.</p></main>';
  fail(error);
}
