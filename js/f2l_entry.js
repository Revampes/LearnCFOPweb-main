(() => {
  const cube = document.getElementById('cube');
  if (!cube) return;

  const statusEl = document.getElementById('f2l-status');
  const cornerOriBtn = document.getElementById('corner-ori');
  const edgeOriBtn = document.getElementById('edge-ori');
  const resetBtn = document.getElementById('f2l-reset');
  
  const addBtn = document.getElementById('add-case');
  const downloadBtn = document.getElementById('download-json');
  const algInput = document.getElementById('alg-input');
  const nameInput = document.getElementById('name-input');
  const caseListEl = document.getElementById('case-list');
  const caseCountEl = document.getElementById('case-count');

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

  let collectedCases = [];

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

  const createStickers = (face, prefix) => {
    face.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('div');
      el.className = 'sticker';
      el.dataset.id = `${prefix}${i}`;
      
      if (i === 4) {
        if (prefix === 'U') el.classList.add(C.Y);
        if (prefix === 'F') el.classList.add(C.G); // Green Front
        if (prefix === 'R') el.classList.add(C.O); // Orange Right
        el.style.cursor = 'default';
      } else {
        el.addEventListener('click', handleStickerClick);
      }
      
      face.appendChild(el);
    }
  };

  const handleStickerClick = (e) => {
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
  };

  const getCornerColors = (pos, ori) => {
    const colors = {};
    // Base: White-Green-Orange (Swapped F/R colors)
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
      
      // Restore center colors
      if (el.dataset.id === 'U4') el.classList.add(C.Y);
      if (el.dataset.id === 'F4') el.classList.add(C.G); // Green
      if (el.dataset.id === 'R4') el.classList.add(C.O); // Orange
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
      renderStatus(`Corner: ${state.corner || '-'}  Edge: ${state.edge || '-'}`);
    }
  };

  const renderStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const reset = () => {
    state.corner = null;
    state.edge = null;
    state.cornerOri = 0;
    state.edgeOri = 0;
    render();
    algInput.value = '';
    nameInput.value = '';
  };

  const addCase = () => {
    if (!state.corner || !state.edge) {
      alert('Please select a corner and an edge first.');
      return;
    }
    if (!algInput.value.trim()) {
      alert('Please enter a solution algorithm.');
      return;
    }

    const newCase = {
      id: `F2L-${(collectedCases.length + 1).toString().padStart(2, '0')}`,
      name: nameInput.value.trim() || `Case ${collectedCases.length + 1}`,
      cornerPos: PIECE_IDS.corner[state.corner],
      cornerOri: state.cornerOri,
      edgePos: PIECE_IDS.edge[state.edge],
      edgeOri: state.edgeOri,
      solution: algInput.value.trim()
    };

    // Check for duplicates
    const exists = collectedCases.find(c => 
      c.cornerPos === newCase.cornerPos && 
      c.cornerOri === newCase.cornerOri && 
      c.edgePos === newCase.edgePos && 
      c.edgeOri === newCase.edgeOri
    );

    if (exists) {
      if (!confirm('This case already exists. Overwrite?')) return;
      Object.assign(exists, newCase);
    } else {
      collectedCases.push(newCase);
    }

    updateList();
    reset();
    renderStatus('Case added! Select next case.');
  };

  const updateList = () => {
    caseCountEl.textContent = collectedCases.length;
    caseListEl.innerHTML = collectedCases.map(c => `
      <div class="case-item">
        <div>
          <strong>${c.name}</strong><br>
          <small>${c.cornerPos}:${c.cornerOri} / ${c.edgePos}:${c.edgeOri}</small>
        </div>
        <div style="text-align:right">
          <code>${c.solution}</code>
        </div>
      </div>
    `).join('');
  };

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collectedCases, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "f2l_cases.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  createStickers(faceU, 'U');
  createStickers(faceF, 'F');
  createStickers(faceR, 'R');

  if (cornerOriBtn) cornerOriBtn.addEventListener('click', () => {
    if (state.corner) {
      state.cornerOri = (state.cornerOri + 1) % 3;
      render();
    }
  });

  if (edgeOriBtn) edgeOriBtn.addEventListener('click', () => {
    if (state.edge) {
      state.edgeOri = (state.edgeOri + 1) % 2;
      render();
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', reset);
  if (addBtn) addBtn.addEventListener('click', addCase);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadJson);

  // Load existing if any (optional, but good for editing)
  fetch('data/f2l_cases.json')
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        collectedCases = data;
        updateList();
      }
    })
    .catch(() => {});

})();
