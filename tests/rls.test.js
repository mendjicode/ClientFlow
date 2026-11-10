import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("SQL применяется; RLS и внешние ключи изолируют двух владельцев", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`,
    );
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      ca = "10000000-0000-4000-8000-000000000001",
      cb = "10000000-0000-4000-8000-000000000002",
      oa = "20000000-0000-4000-8000-000000000001";
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');insert into clients(id,user_id,name) values('${ca}','${a}','A'),('${cb}','${b}','B');insert into orders(id,user_id,client_id,title) values('${oa}','${a}','${ca}','Private');set role authenticated;set request.jwt.claim.sub='${b}';`,
    );
    assert.equal((await db.query("select * from orders")).rows.length, 0);
    assert.equal((await db.query("select * from clients")).rows.length, 1);
    await assert.rejects(
      db.exec(
        `insert into notes(user_id,order_id,text) values('${b}','${oa}','attack')`,
      ),
    );
    await assert.rejects(
      db.exec(`insert into clients(user_id,name) values('${a}','attack')`),
    );
    await assert.rejects(
      db.exec(
        `insert into orders(user_id,client_id,title) values('${b}','${ca}','attack')`,
      ),
    );
    await db.exec(
      `set request.jwt.claim.sub='${a}';insert into notes(order_id,text) values('${oa}','mine');`,
    );
    assert.equal((await db.query("select * from orders")).rows.length, 1);
    assert.equal((await db.query("select * from notes")).rows.length, 1);
    await db.exec(
      `set request.jwt.claim.sub='${b}';update orders set title='hacked' where id='${oa}';delete from orders where id='${oa}';set request.jwt.claim.sub='${a}';`,
    );
    assert.equal(
      (await db.query("select title from orders")).rows[0].title,
      "Private",
    );
  } finally {
    await db.close();
  }
});
