import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const externals = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-conversation',
  'react',
  'react/jsx-runtime',
]

const css = readFileSync(join(rootDir, 'src', 'client', 'ModelSelect.module.css'), 'utf8')

const cssHashed = css
  .replace(/\._root/g, '._mpl_root')
  .replace(/\._triggerProvider/g, '._mpl_triggerProvider')
  .replace(/\._triggerLabel/g, '._mpl_triggerLabel')
  .replace(/\._triggerEffort/g, '._mpl_triggerEffort')
  .replace(/\._trigger\b/g, '._mpl_trigger')
  .replace(/\._chevronOpen/g, '._mpl_chevronOpen')
  .replace(/\._chevron/g, '._mpl_chevron')
  .replace(/\._menu/g, '._mpl_menu')
  .replace(/\._status/g, '._mpl_status')
  .replace(/\._empty/g, '._mpl_empty')
  .replace(/\._error/g, '._mpl_error')
  .replace(/\._warning/g, '._mpl_warning')
  .replace(/\._retry/g, '._mpl_retry')
  .replace(/\._groups/g, '._mpl_groups')
  .replace(/\._groupTitle/g, '._mpl_groupTitle')
  .replace(/\._group\b/g, '._mpl_group')
  .replace(/\._selected/g, '._mpl_selected')
  .replace(/\._optionCopy/g, '._mpl_optionCopy')
  .replace(/\._modelName/g, '._mpl_modelName')
  .replace(/\._description/g, '._mpl_description')
  .replace(/\._check/g, '._mpl_check')
  .replace(/\._cellLabel/g, '._mpl_cellLabel')
  .replace(/\._cellValue/g, '._mpl_cellValue')
  .replace(/\._cellChevron/g, '._mpl_cellChevron')
  .replace(/\._cell\b/g, '._mpl_cell')
  .replace(/\._option\b/g, '._mpl_option')

async function main() {
  mkdirSync(join(rootDir, 'lib'), { recursive: true })

  // IIFE bundle: exports ride the returned object of the arrow-IIFE.
  const result = await build({
    entryPoints: [join(rootDir, 'src', 'client', 'index.tsx')],
    bundle: true,
    format: 'iife',
    globalName: '__MPL__',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    external: externals,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'text' },
    write: false,
    minify: true,
    sourcemap: false,
    logLevel: 'silent',
  })

  // Output looks like: var __MPL__ = (() => { ... return __toCommonJS(index_exports); })();
  // Strip the leading `var __MPL__ = ` so we can evaluate the IIFE inside the factory.
  let raw = result.outputFiles[0].text.trim();
  const marker = 'var __MPL__=';
  const mIdx = raw.indexOf(marker);
  if (mIdx === -1) throw new Error('unexpected esbuild iife shape: ' + raw.slice(0, 80));
  const body = raw.slice(mIdx + marker.length); // starts with '(() => ...)();'
  const iife = body.trim().replace(/;$/, '');

  const tagId = 'dsh-model-provider-label/ModelSelect.module.css'
  const styleSnippet =
    'var css=' + JSON.stringify(cssHashed) + ';' +
    "if(typeof document!=='undefined'&&document.querySelector('style[data-plugin-css='+JSON.stringify(" + JSON.stringify(tagId) + ")+']')===null){" +
    "var tag=document.createElement('style');tag.dataset.plugin='dsh-model-provider-label';tag.dataset.pluginCss=" +
    'JSON.stringify(' + JSON.stringify(tagId) + ');tag.textContent=css;document.head.appendChild(tag);}'

  const wrapped =
    'window.__ModuleLoader__.load({\n' +
    "  id: 'dsh-model-provider-label',\n" +
    '  factory: (require) => {\n' +
    "    var module = { exports: {} };\n" +
    '    var exports = module.exports;\n' +
    "    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });\n" +
    '    ' + styleSnippet + '\n' +
    '    const __exp = ' + iife + ';\n' +
    '    module.exports = __exp;\n' +
    '    return module.exports;\n' +
    '  }\n' +
    '});\n'

  writeFileSync(join(rootDir, 'lib', 'client.js'), wrapped, 'utf8')

  writeFileSync(
    join(rootDir, 'lib', 'index.js'),
    "export const name = 'dsh-model-provider-label'\n" +
      'export const inject = []\n' +
      'export function apply() {}\n',
    'utf8',
  )

  console.log('built lib/client.js (' + wrapped.length + ' bytes)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})