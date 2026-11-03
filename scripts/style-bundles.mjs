import path from 'node:path';
import {build} from 'esbuild';

export const styleBundlePath = html => html === 'index.html'
  ? 'src/styles.css'
  : `src/${html.replace(/\.html$/u,'').replaceAll('/','-')}-bundle.css`;

// Resolve styles only from the regular files already reviewed and read by buildSite.
// No disk loader, remote import, or unreviewed asset can enter the CSS graph.
export async function bundlePageStyles(htmlName, html, sources) {
  const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gu)];
  if (!links.length) return null;
  const origin = 'https://reviewed.invalid';
  const localPath = (reference, importer) => {
    const url = new URL(reference, origin + '/' + importer);
    const filename = decodeURIComponent(url.pathname.slice(1));
    if (url.origin !== origin || !filename.endsWith('.css') || !sources.has(filename)) {
      throw new Error(`Unapproved stylesheet reference in ${importer}: ${reference}`);
    }
    return filename;
  };
  const entries = links.map(([tag]) => {
    const href = tag.match(/\bhref="([^"]+)"/u)?.[1];
    if (!href || /\b(?:media|disabled|title)=/u.test(tag)) throw new Error('Conditional stylesheets need explicit bundle review.');
    return localPath(href, htmlName);
  });
  const output = await build({
    stdin: {contents: entries.map(filename => `@import "/${filename}";`).join('\n'), loader:'css', sourcefile:'reviewed-page.css'},
    bundle:true, minify:true, write:false, logLevel:'silent',
    plugins:[{name:'reviewed-css', setup(builder) {
      builder.onResolve({filter:/.*/}, args => ({path:localPath(args.path,args.importer || htmlName),namespace:'reviewed-css'}));
      builder.onLoad({filter:/.*/,namespace:'reviewed-css'}, args => ({contents:sources.get(args.path).toString('utf8'),loader:'css'}));
    }}]
  });
  const filename = styleBundlePath(htmlName);
  const relative = htmlName === '404.html' ? '/' + filename : path.posix.relative(path.posix.dirname(htmlName), filename);
  const release = links[0][0].match(/\?release=([^"&]+)/u)?.[1];
  let first = true;
  const bundledHtml = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gu, () => {
    if (!first) return '';
    first = false;
    return `<link rel="stylesheet" href="${relative}${release?'?release='+release:''}">`;
  });
  return {html:bundledHtml, filename, css:output.outputFiles[0].contents};
}
