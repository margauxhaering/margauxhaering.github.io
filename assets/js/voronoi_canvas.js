function registerVoronoi(canvas, section) {
    const ctx = canvas.getContext('2d');

    // Render at CSS pixels (dpr = 1): the canvas sits at 33% opacity behind the
    // content, so device-pixel detail is wasted and just multiplies fill/filter cost.
    const dpr = 1;
    function resize(){
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse position in device pixels (top-left origin, matching canvas 2D).
    let mouseX = -1e9;
    let mouseY = -1e9;
    function setMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width * canvas.width;
        mouseY = (e.clientY - rect.top) / rect.height * canvas.height;
    }
    section.addEventListener('mousemove', setMousePosition);

    canvas.setAttribute("currentMouseColor", '#d899bf');

    // Seed points live in a normalized space: x in [0, aspect], y in [0, 1].
    const COUNT = 49;
    function rand(a,b){ return a + Math.random()*(b-a); }

    const noise = createNoise2D();

    // Blue-noise initial placement (Mitchell's best-candidate): even, natural
    // spacing without the clumps and gaps of uniform random. x spans [0, aspect]
    // so the points fill the (wider-than-tall) viewport.
    const aspect0 = window.innerWidth / window.innerHeight;
    const pts = blueNoise(COUNT, aspect0, 1).map((s) => ({
        x: s.x,
        y: s.y,
        vx: rand(-1,1)*0.025,
        vy: rand(-1,1)*0.025,
        seed: rand(0,1000),   // each point samples its own "lane" of the noise field
    }));

    // Tunables for the wandering motion.
    const ACCEL = 0.04;       // steering strength (each noise lane is mean 0, |force| ~0.5)
    const DAMP = 0.95;        // velocity damping (lower = calmer)
    const NOISE_SPEED = 0.15; // how fast the steering force evolves over time
    const DRIFT_SPEED = 0.02; // strength of the steady current (normalized units/dt)
    const TURN_TAU = 0.6;     // seconds for the current to swing to a new heading (smoothness)

    let noiseT = 0;
    let driftAngle = rand(0, Math.PI * 2);   // heading of the current
    let driftTarget = driftAngle;            // heading it's easing toward
    let driftClock = 0;                      // seconds since the last heading change
    let nextTurn = 10 + rand(-2, 2);         // re-randomize the heading every 10 +/- 2 s

    function step(dt){
        noiseT += dt * NOISE_SPEED;
        const sec = dt * 0.3;   // real seconds this frame (dt = elapsedMs / 300)

        // Every 10 +/- 2 s pick a new random heading for the current, then ease toward it
        // (TURN_TAU sets how gently it swings round) so the change reads as a turning
        // current rather than an abrupt jerk.
        driftClock += sec;
        if(driftClock >= nextTurn){
            driftTarget = rand(0, Math.PI * 2);
            driftClock = 0;
            nextTurn = 10 + rand(-2, 2);
        }
        let da = driftTarget - driftAngle;
        da = Math.atan2(Math.sin(da), Math.cos(da));   // shortest way round the circle
        driftAngle += da * (1 - Math.exp(-sec / TURN_TAU));
        const driftX = Math.cos(driftAngle) * DRIFT_SPEED;
        const driftY = Math.sin(driftAngle) * DRIFT_SPEED;

        const aspect = window.innerWidth / window.innerHeight;
        for(const p of pts){
            // Steer with a vector read from two independent noise lanes (one per axis).
            // Each lane is symmetric around 0, so the wander itself has no directional
            // bias; the field evolves smoothly, so paths curve organically.
            const fx = noise(p.seed, noiseT);
            const fy = noise(p.seed + 1000, noiseT);
            p.vx += fx * ACCEL * dt;
            p.vy += fy * ACCEL * dt;
            p.vx *= DAMP;
            p.vy *= DAMP;

            // Damped mean-zero wander + the steady (slowly turning) drift current.
            p.x += (p.vx + driftX) * dt;
            p.y += (p.vy + driftY) * dt;

            // Wrap around the edges (toroidal). The render pass tiles the points 3x3
            // and clips, so cells stay seamless across the seam with no popping.
            p.x = (p.x % aspect + aspect) % aspect;
            p.y = (p.y % 1 + 1) % 1;
        }
    }

    const edgeCol = 'rgba(11, 13, 16, 0.5)';   // dark cell seams (was #0b0d10 mixed at 0.5)

    // For seamless wrapping the drifting points are tiled in a 3x3 block (the real set
    // plus 8 shifted ghost copies) and the Voronoi is clipped to the canvas; the mouse
    // is appended once as a single, non-wrapping point.
    const NTILE = COUNT * 9;
    const mouseIdx = NTILE;
    const coords = new Float64Array((NTILE + 1) * 2);

    let t0 = performance.now();
    let running = true;
    const FRAME_MS = 1000 / 30;   // cap to ~30fps; the drift is slow, 60fps is wasted work
    let lastDraw = 0;

    function render(now){
        if(!running) return;
        requestAnimationFrame(render);
        if(now - lastDraw < FRAME_MS) return;
        lastDraw = now;

        const dt = Math.min(32, now - t0) / 300;
        t0 = now;
        step(dt);

        const w = canvas.width, h = canvas.height;
        const aspect = w / h;

        // Tile the drifting points 3x3 (shift each copy by +/- the canvas width/height)
        // so the Voronoi wraps seamlessly; every ghost keeps its source point's shading.
        let idx = 0;
        for(let sy=-1; sy<=1; sy++){
            for(let sx=-1; sx<=1; sx++){
                const ox = sx * w, oy = sy * h;
                for(let i=0;i<COUNT;i++){
                    coords[idx*2]   = pts[i].x / aspect * w + ox;
                    coords[idx*2+1] = (1 - pts[i].y) * h + oy;
                    idx++;
                }
            }
        }
        coords[mouseIdx*2]   = mouseX;
        coords[mouseIdx*2+1] = mouseY;

        const delaunay = new d3.Delaunay(coords);
        const voronoi = delaunay.voronoi([0, 0, w, h]);

        ctx.clearRect(0, 0, w, h);

        // Radial gradient per cell reproduces the distance-from-seed shading:
        // white at the seed, dimming to 0.35 far away (matches the old shader).
        const shadeRadius = h * 1.18;
        const mouseColor = canvas.getAttribute("currentMouseColor");
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = edgeCol;

        for(let i=0;i<=mouseIdx;i++){
            const cell = voronoi.cellPolygon(i);
            if(!cell) continue;   // ghost cells fully outside the canvas clip to null

            const cx = coords[i*2], cy = coords[i*2+1];
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, shadeRadius);
            if(i === mouseIdx){
                g.addColorStop(0, mouseColor);
                g.addColorStop(1, mouseColor);
            } else {
                g.addColorStop(0, 'rgb(255, 255, 255)');
                g.addColorStop(1, 'rgb(89, 89, 89)');  // 0.35 * 255
            }

            ctx.beginPath();
            ctx.moveTo(cell[0][0], cell[0][1]);
            for(let k=1;k<cell.length;k++){
                ctx.lineTo(cell[k][0], cell[k][1]);
            }
            ctx.closePath();
            ctx.fillStyle = g;
            ctx.fill();
            ctx.stroke();
        }

        // Subtle vignette (edges darkened ~15%), matching the old shader.
        const vig = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.75);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }

    // Pause the loop while the section is off-screen or the tab is hidden.
    let onScreen = true;
    function sync(){
        const shouldRun = onScreen && !document.hidden;
        if(shouldRun && !running){
            running = true;
            t0 = performance.now();
            requestAnimationFrame(render);
        } else if(!shouldRun){
            running = false;
        }
    }

    if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
            onScreen = entries[0].isIntersecting;
            sync();
        });
        io.observe(section);
    }
    document.addEventListener('visibilitychange', sync);

    requestAnimationFrame(render);
}

