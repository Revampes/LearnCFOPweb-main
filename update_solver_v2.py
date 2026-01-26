
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

  // --- Solver Logic (min2phase) ---
  let min2phaseInitialized = false;

  const initMin2Phase = () => {
    if (typeof min2phase === 'undefined') {
      console.error('min2phase library not loaded');
      return;
    }
    min2phase.init();
    min2phaseInitialized = true;
  };

  const solve = () => {
    const error = validateState();
    if (error) {
      alert(error);
      return;
    }
    
    solutionContainer.innerHTML = '<div class="solution-section"><p>Analyzing...</p></div>';
    
    // Initialize solver if needed (async-ish)
    setTimeout(() => {
      if (!min2phaseInitialized) {
        try {
          initMin2Phase();
        } catch (e) {
          solutionContainer.innerHTML = `<div class="solution-section"><p class="error">Error loading solver: ${e.message}</p></div>`;
          return;
        }
      }

      // 1. Map colors to Face characters (U, R, F, D, L, B)
      const centerColors = {
        'U': cubeState.get('U4'),
        'R': cubeState.get('R4'),
        'F': cubeState.get('F4'),
        'D': cubeState.get('D4'),
        'L': cubeState.get('L4'),
        'B': cubeState.get('B4')
      };
      
      // Reverse map: Color -> FaceChar
      const colorToFace = {};
      for (const [face, color] of Object.entries(centerColors)) {
        colorToFace[color] = face;
      }
      
      // 2. Build Facelet String
      // Order: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
      // min2phase expects: U R F D L B order
      const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
      let faceletString = "";
      
      for (const f of faceOrder) {
        for (let i = 0; i < 9; i++) {
          const id = `${f}${i}`;
          const color = cubeState.get(id);
          if (!color) {
             solutionContainer.innerHTML = '<div class="solution-section"><p class="error">Incomplete state.</p></div>';
             return;
          }
          faceletString += colorToFace[color];
        }
      }
      
      // 3. Solve
      try {
        const solution = min2phase.solve(faceletString);
        const moves = solution.trim();
        
        if (moves.length === 0) {
             solutionContainer.innerHTML = '<div class="solution-section"><p>Cube is already solved!</p></div>';
             return;
        }

        solutionContainer.innerHTML = `
          <div class="solution-section">
            <div class="solution-step">
              <h4>Optimal Solution</h4>
              <div class="solution-moves">${moves}</div>
              <p class="muted" style="margin-top:10px; font-size:0.9em;">
                Note: This is an optimal solution (Kociemba algorithm).
              </p>
            </div>
            <div class="solution-step" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
              <h4>Debug Info</h4>
              <p class="muted" style="font-size: 0.8em; word-break: break-all;">
                Facelet String: ${faceletString}
              </p>
            </div>
          </div>
        `;
      } catch (e) {
        // If min2phase fails, it usually returns an error code or throws
        // Error codes: -1: there is not exactly one facelet of each colour
        // -2: not all 12 edges exist exactly once
        // -3: flip error: one edge has to be flipped
        // -4: not all corners exist exactly once
        // -5: twist error: one corner has to be twisted
        // -6: parity error: two corners or two edges have to be exchanged
        
        let msg = "Unsolvable state.";
        if (typeof e === 'string' || typeof e === 'number') {
             // min2phase might return error code instead of throwing?
             // The library usually returns a string solution or error code.
             // But the wrapper might throw.
        }
        
        solutionContainer.innerHTML = `
          <div class="solution-section">
            <p class="error" style="color: var(--accent-strong); font-weight: bold;">${msg}</p>
            <p class="muted">Please check for twisted corners or flipped edges.</p>
            <div class="solution-step" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
              <h4>Debug Info</h4>
              <p class="muted" style="font-size: 0.8em; word-break: break-all;">
                Facelet String: ${faceletString}<br>
                Error: ${e}
              </p>
            </div>
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
