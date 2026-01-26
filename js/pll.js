(() => {
  const board = document.getElementById('pll-board');
  const statusEl = document.getElementById('pll-status');
  const matchEl = document.getElementById('pll-match');
  const searchBtn = document.getElementById('pll-search');
  const resetBtn = document.getElementById('pll-reset');
  const colorLabel = document.getElementById('pll-current-color');

  const ringOrder = [
    { row: 0, col: 1, idx: 0 },
    { row: 0, col: 2, idx: 1 },
    { row: 0, col: 3, idx: 2 },
    { row: 1, col: 0, idx: 3, orientation: 'vertical' },
    { row: 2, col: 0, idx: 4, orientation: 'vertical' },
    { row: 3, col: 0, idx: 5, orientation: 'vertical' },
    { row: 1, col: 4, idx: 6, orientation: 'vertical' },
    { row: 2, col: 4, idx: 7, orientation: 'vertical' },
    { row: 3, col: 4, idx: 8, orientation: 'vertical' },
    { row: 4, col: 1, idx: 9 },
    { row: 4, col: 2, idx: 10 },
    { row: 4, col: 3, idx: 11 },
  ];

  const topPattern = [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 3, col: 1 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
  ];

  const colorSequence = [
    { name: 'Red', key: 'red' },
    { name: 'Green', key: 'green' },
    { name: 'Blue', key: 'blue' },
    { name: 'Orange', key: 'orange' },
  ];

  const ringColors = Array(12).fill(null);
  const colorCounts = { red: 0, green: 0, blue: 0, orange: 0 };

  const currentFillingColor = () => {
    for (const c of colorSequence) {
      if (colorCounts[c.key] < 3) return c;
    }
    return colorSequence[colorSequence.length - 1];
  };

  const updateColorLabel = () => {
    const totalAssigned = ringColors.filter(Boolean).length;
    if (totalAssigned === 12) {
      colorLabel.textContent = 'Assigning: Complete';
      return;
    }
    const c = currentFillingColor();
    colorLabel.textContent = `Assigning: ${c.name} (${colorCounts[c.key]}/3)`;
  };

  const makeTopSticker = () => {
    const el = document.createElement('div');
    el.className = 'sticker top active static';
    el.setAttribute('aria-hidden', 'true');
    return el;
  };

  const makeSticker = ({ idx, orientation }) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `sticker ring${orientation ? ' ' + orientation : ''}`;
    el.dataset.index = idx;
    el.setAttribute('aria-label', `Side sticker ${idx + 1}`);
    el.addEventListener('click', () => {
      const target = currentFillingColor();
      if (!target) return;

      const current = ringColors[idx];

      if (current === target.key) {
        colorCounts[current] = Math.max(0, colorCounts[current] - 1);
        ringColors[idx] = null;
        render();
        matchEl.innerHTML = '';
        return;
      }

      if (current) {
        colorCounts[current] = Math.max(0, colorCounts[current] - 1);
      }

      if (colorCounts[target.key] < 3) {
        ringColors[idx] = target.key;
        colorCounts[target.key] += 1;
      } else {
        ringColors[idx] = null;
      }
      render();
      matchEl.innerHTML = '';
    });
    return el;
  };

  const buildBoard = () => {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));

    ringOrder.forEach((cell) => {
      grid[cell.row][cell.col] = makeSticker({ idx: cell.idx, orientation: cell.orientation });
    });

    topPattern.forEach(({ row, col }) => {
      grid[row][col] = makeTopSticker();
    });

    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const node = grid[r][c] || document.createElement('div');
        node.classList.add('placeholder');
        if (grid[r][c]) node.classList.remove('placeholder');
        board.appendChild(node);
      }
    }
    render();
  };

  const render = () => {
    board.querySelectorAll('.sticker').forEach((el) => {
      const idx = Number(el.dataset.index);
      if (Number.isNaN(idx)) return;
      const color = ringColors[idx];
      el.classList.remove('color-red', 'color-green', 'color-blue', 'color-orange');
      if (color) el.classList.add(`color-${color}`);
    });
    const totalAssigned = ringColors.filter(Boolean).length;
    const c = currentFillingColor();
    if (totalAssigned === 12) {
      statusEl.textContent = 'Side colors: 12/12 · Complete';
    } else {
      statusEl.textContent = `Side colors: ${totalAssigned}/12 · ${c.name} next`;
    }
    updateColorLabel();
  };

  const ringMatrixFromPattern = (pattern) => {
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(null));
    const values = pattern.split('');
    ringOrder.forEach(({ row, col, idx }) => {
      matrix[row][col] = values[idx];
    });
    return matrix;
  };

  const rotateMatrixCW = (matrix) => {
    const size = matrix.length;
    const next = Array.from({ length: size }, () => Array(size).fill(null));
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        next[c][size - 1 - r] = matrix[r][c];
      }
    }
    return next;
  };

  const ringPatternFromMatrix = (matrix) => ringOrder
    .map(({ row, col }) => matrix[row][col] || 'X')
    .join('');

  const rotateRingPattern = (pattern, turns) => {
    let matrix = ringMatrixFromPattern(pattern);
    for (let i = 0; i < turns; i += 1) matrix = rotateMatrixCW(matrix);
    return ringPatternFromMatrix(matrix);
  };

  const loadCases = (() => {
    let memo;
    return () => {
      if (!memo) {
        memo = fetch('data/pll_cases.json').then((res) => {
          if (!res.ok) throw new Error('Could not load PLL data');
          return res.json();
        });
      }
      return memo;
    };
  })();

  const rotationMessages = [
    'Orientation matches the reference.',
    'Detected cube rotated 90° clockwise.',
    'Detected cube rotated 180° from reference.',
    'Detected cube rotated 90° counterclockwise.',
  ];

  const correctionMessages = [
    'No reorientation needed.',
    'Rotate the cube 90° counterclockwise (y\') to align with the reference.',
    'Rotate the cube 180° (y2) to align with the reference.',
    'Rotate the cube 90° clockwise (y) to align with the reference.',
  ];

  const colorsComplete = () => ringColors.every(Boolean);

  const patternMatches = (casePattern, userColors) => {
    const letterToColor = new Map();
    const colorToLetter = new Map();
    for (let i = 0; i < 12; i += 1) {
      const letter = casePattern[i];
      const color = userColors[i];
      if (!color) return null;
      if (letterToColor.has(letter) && letterToColor.get(letter) !== color) return null;
      if (colorToLetter.has(color) && colorToLetter.get(color) !== letter) return null;
      letterToColor.set(letter, color);
      colorToLetter.set(color, letter);
    }
    return { letterToColor, colorToLetter };
  };

  const buildMiniBoard = (casePattern, mapping) => {
    const mini = document.createElement('div');
    mini.className = 'mini-board';
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(null));
    ringOrder.forEach(({ row, col, idx, orientation }) => {
      const letter = casePattern[idx];
      const color = mapping.letterToColor.get(letter);
      matrix[row][col] = { color, orientation };
    });

    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const cellInfo = matrix[r][c];
        if (!cellInfo) {
          const spacer = document.createElement('div');
          spacer.className = 'placeholder';
          mini.appendChild(spacer);
          continue;
        }
        const cell = document.createElement('div');
        const orientClass = cellInfo.orientation === 'vertical' ? ' vertical' : '';
        cell.className = `mini-cell ring${orientClass} color-${cellInfo.color}`;
        mini.appendChild(cell);
      }
    }
    return mini;
  };

  const reset = () => {
    ringColors.fill(null);
    Object.keys(colorCounts).forEach((k) => { colorCounts[k] = 0; });
    statusEl.textContent = 'Side colors: 0/12 · Assigning: Red';
    matchEl.innerHTML = '';
    render();
  };

  const search = async () => {
    if (!colorsComplete()) {
      statusEl.textContent = 'Please fill all 12 side stickers (3 of each color).';
      return;
    }
    searchBtn.disabled = true;
    statusEl.textContent = 'Searching…';
    matchEl.innerHTML = '';
    try {
      const cases = await loadCases();
      const userColors = [...ringColors];
      let found = null;

      for (const entry of cases) {
        for (let turns = 0; turns < 4; turns += 1) {
          const rotated = rotateRingPattern(entry.pattern, turns);
          const mapping = patternMatches(rotated, userColors);
          if (mapping) {
            found = { entry, turns, mapping };
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        statusEl.textContent = 'No exact PLL match. Check colors and orientation.';
        return;
      }

      const { entry, turns, mapping } = found;
      const rotationNote = rotationMessages[turns];
      const correction = correctionMessages[turns];
      statusEl.textContent = `${entry.id} · ${rotationNote}`;

      const mini = buildMiniBoard(entry.pattern, mapping);
      matchEl.innerHTML = `
        <div class="match-layout">
          <div class="match-text">
            <div class="code-chip">${entry.id}</div>
            <div class="code-chip">${entry.solution}</div>
            <small>${correction}</small>
          </div>
        </div>
      `;
      matchEl.querySelector('.match-layout').appendChild(mini);

      // Dispatch event for animation
      window.dispatchEvent(new CustomEvent('f2l-solution-found', { 
        detail: { solution: entry.solution } 
      }));

    } catch (err) {
      statusEl.textContent = 'Search failed. Reload and try again.';
      console.error(err);
    } finally {
      searchBtn.disabled = false;
    }
  };

  searchBtn?.addEventListener('click', search);
  resetBtn?.addEventListener('click', reset);

  buildBoard();
})();
