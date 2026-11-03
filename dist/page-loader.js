const loader = document.querySelector('.page-loader');
if (loader) {
  const startedAt = performance.now();
  const meter = loader.querySelector('[role="progressbar"]');
  const percentage = loader.querySelector('.page-loader-percent');
  let entries = [];
  try { entries = JSON.parse(document.querySelector('#worldData').textContent).wall || []; } catch {}
  const sources = [...new Set(entries.map(entry=>entry.src).filter(Boolean))];
  const total = sources.length + 1;
  let completed = 0;
  let ended = false;
  function advance() {
    if (ended) return;
    completed++;
    const progress = Math.round(completed / total * 100);
    meter.setAttribute('aria-valuenow', String(progress));
    percentage.textContent = `${progress}%`;
    loader.style.setProperty('--load-progress', `${progress}%`);
  }
  function finish() {
    if (ended) return;
    ended = true;
    clearTimeout(fallback);
    const hold = Math.max(0, 1400 - (performance.now() - startedAt));
    setTimeout(() => {
      loader.classList.add('is-complete');
      setTimeout(() => {
        loader.remove();
        document.documentElement.classList.remove('page-is-loading');
        document.documentElement.classList.add('page-has-entered');
        dispatchEvent(new Event('appics:page-ready'));
      }, 650);
    }, hold + 220);
  }
  const fallback = setTimeout(finish,15000);
  const imageTasks = sources.map(src=>new Promise(resolve=>{
    const image = new Image();
    image.onload = image.onerror = () => { advance(); resolve(); };
    image.src = src;
  }));
  const fontTask = (document.fonts ? document.fonts.ready : Promise.resolve()).then(advance);
  Promise.all([...imageTasks,fontTask]).then(finish);
  addEventListener('pageshow',event=>{if(event.persisted)finish();});
}
