
import os

content = r"""(() => {
  const cube = document.getElementById('cube');
  const scene = document.getElementById('scene');
  const dragArea = document.querySelector('.board-wrap');
  const solveBtn = document.getElementById('solve-btn');
  const resetBtn = document.getElementById('reset-btn');
  const solutionContainer = document.getElementById('solution-container');
  const paletteColors = document.querySelectorAll('.palette-color');

  let currentColor = 'white';
  let ollCases = [];
  let pllCases = [];

  // Load Cases
  fetch('data/oll_cases.json').then(r => r.json()).then(d => ollCases = d).catch(e => console.error("Failed to load OLL", e));
  fetch('data/pll_cases.json').then(r => r.json()).then(d => pllCases = d).catch(e => console.error("Failed to load PLL", e));

  // --- Palette Logic ---
  paletteColors.forEach(el => {
    el.addEventListener('click', () => {
      paletteColors.forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      currentColor = el.dataset.color;
    });
  });

  // --- 3D Rotation Logic ---
  let rotX = -25;
  let rotY = -45;
  let isDragging = false;
  let startX, startY;

  const updateRotation = () => {
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  };

  dragArea.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dragArea.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    rotY += dx * 1.5;
    rotX -= dy * 1.5;
    startX = e.clientX;
    startY = e.clientY;
    updateRotation();
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    dragArea.style.cursor = 'default';
  });

  // Touch support
  dragArea.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    rotY += dx * 1.5;
    rotX -= dy * 1.5;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    updateRotation();
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });

  // --- Cube State ---
  const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
  const faceEls = {};
  faces.forEach(f => faceEls[f] = cube.querySelector(`.face-${f.toLowerCase()}`));

  // 54 stickers state. Map "FaceIndex" -> Color
  const cubeState = new Map();

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

  const createStickers = () => {
    faces.forEach(f => {
      const faceEl = faceEls[f];
      faceEl.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const el = document.createElement('div');
        el.className = 'sticker';
        const id = `${f}${i}`;
        el.dataset.id = id;
        
        // Centers are fixed
        if (i === 4) {
          const centerColor = getColorForFace(f);
          el.classList.add(centerColor);
          el.style.cursor = 'default';
          cubeState.set(id, centerColor);
        } else {
          el.addEventListener('click', handleStickerClick);
        }
        faceEl.appendChild(el);
      }
    });
  };

  const handleStickerClick = (e) => {
    const el = e.target;
    const id = el.dataset.id;
    
    // Remove old color class
    ['white', 'yellow', 'green', 'blue', 'red', 'orange'].forEach(c => el.classList.remove(c));
    
    // Add new color
    el.classList.add(currentColor);
    cubeState.set(id, currentColor);
  };

  const validateState = () => {
    const counts = { white:0, yellow:0, green:0, blue:0, red:0, orange:0 };
    for (const color of cubeState.values()) {
      if (counts[color] !== undefined) counts[color]++;
    }
    
    const missing = [];
    for (const [c, count] of Object.entries(counts)) {
      if (count !== 9) missing.push(`${c}: ${count}/9`);
    }
    
    if (missing.length > 0) {
      return `Invalid State:\n${missing.join('\n')}`;
    }
    return null;
  };

  // --- Solver Logic ---
  
  const solve = () => {
    const error = validateState();
    if (error) {
      alert(error);
      return;
    }
    
    solutionContainer.innerHTML = '<div class="solution-section"><p>Analyzing...</p></div>';
    
    setTimeout(() => {
      try {
        // 1. Map colors to Face characters for rubiks-cube-solver
        // It expects 'f', 'r', 'u', 'd', 'l', 'b'
        const centerColors = {
          'U': cubeState.get('U4'),
          'R': cubeState.get('R4'),
          'F': cubeState.get('F4'),
          'D': cubeState.get('D4'),
          'L': cubeState.get('L4'),
          'B': cubeState.get('B4')
        };
        
        const colorToChar = {};
        colorToChar[centerColors['F']] = 'f';
        colorToChar[centerColors['R']] = 'r';
        colorToChar[centerColors['U']] = 'u';
        colorToChar[centerColors['D']] = 'd';
        colorToChar[centerColors['L']] = 'l';
        colorToChar[centerColors['B']] = 'b';
        
        // Order: Front, Right, Up, Down, Left, Back
        const faceOrder = ['F', 'R', 'U', 'D', 'L', 'B'];
        let stateString = "";
        
        for (const f of faceOrder) {
          for (let i = 0; i < 9; i++) {
            const id = `${f}${i}`;
            const color = cubeState.get(id);
            if (!color) throw new Error(`Missing color at ${id}`);
            stateString += colorToChar[color];
          }
        }
        
        // 2. Solve using rubiks-cube-solver (CFOP)
        if (typeof rubiksCubeSolver === 'undefined') {
           throw new Error("CFOP Solver library not loaded.");
        }
        
        const solution = rubiksCubeSolver(stateString, { partitioned: true });
        
        // 3. Display Solution
        let html = `
          <div class="solution-section">
            <h3>CFOP Solution</h3>
        `;
        
        const formatMoves = (moves) => {
          if (!moves || moves.length === 0) return "None";
          return moves.join(" ");
        };

        // Cross
        html += `
            <div class="solution-step">
              <h4>1. Cross</h4>
              <div class="solution-moves">${formatMoves(solution.cross)}</div>
            </div>
        `;
        
        // F2L
        html += `
            <div class="solution-step">
              <h4>2. F2L (First Two Layers)</h4>
              <div class="solution-moves">${formatMoves(solution.f2l)}</div>
            </div>
        `;
        
        // OLL
        html += `
            <div class="solution-step">
              <h4>3. OLL (Orientation)</h4>
              <div class="solution-moves">${formatMoves(solution.oll)}</div>
            </div>
        `;
        
        // PLL
        html += `
            <div class="solution-step">
              <h4>4. PLL (Permutation)</h4>
              <div class="solution-moves">${formatMoves(solution.pll)}</div>
            </div>
        `;
        
        html += `
            <div class="solution-step" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
              <h4>Total Moves: ${solution.cross.length + solution.f2l.length + solution.oll.length + solution.pll.length}</h4>
            </div>
          </div>
        `;
        
        solutionContainer.innerHTML = html;

      } catch (e) {
        console.error(e);
        solutionContainer.innerHTML = `
          <div class="solution-section">
            <p class="error" style="color: var(--accent-strong); font-weight: bold;">Unsolvable state.</p>
            <p class="muted">Error details: ${e.message || e}</p>
            <p class="muted" style="font-size:0.9em">Ensure all centers are correct and no pieces are twisted.</p>
          </div>
        `;
      }
    }, 100);
  };

  solveBtn.addEventListener('click', solve);
  resetBtn.addEventListener('click', () => {
    cubeState.clear();
    createStickers();
    solutionContainer.innerHTML = '<div class="solution-section"><p class="muted">Enter cube state to see solution.</p></div>';
  });

  createStickers();

})();
"""

with open(r"c:\Users\user\Desktop\Repos\LearnOP\js\solver.js", "w", encoding="utf-8") as f:
    f.write(content)
