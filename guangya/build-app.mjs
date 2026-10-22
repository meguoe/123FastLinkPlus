import { execFileSync } from 'node:child_process';
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin' || Number(process.versions.node.split('.')[0]) < 24) throw Error('请使用 macOS 和 Node 24 或更新版本打包');
const root = dirname(fileURLToPath(import.meta.url));
const name = '光鸭云助手';
const bundleId = 'local.guangya.assistant';
const dist = join(root, 'dist');
const destination = join(dist, `${name}.app`);
const run = (file, args) => execFileSync(file, args, { encoding: 'utf8' }).trim();
const node = process.execPath;
const icon = '/Applications/光鸭云盘.app/Contents/Resources/icon.icns';
try { await access(icon); } catch { throw Error('未找到光鸭云盘图标：' + icon); }
if ((await readFile(icon)).subarray(0, 4).toString('latin1') !== 'icns') throw Error('光鸭云盘图标不是有效的 icns 文件：' + icon);
const dependencies = run('/usr/bin/otool', ['-L', node]).split('\n').slice(1).map(line => line.trim().split(' (')[0]);
if (dependencies.some(path => !path.startsWith('/usr/lib/') && !path.startsWith('/System/Library/'))) {
  throw Error('当前 Node 依赖外部动态库，请使用仅依赖系统库的官方 Node 再打包');
}
const minimumVersion = run('/usr/bin/otool', ['-l', node]).match(/\bminos\s+([\d.]+)/)?.[1];
if (!minimumVersion) throw Error('无法确定内置 Node 的最低 macOS 版本');
const licensePaths = [process.env.NODE_LICENSE_PATH, join(dirname(node), '../LICENSE'), `/usr/local/n/versions/node/${process.versions.node}/LICENSE`].filter(Boolean);
let license;
for (const path of licensePaths) {
  try { license = await readFile(path, 'utf8'); break; } catch { }
}
if (!license?.includes('Node.js')) throw Error('未找到 Node 许可证，请用 NODE_LICENSE_PATH 指定当前版本的 LICENSE 文件');
const scripts = (await readdir(root)).filter(file => /^guangya-.*\.(?:js|mjs)$/.test(file));
scripts.push('open-guangya-devtools.mjs');
for (const file of scripts) run(node, ['--check', join(root, file)]);
await mkdir(dist, { recursive: true });
const temporary = await mkdtemp(join(dist, '.guangya-build-'));
try {
  const app = join(temporary, `${name}.app`), contents = join(app, 'Contents');
  const resources = join(contents, 'Resources'), macos = join(contents, 'MacOS');
  await mkdir(join(resources, 'scripts'), { recursive: true });
  await mkdir(macos, { recursive: true });
  for (const file of scripts) await copyFile(join(root, file), join(resources, 'scripts', file));
  await copyFile(node, join(resources, 'node'));
  await chmod(join(resources, 'node'), 0o755);
  await copyFile(icon, join(resources, 'icon.icns'));
  await writeFile(join(resources, 'NODE_LICENSE.txt'), license);
  await writeFile(join(resources, 'BUILD_INFO.json'), JSON.stringify({ bundleId, version: '1.0.0', node: process.version, architecture: process.arch, minimumMacOS: minimumVersion, scripts }, null, 2) + '\n');
  await writeFile(join(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>${bundleId}</string>
<key>CFBundleName</key><string>${name}</string>
<key>CFBundleDisplayName</key><string>${name}</string>
<key>CFBundleIconFile</key><string>icon</string>
<key>CFBundleExecutable</key><string>GuangyaAssistant</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleURLTypes</key><array><dict>
<key>CFBundleURLName</key><string>Magnet Link</string>
<key>CFBundleURLSchemes</key><array><string>magnet</string></array>
</dict></array>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSUIElement</key><true/>
<key>LSMinimumSystemVersion</key><string>${minimumVersion}</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>\n`);
  run('/usr/bin/clang', ['-fobjc-arc', '-Wall', '-Wextra', '-Werror', `-mmacosx-version-min=${minimumVersion}`, '-framework', 'AppKit', '-framework', 'Foundation', join(root, 'macos-launcher.m'), '-o', join(macos, 'GuangyaAssistant')]);
  run('/usr/bin/plutil', ['-lint', join(contents, 'Info.plist')]);
  run('/usr/bin/codesign', ['--force', '--sign', '-', app]);
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
  if (run(join(resources, 'node'), ['--version']) !== process.version) throw Error('内置 Node 版本验证失败');
  let exists = false;
  try { await access(destination); exists = true; } catch { }
  if (exists) {
    const previous = JSON.parse(await readFile(join(destination, 'Contents/Resources/BUILD_INFO.json'), 'utf8'));
    if (previous.bundleId !== bundleId) throw Error('目标位置存在其他应用，拒绝覆盖');
    await rm(destination, { recursive: true });
  }
  await rename(app, destination);
  console.log(JSON.stringify({ app: destination, architecture: process.arch, node: process.version, minimumMacOS: minimumVersion, scripts: scripts.length, signing: 'ad-hoc（本机签名，未公证）' }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
