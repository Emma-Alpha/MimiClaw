#!/usr/bin/env zx

import 'zx/globals';
import sharp from 'sharp';
import png2icons from 'png2icons';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(PROJECT_ROOT, 'resources', 'icons');
const SRC_ASSETS_DIR = path.join(PROJECT_ROOT, 'src', 'assets');

const PNG_SOURCE = path.join(ICONS_DIR, 'icon-source.png');
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg');
const SOURCE_FILE = fs.existsSync(PNG_SOURCE) ? PNG_SOURCE : SVG_SOURCE;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

echo`🎨 Generating MimiClaw icons from ${path.basename(SOURCE_FILE)}...`;

if (!fs.existsSync(SOURCE_FILE)) {
  echo`❌ Icon source not found: ${SOURCE_FILE}`;
  process.exit(1);
}

await fs.ensureDir(ICONS_DIR);
await fs.ensureDir(SRC_ASSETS_DIR);

async function buildSquareVariant(sourceFile, options = {}) {
  const {
    size = 1024,
    paddingRatio = 0.1,
    sharpen = false,
  } = options;

  const trimmed = await sharp(sourceFile)
    .ensureAlpha()
    .trim({ background: TRANSPARENT, threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });

  const contentSize = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const contentBuffer = await sharp(trimmed.data)
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  const offset = Math.max(0, Math.round((size - contentSize) / 2));

  let pipeline = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: contentBuffer, left: offset, top: offset }]);

  if (sharpen) {
    pipeline = pipeline.sharpen();
  }

  return pipeline.png().toBuffer();
}

try {
  echo`  Processing source variants...`;
  const masterPngBuffer = await buildSquareVariant(SOURCE_FILE, {
    size: 1024,
    paddingRatio: 0.12,
  });
  const trayPngBuffer = await buildSquareVariant(SOURCE_FILE, {
    size: 256,
    paddingRatio: 0.03,
    sharpen: true,
  });

  await sharp(masterPngBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon.png'));
  await sharp(masterPngBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(SRC_ASSETS_DIR, 'logo.png'));
  echo`  ✅ Created icon.png and src/assets/logo.png`;

  await sharp(trayPngBuffer)
    .png()
    .toFile(path.join(ICONS_DIR, 'tray-icon.png'));
  echo`  ✅ Created tray-icon.png`;

  echo`🪟 Generating Windows .ico...`;
  const icoBuffer = png2icons.createICO(masterPngBuffer, png2icons.HERMITE, 0, false);
  if (icoBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), icoBuffer);
    echo`  ✅ Created icon.ico`;
  } else {
    echo(chalk.red`  ❌ Failed to create icon.ico`);
  }

  echo`🍎 Generating macOS .icns...`;
  const icnsBuffer = png2icons.createICNS(masterPngBuffer, png2icons.HERMITE, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsBuffer);
    echo`  ✅ Created icon.icns`;
  } else {
    echo(chalk.red`  ❌ Failed to create icon.icns`);
  }

  echo`🐧 Generating Linux PNG icons...`;
  const linuxSizes = [16, 32, 48, 64, 128, 256, 512];
  for (const size of linuxSizes) {
    await sharp(masterPngBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(ICONS_DIR, `${size}x${size}.png`));
  }
  echo`  ✅ Created ${linuxSizes.length} Linux PNG icons`;

  echo`📍 Generating macOS template tray icon...`;
  await sharp(trayPngBuffer)
    .modulate({ brightness: 0 })
    .resize(22, 22)
    .png()
    .toFile(path.join(ICONS_DIR, 'tray-icon-Template.png'));
  echo`  ✅ Created tray-icon-Template.png`;

  echo`\n✨ Icon generation complete!`;
  echo`   Source: ${SOURCE_FILE}`;
  echo`   Outputs: ${ICONS_DIR} + ${SRC_ASSETS_DIR}/logo.png`;
} catch (error) {
  echo(chalk.red`\n❌ Fatal Error: ${error.message}`);
  process.exit(1);
}
