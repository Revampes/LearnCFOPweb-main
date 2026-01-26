(() => {
  const cube = document.getElementById('cube');
  if (!cube) return;

  const statusEl = document.getElementById('f2l-status');
  const matchEl = document.getElementById('f2l-match');
  const solutionEl = document.getElementById('f2l-solution');
  const cornerOriBtn = document.getElementById('corner-ori');
  const edgeOriBtn = document.getElementById('edge-ori');
  const searchBtn = document.getElementById('f2l-search');
  const resetBtn = document.getElementById('f2l-reset');

  // Faces
  const faceU = cube.querySelector('.face-u');
  const faceF = cube.querySelector('.face-f');
  const faceR = cube.querySelector('.face-r');

  const state = {
    corner: null,
    cornerOri: 0,
    edge: null,
    edgeOri: 0,
  };

  const PIECE_IDS = {
    corner: {
      UFR: 'UFR',
      DFR: 'FR_SLOT',
      UFL: 'UFL',
      UBL: 'UBL',
      UBR: 'UBR'
    },
    edge: {
      UR: 'UR',
      UF: 'UF',
      UL: 'UL',
      UB: 'UB',
      FR: 'FR'
    }
  };

  const C = {
    Y: 'yellow',
    R: 'red',
    B: 'blue',
    W: 'white',
    G: 'green',
    O: 'orange',
    X: ''
  };

  const pieces = {
    corners: {
      UFR: ['U8', 'F2', 'R0'],
      DFR: ['F8', 'R6'],
      UFL: ['U6', 'F0'],
      UBL: ['U0'],
      UBR: ['U2', 'R2']
    },
    edges: {
      UR: ['U5', 'R1'],
      UF: ['U7', 'F1'],
      UL: ['U3'], 
      UB: ['U1'], 
      FR: ['F5', 'R3'],
    }
  };

  const stickerToPiece = {};
  Object.entries(pieces.corners).forEach(([piece, stickers]) => {
    stickers.forEach(s => stickerToPiece[s] = { type: 'corner', id: piece });
  });
  Object.entries(pieces.edges).forEach(([piece, stickers]) => {
    stickers.forEach(s => stickerToPiece[s] = { type: 'edge', id: piece });
  });

  const clearResult = () => {
    if (matchEl) matchEl.textContent = '';
    if (solutionEl) solutionEl.textContent = '';
  };

  const createStickers = (face, prefix) => {
    face.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('div');
      el.className = 'sticker';
      el.dataset.id = `${prefix}${i}`;
      
      if (i === 4) {
        if (prefix === 'U') el.classList.add(C.Y);
        // if (prefix === 'F') el.classList.add(C.G); // Green Front
        // if (prefix === 'R') el.classList.add(C.O); // Orange Right
        // el.style.cursor = 'default';
      } 
      
      const isGreenStatic = prefix === 'F' && [3, 4, 6, 7].includes(i);
      const isOrangeStatic = prefix === 'R' && [4, 5, 7, 8].includes(i);
      const isCenterU = prefix === 'U' && i === 4;

      if (isGreenStatic) el.classList.add(C.G);
      if (isOrangeStatic) el.classList.add(C.O);

      if (isCenterU || isGreenStatic || isOrangeStatic) {
          el.style.cursor = 'default';
      } else {
        el.addEventListener('click', handleStickerClick);
      }
      
      face.appendChild(el);
    }
  };

  const handleStickerClick = (e) => {
    e.stopPropagation();
    const stickerId = e.target.dataset.id;
    const piece = stickerToPiece[stickerId];
    
    if (!piece) return;

    if (piece.type === 'corner') {
      if (state.corner === piece.id) {
        state.cornerOri = (state.cornerOri + 1) % 3;
      } else {
        state.corner = piece.id;
        state.cornerOri = 0;
      }
    } else {
      if (state.edge === piece.id) {
        state.edgeOri = (state.edgeOri + 1) % 2;
      } else {
        state.edge = piece.id;
        state.edgeOri = 0;
      }
    }
    render();
    clearResult();
  };

  const getCornerColors = (pos, ori) => {
    const colors = {};
    // Base: White-Green-Orange (Swapped F/R colors to match visual layout used elsewhere)
    // Ori 0: White on U
    // Ori 1: White on R (CW)
    // Ori 2: White on F (CCW)
    
    let c = [C.W, C.O, C.G]; // U, F, R
    if (ori === 1) c = [C.O, C.G, C.W]; // Twist CW: U=Orange, F=Green, R=White
    if (ori === 2) c = [C.G, C.W, C.O]; // Twist CCW: U=Green, F=White, R=Orange

    if (pos === 'UFR') {
      colors['U8'] = c[0]; colors['F2'] = c[1]; colors['R0'] = c[2];
    }
    else if (pos === 'DFR') {
      // DFR (Slot)
      // Ori 0: Solved (Green Front, Orange Right)
      // Ori 1: White on F
      // Ori 2: White on R
      if (ori === 0) { colors['F8'] = C.G; colors['R6'] = C.O; }
      if (ori === 1) { colors['F8'] = C.W; colors['R6'] = C.G; }
      if (ori === 2) { colors['F8'] = C.O; colors['R6'] = C.W; }
    }
    else if (pos === 'UBR') {
      // UBR (U2, R2)
      // Ori 0: U=W, R=O
      // Ori 1: U=O, R=G
      // Ori 2: U=G, R=W
      if (ori === 0) { colors['U2'] = C.W; colors['R2'] = C.O; }
      if (ori === 1) { colors['U2'] = C.O; colors['R2'] = C.G; }
      if (ori === 2) { colors['U2'] = C.G; colors['R2'] = C.W; }
    }
    else if (pos === 'UFL') {
      // UFL (U6, F0)
      // Ori 0: U=W, F=G
      // Ori 1: U=O, F=W
      // Ori 2: U=G, F=O
      if (ori === 0) { colors['U6'] = C.W; colors['F0'] = C.G; }
      if (ori === 1) { colors['U6'] = C.O; colors['F0'] = C.W; }
      if (ori === 2) { colors['U6'] = C.G; colors['F0'] = C.O; }
    }
    else if (pos === 'UBL') {
      // UBL (U0)
      // Ori 0: U=W
      // Ori 1: U=O
      // Ori 2: U=G
      if (ori === 0) { colors['U0'] = C.W; }
      if (ori === 1) { colors['U0'] = C.O; }
      if (ori === 2) { colors['U0'] = C.G; }
    }
    return colors;
  };

  const getEdgeColors = (pos, ori) => {
    const colors = {};
    // Edge: Green-Orange
    // Ori 0: Green on Primary (U/F)
    // Ori 1: Orange on Primary (U/F)
    
    const primary = ori === 0 ? C.G : C.O;
    const secondary = ori === 0 ? C.O : C.G;

    if (pos === 'UR') { colors['U5'] = primary; colors['R1'] = secondary; }
    else if (pos === 'UF') { colors['U7'] = primary; colors['F1'] = secondary; }
    else if (pos === 'UL') { colors['U3'] = primary; }
    else if (pos === 'UB') { colors['U1'] = primary; }
    else if (pos === 'FR') { colors['F5'] = primary; colors['R3'] = secondary; }
    return colors;
  };

  const render = () => {
    document.querySelectorAll('.sticker').forEach(el => {
      el.className = 'sticker';
      el.classList.remove('is-selected');
      
      const id = el.dataset.id;

      // Restore center colors and static highlights
      if (id === 'U4') el.classList.add(C.Y);

      // Green Face (F) - Center + Bottom Left Block (3, 4, 6, 7)
      if (['F3', 'F4', 'F6', 'F7'].includes(id)) {
        el.classList.add(C.G);
      }

      // Orange Face (R) - Center + Bottom Right Block (4, 5, 7, 8)
      if (['R4', 'R5', 'R7', 'R8'].includes(id)) {
        el.classList.add(C.O);
      }
    });

    if (state.corner) {
      const colors = getCornerColors(state.corner, state.cornerOri);
      Object.entries(colors).forEach(([id, color]) => {
        const el = cube.querySelector(`[data-id='${id}']`);
        if (el) {
          el.classList.add(color);
          el.classList.add('is-selected');
        }
      });
    }

    if (state.edge) {
      const colors = getEdgeColors(state.edge, state.edgeOri);
      Object.entries(colors).forEach(([id, color]) => {
        const el = cube.querySelector(`[data-id='${id}']`);
        if (el) {
          el.classList.add(color);
          el.classList.add('is-selected');
        }
      });
    }

    if (cornerOriBtn) cornerOriBtn.textContent = `Twist: ${state.cornerOri}`;
    if (edgeOriBtn) edgeOriBtn.textContent = `Flip: ${state.edgeOri}`;
    
    if (!state.corner && !state.edge) {
      renderStatus('Select a corner and an edge on the cube.');
    } else {
      renderStatus(`Corner: ${state.corner || '-'}  Edge: ${state.edge || '-'} · Press "Search for solution"`);
    }

    if (searchBtn) {
      searchBtn.disabled = !(state.corner && state.edge);
    }
  };

  const renderStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  let casesData = [];
  const loadCases = async () => {
    if (casesData.length > 0) return casesData;
    try {
      const res = await fetch('data/f2l_cases.json');
      if (!res.ok) throw new Error('Failed to load cases');
      casesData = await res.json();
      return casesData;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const search = async () => {
    if (!state.corner || !state.edge) return;
    
    const data = await loadCases();
    
    const cornerId = PIECE_IDS.corner[state.corner];
    const edgeId = PIECE_IDS.edge[state.edge];

    const found = data.find(c => 
      c.cornerPos === cornerId && 
      c.cornerOri === state.cornerOri && 
      c.edgePos === edgeId && 
      c.edgeOri === state.edgeOri
    );

    if (found) {
      if (matchEl) matchEl.textContent = found.name;
      if (solutionEl) solutionEl.innerHTML = `<div class='code-chip'>${found.solution}</div>`;
      
      // Dispatch event for animation
      window.dispatchEvent(new CustomEvent('f2l-solution-found', { 
        detail: { solution: found.solution } 
      }));
    } else {
      if (matchEl) matchEl.textContent = 'Case not found';
      if (solutionEl) solutionEl.textContent = '';
    }
  };

  const reset = () => {
    state.corner = null;
    state.edge = null;
    state.cornerOri = 0;
    state.edgeOri = 0;
    render();
    clearResult();
  };

  createStickers(faceU, 'U');
  createStickers(faceF, 'F');
  createStickers(faceR, 'R');

  if (cornerOriBtn) cornerOriBtn.addEventListener('click', () => {
    if (state.corner) {
      state.cornerOri = (state.cornerOri + 1) % 3;
      render();
      clearResult();
    }
  });

  if (edgeOriBtn) edgeOriBtn.addEventListener('click', () => {
    if (state.edge) {
      state.edgeOri = (state.edgeOri + 1) % 2;
      render();
      clearResult();
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', reset);
  if (searchBtn) searchBtn.addEventListener('click', search);

  render();
  loadCases();
})();
