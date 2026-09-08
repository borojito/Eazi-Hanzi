(function () {
  const promptBox = document.getElementById('ai-prompt-box');
  const copyBtn = document.getElementById('copy-prompt-btn');
  const responseInput = document.getElementById('ai-response-input');
  const startBtn = document.getElementById('start-session-btn');
  const feedbackEl = document.getElementById('setup-feedback');

  const summaryWrap = document.getElementById('active-list-summary');
  const chipsEl = document.getElementById('active-list-chips');
  const modulesHint = document.getElementById('modules-hint');

  promptBox.value = AI_PROMPT_TEMPLATE;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promptBox.value);
    } catch (e) {
      promptBox.select();
      document.execCommand('copy');
    }
    copyBtn.textContent = '¡Copiado!';
    setTimeout(() => (copyBtn.textContent = 'Copiar prompt'), 1500);
  });

  function unlockModules() {
    document.querySelectorAll('[data-module]').forEach((el) => el.classList.remove('module-card--locked'));
    modulesHint.hidden = true;
  }

  function lockModules() {
    document.querySelectorAll('[data-module]').forEach((el) => el.classList.add('module-card--locked'));
    modulesHint.hidden = false;
  }

  function renderActiveList(list) {
    if (!list || list.length === 0) {
      summaryWrap.hidden = true;
      lockModules();
      return;
    }
    summaryWrap.hidden = false;
    chipsEl.innerHTML = '';
    list.forEach((char) => {
      const chip = document.createElement('span');
      chip.className = 'active-list-chip' + (char.resolved ? '' : ' active-list-chip--unresolved');
      chip.innerHTML =
        '<span class="active-list-chip__hanzi">' + char.hanzi + '</span>' +
        '<span>' + (char.resolved ? char.pinyin : 'no encontrado') + '</span>';
      chipsEl.appendChild(chip);
    });
    unlockModules();
  }

  function showFeedback(message, isError) {
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.className = 'setup-feedback ' + (isError ? 'feedback-incorrect' : 'feedback-correct');
  }

  startBtn.addEventListener('click', () => {
    const text = responseInput.value.trim();
    if (!text) {
      showFeedback('Pega la respuesta de tu IA antes de comenzar.', true);
      return;
    }
    const entries = parseAIResponse(text);
    if (entries.length === 0) {
      showFeedback('No se pudo reconocer ningun caracter en el texto pegado.', true);
      return;
    }
    saveActiveList(entries);
    const unresolvedCount = entries.filter((e) => !e.resolved).length;
    if (unresolvedCount > 0) {
      showFeedback(
        entries.length + ' caracteres cargados, ' + unresolvedCount + ' no se reconocieron (revisa el formato).',
        true
      );
    } else {
      showFeedback(entries.length + ' caracteres cargados. ¡Listos para practicar!', false);
    }
    renderActiveList(entries);
    renderProgressPanel(); // la lista nueva cambia los conteos
  });

  document.getElementById('reset-app-btn').addEventListener('click', () => {
    if (!confirm('¿Borrar tu lista y tus niveles de este navegador? No se puede deshacer.')) return;
    resetApp();
    responseInput.value = '';
    promptBox.value = AI_PROMPT_TEMPLATE;
    renderActiveList([]);
    renderProgressPanel();
    showFeedback('Listo, todo borrado. Pega una lista nueva para empezar.', false);
  });

  renderActiveList(getActiveList());
})();
