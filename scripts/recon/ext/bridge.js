// Ponte (mundo isolado): mostra o aviso na tela e entrega o resultado ao background.
(() => {
  const STEPS = {
    login: 'Escaneie o QR code com o celular (Aparelhos conectados).',
    sound: 'Deixe uma conversa aberta e peça para alguém te mandar mensagem em OUTRA conversa, para o som tocar.',
    chat: 'Som capturado. Agora abra uma conversa que tenha mensagens recebidas e enviadas.',
    calls: '1) Ligue (voz) para alguém: deixe chamar uns 8 s, a pessoa ATENDE, conversem uns 5 s e desliguem. 2) A pessoa te liga: deixe tocar uns 5 s, ATENDA, uns 5 s e desliguem. 3) Clique em "Terminei, salvar".',
    saving: 'Gerando os arquivos (sem texto, nomes nem fotos)…',
    saved: 'Salvo em Downloads/holo-recon. Esta janela fecha sozinha.',
    error: 'Não consegui salvar. Avise o Claude.'
  };
  const box = document.createElement('div');
  box.setAttribute('style', 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;padding:12px 14px;' +
    'background:#0b0d10;color:#9ff3f6;border:1px solid #5ce1e6;font:14px/1.35 system-ui,sans-serif;box-shadow:0 0 12px rgba(92,225,230,.35)');
  const title = document.createElement('div');
  title.textContent = 'HOLO-RECON';
  title.setAttribute('style', 'font-weight:700;letter-spacing:.12em;color:#ff5a50;margin-bottom:4px');
  const text = document.createElement('div');
  text.textContent = 'Carregando…';
  const btn = document.createElement('button');
  btn.textContent = 'Salvar agora, sem esperar o som';
  btn.setAttribute('style', 'margin-top:8px;background:transparent;color:#f0d64a;border:1px solid #f0d64a;padding:5px 8px;cursor:pointer;font:inherit');
  btn.hidden = true;
  btn.addEventListener('click', () => window.postMessage({ holoReconCmd: 'save' }, '*'));
  box.append(title, text, btn);
  const mount = () => (document.body ? document.body.append(box) : setTimeout(mount, 300));
  mount();

  let done = false;
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || typeof e.data !== 'object' || done) return;
    const d = e.data;
    if (d.holoRecon === 'status') {
      text.textContent = STEPS[d.stage] || d.stage;
      btn.hidden = !(d.stage === 'sound' || d.stage === 'chat' || d.stage === 'calls') || !d.chat;
      if (d.stage === 'calls') btn.textContent = 'Terminei, salvar' + (d.calls ? ' (' + d.calls + ' eventos de ligação)' : '');
    } else if (d.holoRecon === 'done' && typeof d.json === 'string') {
      done = true; btn.hidden = true;
      browser.runtime.sendMessage({ type: 'save', json: d.json, html: String(d.html || '') })
        .then((r) => { text.textContent = r && r.ok ? STEPS.saved : STEPS.error + ' ' + ((r && r.error) || ''); })
        .catch((err) => { text.textContent = STEPS.error + ' ' + err; });
    }
  });
})();
