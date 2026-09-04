#!/usr/bin/env node
/**
 * scripts/encode-images.mjs
 *
 * Pre-codifica assets de campaña (estáticos, public/) a AVIF + WebP en 4 anchos
 * fijos — 640 / 1080 / 1600 / 2400 — como pide docs/spec/05-direccion-arte.md §10
 * ("Imágenes"): "los assets de campaña se pre-codifican en build ... y se sirven
 * con srcset — cero costo de runtime y cero dependencia de Cloudflare Images".
 *
 * Es un script de REPO, no de runtime: no lo importa ninguna ruta de la app y NO
 * se cablea todavía a `pnpm build` ni a `build:worker` (eso se hace cuando existan
 * los assets reales de campaña — ver §12, "assets pendientes"). Por ahora se corre
 * a mano.
 *
 * Cómo se corre:
 *   node scripts/encode-images.mjs                     # public/media/source -> public/media
 *   node scripts/encode-images.mjs --in dir --out dir   # directorios custom
 *   node scripts/encode-images.mjs --force              # re-codifica aunque ya exista el output
 *   node scripts/encode-images.mjs --help
 *
 * Convención de nombres de salida (la consume src/lib/media/srcset.ts):
 *   <mismo path relativo que el source, sin extensión>-<ancho>.<avif|webp>
 *   ej: public/media/source/hero/campana.jpg
 *    -> public/media/hero/campana-640.avif, ...-1080.avif, ...-1600.avif, ...-2400.avif
 *       (+ los mismos 4 anchos en .webp)
 *
 * Idempotente: si el archivo de salida ya existe y no se pasó --force, se saltea.
 * Nunca sobre-escala: si el ancho pedido es mayor al ancho original de la imagen,
 * usa el ancho original (sharp con `withoutEnlargement: true`) para no generar
 * variantes infladas sin ganancia real.
 *
 * Dependencia: `sharp` (NO está en package.json todavía — instalación fuera del
 * alcance de esta tarea). Si falta, el script falla con un mensaje accionable
 * en vez de un stack trace de "Cannot find module".
 */

import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Misma lista que CAMPAIGN_WIDTHS en src/lib/media/srcset.ts — si cambia acá,
// cambiar también ahí (no se comparte el módulo: éste es un script Node plano,
// ese es TS de la app, y el repo no tiene un runner que compile TS para scripts).
const WIDTHS = [640, 1080, 1600, 2400];
const FORMATS = ["avif", "webp"];
const SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    in: path.join(REPO_ROOT, "public", "media", "source"),
    out: path.join(REPO_ROOT, "public", "media"),
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") args.force = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--in") args.in = path.resolve(argv[++i] ?? "");
    else if (arg === "--out") args.out = path.resolve(argv[++i] ?? "");
    else {
      throw new Error(
        `Argumento desconocido: "${arg}". Usá --help para ver las opciones.`,
      );
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Pre-codifica imágenes de campaña a AVIF + WebP en 4 anchos (640/1080/1600/2400).

Uso:
  node scripts/encode-images.mjs [--in <dir>] [--out <dir>] [--force]

Opciones:
  --in <dir>   Directorio de origen (default: public/media/source)
  --out <dir>  Directorio de salida (default: public/media)
  --force      Re-codifica aunque el archivo de salida ya exista
  --help       Muestra esta ayuda
`);
}

/** Carga sharp de forma perezosa y falla con un mensaje accionable si no está instalado. */
async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default ?? mod;
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    console.error(
      `\nfalta sharp: pnpm add -D sharp\n\n(sharp es una dependencia de build, no de runtime — ` +
        `no la agrega este script porque este script no puede tocar package.json).\n\nError original: ${cause}\n`,
    );
    process.exitCode = 1;
    return null;
  }
}

/** Recorre `dir` recursivamente y devuelve las rutas absolutas de imágenes source soportadas. */
async function collectSourceFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(full);
      }
      if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return [full];
      }
      return [];
    }),
  );
  return files.flat();
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function encodeOne(sharpLib, sourcePath, inRoot, outRoot, force, stats) {
  const relDir = path.dirname(path.relative(inRoot, sourcePath));
  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const outDir = path.join(outRoot, relDir);
  await ensureDir(outDir);

  const source = sharpLib(sourcePath);
  const metadata = await source.metadata();
  const originalWidth = metadata.width ?? Infinity;

  for (const width of WIDTHS) {
    // No sobre-escalar: el ancho efectivo nunca supera el original.
    const targetWidth = Math.min(width, originalWidth);
    for (const format of FORMATS) {
      const outPath = path.join(outDir, `${baseName}-${width}.${format}`);
      if (existsSync(outPath) && !force) {
        stats.skipped++;
        continue;
      }
      await sharpLib(sourcePath)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .toFormat(format, format === "avif" ? { quality: 55 } : { quality: 75 })
        .toFile(outPath);
      stats.written++;
      console.log(`  ${path.relative(REPO_ROOT, outPath)}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const sharpLib = await loadSharp();
  if (!sharpLib) return; // loadSharp ya seteó exitCode y logueó el mensaje accionable

  if (!existsSync(args.in)) {
    console.error(
      `No existe el directorio de entrada: ${path.relative(REPO_ROOT, args.in)}\n` +
        `Creá el directorio y poné ahí los assets de campaña originales (jpg/png), o pasá --in <dir>.`,
    );
    process.exitCode = 1;
    return;
  }

  const sourceFiles = await collectSourceFiles(args.in);
  if (sourceFiles.length === 0) {
    console.log(
      `No hay imágenes en ${path.relative(REPO_ROOT, args.in)} (extensiones soportadas: ${[...SOURCE_EXTENSIONS].join(", ")}). Nada para hacer.`,
    );
    return;
  }

  console.log(
    `Codificando ${sourceFiles.length} imagen(es) x ${WIDTHS.length} anchos x ${FORMATS.length} formatos${args.force ? " (--force)" : ""}...\n`,
  );

  const stats = { written: 0, skipped: 0 };
  for (const sourcePath of sourceFiles) {
    await encodeOne(sharpLib, sourcePath, args.in, args.out, args.force, stats);
  }

  console.log(
    `\nListo: ${stats.written} archivo(s) generado(s), ${stats.skipped} salteado(s) (ya existían — usá --force para regenerar).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
