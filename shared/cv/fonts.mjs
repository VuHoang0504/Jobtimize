import { FONTS } from './model.mjs';
export function fontFiles() {
  return Object.entries(FONTS).flatMap(([id, { family }]) =>
    (id === 'lato' ? ['latin'] : ['latin', 'vietnamese']).flatMap(subset =>
      [400, 700].flatMap(weight => ['normal', 'italic'].map(style => ({
        file: `${id}-${subset}-${weight}-${style}.woff2`, family, weight, style, subset
      })))));
}
export function fontStyles(resolve = file => `/cv-fonts/${file}`) {
  return fontFiles().map(({ file, family, weight, style, subset }) =>
    `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url('${resolve(file)}') format('woff2');${subset === 'vietnamese' ? 'unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB;' : ''}}`).join('\n');
}
