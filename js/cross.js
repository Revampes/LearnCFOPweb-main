(() => {
  const cube = document.getElementById('cube');
  const scene = document.getElementById('scene');
  const dragArea = document.querySelector('.board-wrap'); // Use larger area for drag
  const statusEl = document.getElementById('solver-status');
  const solutionEl = document.getElementById('solution-text');
  const solveBtn = document.getElementById('solve-btn');
  const resetBtn = document.getElementById('reset-btn');
  const nextPieceEl = document.getElementById('next-piece-display');

  // --- 3D Rotation Logic ---
  let rotX = -25;
  let rotY = -45;
  let isDragging = false;
  let startX, startY;

  const updateRotation = () => {
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  };

  let mouseMoved = false;
  let mouseStartX, mouseStartY;

  // Attach to dragArea instead of scene for larger hit target
  dragArea.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    mouseStartX = startX;
    mouseStartY = startY;
    mouseMoved = false;
    dragArea.style.cursor = 'grabbing';
    // Prevent default to avoid text selection
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(e.clientX - mouseStartX) > 5 || Math.abs(e.clientY - mouseStartY) > 5) {
      mouseMoved = true;
    }

    rotY += dx * 1.5; // Increased speed
    rotX -= dy * 1.5; // Increased speed
    startX = e.clientX;
    startY = e.clientY;
    updateRotation();
  });

  document.addEventListener('mouseup', (e) => {
    isDragging = false;
    if (dragArea) dragArea.style.cursor = 'default'; // Or grab if we want to show it's draggable

    if (!mouseMoved) {
      if (e.target.classList.contains('sticker') && !e.target.dataset.id.endsWith('4')) {
        handleStickerClick({ target: e.target });
      }
    }
  });

  // Touch support
  let touchStartX, touchStartY;
  let touchMoved = false;

  dragArea.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    touchStartX = startX;
    touchStartY = startY;
    touchMoved = false;
    e.preventDefault(); // Prevent scrolling while rotating
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    
    if (Math.abs(cx - touchStartX) > 10 || Math.abs(cy - touchStartY) > 10) {
      touchMoved = true;
    }

    const dx = cx - startX;
    const dy = cy - startY;
    rotY += dx * 1.5;
    rotX -= dy * 1.5;
    startX = cx;
    startY = cy;
    updateRotation();
  });

  document.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    if (!touchMoved) {
      // Tap detected - manually trigger click handling for stickers
      if (e.target.classList.contains('sticker') && !e.target.dataset.id.endsWith('4')) {
        handleStickerClick({ target: e.target });
      }
    }
  });


  // --- Cube State & Selection ---
  const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
  const faceEls = {};
  faces.forEach(f => faceEls[f] = cube.querySelector(`.face-${f.toLowerCase()}`));

  // Edge definitions (Sticker indices)
  // [Face, Index]
  // 0:UB, 1:UL, 2:UR, 3:UF
  // 4:LB, 5:LF, 6:RB, 7:RF
  // 8:DB, 9:DL, 10:DR, 11:DF
  const edges = [
    { id: 'UB', s1: ['U', 1], s2: ['B', 1] }, // 0
    { id: 'UL', s1: ['U', 3], s2: ['L', 1] }, // 1
    { id: 'UR', s1: ['U', 5], s2: ['R', 1] }, // 2
    { id: 'UF', s1: ['U', 7], s2: ['F', 1] }, // 3
    { id: 'LB', s1: ['L', 3], s2: ['B', 5] }, // 4
    { id: 'LF', s1: ['L', 5], s2: ['F', 3] }, // 5
    { id: 'RB', s1: ['R', 5], s2: ['B', 3] }, // 6
    { id: 'RF', s1: ['R', 3], s2: ['F', 5] }, // 7
    { id: 'DB', s1: ['D', 7], s2: ['B', 7] }, // 8
    { id: 'DL', s1: ['D', 3], s2: ['L', 7] }, // 9
    { id: 'DR', s1: ['D', 5], s2: ['R', 7] }, // 10
    { id: 'DF', s1: ['D', 1], s2: ['F', 7] }  // 11
  ];

  // Map sticker ID to edge
  const stickerToEdge = {};
  edges.forEach((edge, idx) => {
    const id1 = `${edge.s1[0]}${edge.s1[1]}`;
    const id2 = `${edge.s2[0]}${edge.s2[1]}`;
    stickerToEdge[id1] = { edgeIdx: idx, part: 0 }; // part 0 = primary (U/D/L/R)
    stickerToEdge[id2] = { edgeIdx: idx, part: 1 }; // part 1 = secondary (F/B/L/R)
  });

  const edgeTypes = [
    { name: 'WG', c1: 'white', c2: 'green' },
    { name: 'WO', c1: 'white', c2: 'orange' },
    { name: 'WB', c1: 'white', c2: 'blue' },
    { name: 'WR', c1: 'white', c2: 'red' }
  ];
  
  // Map edgeIdx -> { typeIdx: 0..3, whitePart: 0|1 }
  const edgeAssignments = new Map();

  const getColorForFace = (f) => {
    switch(f) {
      case 'U': return 'yellow';
      case 'F': return 'green';
      case 'R': return 'orange';
      case 'B': return 'blue';
      case 'L': return 'red';
      case 'D': return 'white';
    }
    return '';
  };

  const getAllowedTypesForEdge = (edgeIdx) => {
    // Return standard order regardless of position:
    // 0:WG, 1:WO, 2:WB, 3:WR
    return [0, 1, 2, 3];
  };

  const getNextAvailableType = (edgeIdx, currentTypeIdx, allowedTypes = [0, 1, 2, 3]) => {
    const allowed = Array.from(allowedTypes);

    // Collect used types excluding the current edge so orientation tweaks stay allowed
    const used = new Set();
    edgeAssignments.forEach((data, idx) => {
      if (idx !== edgeIdx) used.add(data.typeIdx);
    });

    const free = allowed.filter((t) => !used.has(t));

    if (free.length === 0) return -1; // No allowed colors left
    if (currentTypeIdx === -1 || !allowed.includes(currentTypeIdx)) return free[0];

    const currIndex = free.indexOf(currentTypeIdx);
    if (currIndex === -1) return free[0]; // Current type was blocked; pick the first free
    if (free.length === 1) return currentTypeIdx; // Keep type, but allow orientation flip

    return free[(currIndex + 1) % free.length];
  };

  const handleStickerClick = (e) => {
    if (e.stopPropagation) e.stopPropagation();
    // If we were dragging, don't process click
    // But click event fires after mouseup.
    // We can check if mouse moved significantly?
    // Or just rely on the fact that if we are dragging, the user likely won't release ON the sticker perfectly without moving?
    // Actually, standard behavior is: if mousedown/mouseup are close, it's a click.
    // But here, we just want to ensure we don't accidentally select while rotating.
    // Since we use 'click' event, it should be fine unless the browser fires click after a drag.
    // Most browsers do fire click after drag if the element is the same.
    // Let's add a check.
    
    // Simple check: if we just finished a drag, ignore click.
    // But `isDragging` is set to false on mouseup.
    // We can store a timestamp or flag "wasDragging".
    
    const id = e.target.dataset.id;
    const info = stickerToEdge[id];
    if (!info) return;

    const { edgeIdx, part } = info;
    
    const allowedTypes = getAllowedTypesForEdge(edgeIdx);

    // Check if this edge is already assigned
    let current = edgeAssignments.get(edgeIdx);
    
    if (!current) {
      // New assignment: Start with WG, white at clicked part
      const nextType = getNextAvailableType(edgeIdx, -1, allowedTypes);
      if (nextType === -1) {
        const sideMsg = allowedTypes.length === 2 && allowedTypes.includes(1) && allowedTypes.includes(3);
        alert(sideMsg ? 'Side pieces only allow White-Red or White-Orange. Clear one to reassign this edge.' : 'All white edge colors are already used.');
        return;
      }
      edgeAssignments.set(edgeIdx, { typeIdx: nextType, whitePart: part });
    } else {
      // Cycle type
      const nextType = getNextAvailableType(edgeIdx, current.typeIdx, allowedTypes);
      if (nextType === -1) {
        edgeAssignments.delete(edgeIdx);
      } else {
        edgeAssignments.set(edgeIdx, { typeIdx: nextType, whitePart: part });
      }
    }
    render();
  };

  const render = () => {
    // Reset all stickers to default gray (except centers)
    document.querySelectorAll('.sticker').forEach(el => {
      // Safety check: ensure dataset.id exists
      if (!el.dataset.id || el.dataset.id.endsWith('4')) return;
      el.className = 'sticker';
      el.style.backgroundColor = '';
    });

    edgeAssignments.forEach((data, edgeIdx) => {
      const edge = edges[edgeIdx];
      const type = edgeTypes[data.typeIdx];
      
      const whiteStickerId = data.whitePart === 0 ? `${edge.s1[0]}${edge.s1[1]}` : `${edge.s2[0]}${edge.s2[1]}`;
      const colorStickerId = data.whitePart === 0 ? `${edge.s2[0]}${edge.s2[1]}` : `${edge.s1[0]}${edge.s1[1]}`;
      
      const whiteEl = cube.querySelector(`[data-id='${whiteStickerId}']`);
      const colorEl = cube.querySelector(`[data-id='${colorStickerId}']`);
      
      if (whiteEl) {
        whiteEl.style.backgroundColor = 'white';
        whiteEl.classList.add('is-selected');
      }
      if (colorEl) {
        colorEl.classList.add(type.c2); // e.g. 'green', 'orange'
      }
    });
    
    statusEl.textContent = `Placed: ${edgeAssignments.size}/4 edges`;

    // Update Next Piece Display
    if (nextPieceEl) {
      const nextType = getNextAvailableType(-1, -1, [0, 1, 2, 3]);
      if (nextType === -1) {
        nextPieceEl.textContent = "All pieces placed";
        nextPieceEl.style.color = 'var(--muted)';
      } else {
        const typeName = edgeTypes[nextType].name; // "WG"
        const fullNames = { 'WG': 'White-Green', 'WO': 'White-Orange', 'WB': 'White-Blue', 'WR': 'White-Red' };
        nextPieceEl.textContent = `Next Piece: ${fullNames[typeName]}`;
        nextPieceEl.style.color = 'var(--accent)';
      }
    }
  };

  const createStickers = () => {
    faces.forEach(f => {
      const faceEl = faceEls[f];
      faceEl.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const el = document.createElement('div');
        el.className = 'sticker';
        el.dataset.id = `${f}${i}`;
        
        // Centers
        if (i === 4) {
          el.classList.add(getColorForFace(f));
          el.style.cursor = 'default';
        } else {
          // We need to handle click vs drag.
          // If we use 'click', it might fire after drag.
          // Let's use a custom click handler that checks for movement.
          el.addEventListener('click', (e) => {
             // If we want to be strict, we can check if total movement was small.
             // But for now, let's assume standard click behavior is fine.
             // The issue is if the user drags ON a sticker, does it count as a click?
             // Usually yes.
             handleStickerClick(e);
          });
        }
        faceEl.appendChild(el);
      }
    });
  };

  // --- Solver Implementation ---
  const solve = () => {
    if (edgeAssignments.size < 4) {
      solutionEl.textContent = 'Please place all 4 white edges.';
      return;
    }
    
    const pieceLocs = {}; // typeIdx -> { edgeIdx, whitePart }
    edgeAssignments.forEach((data, edgeIdx) => {
      pieceLocs[data.typeIdx] = { edgeIdx, whitePart: data.whitePart };
    });
    
    // Initial State
    const startState = [];
    for(let i=0; i<4; i++) {
      const loc = pieceLocs[i];
      startState.push(loc.edgeIdx);
      startState.push(loc.whitePart);
    }
    
    // Target: 
    // WG(0) -> DF(11), 0
    // WO(1) -> DR(10), 0
    // WB(2) -> DB(8), 0
    // WR(3) -> DL(9), 0
    const targetStr = JSON.stringify([11,0, 10,0, 8,0, 9,0]);
    
    // BFS
    const queue = [[startState, []]]; // [state, moves]
    const visited = new Set();
    visited.add(JSON.stringify(startState));
    
    if (JSON.stringify(startState) === targetStr) {
      solutionEl.textContent = "Solved!";
      return;
    }
    
    let iterations = 0;
    while(queue.length > 0 && iterations < 200000) {
      iterations++;
      const [currState, moves] = queue.shift();
      
      if (moves.length >= 8) continue; // Cap at 8 moves
      
      const moveNames = ["U", "U'", "D", "D'", "F", "F'", "B", "B'", "R", "R'", "L", "L'"];
      
      for (const m of moveNames) {
        const nextState = applyMove(currState, m);
        const nextStr = JSON.stringify(nextState);
        
        if (nextStr === targetStr) {
          const solution = [...moves, m].join(' ');
          solutionEl.innerHTML = solution;
          
          window.dispatchEvent(new CustomEvent('f2l-solution-found', { 
            detail: { solution: solution } 
          }));

          return;
        }
        
        if (!visited.has(nextStr)) {
          visited.add(nextStr);
          queue.push([nextState, [...moves, m]]);
        }
      }
    }
    
    solutionEl.textContent = "No solution found within 8 moves.";
  };

  const applyMove = (state, move) => {
    // state: [p0, o0, p1, o1, p2, o2, p3, o3]
    const newState = [...state];
    
    let cycle = [];
    let flip = 0;
    
    const baseMove = move[0];
    
    // Edges:
    // 0:UB, 1:UL, 2:UR, 3:UF
    // 4:LB, 5:LF, 6:RB, 7:RF
    // 8:DB, 9:DL, 10:DR, 11:DF
    
    // CW Cycles
    switch(baseMove) {
      case 'U': cycle = [0, 2, 3, 1]; flip = 0; break; // UB->UR->UF->UL
      case 'D': cycle = [11, 10, 8, 9]; flip = 0; break; // DF->DR->DB->DL
      case 'L': cycle = [1, 5, 9, 4]; flip = 1; break; // UL->LF->DL->LB
      case 'R': cycle = [2, 6, 10, 7]; flip = 1; break; // UR->RB->DR->RF
      case 'F': cycle = [3, 7, 11, 5]; flip = 0; break; // UF->RF->DF->LF
      case 'B': cycle = [0, 4, 8, 6]; flip = 0; break; // UB->LB->DB->RB
    }
    
    const times = move.endsWith("'") ? 3 : (move.endsWith("2") ? 2 : 1);
    
    for (let t=0; t<times; t++) {
      for (let i=0; i<4; i++) {
        const pos = newState[i*2];
        const ori = newState[i*2+1];
        
        const idxInCycle = cycle.indexOf(pos);
        if (idxInCycle !== -1) {
          const nextPos = cycle[(idxInCycle + 1) % 4];
          newState[i*2] = nextPos;
          newState[i*2+1] = ori ^ flip;
        }
      }
    }
    
    return newState;
  };

  createStickers();
  render();

  solveBtn.addEventListener('click', solve);
  resetBtn.addEventListener('click', () => {
    edgeAssignments.clear();
    render();
    solutionEl.textContent = 'Waiting for input...';
  });

})();
