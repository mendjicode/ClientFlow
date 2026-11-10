import { createClient } from "@supabase/supabase-js";
import { empty, uid } from "./domain.js";
const url = __SUPABASE_URL__,
  key = __SUPABASE_KEY__;
export const supabase = url && key ? createClient(url, key) : null;
export let user = null,
  mode = "local";
let data = empty();
const tables = [
  "clients",
  "orders",
  "order_requirements",
  "revisions",
  "notes",
  "payments",
  "time_entries",
  "task_templates",
  "task_template_items",
  "attachments",
  "activity_logs",
];
const storageKey = () => `clientflow-v1-${mode}`;
export const get = () => data;
export async function init() {
  if (supabase) {
    const { data: s, error } = await supabase.auth.getSession();
    if (error) throw error;
    user = s.session?.user || null;
    mode = user ? "cloud" : "local";
  }
  if (sessionStorage.getItem("clientflow-mode") === "demo") mode = "demo";
  await load();
}
export async function load() {
  if (mode === "cloud") {
    const next = empty();
    await Promise.all(
      tables.map(async (t) => {
        const rows = [];
        for (let offset = 0; ; offset += 1000) {
          const { data: page, error } = await supabase
            .from(t)
            .select("*")
            .order("id")
            .range(offset, offset + 999);
          if (error) throw error;
          rows.push(...page);
          if (page.length < 1000) break;
        }
        next[t] = rows;
      }),
    );
    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (p) next.profile = { ...next.profile, ...p };
    data = next;
  } else {
    const s = localStorage.getItem(storageKey());
    data = s ? JSON.parse(s) : empty();
  }
}
export async function switchMode(next) {
  if (next === "cloud" && !user) throw Error("Сначала войдите в аккаунт");
  mode = next;
  sessionStorage.setItem("clientflow-mode", mode);
  await load();
}
export async function setDemo(value) {
  mode = "demo";
  sessionStorage.setItem("clientflow-mode", mode);
  data = value;
  await persist();
}
export async function persist() {
  if (mode !== "cloud") {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(data));
    } catch {
      throw Error(
        "Не удалось сохранить данные в браузере. Возможно, хранилище заполнено. Экспортируйте данные и освободите место.",
      );
    }
  }
}
export async function save(table, record) {
  const row = { ...record, id: record.id || uid() };
  if (table === "orders" && !row.deadline) row.deadline = null;
  if (mode === "cloud") {
    row.user_id = user.id;
    const { error } = await supabase.from(table).upsert(row);
    if (error) throw error;
  }
  const previous = [...data[table]];
  const idx = data[table].findIndex((r) => r.id === row.id);
  if (idx < 0) data[table].push(row);
  else data[table][idx] = row;
  try {
    await persist();
  } catch (error) {
    data[table] = previous;
    throw error;
  }
  return row;
}
export async function remove(table, id) {
  if (mode === "cloud") {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  }
  data[table] = data[table].filter((r) => r.id !== id);
  if (table === "orders" && timer()?.order_id === id) await setTimer(null);
  if (table === "orders")
    for (const t of tables.filter(
      (t) => !["clients", "orders", "task_templates"].includes(t),
    ))
      data[t] = data[t].filter((r) => r.order_id !== id);
  await persist();
}
export async function profile(value) {
  if (mode === "cloud") {
    const { error } = await supabase
      .from("profiles")
      .upsert({ ...value, id: user.id });
    if (error) throw error;
  }
  data.profile = value;
  await persist();
}
export async function log(order_id, text) {
  await save("activity_logs", {
    order_id: order_id || null,
    text,
    created_at: new Date().toISOString(),
  });
}
export async function setTimer(timer) {
  data.timer = timer;
  await persist();
  localStorage.setItem(
    `clientflow-timer-${mode}-${user?.id || "browser"}`,
    JSON.stringify(timer),
  );
}
export function timer() {
  return (
    data.timer ||
    JSON.parse(
      localStorage.getItem(
        `clientflow-timer-${mode}-${user?.id || "browser"}`,
      ) || "null",
    )
  );
}
export async function upload(file, order_id) {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Максимальный размер файла — 10 МБ");
  if (mode === "cloud") {
    const path = `${user.id}/${uid()}/${file.name}`;
    const { error } = await supabase.storage
      .from("attachments")
      .upload(path, file);
    if (error) throw error;
    return save("attachments", {
      order_id,
      name: file.name,
      path,
      size: file.size,
    });
  }
  if (file.size > 1024 * 1024)
    throw Error("В локальном режиме максимум 1 МБ на файл");
  const content = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return save("attachments", {
    order_id,
    name: file.name,
    content,
    size: file.size,
  });
}
