(() => {
  const scrambleInput = document.getElementById('scramble-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusEl = document.getElementById('solution-status');
  const resultsEl = document.getElementById('step-results');
  const sampleButtons = Array.from(document.querySelectorAll('[data-scramble]'));

  const normalizeMoves = (text = '') => text.replace(/\s+/g, ' ').trim();
  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

  const countMoves = (moves) => {
    const countString = (value = '') => normalizeMoves(value).split(' ').filter(Boolean).length;
    if (Array.isArray(moves)) return moves.reduce((sum, part) => sum + countString(part), 0);
    return countString(moves);
  };

  const joinMoves = (moves) => {
    if (Array.isArray(moves)) return normalizeMoves(moves.join(' '));
    return normalizeMoves(moves);
  };

  const renderPhase = ({ title, hint }, moves) => {
    const step = document.createElement('article');
    step.className = 'solution-step';

    const heading = document.createElement('h4');
    heading.textContent = title;
    step.appendChild(heading);

    if (hint) {
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = hint;
      step.appendChild(note);
    }

    if (Array.isArray(moves)) {
      const list = document.createElement('ol');
      list.style.margin = '0';
      list.style.paddingLeft = '18px';
      moves.forEach((part, idx) => {
        const li = document.createElement('li');
        li.style.margin = '4px 0';
        const label = document.createElement('div');
        label.className = 'note';
        label.textContent = `Pair ${idx + 1}`;
        const alg = document.createElement('div');
        alg.className = 'solution-moves';
        alg.textContent = normalizeMoves(part) || 'Solved';
        li.appendChild(label);
        li.appendChild(alg);
        list.appendChild(li);
      });
      step.appendChild(list);
    } else {
      const alg = document.createElement('div');
      alg.className = 'solution-moves';
      alg.textContent = normalizeMoves(moves) || 'Solved';
      step.appendChild(alg);
    }

    const tally = document.createElement('div');
    tally.className = 'note';
    tally.textContent = `${countMoves(moves)} moves`;
    step.appendChild(tally);

    return step;
  };

  const renderSolution = (solution) => {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    const phases = [
      { key: 'cross', title: 'Cross', hint: 'White cross on D.' },
      { key: 'f2l', title: 'F2L (4 pairs)', hint: 'Pairs are ordered from the solver output.' },
      { key: 'oll', title: 'OLL', hint: 'Orient last-layer stickers.' },
      { key: 'pll', title: 'PLL', hint: 'Permute last-layer pieces.' },
    ];

    let totalMoves = 0;

    phases.forEach((phase) => {
      const moves = solution[phase.key] || '';
      totalMoves += countMoves(moves);
      resultsEl.appendChild(renderPhase({ title: phase.title, hint: phase.hint }, moves));
    });

    const summary = document.createElement('article');
    summary.className = 'solution-step';
    const head = document.createElement('div');
    head.className = 'status-pill';
    head.textContent = `Total moves: ${totalMoves}`;
    summary.appendChild(head);

    const combined = document.createElement('div');
    combined.className = 'solution-moves';
    combined.textContent = phases
      .map((p) => joinMoves(solution[p.key] || ''))
      .filter(Boolean)
      .join(' ');
    summary.appendChild(combined);

    resultsEl.appendChild(summary);
  };

  const handleSolve = () => {
    const scramble = normalizeMoves(scrambleInput?.value || '');
    if (!scramble) {
      setStatus('Please enter a scramble.');
      if (resultsEl) resultsEl.innerHTML = '';
      return;
    }

    if (resultsEl) resultsEl.innerHTML = '<div class="solution-step"><div class="solution-moves">Analyzing…</div></div>';
    setStatus('Computing CFOP breakdown…');

    try {
      if (typeof rubiksCubeSolver === 'undefined') {
        throw new Error('Solver library is not loaded.');
      }
      const solver = new rubiksCubeSolver.Solver(scramble);
      solver.solve();
      const partitions = solver.getPartitions();
      renderSolution(partitions);
      setStatus('CFOP breakdown ready.');
    } catch (error) {
      console.error(error);
      setStatus('Unsolvable scramble or invalid notation.');
      if (resultsEl) {
        const card = document.createElement('article');
        card.className = 'solution-step';
        const title = document.createElement('h4');
        title.textContent = 'Error';
        const desc = document.createElement('div');
        desc.className = 'note';
        desc.textContent = error?.message || error || 'Unknown error.';
        card.appendChild(title);
        card.appendChild(desc);
        resultsEl.innerHTML = '';
        resultsEl.appendChild(card);
      }
    }
  };

  const handleClear = () => {
    if (scrambleInput) scrambleInput.value = '';
    setStatus('Waiting for a scramble.');
    if (resultsEl) resultsEl.innerHTML = '';
    scrambleInput?.focus();
  };

  analyzeBtn?.addEventListener('click', handleSolve);
  clearBtn?.addEventListener('click', handleClear);
  scrambleInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSolve();
    }
  });

  sampleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.scramble || '';
      if (scrambleInput) scrambleInput.value = preset;
      handleSolve();
    });
  });
})();
