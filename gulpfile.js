import gulp from "gulp";
import * as sass from "sass";
import { build as bundle } from "esbuild";
import { mkdir, writeFile, copyFile, cp } from "node:fs/promises";
import browserSync from "browser-sync";
import "dotenv/config";
export async function build() {
  await mkdir("dist/assets", { recursive: true });
  await copyFile("src/index.html", "dist/index.html");
  await cp("node_modules/bootstrap-icons/font/fonts", "dist/assets/fonts", {
    recursive: true,
  });
  await copyFile(
    "node_modules/bootstrap-icons/font/bootstrap-icons.css",
    "dist/assets/icons.css",
  );
  const css = sass.compile("src/scss/app.scss", {
    loadPaths: ["node_modules"],
    silenceDeprecations: ["import", "global-builtin", "color-functions"],
    style: "compressed",
  });
  await writeFile("dist/assets/app.css", css.css);
  await bundle({
    entryPoints: ["src/js/app.js"],
    bundle: true,
    outfile: "dist/assets/app.js",
    format: "esm",
    minify: true,
    sourcemap: true,
    define: {
      __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || ""),
      __SUPABASE_KEY__: JSON.stringify(
        process.env.SUPABASE_PUBLISHABLE_KEY || "",
      ),
    },
  });
}
export async function dev() {
  await build();
  browserSync
    .create()
    .init({ server: "dist", port: 3000, open: false, notify: false });
  gulp.watch("src/**/*", build);
}
export default build;
