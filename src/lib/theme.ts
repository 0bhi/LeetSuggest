export const THEME_STORAGE_KEY = "leetsuggest-theme";

const key = JSON.stringify(THEME_STORAGE_KEY);

export const THEME_SCRIPT = `(function(){try{var k=${key},s=localStorage.getItem(k),t=s==="light"||s==="dark"?s:window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
