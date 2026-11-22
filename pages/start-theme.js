/* Theme before first paint (srcs.online/start pages, kept external for the CSP). */
(function(){try{
  if(localStorage.getItem('sr-theme-v')!=='2'){localStorage.removeItem('sr-theme');localStorage.setItem('sr-theme-v','2');}
  if(localStorage.getItem('sr-theme')==='dark'){document.documentElement.classList.add('dark');}
}catch(e){}})();
/* Move a project link's invite token out of the address bar before anything
   else on the page (analytics included) can read the URL. */
(function(){try{
  var q=new URLSearchParams(location.search),t=q.get('invite');
  if(t&&/^\/start\/?$/.test(location.pathname)){sessionStorage.setItem('srcs-start-invite',t);history.replaceState(null,'',location.pathname);}
}catch(e){}})();
