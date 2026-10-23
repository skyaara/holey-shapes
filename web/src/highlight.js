// Tiny highlighter for the JavaScript, Swift and Kotlin snippets on the site.
const escapeHtml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const TOKENS = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\.|[^`\\])*`?)|\b(import|from|const|let|val|var|return|true|false|null|new|function)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
export function highlight(code) {
  let html = '';
  let last = 0;
  for (const match of code.matchAll(TOKENS)) {
    html += escapeHtml(code.slice(last, match.index));
    const kind = match[1] ? 'c' : match[2] ? 's' : match[3] ? 'k' : match[4] ? 'n' : 'f';
    html += `<span class="${kind}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  // A trailing newline needs a character after it or the overlay is one line short.
  return html + escapeHtml(code.slice(last)) + (code.endsWith('\n') ? ' ' : '');
}
