// Inline script that runs before hydration to set the saved theme on <html>.
// Prevents a flash of the wrong theme on reload. Stringified body lives in a
// dangerouslySetInnerHTML script tag in the document <head>.

const SCRIPT = `
(function() {
  try {
    var saved = localStorage.getItem('og-theme');
    var theme = saved === 'leather' || saved === 'paper'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'leather' : 'paper');
    document.documentElement.classList.add('theme-' + theme);
  } catch (e) {
    document.documentElement.classList.add('theme-paper');
  }
})();
`.trim();

export function ThemeScript() {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration theme
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
