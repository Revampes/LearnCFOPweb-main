
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

  // --- CFOP Analysis ---
  const analyzeCFOP = () => {
    const report = [];
    
    // 1. Cross Check (White Cross on D)
    // Edges: DF (D1, F7), DR (D5, R7), DB (D7, B7), DL (D3, L7)
    // Note: Indices depend on rotation.
    // Standard layout:
    // D face: 0 1 2 (top), 3 4 5 (mid), 6 7 8 (bottom).
    // D1 is top-mid (adj F). D5 is right-mid (adj R). D7 is bottom-mid (adj B). D3 is left-mid (adj L).
    // F face: F7 is bottom-mid (adj D).
    // R face: R7 is bottom-mid (adj D).
    // B face: B7 is bottom-mid (adj D).
    // L face: L7 is bottom-mid (adj D).
    
    const checkEdge = (dId, fId, dColor, fColor) => {
      return cubeState.get(dId) === dColor && cubeState.get(fId) === fColor;
    };

    const dColor = 'white'; // D center
    const fColor = 'green'; // F center
    const rColor = 'orange';
    const bColor = 'blue';
    const lColor = 'red';

    const crossEdges = [
      checkEdge('D1', 'F7', dColor, fColor),
      checkEdge('D5', 'R7', dColor, rColor),
      checkEdge('D7', 'B7', dColor, bColor),
      checkEdge('D3', 'L7', dColor, lColor)
    ];
    
    const solvedCrossEdges = crossEdges.filter(x => x).length;
    if (solvedCrossEdges === 4) {
      report.push("✅ Cross is Solved");
    } else {
      report.push(`⚠️ Cross: ${solvedCrossEdges}/4 edges solved`);
    }

    // 2. OLL Identification (Yellow on U)
    // Check if F2L is done? Assuming yes for OLL check.
    // OLL Pattern: U face colors + Ring colors.
    // U Face: U0..U8.
    // Ring: L0 L1 L2, F0 F1 F2, R0 R1 R2, B0 B1 B2.
    
    const uColor = 'yellow';
    let uPattern = "";
    for(let i=0; i<9; i++) {
      if (i===4) continue; // Skip center
      uPattern += (cubeState.get(`U${i}`) === uColor ? "1" : "0");
    }
    
    // Ring pattern for OLL (12 bits)
    // Order: L(0,1,2) F(0,1,2) R(0,1,2) B(0,1,2)
    // Bit is 1 if color == uColor (Yellow), else 0.
    let ringPattern = "";
    const ringIndices = [
      ['L',0], ['L',1], ['L',2],
      ['F',0], ['F',1], ['F',2],
      ['R',0], ['R',1], ['R',2],
      ['B',0], ['B',1], ['B',2]
    ];
    
    for(const [f, i] of ringIndices) {
      ringPattern += (cubeState.get(`${f}${i}`) === uColor ? "1" : "0");
    }

    // Find OLL
    // We need to check rotations (0, 90, 180, 270)
    // Rotating U face means shifting U pattern and Ring pattern.
    // This is complex to implement fully without a library, but we can try exact match.
    
    const ollMatch = ollCases.find(c => c.topPattern === uPattern && c.ringPattern === ringPattern);
    if (ollMatch) {
      report.push(`💡 OLL Case: ${ollMatch.id}`);
      report.push(`   Alg: ${ollMatch.solution}`);
    } else {
      // Try to detect if OLL is solved
      if (uPattern === "11111111") {
        report.push("✅ OLL is Solved");
        
        // 3. PLL Identification
        // Check if PLL is solved
        // Ring colors must match their faces.
        // L0=L1=L2, F0=F1=F2, etc.
        // And L0 matches L center?
        
        // Simple PLL check:
        // Construct string of ring colors.
        // Map colors to A,B,C,D based on centers.
        // F=A, R=B, B=C, L=D.
        
        const mapColorToChar = (c) => {
          if (c === 'green') return 'A';
          if (c === 'orange') return 'B';
          if (c === 'blue') return 'C';
          if (c === 'red') return 'D';
          return '?';
        };
        
        let pllString = "";
        // Order for PLL cases json: F(0,1,2) R(0,1,2) B(0,1,2) L(0,1,2) ??
        // JSON example: "ABCBDBDAADCC" (12 chars).
        // Let's assume standard order starting from F.
        const pllIndices = [
          ['F',0], ['F',1], ['F',2],
          ['R',0], ['R',1], ['R',2],
          ['B',0], ['B',1], ['B',2],
          ['L',0], ['L',1], ['L',2]
        ];
        
        for(const [f, i] of pllIndices) {
          pllString += mapColorToChar(cubeState.get(`${f}${i}`));
        }
        
        // Check rotations for PLL
        // Shift string by 3 chars (one face) and remap colors?
        // Easier: Just check if solved.
        const isSolved = 
          cubeState.get('F0')===cubeState.get('F1') && cubeState.get('F1')===cubeState.get('F2') &&
          cubeState.get('R0')===cubeState.get('R1') && cubeState.get('R1')===cubeState.get('R2') &&
          cubeState.get('B0')===cubeState.get('B1') && cubeState.get('B1')===cubeState.get('B2') &&
          cubeState.get('L0')===cubeState.get('L1') && cubeState.get('L1')===cubeState.get('L2');
          
        if (isSolved) {
          report.push("✅ PLL is Solved (Cube Solved)");
        } else {
          // Try to match PLL case
          // We need to try 4 rotations of the pattern
          // And also map the colors dynamically.
          // This is a bit involved for this snippet.
          report.push("ℹ️ PLL Stage (Case detection requires alignment)");
        }
      }
    }

    return report;
  };

  // --- Solver Logic (min2phase) ---
  let min2phaseInitialized = false;

  const initMin2Phase = () => {
    if (typeof min2phase === 'undefined') {
      throw new Error('min2phase library not loaded');
    }
    if (!min2phaseInitialized) {
      min2phase.init();
      min2phaseInitialized = true;
    }
  };

  const solve = () => {
    const error = validateState();
    if (error) {
      alert(error);
      return;
    }
    
    solutionContainer.innerHTML = '<div class="solution-section"><p>Analyzing...</p></div>';
    
    setTimeout(() => {
      try {
        initMin2Phase();

        // 1. Map colors to Face characters (U, R, F, D, L, B)
        const centerColors = {
          'U': cubeState.get('U4'),
          'R': cubeState.get('R4'),
          'F': cubeState.get('F4'),
          'D': cubeState.get('D4'),
          'L': cubeState.get('L4'),
          'B': cubeState.get('B4')
        };
        
        const colorToFace = {};
        for (const [face, color] of Object.entries(centerColors)) {
          colorToFace[color] = face;
        }
        
        // 2. Build Facelet String
        // Order: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let faceletString = "";
        
        for (const f of faceOrder) {
          for (let i = 0; i < 9; i++) {
            const id = `${f}${i}`;
            const color = cubeState.get(id);
            if (!color) throw new Error(`Missing color at ${id}`);
            faceletString += colorToFace[color];
          }
        }
        
        // 3. Solve
        const solution = min2phase.solve(faceletString);
        
        // 4. CFOP Analysis
        const cfopReport = analyzeCFOP();
        
        let html = `
          <div class="solution-section">
            <div class="solution-step">
              <h4>Optimal Solution (${solution.trim().split(' ').length} moves)</h4>
              <div class="solution-moves">${solution}</div>
            </div>
        `;
        
        if (cfopReport.length > 0) {
          html += `
            <div class="solution-step" style="margin-top:15px; border-top:1px solid var(--border); padding-top:10px;">
              <h4>CFOP Analysis</h4>
              <ul style="padding-left: 20px; margin: 5px 0;">
                ${cfopReport.map(line => `<li>${line}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        
        html += `
            <div class="solution-step" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
              <h4>Debug Info</h4>
              <p class="muted" style="font-size: 0.8em; word-break: break-all;">
                Facelet String: ${faceletString}
              </p>
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
