// Salva os arquivos da inspeção em Downloads/holo-recon/ e fecha o Firefox ao terminar.
const save = (name, text, type) => browser.downloads.download({
  url: URL.createObjectURL(new Blob([text], { type })),
  filename: 'holo-recon/' + name,
  conflictAction: 'overwrite',
  saveAs: false
});

const waitComplete = async (ids) => {
  for (let i = 0; i < 60; i++) {
    const items = (await Promise.all(ids.map((id) => browser.downloads.search({ id })))).flat();
    if (items.some((d) => d.state === 'interrupted')) throw new Error('download interrompido: ' + items.map((d) => d.error).join(','));
    if (items.length === ids.length && items.every((d) => d.state === 'complete')) return items.map((d) => d.filename);
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('download demorou demais');
};

browser.runtime.onMessage.addListener(async (msg) => {
  if (!msg || msg.type !== 'save') return undefined;
  try {
    const ids = [await save('wa-recon.json', msg.json, 'application/json'), await save('wa-snapshot.html', msg.html, 'text/html')];
    const files = await waitComplete(ids);
    setTimeout(async () => {
      for (const w of await browser.windows.getAll()) browser.windows.remove(w.id);
    }, 4000);
    return { ok: true, files };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});
