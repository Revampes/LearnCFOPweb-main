(() => {
  const scrambleEl = document.getElementById('timer-scramble');
  if (!scrambleEl) return;

  const displayEl = document.getElementById('timer-display');
  const instructionEl = document.getElementById('timer-instruction');
  const newScrambleBtn = document.getElementById('new-scramble');
  const rowsEl = document.getElementById('time-rows');
  const clearBtn = document.getElementById('clear-times');
  const bestEl = document.getElementById('stat-best');
  const worstEl = document.getElementById('stat-worst');
  const avgEl = document.getElementById('stat-avg');
  const medianEl = document.getElementById('stat-median');
  const graphEl = document.getElementById('timer-graph');
  const triggerArea = document.getElementById('timer-touch');

  const storageKey = 'cfop-timer-runs';
  const holdThreshold = 500; // ms

  const axes = { R: 'R', L: 'R', U: 'U', D: 'U', F: 'F', B: 'F' };
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];

  const state = {
    runs: [],
    status: 'idle',
    holdTimer: null,
    holdStartedAt: 0,
    startTime: 0,
    tickId: null,
    scramble: '',
  };

  const loadRuns = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        id: item.id || crypto.randomUUID?.() || String(Date.now()),
        ms: Number(item.ms) || 0,
        penalty: item.penalty === 'plus2' ? 'plus2' : item.penalty === 'dnf' ? 'dnf' : 'none',
        created: Number(item.created) || Date.now(),
      }));
    } catch (err) {
      console.error('Could not load timer data', err);
      return [];
    }
  };

  const saveRuns = () => {
    localStorage.setItem(storageKey, JSON.stringify(state.runs));
  };

  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const generateScramble = () => {
    const length = 20 + Math.floor(Math.random() * 6);
    const moves = [];
    let prevAxis = null;
    while (moves.length < length) {
      const face = randomItem(faces);
      const axis = axes[face];
      if (axis === prevAxis) continue;
      const mod = randomItem(modifiers);
      moves.push(face + mod);
      prevAxis = axis;
    }
    state.scramble = moves.join(' ');
    scrambleEl.textContent = state.scramble;
  };

  const formatMs = (ms) => {
    if (Number.isNaN(ms)) return '—';
    if (ms >= 60000) {
      const mins = Math.floor(ms / 60000);
      const secs = ((ms % 60000) / 1000).toFixed(2).padStart(5, '0');
      return `${mins}:${secs}`;
    }
    return (ms / 1000).toFixed(2);
  };

  const computedTime = (entry) => {
    if (entry.penalty === 'dnf') return null;
    const plus = entry.penalty === 'plus2' ? 2000 : 0;
    return entry.ms + plus;
  };

  const timeLabel = (entry) => {
    if (entry.penalty === 'dnf') return 'DNF';
    const plus = entry.penalty === 'plus2' ? ' +2' : '';
    return `${formatMs(entry.ms + (entry.penalty === 'plus2' ? 2000 : 0))}${plus}`;
  };

  const renderStats = () => {
    const valid = state.runs
      .map((run) => computedTime(run))
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));

    if (!valid.length) {
      bestEl.textContent = '—';
      worstEl.textContent = '—';
      avgEl.textContent = '—';
      medianEl.textContent = '—';
      return;
    }

    const best = Math.min(...valid);
    const worst = Math.max(...valid);
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const sorted = [...valid].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    bestEl.textContent = formatMs(best);
    worstEl.textContent = formatMs(worst);
    avgEl.textContent = formatMs(avg);
    medianEl.textContent = formatMs(median);
  };

  const renderGraph = () => {
    if (!graphEl) return;
    graphEl.innerHTML = '';
    const valid = state.runs
      .map((run, idx) => ({ x: idx + 1, y: computedTime(run) }))
      .filter((p) => typeof p.y === 'number' && !Number.isNaN(p.y));

    if (!valid.length) {
      const empty = document.createElement('div');
      empty.className = 'graph-empty';
      empty.textContent = 'Run a few solves to see your trend.';
      graphEl.appendChild(empty);
      return;
    }

    const width = Math.max(260, valid.length * 34);
    const height = 180;
    const pad = 16;
    const maxY = Math.max(...valid.map((p) => p.y));

    const points = valid.map((p, i) => {
      const x = pad + (i / Math.max(1, valid.length - 1)) * (width - pad * 2);
      const y = height - pad - (p.y / maxY) * (height - pad * 2);
      return `${x},${y}`;
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.innerHTML = `
      <polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${points.join(' ')}" />
      ${points
        .map((pt) => `<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="4" fill="var(--accent)" />`)
        .join('')}
    `;
    graphEl.style.color = 'var(--accent)';
    graphEl.appendChild(svg);
  };

  const renderRows = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = '';
    state.runs.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'time-row';

      const label = document.createElement('strong');
      label.textContent = `#${idx + 1}`;

      const timeText = document.createElement('div');
      timeText.textContent = timeLabel(entry);
      timeText.setAttribute('aria-label', `Attempt ${idx + 1}`);

      const meta = document.createElement('div');
      meta.className = 'time-meta';
      const when = new Date(entry.created).toLocaleString();
      meta.textContent = `${when}`;

      const left = document.createElement('div');
      left.appendChild(timeText);
      left.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'time-actions';

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.textContent = '+2';
      if (entry.penalty === 'plus2') plusBtn.classList.add('active');
      plusBtn.addEventListener('click', () => {
        entry.penalty = entry.penalty === 'plus2' ? 'none' : 'plus2';
        saveRuns();
        renderAll();
      });

      const dnfBtn = document.createElement('button');
      dnfBtn.type = 'button';
      dnfBtn.textContent = 'DNF';
      if (entry.penalty === 'dnf') dnfBtn.classList.add('active');
      dnfBtn.addEventListener('click', () => {
        entry.penalty = entry.penalty === 'dnf' ? 'none' : 'dnf';
        saveRuns();
        renderAll();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        state.runs.splice(idx, 1);
        saveRuns();
        renderAll();
      });

      actions.appendChild(plusBtn);
      actions.appendChild(dnfBtn);
      actions.appendChild(delBtn);

      row.appendChild(label);
      row.appendChild(left);
      row.appendChild(actions);
      rowsEl.appendChild(row);
    });
  };

  const renderAll = () => {
    renderRows();
    renderStats();
    renderGraph();
  };

  const addRun = (ms) => {
    state.runs.push({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ms,
      penalty: 'none',
      created: Date.now(),
    });
    saveRuns();
    renderAll();
  };

  const setDisplay = (ms) => {
    displayEl.textContent = formatMs(ms);
  };

  const setInstruction = (text) => {
    if (instructionEl) instructionEl.textContent = text;
  };

  const clearHold = () => {
    if (state.holdTimer) clearTimeout(state.holdTimer);
    state.holdTimer = null;
    if (state.status === 'holding' || state.status === 'ready') state.status = 'idle';
  };

  const startTimer = () => {
    state.status = 'running';
    state.startTime = performance.now();
    setInstruction('Running… press space or click to stop.');
    state.tickId = setInterval(() => {
      const elapsed = performance.now() - state.startTime;
      setDisplay(elapsed);
    }, 16);
  };

  const stopTimer = () => {
    if (state.status !== 'running') return;
    const elapsed = performance.now() - state.startTime;
    clearInterval(state.tickId);
    state.tickId = null;
    state.status = 'idle';
    setDisplay(elapsed);
    addRun(elapsed);
    generateScramble();
    setInstruction('Saved. Hold space or left-click for 0.5s, release to start.');
  };

  const handleTriggerDown = (event) => {
    if (event && event.target instanceof HTMLElement) {
      if (event.target.closest('button, a, input, textarea, select, label')) return;
    }
    if (state.status === 'running') {
      stopTimer();
      return;
    }
    if (state.status !== 'idle') return;
    state.status = 'holding';
    state.holdStartedAt = performance.now();
    setInstruction('Holding the button for at least 0.5 seconds');
    state.holdTimer = setTimeout(() => {
      if (state.status === 'holding') {
        state.status = 'ready';
        setInstruction('Ready. Release to start.');
      }
    }, holdThreshold);
  };

  const handleTriggerUp = () => {
    if (state.status === 'ready') {
      clearHold();
      startTimer();
      return;
    }
    if (state.status === 'holding') {
      clearHold();
      setInstruction('Hold spacebar or left-click for 0.5s, release to start. Press again to stop.');
    }
  };

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (event.repeat) return;
    handleTriggerDown(event);
  });

  document.addEventListener('keyup', (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    handleTriggerUp();
  });

  triggerArea?.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    handleTriggerDown(event);
  });

  triggerArea?.addEventListener('mouseup', (event) => {
    if (event.button !== 0) return;
    handleTriggerUp();
  });

  // Mobile support: prevent scrolling/dragging while holding
  triggerArea?.addEventListener(
    'touchstart',
    (event) => {
      // Allow buttons to work normally
      if (event.target.closest('button, a, input, textarea, select, label')) {
        return;
      }
      // Prevent scroll/zoom so long-press works reliably
      event.preventDefault();
      handleTriggerDown(event);
    },
    { passive: false }
  );

  triggerArea?.addEventListener('touchend', (event) => {
    handleTriggerUp();
  });

  triggerArea?.addEventListener('touchcancel', (event) => {
    handleTriggerUp();
  });

  newScrambleBtn?.addEventListener('click', () => {
    generateScramble();
    setInstruction('Scramble refreshed. Hold to start.');
  });

  clearBtn?.addEventListener('click', () => {
    state.runs = [];
    saveRuns();
    renderAll();
  });

  state.runs = loadRuns();
  generateScramble();
  renderAll();
  setInstruction('Hold spacebar or left-click for 0.5s, release to start. Press again to stop.');
})();
