(() => {
  const animCube = document.getElementById('anim-cube');
  const animSection = document.getElementById('animation-section');
  const replayBtn = document.getElementById('anim-replay');
  const stepsContainer = document.getElementById('anim-steps');

  // Modal logic shared across pages that use f2l-animation
  const modal = document.getElementById('alg-modal');
  const modalClosers = Array.from(document.querySelectorAll('[data-close-modal]'));

  const openModal = () => {
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    modal.setAttribute('aria-hidden', 'false');
    if (stepsContainer) stepsContainer.scrollTop = 0;
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    modal.setAttribute('aria-hidden', 'true');
    killAnimation = true;
  };

  if (modal) {
    modalClosers.forEach((btn) => btn.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }
  
  if (!animCube) return;

  // New container for orientation
  let world = null;

  // Constants
  const FACES = ['u', 'f', 'r', 'd', 'l', 'b'];
  // Adjusted to Standard CFOP orientation: U=Yellow, F=Green, R=Orange, D=White, L=Red, B=Blue
  const COLORS = ['yellow', 'green', 'orange', 'white', 'red', 'blue'];
  // Indices for State array
  const U=0, F=1, R=2, D=3, L=4, B=5; 
  
  const isCrossPage = (window.location.pathname.split('/').pop() || '').toLowerCase() === 'cross.html';

  // State: [FaceIndex][StickerIndex] = ColorString
  // Cross page: centers + cross edges colored, others grey. Other pages: fully colored.
  let state = [];
  let solvedState = [];
  let currentSolution = '';
  let currentSetupMoves = null;
  let isAnimating = false;
  let killAnimation = false;
  
  const invertMove = (m) => {
    if (m.endsWith('2')) return m;
    if (m.endsWith("'")) return m.slice(0, -1);
    return `${m}'`;
  };

  const parseMoves = (solution = currentSolution) => solution.split(' ').filter((x) => x);

  // Note: we keep the full move list (including any conjugations like y/y') for animation playback.
  // The unsolved setup state is built by applying the inverse of the full move list, so orientation stays correct.

  // Cubie Management
  // 3x3x3 grid. x, y, z in {-1, 0, 1}
  // We store references to DOM elements
  const cubies = [];

  /*
    Coordinate System (Web 3D):
    +X: Right
    +Y: Down (So Top is y=-1)
    +Z: Front (So Front is z=1)
  */

  const createCubie = (x, y, z) => {
    const el = document.createElement('div');
    el.className = 'cubie';
    el.dataset.x = x;
    el.dataset.y = y;
    el.dataset.z = z;
    
    // Position
    // 50px unit. Center (0,0,0) is at 50%, 50% (css centered).
    // translate3d(x*50, y*50, z*50).
    el.style.transform = `translate3d(${x*50}px, ${y*50}px, ${z*50}px)`;

    // Create 6 faces
    FACES.forEach(f => {
      const face = document.createElement('div');
      face.className = `face face-${f} sticker`;
      el.appendChild(face);
    });

    return el;
  };

  const initWorld = () => {
    animCube.innerHTML = '';
    
    world = document.createElement('div');
    world.className = 'world-pivot';
    world.style.transformStyle = 'preserve-3d';
    world.style.width = '100%';
    world.style.height = '100%';
    world.style.transition = 'transform 0.5s ease';
    animCube.appendChild(world);

    cubies.length = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const c = createCubie(x, y, z);
          world.appendChild(c);
          cubies.push(c);
        }
      }
    }

    if (isCrossPage) {
      const makeFace = (centerColor) => {
        const face = Array(9).fill('');
        face[4] = centerColor; // show only the center color
        return face;
      };

      solvedState = COLORS.map((c) => makeFace(c));

      // Color only the solved white cross edges (white on D, color on adjacent face)
      // DF: D1 white, F7 green
      solvedState[D][1] = 'white';
      solvedState[F][7] = 'green';
      // DR: D5 white, R7 orange
      solvedState[D][5] = 'white';
      solvedState[R][7] = 'orange';
      // DB: D7 white, B7 blue
      solvedState[D][7] = 'white';
      solvedState[B][7] = 'blue';
      // DL: D3 white, L7 red
      solvedState[D][3] = 'white';
      solvedState[L][7] = 'red';
    } else {
      solvedState = COLORS.map((c) => Array(9).fill(c));
    }

    state = JSON.parse(JSON.stringify(solvedState)); // Deep copy
  };

  // State Helpers (Logic from previous file)
  const getS = (f, i) => state[f][i];
  const setS = (f, i, c) => state[f][i] = c;
  
  const cycle = (arr) => {
    const lastVal = getS(arr[arr.length-1][0], arr[arr.length-1][1]);
    for (let i = arr.length - 1; i > 0; i--) {
        const [tf, ti] = arr[i];
        const [sf, si] = arr[i-1];
        setS(tf, ti, getS(sf, si));
    }
    const [tf, ti] = arr[0];
    setS(tf, ti, lastVal); 
  };

  const rotateFaceState = (f) => {
    cycle([[f,0], [f,2], [f,8], [f,6]]);
    cycle([[f,1], [f,5], [f,7], [f,3]]);
  };

  // State Updates (Logical)
  // These modify 'state' array.
  const logicalMoves = {
    U: () => {
      rotateFaceState(U);
      cycle([[F,0],[L,0],[B,0],[R,0]]);
      cycle([[F,1],[L,1],[B,1],[R,1]]);
      cycle([[F,2],[L,2],[B,2],[R,2]]);
    },
    D: () => {
      rotateFaceState(D);
      cycle([[F,6],[R,6],[B,6],[L,6]]);
      cycle([[F,7],[R,7],[B,7],[L,7]]);
      cycle([[F,8],[R,8],[B,8],[L,8]]);
    },
    R: () => {
      rotateFaceState(R);
      cycle([[F,2],[U,2],[B,6],[D,2]]);
      cycle([[F,5],[U,5],[B,3],[D,5]]);
      cycle([[F,8],[U,8],[B,0],[D,8]]);
    },
    L: () => {
      rotateFaceState(L);
      cycle([[F,0],[D,0],[B,8],[U,0]]);
      cycle([[F,3],[D,3],[B,5],[U,3]]);
      cycle([[F,6],[D,6],[B,2],[U,6]]);
    },
    F: () => {
      rotateFaceState(F);
      cycle([[U,6],[R,0],[D,2],[L,8]]);
      cycle([[U,7],[R,3],[D,1],[L,5]]);
      cycle([[U,8],[R,6],[D,0],[L,2]]);
    },
    B: () => {
      rotateFaceState(B);
      cycle([[U,2],[L,0],[D,6],[R,8]]);
      cycle([[U,1],[L,3],[D,7],[R,5]]);
      cycle([[U,0],[L,6],[D,8],[R,2]]);
    }
  };

  const applyLogicalMove = (base) => {
    if (logicalMoves[base]) {
        logicalMoves[base]();
        return;
    }
    
    // M' Logic (Used in x and r)
    // Moves M slice Up (F -> U -> B -> D)
    const applyMPrime = () => {
       cycle([[F,1],[U,1],[B,7],[D,1]]);
       cycle([[F,4],[U,4],[B,4],[D,4]]);
       cycle([[F,7],[U,7],[B,1],[D,7]]);
    };

    // S Logic (Used in f and z)
    // Moves S slice CW (following F)
    const applyS = () => {
        cycle([[U,3],[R,1],[D,5],[L,7]]);
        cycle([[U,4],[R,4],[D,4],[L,4]]);
        cycle([[U,5],[R,7],[D,3],[L,1]]);
    };

    if (base === 'x') {
       // x = R M' L'
       applyLogicalMove('R');
       applyMPrime();
       // L'
       applyLogicalMove('L'); applyLogicalMove('L'); applyLogicalMove('L');
    }
    else if (base === 'y') {
       // y = U E' D'
       // U
       applyLogicalMove('U');
       // E' (follows U direction)
       cycle([[F,3],[L,3],[B,3],[R,3]]);
       cycle([[F,4],[L,4],[B,4],[R,4]]);
       cycle([[F,5],[L,5],[B,5],[R,5]]);
       // D'
       applyLogicalMove('D'); applyLogicalMove('D'); applyLogicalMove('D');
    }
    else if (base === 'r') {
       // r = R M'
       applyLogicalMove('R');
       applyMPrime();
    }
    else if (base === 'l') {
       // l = L M
       // M is opposite of M'
       applyLogicalMove('L');
       applyMPrime(); applyMPrime(); applyMPrime(); // M = M' x 3
    }
    else if (base === 'u') { // Uw
        // u = U E' = y D
        applyLogicalMove('y');
        applyLogicalMove('D');
    }
    else if (base === 'd') { // Dw
        // d = D E = y' U
        applyLogicalMove('y'); applyLogicalMove('y'); applyLogicalMove('y'); // y'
        applyLogicalMove('U');
    }
    else if (base === 'f') { // Fw
        // f = F S
        applyLogicalMove('F');
        applyS();
    }
    else if (base === 'b') { // Bw
        // b = B S'
        applyLogicalMove('B');
        applyS(); applyS(); applyS(); // S'
    }
    else if (base === 'M') {
        // M = L' R x' (Moves middle slice downwards F-D-B-U)
        // M is opposite of M', so call applyMPrime 3 times
        applyMPrime(); applyMPrime(); applyMPrime();
    }
    else if (base === 'E') {
        // E moves middle slice D-L-U-R (Reference? checks needed)
        // Standard E follows D. D follows Y axis right hand (Top -> Right).
        // Actually D rotates around Y axis? No.
        // D is bottom face clockwise. Thumb Down. Fingers Front->Right.
        // E follows D. So Front->Right.
        // E' is used in y = U E' D'.
        // U moves Front->Left. D moves Front->Right.
        // E' moves Front->Left.
        // So E moves Front->Right.
        // My E' implementation in y: cycle F->R->B->L (Wait. y loops: F,3 (Left of F) -> L,3...??)
        // cycle([[F,3],[L,3],[B,3],[R,3]]);
        // F,3 is Right edge of F? No. 3 is Middle Left?
        // Indices:
        // 0 1 2
        // 3 4 5
        // 6 7 8
        // F3 is Middle Left. F5 is Middle Right.
        
        // E moves slice Front -> Right -> Back -> Left.
        // Is that CW or CCW?
        // Let's rely on y logic. y = U E' D'
        // So E' = U' y D'.
        // Or E = U y' D.
        // simpler: E' follows U. E follows D.
        // D moves Front -> Right.
        // So E moves Front -> Right.
        // Check applyS logic...
        
        // Let's implement E using cycle helper from y, but reversed for E.
        // E' cycle: F -> L -> B -> R.
        // E cycle: F -> R -> B -> L.
        cycle([[F,3],[R,3],[B,3],[L,3]]);
        cycle([[F,4],[R,4],[B,4],[L,4]]);
        cycle([[F,5],[R,5],[B,5],[L,5]]);
    }
    else if (base === 'S') {
        // S = F' B z (Moves middle slice CW F-R-D-L) ... no.
        // S follows F. F is CW.
        applyS();
    }
  };

  // Mapping from State Index to Cubie Face
  // Returns { x, y, z, fName }
  const getCubieFaceForSticker = (faceIdx, sIdx) => {
    let x=0, y=0, z=0, fName='';
    
    // Helper: Map 0..8 to row/col
    const row = Math.floor(sIdx / 3);
    const col = sIdx % 3;

    switch(faceIdx) {
      case U: // y = -1. Z increases with row. X increases with col.
        y = -1;
        z = row - 1; // 0->-1, 1->0, 2->1
        x = col - 1; 
        fName = 'face-u';
        break;
      case D: // y = 1. Z decreases with row. X increases with col.
        y = 1;
        z = 1 - row;
        x = col - 1;
        fName = 'face-d';
        break;
      case F: // z = 1. Y increases with row. X increases with col.
        z = 1;
        y = row - 1;
        x = col - 1;
        fName = 'face-f';
        break;
      case B: // z = -1. Y increases with row. X DECREASES with col 
        z = -1;
        y = row - 1;
        x = 1 - col;
        fName = 'face-b';
        break;
      case L: // x = -1. Y increases with row. Z increases with col.
        x = -1;
        y = row - 1;
        z = col - 1;
        fName = 'face-l';
        break;
      case R: // x = 1. Y increases row. Z DECREASES col.
        x = 1;
        y = row - 1;
        z = 1 - col;
        fName = 'face-r';
        break;
    }
    return {x, y, z, fName};
  };

  const render = () => {
    // For each face in state
    state.forEach((stickers, fIdx) => {
      stickers.forEach((color, sIdx) => {
        // Find geometry
        const {x, y, z, fName} = getCubieFaceForSticker(fIdx, sIdx);
        
        // Find DOM
        const cubie = cubies.find(c => 
          parseInt(c.dataset.x) === x &&
          parseInt(c.dataset.y) === y &&
          parseInt(c.dataset.z) === z
        );
        
        if (cubie) {
          const faceEl = cubie.querySelector('.' + fName);
          if (faceEl) {
            const colorClass = color ? ` ${color}` : '';
            faceEl.className = `face ${fName} sticker${colorClass}`;
          }
        }
      });
    });
  };

  const applySetupState = (moves) => {
    initWorld();
    const setupMoves = moves.slice().reverse().map(invertMove);
    setupMoves.forEach((m) => {
      const { base, isPrime, isDouble } = parseMove(m);
      let count = 1;
      if (isDouble) count = 2;
      else if (isPrime) count = 3;
      for (let i = 0; i < count; i += 1) applyLogicalMove(base);
    });
    render();
    fixOrientation();
  };

  const fixOrientation = () => {
    if (!world) return;
    
    let gFace = null, yFace = null;
    const faceMap = {0:'U', 1:'F', 2:'R', 3:'D', 4:'L', 5:'B'};
    
    for(let f=0; f<6; f++) {
        const c = state[f][4]; // center sticker
        if (c === 'green') gFace = faceMap[f];
        if (c === 'yellow') yFace = faceMap[f];
    }
    
    if (!gFace || !yFace) return;

    let rot1 = '', accRot = '';

    // 1. Move Green to Front
    switch(gFace) {
        case 'U': rot1 = 'rotateX(90deg)'; break;
        case 'D': rot1 = 'rotateX(-90deg)'; break;
        case 'L': rot1 = 'rotateY(90deg)'; break;
        case 'R': rot1 = 'rotateY(-90deg)'; break;
        case 'B': rot1 = 'rotateY(180deg)'; break;
        case 'F': rot1 = ''; break;
    }
    
    let rot2 = '';
    // 2. Move Yellow to Up (Relative to Rot1)
    
    // Group 1: gFace = F (rot1='')
    if (gFace === 'F') {
        if (yFace === 'D') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'L') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'R') rot2 = 'rotateZ(-90deg)';
    }
    // Group 2: gFace = U (rot1=rotateX(90))
    else if (gFace === 'U') {
        if (yFace === 'F') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'L') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'R') rot2 = 'rotateZ(-90deg)';
    }
    // Group 3: gFace = D (rot1=rotateX(-90))
    else if (gFace === 'D') {
        if (yFace === 'B') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'L') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'R') rot2 = 'rotateZ(-90deg)';
    }
    // Group 4: gFace = L (rot1=rotateY(90))
    else if (gFace === 'L') {
        if (yFace === 'D') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'B') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'F') rot2 = 'rotateZ(-90deg)';
    }
    // Group 5: gFace = R (rot1=rotateY(-90))
    else if (gFace === 'R') {
        if (yFace === 'D') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'F') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'B') rot2 = 'rotateZ(-90deg)';
    }
    // Group 6: gFace = B (rot1=rotateY(180))
    else if (gFace === 'B') {
        if (yFace === 'D') rot2 = 'rotateZ(180deg)';
        else if (yFace === 'R') rot2 = 'rotateZ(90deg)';
        else if (yFace === 'L') rot2 = 'rotateZ(-90deg)';
    }

    world.style.transform = `${rot1} ${rot2}`.trim();
  };

  const renderMoveChips = (moves) => {
    if (!stepsContainer) return;
    stepsContainer.innerHTML = '';
    moves.forEach((m) => {
      const span = document.createElement('span');
      span.className = 'move-chip';
      span.textContent = m;
      stepsContainer.appendChild(span);
    });
  };

  const setActiveChip = (index) => {
    if (!stepsContainer) return;
    const chips = Array.from(stepsContainer.querySelectorAll('.move-chip'));
    chips.forEach((chip, i) => {
      chip.classList.toggle('is-active', i === index);
    });
  };

  // Animation Primitive
  const visualRotate = async (filterFn, axis, angleDeg) => {
    if (killAnimation) return;

    // 1. Identify Group
    const group = cubies.filter(c => filterFn(
      parseInt(c.dataset.x),
      parseInt(c.dataset.y),
      parseInt(c.dataset.z)
    ));

    if (group.length === 0) return;

    // 2. Create Pivot
    const pivot = document.createElement('div');
    pivot.style.position = 'absolute';
    pivot.style.top = '50%';
    pivot.style.left = '50%';
    pivot.style.width = '0';
    pivot.style.height = '0';
    pivot.style.transformStyle = 'preserve-3d';
    pivot.style.transform = 'rotate(0deg)'; // Init
    pivot.style.transition = 'transform 0.25s ease-out'; // Fast and smooth
    world.appendChild(pivot);

    // 3. Move cubies to pivot
    group.forEach(c => pivot.appendChild(c));

    // 4. Trigger Reflow
    pivot.offsetHeight;

    // 5. Animate
    let transformCmd = '';
    if (axis === 'x') transformCmd = `rotateX(${angleDeg}deg)`;
    if (axis === 'y') transformCmd = `rotateY(${angleDeg}deg)`;
    if (axis === 'z') transformCmd = `rotateZ(${angleDeg}deg)`;
    
    pivot.style.transform = transformCmd;

    // 6. Wait for transition
    await new Promise(r => setTimeout(r, 260));

    // 7. Cleanup
    group.forEach(c => {
        world.appendChild(c);
        // c element retains its relative transform (translate3d)
        // But since it's removed from pivot, visual rotation is lost.
        // This is where we must immediately Update Logic & Render
        // So the "snap back" shows the new colors in the old positions.
    });
    pivot.remove();
  };

  const parseMove = (moveStr) => {
    let m = moveStr;
    let isPrime = m.includes("'");
    let isDouble = m.includes("2");
    
    // Remove modifiers to identify base
    // Handle 'w' before ' or 2. e.g. Fw2, Fw'.
    // Regex might be cleaner but manual parsing is fine.
    
    let baseRaw = m.replace("'", "").replace("2", ""); // e.g. "Fw", "R", "r"
    
    let base = baseRaw;
    let isWide = false;
    
    if (baseRaw.length > 1 && baseRaw.toLowerCase().endsWith('w')) {
        isWide = true;
        base = baseRaw[0].toLowerCase(); // Use lowercase for wide internal logic (r, l, u, d, f, b)
    } else if (['u','d','l','r','f','b'].includes(baseRaw)) { 
        // Already lowercase wide move
        isWide = true;
        base = baseRaw;
    } else {
        // Standard uppercase
        base = baseRaw;
    }
    
    return { base, isPrime, isDouble };
  };

  const animateMove = async (move) => {
    const { base, isPrime, isDouble } = parseMove(move);

    let angle = -90; // Default CW
    
    // Override angles based on move type
    const getAngle = (baseParams) => {
        let a = baseParams;
        if (isPrime) a *= -1;
        if (isDouble) a *= 2;
        return a;
    };

    // Filters and Base Angles (CW)
    let filter = null;
    let axis = '';
    let baseAngle = 0;

    switch(base) {
      case 'U': 
        filter = (x,y,z) => y === -1;
        axis = 'y';
        baseAngle = -90; // Top spins left (CW from top)
        break;
      case 'D':
        filter = (x,y,z) => y === 1;
        axis = 'y';
        baseAngle = 90; // Bottom spins right (CW from bottom)
        break;
      case 'R':
        filter = (x,y,z) => x === 1;
        axis = 'x';
        baseAngle = 90; // CW around X
        break;
      case 'L':
        filter = (x,y,z) => x === -1;
        axis = 'x';
        baseAngle = -90; // CW around -X (CCW X)
        break;
      case 'F':
        filter = (x,y,z) => z === 1;
        axis = 'z';
        baseAngle = 90; // CW around Z
        break;
      case 'B':
        filter = (x,y,z) => z === -1;
        axis = 'z';
        baseAngle = -90; // CW around -Z (CCW Z)
        break;
      case 'y':
        filter = () => true;
        axis = 'y';
        baseAngle = -90;
        break;
      case 'x':
        filter = () => true;
        axis = 'x';
        baseAngle = 90;
        break;
      case 'r': // wide R (R + M')
        filter = (x,y,z) => x >= 0;
        axis = 'x';
        baseAngle = 90; 
        break;
      case 'l': // wide L (L + M)
        filter = (x,y,z) => x <= 0;
        axis = 'x';
        baseAngle = -90; 
        break;
      case 'u': // wide U (U + E')
        filter = (x,y,z) => y <= 0;
        axis = 'y';
        baseAngle = -90; 
        break;
      case 'd': // wide D (D + E)
        filter = (x,y,z) => y >= 0;
        axis = 'y';
        baseAngle = 90; 
        break;
      case 'f': // wide F (F + S)
        filter = (x,y,z) => z >= 0;
        axis = 'z';
        baseAngle = 90; 
        break;
      case 'b': // wide B (B + S')
        filter = (x,y,z) => z <= 0;
        axis = 'z';
        baseAngle = -90; 
        break;
      case 'M': 
        // M follows L (Down). L is -90 around X.
        // M is middle slice (x=0).
        filter = (x,y,z) => x === 0;
        axis = 'x';
        baseAngle = -90;
        break;
      case 'E':
        // E follows D (Right). D is +90 around Y.
        // E is middle slice (y=0).
        filter = (x,y,z) => y === 0;
        axis = 'y';
        baseAngle = 90;
        break;
      case 'S':
        // S follows F (CW). F is +90 around Z.
        // S is middle slice (z=0).
        filter = (x,y,z) => z === 0;
        axis = 'z';
        baseAngle = 90;
        break;
    }

    if (filter) {
        await visualRotate(filter, axis, getAngle(baseAngle));
    }

    // Update Logic
    // Apply logical moves
    let count = 1;
    if (isDouble) count = 2;
    if (isPrime) count = 3;
    
    for(let k=0; k<count; k++) {
        applyLogicalMove(base);
    }
    
    render();
  };

  const simplifyMoves = (moves) => {
    const stack = [];
    moves.forEach(m => {
      if (!m) return;
      let base = m[0];
      let suffix = m.substring(1);
      let count = 1;
      if (suffix === '2') count = 2;
      else if (suffix === "'") count = 3;
      
      if (stack.length > 0) {
        let last = stack[stack.length-1];
        let lastBase = last[0];
        if (lastBase === base) {
          let lastSuffix = last.substring(1);
          let lastCount = 1;
          if (lastSuffix === '2') lastCount = 2;
          else if (lastSuffix === "'") lastCount = 3;
          
          let sum = (count + lastCount) % 4;
          stack.pop();
          
          if (sum === 0) return; 
          let newSuffix = '';
          if (sum === 2) newSuffix = '2';
          else if (sum === 3) newSuffix = "'";
          stack.push(base + newSuffix);
          return;
        }
      }
      stack.push(m);
    });
    return stack;
  };

  const normalizeAlgorithm = (alg) => {
    let moves = parseMoves(alg);
    const newMoves = [];
    
    let map = { U: 'U', D: 'D', F: 'F', B: 'B', L: 'L', R: 'R' };

    const updateMap = (type, count = 1) => {
      for(let i=0; i<count; i++) {
        const m = {...map};
        if (type === 'y') {
          map.F = m.R; map.R = m.B; map.B = m.L; map.L = m.F;
        } else if (type === 'x') { 
          map.F = m.D; map.D = m.B; map.B = m.U; map.U = m.F;
        } else if (type === 'z') { 
          map.U = m.L; map.L = m.D; map.D = m.R; map.R = m.U;
        }
      }
    };

    for (let move of moves) {
      let { base, isPrime, isDouble } = parseMove(move); 
      let repeat = isDouble ? 2 : (isPrime ? 3 : 1); 
      
      let seq = [];
      
      switch(base) {
        case 'x': seq.push({t:'rot', v:'x'}); break;
        case 'y': seq.push({t:'rot', v:'y'}); break;
        case 'z': seq.push({t:'rot', v:'z'}); break;
        case 'U': seq.push({t:'face', v:'U'}); break;
        case 'D': seq.push({t:'face', v:'D'}); break;
        case 'F': seq.push({t:'face', v:'F'}); break;
        case 'B': seq.push({t:'face', v:'B'}); break;
        case 'L': seq.push({t:'face', v:'L'}); break;
        case 'R': seq.push({t:'face', v:'R'}); break;
        case 'r': seq.push({t:'rot', v:'x'}, {t:'face', v:'L'}); break; 
        case 'l': seq.push({t:'rot', v:'x', inv:true}, {t:'face', v:'R'}); break; 
        case 'u': seq.push({t:'rot', v:'y'}, {t:'face', v:'D'}); break;
        case 'd': seq.push({t:'rot', v:'y', inv:true}, {t:'face', v:'U'}); break;
        case 'f': seq.push({t:'rot', v:'z'}, {t:'face', v:'B'}); break;
        case 'b': seq.push({t:'rot', v:'z', inv:true}, {t:'face', v:'F'}); break;
        case 'M': seq.push({t:'slice', v:'M'}); break; 
        case 'E': seq.push({t:'slice', v:'E'}); break; 
        case 'S': seq.push({t:'slice', v:'S'}); break; 
      }

      for (let k=0; k<repeat; k++) {
        seq.forEach(step => {
           let val = step.v;
           if (step.t === 'rot') {
             let rots = 1;
             if (step.inv) rots = 3;
             updateMap(val, rots);
           } else if (step.t === 'slice') {
             let suffix = step.inv ? "'" : '';
             newMoves.push(val + suffix);
           } else {
             let mapped = map[val];
             let suffix = '';
             if (step.inv) suffix = "'"; 
             newMoves.push(mapped + suffix);
           }
        });
      }
    }
    
    return simplifyMoves(newMoves);
  };

  const fullAnimation = async () => {
    // If currentSolution is set, we prefer the normalized setup moves
    const moves = currentSetupMoves || parseMoves();
    if (moves.length === 0) return;

    const setupMoves = currentSetupMoves || moves;
    const solutionAtStart = currentSolution;

    isAnimating = true;
    killAnimation = false;
    replayBtn.disabled = true;

    applySetupState(setupMoves);
    renderMoveChips(moves);
    setActiveChip(-1);

    try {
      await new Promise((r) => setTimeout(r, 500));

      for (let i = 0; i < moves.length; i += 1) {
        if (killAnimation) break;
        setActiveChip(i);
        await animateMove(moves[i]);
        if (killAnimation) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    } finally {
      setActiveChip(-1);
      replayBtn.disabled = false;
      isAnimating = false;

      const hasNewerSolution = currentSolution !== solutionAtStart;
      const latestMoves = hasNewerSolution ? parseMoves() : moves;
      const shouldDelay = !killAnimation && !hasNewerSolution;
      killAnimation = false;

      if (shouldDelay) await new Promise((r) => setTimeout(r, 1500));
      applySetupState(latestMoves);
    }
  };

  window.addEventListener('f2l-solution-found', (e) => {
    const solution = (e.detail?.solution || '').trim();
    if (!solution) return;

    currentSolution = solution;
    
    // Normalize to remove rotations and decompose wide moves
    const moves = normalizeAlgorithm(solution);
    currentSetupMoves = moves;

    if (animSection) animSection.style.display = 'block';
    openModal();
    renderMoveChips(moves);
    applySetupState(moves);
    replayBtn.disabled = false;

    if (isAnimating) {
      killAnimation = true;
    }
  });

  replayBtn.addEventListener('click', () => {
      if (isAnimating || !currentSolution) return;
      fullAnimation();
  });

  initWorld();

})();
