(() => {
  const video = document.getElementById('video-feed');
  const canvas = document.getElementById('hidden-canvas');
  const ctx = canvas.getContext('2d');
  const gridOverlay = document.getElementById('grid-overlay');
  const captureBtn = document.getElementById('capture-btn');
  const retakeBtn = document.getElementById('retake-btn');
  const instructionTitle = document.getElementById('instruction-title');
  const instructionText = document.getElementById('instruction-text');
  const previewStrip = document.getElementById('preview-strip');
  const actionArea = document.getElementById('action-area');

  // Cube Notation: U, R, F, D, L, B
  const faces = [
    { id: 'U', name: 'Top (Yellow Center)', center: 'U' },
    { id: 'F', name: 'Front (Green Center)', center: 'F' },
    { id: 'R', name: 'Right (Orange Center)', center: 'R' },
    { id: 'B', name: 'Back (Blue Center)', center: 'B' },
    { id: 'L', name: 'Left (Red Center)', center: 'L' },
    { id: 'D', name: 'Bottom (White Center)', center: 'D' }
  ];

  let currentFaceIndex = 0;
  let scannedData = {}; // Stores arrays of 9 colors per face

  // Setup Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      video.srcObject = stream;
    } catch (err) {
      alert('Camera access denied or not available.');
      console.error(err);
    }
  };

  // Generate Grid UI
  const createGrid = () => {
    gridOverlay.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const div = document.createElement('div');
      div.className = 'scan-cell';
      gridOverlay.appendChild(div);
    }
  };

  // Initialize Previews
  const initPreviews = () => {
    previewStrip.innerHTML = '';
    faces.forEach(face => {
      const wrapper = document.createElement('div');
      wrapper.className = 'preview-face';
      wrapper.id = `preview-${face.id}`;
      // 3x3 grid
      for(let i=0; i<9; i++) {
        const d = document.createElement('div');
        d.className = 'preview-sticker';
        // Center color hint
        if (i === 4) d.classList.add(`c-${face.center.toLowerCase()}`);
        wrapper.appendChild(d);
      }
      previewStrip.appendChild(wrapper);
    });
  };

  // Color Detection Logic
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s, l];
  };

  const classifyColor = (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);

    // Thresholds - these need tuning in real world
    if (l > 0.8 && s < 0.2) return 'U'; // White (sometimes detected as U/D depending on lighting, we map 'D' to white in standard scheme)
    // Wait, standard scheme: U=Yellow, D=White
    // White: High L, Low S
    if (s < 0.15 && l > 0.4) return 'D'; // White
    
    // Low light white fallback
    if (s < 0.2 && l > 0.3) return 'D';

    if ((h >= 45 && h <= 70) && l > 0.35) return 'U'; // Yellow
    if ((h >= 0 && h <= 15) || (h >= 340 && h <= 360)) return 'L'; // Red? Standard scheme: L=Orange, R=Red? No.
    // Standard: U=Yellow, F=Green, R=Red, B=Blue, L=Orange, D=White
    // Wait, faces array above: R=Orange, L=Red in my array?
    // Let's correct faces array in memory for logic:
    // Standard Western: 
    // Top: Yellow
    // Front: Green
    // Right: Red
    // Back: Blue
    // Left: Orange
    // Down: White
    
    // HSL Hue approximate ranges:
    // Red: 0-10, 345-360
    // Orange: 10-45
    // Yellow: 45-70
    // Green: 75-150
    // Blue: 180-260

    if (h > 10 && h < 45) return 'L'; // Orange (L in my text used Orange Center? wait let's check faces array)
    // In code above: R=Orange center?? 
    // Standard R is Red, L is Orange usually. But user code might vary.
    // Let's assume standard spectral colors and map to closest "Id".
    
    // We will return generic Color Names first, then logic maps to face.
    if ((h >= 0 && h <= 15) || (h >= 345 && h <= 360)) return 'R'; // Red
    if (h > 15 && h < 45) return 'L'; // Orange
    if (h >= 45 && h < 75) return 'U'; // Yellow
    if (h >= 75 && h < 160) return 'F'; // Green
    if (h >= 160 && h < 270) return 'B'; // Blue
    
    return 'D'; // Fallback white
  };

  // But we need to match the specific center color of the face we are scanning
  // or simply trust the color.
  // Actually, we should just map to standard U/D/F/B/R/L based on color.
  // White -> D
  // Yellow -> U
  // Green -> F
  // Blue -> B
  // Red -> R
  // Orange -> L
  
  // NOTE: The previous `faces` array had R=Orange. Let's fix that to match standard color scheme 
  // or match the user's files if they are weird.
  // cross.js: R=orange, L=red.
  // user's cross.js line 230:
  // case 'U': return 'yellow';
  // case 'F': return 'green';
  // case 'R': return 'orange';
  // case 'B': return 'blue';
  // case 'L': return 'red';
  // case 'D': return 'white';
  // OKAY, this user uses R=ORANGE, L=RED. 
  // This is non-standard but I MUST FOLLOW IT.
  
  const classifyColorUserScheme = (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // White (D)
    if (s < 0.20 && l > 0.3) return 'D';
    
    // Yellow (U)
    if (h >= 45 && h < 75) return 'U';
    
    // Green (F)
    if (h >= 75 && h < 160) return 'F';
    
    // Blue (B)
    if (h >= 160 && h < 270) return 'B';
    
    // Orange (R in this scheme) - H~30
    if (h > 15 && h < 45) return 'R';
    
    // Red (L in this scheme) - H~0
    if ((h >= 0 && h <= 15) || (h >= 345 && h <= 360)) return 'L';

    return 'D';
  };


  const capture = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.scale(-1, 1); // Mirror flip context to match video
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    // Because we scaled context, we need to be careful with pixel extraction coords if we calculated them on screen.
    // Actually, easier to draw normal and just mirror the coordinates? 
    // Or just draw mirror and read.
    // The video element is CSS transformed. The captured image is NOT.
    // So 'video' source is normal. We should draw it normal.
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const faceColors = [];
    const w = canvas.width;
    const h = canvas.height;
    
    // 3x3 grid sample points
    // Center of each cell
    const stepX = w / 3;
    const stepY = h / 3;
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = Math.floor(col * stepX + stepX / 2);
        const y = Math.floor(row * stepY + stepY / 2);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const colorCode = classifyColorUserScheme(pixel[0], pixel[1], pixel[2]);
        faceColors.push(colorCode);
      }
    }
    
    // Force center to be correct for the requested face (User might have bad lighting)
    // Current face expected center:
    const expected = faces[currentFaceIndex].center;
    // faceColors[4] is center
    if (faceColors[4] !== expected) {
      console.warn(`Center detected as ${faceColors[4]}, processed as ${expected}`);
      faceColors[4] = expected; 
    }

    scannedData[faces[currentFaceIndex].id] = faceColors;
    updatePreview(faces[currentFaceIndex].id, faceColors);
    
    nextFace();
  };

  const updatePreview = (faceId, colors) => {
    const el = document.getElementById(`preview-${faceId}`);
    if (!el) return;
    const stickers = el.children;
    for(let i=0; i<9; i++) {
        stickers[i].className = 'preview-sticker'; // reset
        stickers[i].classList.add(`c-${colors[i].toLowerCase()}`);
    }
    // Highlight done
    el.style.borderColor = 'var(--accent)';
  };

  const nextFace = () => {
    currentFaceIndex++;
    if (currentFaceIndex >= faces.length) {
      finishScan();
    } else {
      updateInstruction();
    }
  };

  const updateInstruction = () => {
    const f = faces[currentFaceIndex];
    instructionTitle.textContent = `Scan ${f.name}`;
    instructionText.textContent = `Align the ${f.name} in the grid.`;
  };

  const finishScan = () => {
    instructionTitle.textContent = "Scan Complete!";
    instructionText.textContent = "Check the previews. If they look wrong, retake.";
    captureBtn.style.display = 'none';
    actionArea.style.display = 'block';
    
    // Cleanup video
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  // Export functions
  window.sendTo = (tool) => {
    localStorage.setItem('cubeScanData', JSON.stringify(scannedData));
    if (tool === 'cross') window.location.href = 'cross.html?auto=true';
    if (tool === 'oll') window.location.href = 'oll.html?auto=true';
    if (tool === 'pll') window.location.href = 'pll.html?auto=true';
  };

  captureBtn.addEventListener('click', capture);
  
  createGrid();
  initPreviews();
  startCamera();
  updateInstruction();

})();