// Blue-noise sampling via Mitchell's best-candidate algorithm: each new point is
// the farthest-from-its-neighbours of `k` random candidates, yielding even spacing.
// Returns exactly `count` points in the box [0,w] x [0,h].
function blueNoise(count, w, h, k = 12){
    const pts = [{ x: Math.random()*w, y: Math.random()*h }];
    for(let i=1;i<count;i++){
        let best = null, bestDist = -1;
        for(let c=0;c<k;c++){
            const cand = { x: Math.random()*w, y: Math.random()*h };
            let nearest = Infinity;
            for(const p of pts){
                const dx = cand.x - p.x, dy = cand.y - p.y;
                nearest = Math.min(nearest, dx*dx + dy*dy);
            }
            if(nearest > bestDist){ bestDist = nearest; best = cand; }
        }
        pts.push(best);
    }
    return pts;
}

// Classic 2D Perlin noise (Ken Perlin's improved noise), dependency-free.
// Returns a sampler f(x, y) -> roughly [-1, 1], smooth and continuous.
function createNoise2D(){
    const perm = new Uint8Array(512);
    const src = Uint8Array.from({length:256}, (_, i) => i);
    for(let i=255;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        const tmp = src[i]; src[i] = src[j]; src[j] = tmp;
    }
    for(let i=0;i<512;i++) perm[i] = src[i & 255];

    const fade = (t) => t*t*t*(t*(t*6-15)+10);
    const lerp = (a,b,t) => a + t*(b-a);
    const grad = (h,x,y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);

    return function(x, y){
        const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = fade(xf), v = fade(yf);
        const aa = perm[perm[xi] + yi],     ba = perm[perm[xi+1] + yi];
        const ab = perm[perm[xi] + yi+1],   bb = perm[perm[xi+1] + yi+1];
        const x1 = lerp(grad(aa, xf, yf),   grad(ba, xf-1, yf),   u);
        const x2 = lerp(grad(ab, xf, yf-1), grad(bb, xf-1, yf-1), u);
        return lerp(x1, x2, v);
    };
}

function loadScript(src){
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

var canvas = document.createElement('canvas');

canvas.className = "voronoi";
// 100vw/100vh is the standard fallback for Firefox, which ignores -webkit-fill-available
// (without it the canvas falls back to its buffer size and renders ~2x too large).
canvas.style = "display:block; width:100vw; height:100vh; width:-webkit-fill-available; height:-webkit-fill-available; opacity:33%; z-index:-1; position: absolute; left: 0; top: 0; filter: contrast(1.5)";
section = document.currentScript.parentElement; // for the current use of it, this will be the highlights section
section.insertBefore(canvas, section.children[0]);

// d3-delaunay@6 UMD bundles delaunator and exposes the `d3` global (d3.Delaunay).
loadScript("https://unpkg.com/d3-delaunay@6")
    .then(() => registerVoronoi(canvas, section))
    .catch(() => console.error("voronoi: failed to load d3-delaunay"));

// <a> elements aren't built yet at this point so we delay adding the EventListeners until the window is loaded
window.addEventListener('load', () => {
    for (element of document.getElementsByTagName("a")) {
        element.addEventListener("mouseenter", (e) => {canvas.setAttribute("currentMouseColor", '#5a89e0')});
        element.addEventListener("mouseleave", (e) => {canvas.setAttribute("currentMouseColor", '#d899bf')});
    }
});
