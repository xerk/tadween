export const THEME_KEY = 'tadween-theme';

/* Runs in <head> before first paint: a stored choice wins, otherwise the OS setting, and
   the page keeps following the OS until the visitor picks a theme with the toggle. It also
   marks <html> with `motion-ok` when animations are allowed, so the hero copy can wait for
   its reveal instead of flashing (landing.css shows it anyway after 2.5s). */
export const themeScript = `(function(){var d=document.documentElement,k='${THEME_KEY}';
function s(){try{return localStorage.getItem(k)}catch(e){return null}}
var m=window.matchMedia('(prefers-color-scheme: dark)');
function a(t){d.setAttribute('data-theme',t);d.style.colorScheme=t}
a(s()||(m.matches?'dark':'light'));
m.addEventListener&&m.addEventListener('change',function(e){if(!s())a(e.matches?'dark':'light')});
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('motion-ok');})();`;
