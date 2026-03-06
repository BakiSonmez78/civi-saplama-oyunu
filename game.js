/* ============================================
   Çivi Saplama Oyunu - Game Engine v2
   Skill-based Nail Throwing System
   ============================================ */

const PLAYER_COLORS = [
    { main: '#e74c3c', light: '#ff6b6b', glow: 'rgba(231,76,60,0.4)', name: 'Kırmızı' },
    { main: '#3498db', light: '#5dade2', glow: 'rgba(52,152,219,0.4)', name: 'Mavi' },
    { main: '#2ecc71', light: '#58d68d', glow: 'rgba(46,204,113,0.4)', name: 'Yeşil' },
    { main: '#f39c12', light: '#f5b041', glow: 'rgba(243,156,18,0.4)', name: 'Sarı' }
];

const NAIL_RADIUS = 6;
const LINE_WIDTH = 3;
const PADDING = 40;
const MIN_THROW_DIST = 40;
const MAX_THROW_DIST = 220;
const MAX_DEVIATION = 55;

const MUD = { base: '#5c3d2e', dark: '#3d2b1f', medium: '#6b4c3b', light: '#7a5c47', highlight: '#9b7b65', wet: '#4a3328', crack: '#352018' };
const NAIL_FAIL_CHANCE = 0.40;

// ============ COMPETITIVE SYSTEM CONSTANTS ============
const TURN_TIMER_BASE = 5.0;       // seconds per phase
const TURN_TIMER_MIN = 2.0;        // minimum timer
const COMBO_RANGE_BONUS = 0.20;    // +20% range per combo tier
const COMBO_ACCURACY_SLOW = 0.30;  // 30% slower ring
const TURN_STEAL_DIST = 35;        // pixels close to enemy nail for steal
const CRITICAL_ZONE_RADIUS = 40;
const CRITICAL_ZONE_RESPAWN = 4;   // every N turns
const AREA_WIN_PERCENT = 60;       // win at 60% area
const POWERUP_SPAWN_CHANCE = 0.25; // 25% chance per turn
const POWERUP_COLLECT_DIST = 45;   // pixels
const OBSTACLE_COUNT = 3;          // rocks on map

// ============ STATE ============
let state = {
    playerCount: 2, currentPlayer: 0, players: [], gameStarted: false,
    gameOver: false, initialShape: [], canvasWidth: 0, canvasHeight: 0,
    groundZones: [], groundSeed: 42,
    introPhase: 'none', introDrawProgress: 0,
    // Competitive systems
    turnTimer: 0,           // current countdown
    turnTimerMax: TURN_TIMER_BASE,
    turnTimerActive: false,
    comboCount: [],         // per player combo streak
    powerups: [],           // {x, y, type, timer}
    criticalZones: [],      // {x, y, active}
    obstacles: [],          // {x, y, w, h}
    totalTurns: 0,          // total turns played
    activePowerup: null,    // {type, player} currently active
};

// ============ NAIL SHOP SYSTEM ============
const NAIL_TYPES = [
    {
        id: 'iron', name: 'Demir Çivi', price: 0, rarity: 'common',
        desc: 'Standart demir çivi. Güvenilir ve sağlam.',
        color: { head: '#999', shaft: '#888', tip: '#666', shine: 'rgba(255,255,255,0.2)' },
        stats: { saplama: 40, menzil: 50, isabet: 50, hiz: 50, ozel: 0 },
        bonuses: {}
    },
    {
        id: 'bronze', name: 'Bronz Çivi', price: 100, rarity: 'common',
        desc: 'Bronz alaşımlı çivi. Sert zeminlerde daha iyi tutar.',
        color: { head: '#cd7f32', shaft: '#b87333', tip: '#8c5e2a', shine: 'rgba(255,220,150,0.3)' },
        stats: { saplama: 55, menzil: 50, isabet: 50, hiz: 50, ozel: 15 },
        bonuses: { hardBonus: 0.15 }
    },
    {
        id: 'steel', name: 'Çelik Çivi', price: 250, rarity: 'uncommon',
        desc: 'Yüksek karbonlu çelik. Tüm zeminlerde güçlü.',
        color: { head: '#c0c0c0', shaft: '#a8a8a8', tip: '#808080', shine: 'rgba(255,255,255,0.35)' },
        stats: { saplama: 65, menzil: 55, isabet: 50, hiz: 50, ozel: 25 },
        bonuses: { allGroundBonus: 0.15 }
    },
    {
        id: 'gold', name: 'Altın Çivi', price: 500, rarity: 'rare',
        desc: 'Saf altın kaplama. Daha uzağa fırlatılabilir.',
        color: { head: '#ffd700', shaft: '#daa520', tip: '#b8860b', shine: 'rgba(255,255,200,0.4)' },
        stats: { saplama: 50, menzil: 75, isabet: 50, hiz: 50, ozel: 30 },
        bonuses: { rangeBonus: 0.25 }
    },
    {
        id: 'ruby', name: 'Yakut Çivi', price: 400, rarity: 'rare',
        desc: 'Yakut kristalli uç. Güç barı daha yavaş döner.',
        color: { head: '#e0115f', shaft: '#c41e3a', tip: '#8b0000', shine: 'rgba(255,100,100,0.3)' },
        stats: { saplama: 50, menzil: 50, isabet: 50, hiz: 70, ozel: 25 },
        bonuses: { powerSlowdown: 0.20 }
    },
    {
        id: 'emerald', name: 'Zümrüt Çivi', price: 400, rarity: 'rare',
        desc: 'Zümrüt kaplamalı. İsabet halkası daha yavaş.',
        color: { head: '#50c878', shaft: '#3cb371', tip: '#228b22', shine: 'rgba(100,255,150,0.3)' },
        stats: { saplama: 50, menzil: 50, isabet: 75, hiz: 50, ozel: 25 },
        bonuses: { accuracySlowdown: 0.25 }
    },
    {
        id: 'sapphire', name: 'Safir Çivi', price: 400, rarity: 'rare',
        desc: 'Safir taşlı. Daha güçlü saplama ve alan bonusu.',
        color: { head: '#0f52ba', shaft: '#1a3c7a', tip: '#0a2351', shine: 'rgba(100,150,255,0.3)' },
        stats: { saplama: 65, menzil: 60, isabet: 50, hiz: 50, ozel: 30 },
        bonuses: { powerBonus: 0.20 }
    },
    {
        id: 'diamond', name: 'Elmas Çivi', price: 1000, rarity: 'legendary',
        desc: 'Efsanevi elmas çivi. Her zeminde neredeyse kesin saplanır!',
        color: { head: '#b9f2ff', shaft: '#87ceeb', tip: '#4fc3f7', shine: 'rgba(200,240,255,0.5)' },
        stats: { saplama: 95, menzil: 60, isabet: 60, hiz: 55, ozel: 90 },
        bonuses: { allGroundBonus: 0.50 }
    },
    {
        id: 'rockdriller', name: 'Kaya Delici', price: 750, rarity: 'epic',
        desc: 'Tungsten uçlu. Kayalık zeminde bile saplanır!',
        color: { head: '#ff6600', shaft: '#cc5500', tip: '#333', shine: 'rgba(255,150,50,0.3)' },
        stats: { saplama: 70, menzil: 50, isabet: 45, hiz: 45, ozel: 80 },
        bonuses: { rockyBonus: 0.50 }
    },
    {
        id: 'ghost', name: 'Hayalet Çivi', price: 800, rarity: 'epic',
        desc: 'Gizemli çivi. Engelleri 1 kez geçebilir!',
        color: { head: 'rgba(180,130,255,0.7)', shaft: 'rgba(150,100,220,0.6)', tip: 'rgba(120,80,200,0.5)', shine: 'rgba(200,160,255,0.4)' },
        stats: { saplama: 50, menzil: 55, isabet: 55, hiz: 60, ozel: 70 },
        bonuses: { pierceObstacle: true }
    },
    {
        id: 'magnetic', name: 'Manyetik Çivi', price: 600, rarity: 'epic',
        desc: 'Mıknatıslı uç. Hedefe doğru çekilir!',
        color: { head: '#00bfff', shaft: '#0099cc', tip: '#006699', shine: 'rgba(0,200,255,0.4)' },
        stats: { saplama: 50, menzil: 50, isabet: 70, hiz: 50, ozel: 55 },
        bonuses: { magnetPull: 0.15 }
    },
    {
        id: 'titan', name: 'Titan Çivi', price: 1500, rarity: 'legendary',
        desc: 'Titan alaşımlı efsanevi çivi. Tüm bonuslar artırılmış!',
        color: { head: '#708090', shaft: '#5a6e7f', tip: '#3d4f5f', shine: 'rgba(180,200,220,0.4)' },
        stats: { saplama: 70, menzil: 60, isabet: 60, hiz: 60, ozel: 60 },
        bonuses: { allGroundBonus: 0.10, rangeBonus: 0.10, accuracySlowdown: 0.10, powerSlowdown: 0.10 }
    }
];

// Shop state persisted in localStorage
let shopState = {
    gold: 200, // start with 200 gold
    owned: ['iron'], // IDs of owned nails
    equipped: 'iron', // currently equipped nail ID
    selectedShopNail: null // currently selected in shop UI
};

function loadShopState() {
    try {
        const saved = localStorage.getItem('civiShopState');
        if (saved) {
            const parsed = JSON.parse(saved);
            shopState.gold = parsed.gold ?? 200;
            shopState.owned = parsed.owned ?? ['iron'];
            shopState.equipped = parsed.equipped ?? 'iron';
        }
    } catch (e) { /* ignore */ }
}

function saveShopState() {
    try {
        localStorage.setItem('civiShopState', JSON.stringify({
            gold: shopState.gold,
            owned: shopState.owned,
            equipped: shopState.equipped
        }));
    } catch (e) { /* ignore */ }
}

function getEquippedNail() {
    return NAIL_TYPES.find(n => n.id === shopState.equipped) || NAIL_TYPES[0];
}

function addGold(amount) {
    shopState.gold += amount;
    saveShopState();
    updateGoldDisplays();
    // Show popup
    if (amount > 0) {
        const popup = document.createElement('div');
        popup.className = 'gold-earned-popup';
        popup.textContent = `+${amount} 🪙`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1600);
    }
}

function updateGoldDisplays() {
    const menuGold = document.getElementById('menu-gold-amount');
    const shopGold = document.getElementById('shop-gold-amount');
    if (menuGold) menuGold.textContent = shopState.gold;
    if (shopGold) shopGold.textContent = shopState.gold;
}

function getNailSVG(nailType, size) {
    size = size || 32;
    const c = nailType.color;
    const uid = 'n' + nailType.id + Math.random().toString(36).substr(2, 4);
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="14" rx="14" ry="6" fill="${c.head}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
        <ellipse cx="32" cy="13" rx="11" ry="4" fill="${c.shine}" opacity="0.5"/>
        <rect x="29" y="14" width="6" height="38" rx="1" fill="${c.shaft}" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
        <rect x="30.5" y="16" width="2" height="34" rx="1" fill="${c.shine}"/>
        <polygon points="29,52 35,52 32,62" fill="${c.tip}"/>
    </svg>`;
}

// ============ SHOP UI ============
function openShop() {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');
    menuScreen.classList.remove('active');
    shopScreen.classList.add('active');
    shopState.selectedShopNail = null;
    renderShopGrid();
    renderShopDetail(null);
    updateGoldDisplays();
    updateEquippedDisplay();
}

function closeShop() {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');
    shopScreen.classList.remove('active');
    menuScreen.classList.add('active');
    updateGoldDisplays();
    updateEquippedDisplay();
}

function renderShopGrid() {
    const grid = document.getElementById('nail-grid');
    grid.innerHTML = '';
    NAIL_TYPES.forEach(nail => {
        const owned = shopState.owned.includes(nail.id);
        const equipped = shopState.equipped === nail.id;
        const selected = shopState.selectedShopNail === nail.id;
        const card = document.createElement('div');
        card.className = 'nail-card';
        card.dataset.rarity = nail.rarity;
        if (selected) card.classList.add('selected');
        if (equipped) card.classList.add('equipped');
        if (!owned && nail.price > 0) card.classList.add('locked');
        card.innerHTML = `
            <div class="nail-card-visual">${getNailSVG(nail, 32)}</div>
            <div class="nail-card-name">${nail.name}</div>
            <div class="nail-card-price ${nail.price === 0 ? 'free' : ''}">
                ${nail.price === 0 ? 'Ücretsiz' : `🪙 ${nail.price}`}
            </div>
        `;
        card.addEventListener('click', () => {
            shopState.selectedShopNail = nail.id;
            renderShopGrid();
            renderShopDetail(nail);
        });
        grid.appendChild(card);
    });
}

function renderShopDetail(nail) {
    const preview = document.getElementById('detail-preview');
    const name = document.getElementById('detail-name');
    const desc = document.getElementById('detail-desc');
    const stats = document.getElementById('detail-stats');
    const actions = document.getElementById('detail-actions');

    if (!nail) {
        preview.innerHTML = '';
        name.textContent = 'Çivi Seç';
        desc.textContent = 'Bir çivi seçerek özelliklerini görün.';
        stats.innerHTML = '';
        actions.innerHTML = '';
        return;
    }

    preview.innerHTML = getNailSVG(nail, 50);
    name.textContent = nail.name;
    name.style.color = nail.color.head;
    desc.textContent = nail.desc;

    const statDefs = [
        { key: 'saplama', label: '⚡ Saplama', color: 'green' },
        { key: 'menzil', label: '📏 Menzil', color: 'blue' },
        { key: 'isabet', label: '🎯 İsabet', color: 'red' },
        { key: 'hiz', label: '💨 Hız', color: 'gold' },
        { key: 'ozel', label: '✨ Özel', color: 'purple' }
    ];
    stats.innerHTML = statDefs.map(s => `
        <div class="stat-row">
            <span class="stat-label">${s.label}</span>
            <div class="stat-bar-wrap">
                <div class="stat-bar ${s.color}" style="width:${nail.stats[s.key]}%"></div>
            </div>
        </div>
    `).join('');

    const owned = shopState.owned.includes(nail.id);
    const equipped = shopState.equipped === nail.id;

    if (equipped) {
        actions.innerHTML = `<button class="btn-equip active" disabled>✓ Kuşanıldı</button>`;
    } else if (owned) {
        actions.innerHTML = `<button class="btn-equip" id="btn-equip-nail">Kuşan</button>`;
        document.getElementById('btn-equip-nail').addEventListener('click', () => {
            shopState.equipped = nail.id;
            saveShopState();
            renderShopGrid();
            renderShopDetail(nail);
            updateEquippedDisplay();
        });
    } else {
        const canAfford = shopState.gold >= nail.price;
        actions.innerHTML = `
            <button class="btn-buy" id="btn-buy-nail" ${!canAfford ? 'disabled' : ''}>
                🪙 ${nail.price} Satın Al
            </button>
        `;
        if (canAfford) {
            document.getElementById('btn-buy-nail').addEventListener('click', () => {
                shopState.gold -= nail.price;
                shopState.owned.push(nail.id);
                shopState.equipped = nail.id;
                saveShopState();
                updateGoldDisplays();
                renderShopGrid();
                renderShopDetail(nail);
                updateEquippedDisplay();
            });
        }
    }
}

function updateEquippedDisplay() {
    const el = document.getElementById('equipped-nail-name');
    if (el) {
        const nail = getEquippedNail();
        el.textContent = nail.name;
        el.style.color = nail.color.head;
    }
}

// Cached background canvas
let bgCanvas = null;
let bgCtx = null;
let bgCached = false;

// Intro animation state
let introAnim = {
    // Legs pair 1 (enters from left)
    legs1: { x: 0, y: 0, alpha: 0, scale: 1.1, legPhase: 0, jump: 0 },
    // Legs pair 2 (enters from right)
    legs2: { x: 0, y: 0, alpha: 0, scale: 1.1, legPhase: 0, jump: 0 },
    stompEffect: 0, stompEffect2: 0,
    dustAlpha: 0, dustAlpha2: 0,
    screenShake: 0,
    // Hand drawing (nail scratching)
    handX: 0, handY: 0, handAlpha: 0, handRot: 0,
    drawProgress: 0,
    overlayAlpha: 0
};
let introTimeline = null;

let throwState = {
    phase: 'idle', // idle, direction, power, accuracy, throwing
    // Direction
    sweepAngle: 0, baseAngle: 0, sweepRange: Math.PI * 0.75,
    sweepSpeed: 2.2, lockedDirection: 0,
    // Power
    powerLevel: 0, powerSpeed: 2.8, lockedPower: 0,
    // Accuracy
    ringSize: 0, ringMin: 8, ringMax: 55, accuracySpeed: 3.5, lockedAccuracy: 0,
    // Target & Landing
    targetX: 0, targetY: 0, landingX: 0, landingY: 0,
    // Animation
    throwProgress: 0, resultText: '', resultColor: '', resultTimer: 0,
    // Difficulty
    round: 0
};

// ============ GSAP ARM ANIMATION STATE ============
let armAnim = {
    // Position & visibility
    x: 0, y: 0, alpha: 0, scale: 1,
    // Bone rotations (skeletal system)
    upperArmRot: 0,    // shoulder rotation
    forearmRot: 0,      // elbow bend
    wristRot: 0,        // wrist flick
    // Finger curl (0 = closed/gripping, 1 = open/released)
    fingerCurl: 0,
    thumbCurl: 0,
    // Individual finger offsets for staggered release
    finger0: 0, finger1: 0, finger2: 0, finger3: 0,
    // Nail state
    nailRot: 0,         // nail rotation in hand
    nailInHand: 1,      // 1 = in hand, 0 = released
    // Flying nail
    nailFlyProgress: -1, // -1 = not flying, 0-1 = flying
    nailX: 0, nailY: 0,
    // Impact
    impactProgress: -1,  // -1 = no impact
    impactScale: 0,
    // Landing nail
    landedScale: 0,
    // Arm sway (subtle breathing)
    sway: 0,
    // Muscle tension
    tension: 0
};
let throwTimeline = null;

let lastTimestamp = 0;
let animFrameId = null;

// ============ CAMERA / ZOOM STATE ============
// Zoom controls the WORLD SIZE, not a camera viewport.
// Zoom out = world area grows (more room to play).
// Zoom in = world shrinks back to original canvas size.
let camera = {
    zoom: 1,           // 1 = normal, <1 = world shrunk (zoomed in), >1 = world expanded (zoomed out)
    targetZoom: 1,
    minZoom: 0.5,      // minimum: half the canvas area
    maxZoom: 3,        // maximum: 3x the canvas area
};

// Returns the effective world bounds (play area) based on zoom level
function getWorldBounds() {
    const w = state.canvasWidth, h = state.canvasHeight;
    const ww = w * camera.zoom, wh = h * camera.zoom;
    // World expands symmetrically from canvas center (w/2, h/2)
    const cx = w / 2, cy = h / 2;
    return {
        left: cx - ww / 2 + PADDING,
        top: cy - wh / 2 + PADDING,
        right: cx + ww / 2 - PADDING,
        bottom: cy + wh / 2 - PADDING,
        width: ww,
        height: wh
    };
}

function applyCameraTransform() {
    const w = state.canvasWidth, h = state.canvasHeight;
    const scale = 1 / camera.zoom;
    // Center everything around the canvas center (w/2, h/2)
    // Scale the world down so the expanded area fits in the canvas
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
}

function resetCamera() {
    camera.targetZoom = 1;
}

function updateCamera() {
    const ease = 0.12;
    camera.zoom += (camera.targetZoom - camera.zoom) * ease;
    // Recache background when zoom changes significantly
    if (Math.abs(camera.zoom - camera.targetZoom) > 0.01) {
        bgCached = false;
    }
}

// ============ COMPETITIVE SYSTEMS ============

// --- TIMER ---
function startTurnTimer() {
    const r = throwState.round;
    state.turnTimerMax = Math.max(TURN_TIMER_MIN, TURN_TIMER_BASE - r * 0.15);
    state.turnTimer = state.turnTimerMax;
    state.turnTimerActive = true;
}

function updateTurnTimer(dt) {
    if (!state.turnTimerActive || state.gameOver) return;
    if (throwState.phase === 'idle' || throwState.phase === 'throwing') return;
    state.turnTimer -= dt;
    if (state.turnTimer <= 0) {
        state.turnTimer = 0;
        state.turnTimerActive = false;
        // Auto-lock current phase with whatever value is current
        handleClick({ preventDefault: () => { } });
    }
}

function drawTurnTimer() {
    if (!state.turnTimerActive) return;
    if (throwState.phase === 'idle' || throwState.phase === 'throwing') return;
    const w = state.canvasWidth;
    const ratio = state.turnTimer / state.turnTimerMax;
    const r = 22, cx = w - 45, cy = 55;
    // Background circle
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    // Timer arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = ratio > 0.3 ? '#2ecc71' : ratio > 0.15 ? '#f39c12' : '#e74c3c';
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    // Time text
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(state.turnTimer) + 's', cx, cy);
}

// --- COMBO SYSTEM ---
function getCombo(playerIdx) {
    return state.comboCount[playerIdx] || 0;
}

function addCombo(playerIdx) {
    state.comboCount[playerIdx] = (state.comboCount[playerIdx] || 0) + 1;
    return state.comboCount[playerIdx];
}

function resetCombo(playerIdx) {
    state.comboCount[playerIdx] = 0;
}

function getComboBonus(playerIdx) {
    const c = getCombo(playerIdx);
    return {
        rangeMultiplier: 1 + Math.min(c, 3) * COMBO_RANGE_BONUS,
        accuracySlowdown: c >= 3 ? COMBO_ACCURACY_SLOW : 0,
        doubleNail: c >= 5,
        label: c >= 5 ? '🔥🔥🔥 5x SÜPER!' : c >= 3 ? '🔥🔥 3x KOMBİ!' : c >= 2 ? '🔥 2x SERİ!' : ''
    };
}

function drawComboIndicator() {
    const combo = getCombo(state.currentPlayer);
    if (combo < 2) return;
    const player = state.players[state.currentPlayer];
    const label = combo >= 5 ? '🔥🔥🔥 5x' : combo >= 3 ? '🔥🔥 3x' : '🔥 2x';
    ctx.save();
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = combo >= 5 ? '#e74c3c' : combo >= 3 ? '#f39c12' : '#f1c40f';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
    ctx.fillText(label + ' KOMBİ', 15, 55);
    ctx.restore();
}

// --- POWER-UPS ---
const POWERUP_TYPES = [
    { id: 'wind', emoji: '💨', name: 'Rüzgar', desc: 'Rakibi saptır' },
    { id: 'magnet', emoji: '🧲', name: 'Mıknatıs', desc: 'Hedefe çek' },
    { id: 'shield', emoji: '🛡️', name: 'Kalkan', desc: 'Çizgi koruması' },
    { id: 'dynamite', emoji: '💣', name: 'Dinamit', desc: 'Çivi sök' },
    { id: 'freeze', emoji: '❄️', name: 'Dondur', desc: 'Tur atla' }
];

function spawnPowerup() {
    if (state.powerups.length >= 3) return;
    if (Math.random() > POWERUP_SPAWN_CHANCE) return;
    const wb = getWorldBounds();
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const x = wb.left + Math.random() * (wb.right - wb.left);
    const y = wb.top + Math.random() * (wb.bottom - wb.top);
    state.powerups.push({ x, y, type: type.id, emoji: type.emoji, name: type.name, timer: 20, pulse: 0 });
}

function checkPowerupCollect(nailX, nailY, playerIdx) {
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const p = state.powerups[i];
        const dx = nailX - p.x, dy = nailY - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < POWERUP_COLLECT_DIST) {
            state.powerups.splice(i, 1);
            state.activePowerup = { type: p.type, player: playerIdx, name: p.name, emoji: p.emoji };
            updateInstruction(`${p.emoji} ${p.name} toplandı! Otomatik uygulanacak.`);
            return p;
        }
    }
    return null;
}

function drawPowerups() {
    for (const p of state.powerups) {
        p.pulse = (p.pulse + 0.05) % (Math.PI * 2);
        const s = 1 + Math.sin(p.pulse) * 0.15;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(s, s);
        // Glow
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, 18);
        grd.addColorStop(0, 'rgba(255,215,0,0.4)'); grd.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grd; ctx.fill();
        // Emoji
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
    }
}

// --- CRITICAL ZONES ---
function spawnCriticalZones() {
    state.criticalZones = [];
    const wb = getWorldBounds();
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
        state.criticalZones.push({
            x: wb.left + 50 + Math.random() * (wb.right - wb.left - 100),
            y: wb.top + 50 + Math.random() * (wb.bottom - wb.top - 100),
            active: true, pulse: Math.random() * Math.PI * 2
        });
    }
}

function checkCriticalZone(nailX, nailY) {
    for (const z of state.criticalZones) {
        if (!z.active) continue;
        const dx = nailX - z.x, dy = nailY - z.y;
        if (Math.sqrt(dx * dx + dy * dy) < CRITICAL_ZONE_RADIUS) {
            z.active = false;
            return true;
        }
    }
    return false;
}

function drawCriticalZones() {
    for (const z of state.criticalZones) {
        if (!z.active) continue;
        z.pulse = (z.pulse + 0.03) % (Math.PI * 2);
        const s = 1 + Math.sin(z.pulse) * 0.1;
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.scale(s, s);
        // Outer glow
        const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, CRITICAL_ZONE_RADIUS);
        grd.addColorStop(0, 'rgba(255,215,0,0.25)');
        grd.addColorStop(0.6, 'rgba(255,180,0,0.1)');
        grd.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, CRITICAL_ZONE_RADIUS, 0, Math.PI * 2); ctx.fill();
        // Star icon
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillText('⭐', 0, 0);
        // Ring
        ctx.beginPath(); ctx.arc(0, 0, CRITICAL_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
    }
}

// --- OBSTACLES ---
function generateObstacles() {
    state.obstacles = [];
    const wb = getWorldBounds();
    const cx = state.canvasWidth / 2, cy = state.canvasHeight / 2;
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        let ox, oy, tries = 0;
        do {
            ox = wb.left + 60 + Math.random() * (wb.right - wb.left - 120);
            oy = wb.top + 60 + Math.random() * (wb.bottom - wb.top - 120);
            tries++;
        } while (Math.sqrt((ox - cx) ** 2 + (oy - cy) ** 2) < 120 && tries < 20);
        const ow = 25 + Math.random() * 35;
        const oh = 20 + Math.random() * 25;
        state.obstacles.push({ x: ox, y: oy, w: ow, h: oh, rot: Math.random() * 0.4 - 0.2 });
    }
}

function lineIntersectsObstacle(x1, y1, x2, y2) {
    for (const ob of state.obstacles) {
        // Simple AABB check
        const left = ob.x - ob.w / 2, right = ob.x + ob.w / 2;
        const top = ob.y - ob.h / 2, bottom = ob.y + ob.h / 2;
        if (lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom)) return true;
    }
    return false;
}

function lineIntersectsRect(x1, y1, x2, y2, l, t, r, b) {
    // Check if line segment intersects rectangle
    function lineLine(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
        const d = (bx2 - bx1) * (ay1 - ay2) - (ax1 - ax2) * (by2 - by1);
        if (Math.abs(d) < 0.001) return false;
        const ta = ((by1 - by2) * (ax1 - bx1) + (bx2 - bx1) * (ay1 - by1)) / d;
        const tb = ((ay1 - ay2) * (ax1 - bx1) + (ax2 - ax1) * (ay1 - by1)) / d;
        return ta >= 0 && ta <= 1 && tb >= 0 && tb <= 1;
    }
    return lineLine(x1, y1, x2, y2, l, t, r, t) ||
        lineLine(x1, y1, x2, y2, r, t, r, b) ||
        lineLine(x1, y1, x2, y2, r, b, l, b) ||
        lineLine(x1, y1, x2, y2, l, b, l, t);
}

function drawObstacles() {
    for (const ob of state.obstacles) {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        ctx.rotate(ob.rot);
        // Rock body
        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, ob.w * 0.6);
        grad.addColorStop(0, '#8a7a6a'); grad.addColorStop(0.5, '#6a5a4a'); grad.addColorStop(1, '#4a3a2a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.w / 2, ob.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.ellipse(-3, -4, ob.w * 0.25, ob.h * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, ob.w / 2, ob.h / 2, 0, 0, Math.PI * 2); ctx.stroke();
        // X mark
        ctx.strokeStyle = 'rgba(231,76,60,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
        ctx.restore();
    }
}

// --- TURN STEALING ---
function checkTurnSteal(nailX, nailY, currentPlayerIdx) {
    for (let i = 0; i < state.players.length; i++) {
        if (i === currentPlayerIdx) continue;
        for (const n of state.players[i].nails) {
            const dx = nailX - n.x, dy = nailY - n.y;
            if (Math.sqrt(dx * dx + dy * dy) < TURN_STEAL_DIST) {
                return true;
            }
        }
    }
    return false;
}

// --- AREA SCORE ---
function calculateAreaPercent(playerIdx) {
    const player = state.players[playerIdx];
    if (!player.territory || player.territory.length < 3) return 0;
    const wb = getWorldBounds();
    const totalArea = (wb.right - wb.left) * (wb.bottom - wb.top);
    return Math.min(100, (player.territoryArea / totalArea) * 100);
}

function drawAreaScore() {
    const y = 85;
    ctx.font = '11px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.playerCount; i++) {
        const pct = calculateAreaPercent(i).toFixed(1);
        const p = state.players[i];
        const x = 15 + i * 110;
        ctx.fillStyle = p.color.main;
        ctx.textAlign = 'left';
        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y - 5, 95, 12);
        // Bar fill
        ctx.fillStyle = p.color.main;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y - 5, Math.min(95, parseFloat(pct) * 95 / 100), 12);
        ctx.globalAlpha = 1;
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText(`O${i + 1}: ${pct}%`, x + 3, y + 1);
    }
}

// --- DIFFICULTY SCALING ---
function getDifficultyMultiplier() {
    return 1 + state.totalTurns * 0.02;
}


// ============ DOM ============
const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
const menuScreen = $('menu-screen');
const gameScreen = $('game-screen');
const turnDot = $('turn-dot');
const turnText = $('turn-text');
const scoreBoard = $('score-board');
const instructionText = $('instruction-text');
const nailCursor = $('nail-cursor');
const winModal = $('win-modal');
const winnerText = $('winner-text');
const winnerDesc = $('winner-desc');
const gameArea = $('game-area');
const phaseIndicator = $('phase-indicator');

// ============ AI SYSTEM ============
let aiMode = true; // true = vs AI, false = local multiplayer
const AI_PLAYER_IDX = 1; // AI is always player 2
const AI_THINK_DELAY = 600; // ms delay per phase to simulate "thinking"
const AI_SKILL = 0.65; // 0-1, higher = better AI

function isAITurn() {
    return aiMode && state.currentPlayer === AI_PLAYER_IDX && !state.gameOver;
}

function aiPlay() {
    if (!isAITurn()) return;
    if (throwState.phase === 'direction') {
        setTimeout(() => aiChooseDirection(), AI_THINK_DELAY + Math.random() * 400);
    } else if (throwState.phase === 'power') {
        setTimeout(() => aiChoosePower(), AI_THINK_DELAY + Math.random() * 300);
    } else if (throwState.phase === 'accuracy') {
        setTimeout(() => aiChooseAccuracy(), AI_THINK_DELAY + Math.random() * 500);
    }
}

function aiChooseDirection() {
    if (!isAITurn() || throwState.phase !== 'direction') return;
    const player = state.players[AI_PLAYER_IDX];
    const last = player.nails[player.nails.length - 1];
    const opponent = state.players[0];
    const oppLast = opponent.nails[opponent.nails.length - 1];

    // Strategy: aim to create territory and surround opponent
    let bestAngle = throwState.sweepAngle;
    let bestScore = -Infinity;

    // Evaluate several candidate angles
    for (let i = 0; i < 20; i++) {
        const angle = throwState.baseAngle + throwState.sweepRange * (Math.random() * 2 - 1);
        let score = 0;

        // Prefer angles towards opponent (surrounding strategy)
        const toOppAngle = Math.atan2(oppLast.y - last.y, oppLast.x - last.x);
        const angleDiff = Math.abs(angle - toOppAngle);
        score += (Math.PI - angleDiff) * 20; // closer to opponent direction = higher score

        // Prefer angles towards critical zones
        for (const z of state.criticalZones) {
            if (!z.active) continue;
            const toCritAngle = Math.atan2(z.y - last.y, z.x - last.x);
            const critDiff = Math.abs(angle - toCritAngle);
            if (critDiff < 0.5) score += 30;
        }

        // Avoid angles towards obstacles
        const testDist = 100;
        const testX = last.x + Math.cos(angle) * testDist;
        const testY = last.y + Math.sin(angle) * testDist;
        if (lineIntersectsObstacle(last.x, last.y, testX, testY)) {
            score -= 100;
        }

        // Add some randomness based on skill
        score += (1 - AI_SKILL) * (Math.random() * 40 - 20);

        if (score > bestScore) {
            bestScore = score;
            bestAngle = angle;
        }
    }

    // Wait for sweep to be near best angle, then lock
    const waitForAngle = () => {
        if (!isAITurn() || throwState.phase !== 'direction') return;
        const current = throwState.sweepAngle;
        const diff = Math.abs(current - bestAngle);
        if (diff < 0.15 || Math.random() > AI_SKILL) {
            handleClick({ preventDefault: () => { } });
        } else {
            requestAnimationFrame(waitForAngle);
        }
    };
    waitForAngle();
}

function aiChoosePower() {
    if (!isAITurn() || throwState.phase !== 'power') return;
    // AI prefers medium-high power (0.4-0.8)
    const targetPower = 0.4 + AI_SKILL * 0.4 + (Math.random() * 0.2 - 0.1);

    const waitForPower = () => {
        if (!isAITurn() || throwState.phase !== 'power') return;
        const diff = Math.abs(throwState.powerLevel - targetPower);
        if (diff < 0.1 || Math.random() > AI_SKILL * 1.5) {
            handleClick({ preventDefault: () => { } });
        } else {
            requestAnimationFrame(waitForPower);
        }
    };
    waitForPower();
}

function aiChooseAccuracy() {
    if (!isAITurn() || throwState.phase !== 'accuracy') return;
    // AI tries to click when ring is small
    const targetSize = throwState.ringMin + (throwState.ringMax - throwState.ringMin) * (0.1 + (1 - AI_SKILL) * 0.4);

    const waitForAccuracy = () => {
        if (!isAITurn() || throwState.phase !== 'accuracy') return;
        if (throwState.ringSize < targetSize || Math.random() > AI_SKILL * 2) {
            handleClick({ preventDefault: () => { } });
        } else {
            requestAnimationFrame(waitForAccuracy);
        }
    };
    waitForAccuracy();
}

// ============ INIT ============
function init() {
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            aiMode = btn.dataset.mode === 'ai';
            // Hide player count in AI mode (always 2)
            const playerSection = $('player-select-section');
            if (aiMode) {
                playerSection.style.display = 'none';
                state.playerCount = 2;
            } else {
                playerSection.style.display = '';
            }
        });
    });
    // Trigger initial state
    if (aiMode) {
        const playerSection = $('player-select-section');
        if (playerSection) playerSection.style.display = 'none';
        state.playerCount = 2;
    }

    document.querySelectorAll('.player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.playerCount = parseInt(btn.dataset.players);
        });
    });
    $('btn-start').addEventListener('click', startGame);
    $('btn-shop').addEventListener('click', openShop);
    $('btn-shop-back').addEventListener('click', closeShop);
    canvas.addEventListener('click', handleClick);
    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('mouseleave', () => { nailCursor.style.opacity = '0'; });
    $('btn-back').addEventListener('click', goToMenu);
    $('btn-reset').addEventListener('click', resetGame);
    $('btn-play-again').addEventListener('click', resetGame);
    $('btn-to-menu').addEventListener('click', goToMenu);
    createMenuParticles();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Load shop state
    loadShopState();
    updateGoldDisplays();
    updateEquippedDisplay();

    // === ZOOM: Mouse wheel ===
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.targetZoom = clamp(camera.targetZoom * zoomFactor, camera.minZoom, camera.maxZoom);
        updateZoomDisplay();
    }, { passive: false });

    // === ZOOM: Touch pinch ===
    let lastPinchDist = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist > 0) {
                const scale = dist / lastPinchDist;
                camera.targetZoom = clamp(camera.targetZoom * scale, camera.minZoom, camera.maxZoom);
                updateZoomDisplay();
            }
            lastPinchDist = dist;
        }
    }, { passive: false });

    // === ZOOM CONTROLS ===
    $('btn-zoom-in').addEventListener('click', () => {
        camera.targetZoom = clamp(camera.targetZoom * 0.8, camera.minZoom, camera.maxZoom);
        updateZoomDisplay();
    });
    $('btn-zoom-out').addEventListener('click', () => {
        camera.targetZoom = clamp(camera.targetZoom * 1.25, camera.minZoom, camera.maxZoom);
        updateZoomDisplay();
    });
    $('btn-zoom-reset').addEventListener('click', () => {
        resetCamera();
        updateZoomDisplay();
    });
}

function updateZoomDisplay() {
    const pct = Math.round(camera.targetZoom * 100);
    const el = $('zoom-level');
    if (el) el.textContent = pct + '%';
}

function createMenuParticles() {
    const c = $('menu-particles');
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'mud-particle';
        p.style.width = p.style.height = Math.random() * 8 + 3 + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 6 + 's';
        p.style.animationDuration = Math.random() * 4 + 4 + 's';
        c.appendChild(p);
    }
}

function resizeCanvas() {
    const r = gameArea.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.canvasWidth = r.width;
    state.canvasHeight = r.height;
}

// ============ GAME FLOW ============
function startGame() {
    menuScreen.classList.add('fade-out');
    setTimeout(() => {
        menuScreen.classList.remove('active', 'fade-out');
        gameScreen.classList.add('active');
        resizeCanvas();
        initializeGame();
    }, 500);
}

function initializeGame() {
    const cx = state.canvasWidth / 2, cy = state.canvasHeight / 2;
    const radius = Math.min(state.canvasWidth, state.canvasHeight) * 0.10;
    state.players = []; state.initialShape = [];
    state.currentPlayer = 0; state.gameOver = false; state.gameStarted = true;
    state.groundSeed = Math.floor(Math.random() * 10000);
    state.totalTurns = 0;
    state.comboCount = new Array(state.playerCount).fill(0);
    state.powerups = [];
    state.activePowerup = null;
    generateGroundZones();
    generateObstacles();
    cacheBackground();
    const pos = getStartPositions(cx, cy, radius, state.playerCount);
    for (let i = 0; i < state.playerCount; i++) {
        state.players.push({ id: i, color: PLAYER_COLORS[i], nails: [pos[i]], lines: [], territory: [], territoryArea: 0, eliminated: false });
    }
    generateInitialShape(cx, cy, radius);
    spawnCriticalZones();
    throwState.round = 0;
    updateScoreBoard();
    updateTurnIndicator();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    lastTimestamp = performance.now();
    animFrameId = requestAnimationFrame(gameLoop);
    // Start intro animation
    playIntroAnimation();
}

function resetGame() {
    winModal.classList.remove('show');
    if (introTimeline) introTimeline.kill();
    resetCamera();
    initializeGame();
}

function goToMenu() {
    winModal.classList.remove('show');
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    gameScreen.classList.remove('active');
    menuScreen.classList.add('active');
    state.gameStarted = false;
    resetCamera();
}

function getStartPositions(cx, cy, r, n) {
    if (n === 2) return [{ x: cx - r * 0.8, y: cy + r * 0.7 }, { x: cx + r * 0.8, y: cy + r * 0.7 }];
    if (n === 3) return [{ x: cx, y: cy - r * 0.9 }, { x: cx - r * 0.8, y: cy + r * 0.7 }, { x: cx + r * 0.8, y: cy + r * 0.7 }];
    return [{ x: cx - r * 0.8, y: cy - r * 0.7 }, { x: cx + r * 0.8, y: cy - r * 0.7 }, { x: cx - r * 0.8, y: cy + r * 0.7 }, { x: cx + r * 0.8, y: cy + r * 0.7 }];
}

function generateInitialShape(cx, cy, r) {
    const c = { x: cx, y: cy };
    state.initialShape = [];
    if (state.playerCount === 2) {
        state.initialShape.push({ from: c, to: state.players[0].nails[0] }, { from: c, to: state.players[1].nails[0] });
    } else if (state.playerCount === 3) {
        state.initialShape.push({ from: c, to: state.players[0].nails[0] }, { from: c, to: state.players[1].nails[0] }, { from: c, to: state.players[2].nails[0] });
    } else {
        state.initialShape.push({ from: state.players[0].nails[0], to: state.players[3].nails[0] }, { from: state.players[1].nails[0], to: state.players[2].nails[0] });
    }
}

// ============ THROW SYSTEM ============
function startThrow() {
    const player = state.players[state.currentPlayer];
    const last = player.nails[player.nails.length - 1];
    const cx = state.canvasWidth / 2, cy = state.canvasHeight / 2;
    throwState.phase = 'direction';
    throwState.baseAngle = Math.atan2(cy - last.y, cx - last.x);
    throwState.resultText = '';
    throwState.resultTimer = 0;
    state.totalTurns++;

    // Difficulty ramp + combo bonuses + nail bonuses
    const r = throwState.round;
    const diff = getDifficultyMultiplier();
    const combo = getComboBonus(state.currentPlayer);
    const eqNail = getEquippedNail();
    const enb = eqNail.bonuses;
    throwState.sweepSpeed = (2.2 + r * 0.12) * diff;
    throwState.powerSpeed = (2.8 + r * 0.1) * diff * (1 - (enb.powerSlowdown || 0));
    throwState.accuracySpeed = (3.5 + r * 0.15) * diff * (1 - combo.accuracySlowdown) * (1 - (enb.accuracySlowdown || 0));

    // Start timer for this phase
    startTurnTimer();

    // Spawn power-ups periodically
    spawnPowerup();

    // Refresh critical zones every N turns
    if (state.totalTurns % CRITICAL_ZONE_RESPAWN === 0) {
        spawnCriticalZones();
    }

    // Show combo info
    const comboLabel = combo.label;
    const phaseMsg = comboLabel ? `${comboLabel} — 🧭 Yönü kilitlemek için tıklayın!` : '🧭 Yönü kilitlemek için tıklayın!';

    updatePhaseUI('direction');
    updateInstruction(phaseMsg);
    nailCursor.style.display = 'none';
    gameArea.style.cursor = 'pointer';

    // Trigger AI if it's AI's turn
    if (isAITurn()) {
        updateInstruction('🤖 Bilgisayar düşünüyor...');
        gameArea.style.cursor = 'wait';
        aiPlay();
    }
}

function handleClick(e) {
    if (state.gameOver) return;
    // Block human clicks during AI turn (AI calls this directly)
    if (isAITurn() && e && e.isTrusted) return;
    const phase = throwState.phase;
    if (phase === 'direction') {
        throwState.lockedDirection = throwState.sweepAngle;
        throwState.phase = 'power';
        startTurnTimer(); // restart timer for next phase
        updatePhaseUI('power');
        updateInstruction('💪 Gücü ayarlamak için tıklayın!');
        if (isAITurn()) aiPlay(); // AI continues
    } else if (phase === 'power') {
        throwState.lockedPower = throwState.powerLevel;
        const player = state.players[state.currentPlayer];
        const last = player.nails[player.nails.length - 1];
        const comboBonus = getComboBonus(state.currentPlayer);
        const nailRangeBonus = 1 + (getEquippedNail().bonuses.rangeBonus || 0);
        const dist = (MIN_THROW_DIST + throwState.lockedPower * (MAX_THROW_DIST - MIN_THROW_DIST)) * comboBonus.rangeMultiplier * nailRangeBonus;
        const wb = getWorldBounds();
        throwState.targetX = clamp(last.x + Math.cos(throwState.lockedDirection) * dist, wb.left, wb.right);
        throwState.targetY = clamp(last.y + Math.sin(throwState.lockedDirection) * dist, wb.top, wb.bottom);
        throwState.phase = 'accuracy';
        startTurnTimer(); // restart timer for accuracy phase
        updatePhaseUI('accuracy');
        updateInstruction('🎯 Halka en küçükken tıklayın!');
        if (isAITurn()) aiPlay(); // AI continues
    } else if (phase === 'accuracy') {
        const acc = (throwState.ringSize - throwState.ringMin) / (throwState.ringMax - throwState.ringMin);
        throwState.lockedAccuracy = acc;
        const dev = acc * MAX_DEVIATION;
        const ra = Math.random() * Math.PI * 2;
        const wb2 = getWorldBounds();
        throwState.landingX = clamp(throwState.targetX + Math.cos(ra) * dev, wb2.left, wb2.right);
        throwState.landingY = clamp(throwState.targetY + Math.sin(ra) * dev, wb2.top, wb2.bottom);
        // Result label
        if (acc < 0.15) { throwState.resultText = 'MÜKEMMEL!'; throwState.resultColor = '#2ecc71'; }
        else if (acc < 0.35) { throwState.resultText = 'İYİ!'; throwState.resultColor = '#f1c40f'; }
        else if (acc < 0.6) { throwState.resultText = 'ORTA'; throwState.resultColor = '#e67e22'; }
        else { throwState.resultText = 'KÖTÜ!'; throwState.resultColor = '#e74c3c'; }
        throwState.resultTimer = 1.5;
        throwState.phase = 'throwing';
        state.turnTimerActive = false; // stop timer during throw animation
        throwState.throwProgress = 0;
        updatePhaseUI('none');
        updateInstruction('');
        startGSAPThrow();
    }
}

function landNail() {
    const player = state.players[state.currentPlayer];
    const last = player.nails[player.nails.length - 1];
    let nail = { x: throwState.landingX, y: throwState.landingY };

    // === POWER-UP EFFECTS on landing ===
    if (state.activePowerup && state.activePowerup.player !== state.currentPlayer) {
        if (state.activePowerup.type === 'wind') {
            // Wind: deviate nail position
            const windAngle = Math.random() * Math.PI * 2;
            nail.x += Math.cos(windAngle) * 60;
            nail.y += Math.sin(windAngle) * 60;
            const wb = getWorldBounds();
            nail.x = clamp(nail.x, wb.left, wb.right);
            nail.y = clamp(nail.y, wb.top, wb.bottom);
            updateInstruction('💨 Rüzgar çiviyi saptırdı!');
            state.activePowerup = null;
        }
    }
    if (state.activePowerup && state.activePowerup.player === state.currentPlayer) {
        if (state.activePowerup.type === 'magnet') {
            // Magnet: pull nail closer to target
            nail.x = throwState.targetX * 0.8 + nail.x * 0.2;
            nail.y = throwState.targetY * 0.8 + nail.y * 0.2;
            state.activePowerup = null;
        }
    }

    // Check ground hardness for nail failure
    const groundType = getGroundType(nail.x, nail.y);
    const equippedNail = getEquippedNail();
    const nb = equippedNail.bonuses;
    let failChance = NAIL_FAIL_CHANCE;
    if (groundType === 'rocky') failChance = 0.80 - (nb.rockyBonus || 0) - (nb.allGroundBonus || 0);
    else if (groundType === 'hard') failChance = 0.60 - (nb.hardBonus || 0) - (nb.allGroundBonus || 0);
    else if (groundType === 'soft') failChance = 0.08 - (nb.allGroundBonus || 0);
    else failChance = 0.35 - (nb.allGroundBonus || 0);
    failChance = Math.max(0.02, failChance); // minimum 2% fail chance

    if (Math.random() < failChance) {
        // NAIL FAILED TO STICK!
        createImpactEffect(nail.x, nail.y, { main: '#888', glow: 'rgba(100,100,100,0.4)' });
        throwState.phase = 'idle';
        throwState.resultText = groundType === 'rocky' ? 'TAŞ!' : groundType === 'hard' ? 'SERT!' : 'KAYMADI!';
        throwState.resultColor = '#e74c3c';
        throwState.resultTimer = 2.0;
        resetCombo(state.currentPlayer); // combo broken!
        const failMsgs = {
            rocky: '🪨 Taşlık zemin! Çivi saplamadı! Seri bozuldu!',
            hard: '💎 Sert zemin! Çivi geri sıçradı! Seri bozuldu!',
            soft: '🕳️ Zemin çok yumuşak! Çivi tutmadı!',
            normal: '❌ Çivi saplamadı! Seri bozuldu!'
        };
        updateInstruction(failMsgs[groundType] || '❌ Çivi saplamadı!');

        // === FREEZE power-up: skip opponent's turn ===
        if (state.activePowerup && state.activePowerup.type === 'freeze' && state.activePowerup.player === state.currentPlayer) {
            state.activePowerup = null;
            updateInstruction('❄️ Dondurma kullanıldı! Sıra sende kaldı!');
            setTimeout(() => {
                throwState.round = Math.floor(state.players.reduce((s, p) => s + p.lines.length, 0) / state.playerCount);
                updateScoreBoard(); updateTurnIndicator(); startThrow();
            }, 1200);
            return;
        }

        setTimeout(() => {
            state.currentPlayer = (state.currentPlayer + 1) % state.playerCount;
            throwState.round = Math.floor(state.players.reduce((s, p) => s + p.lines.length, 0) / state.playerCount);
            updateScoreBoard(); updateTurnIndicator(); startThrow();
        }, 1200);
        return;
    }

    const newLine = { from: last, to: nail };

    // === NAIL MAGNETIC PULL bonus ===
    if (nb.magnetPull) {
        nail.x = throwState.targetX * nb.magnetPull + nail.x * (1 - nb.magnetPull);
        nail.y = throwState.targetY * nb.magnetPull + nail.y * (1 - nb.magnetPull);
    }

    // === OBSTACLE CHECK: line can't pass through obstacles ===
    const hitsObstacle = lineIntersectsObstacle(last.x, last.y, nail.x, nail.y);
    if (hitsObstacle && !(nb.pierceObstacle)) {
        createImpactEffect(nail.x, nail.y, { main: '#888', glow: 'rgba(100,100,100,0.4)' });
        throwState.phase = 'idle';
        throwState.resultText = '🪨 ENGEL!';
        throwState.resultColor = '#e67e22';
        throwState.resultTimer = 2.0;
        resetCombo(state.currentPlayer);
        updateInstruction('🚫 Çizgi engele çarptı! Çivi saplamadı!');
        setTimeout(() => {
            state.currentPlayer = (state.currentPlayer + 1) % state.playerCount;
            throwState.round = Math.floor(state.players.reduce((s, p) => s + p.lines.length, 0) / state.playerCount);
            updateScoreBoard(); updateTurnIndicator(); startThrow();
        }, 1200);
        return;
    }
    if (hitsObstacle && nb.pierceObstacle) {
        updateInstruction('👻 Hayalet çivi engeli geçti!');
    }

    // === SHIELD power-up: protect from line crossing ===
    let shieldActive = false;
    if (state.activePowerup && state.activePowerup.type === 'shield' && state.activePowerup.player === state.currentPlayer) {
        shieldActive = true;
        state.activePowerup = null;
    }

    // Check if new line crosses any existing line BEFORE adding it
    const crossResult = shieldActive ? null : checkLineCrossing(newLine, state.currentPlayer);

    // Add the nail and line
    player.nails.push(nail);
    player.lines.push(newLine);
    if (player.nails.length >= 3) {
        player.territory = convexHull(player.nails);
        player.territoryArea = polyArea(player.territory);
    }
    createImpactEffect(nail.x, nail.y, player.color);
    addCombo(state.currentPlayer); // combo increases!
    updateScoreBoard();

    // === COLLECT POWER-UPS near landing ===
    checkPowerupCollect(nail.x, nail.y, state.currentPlayer);

    // === CRITICAL ZONE bonus ===
    const hitCritical = checkCriticalZone(nail.x, nail.y);
    if (hitCritical) {
        throwState.resultText = '⭐ KRİTİK!';
        throwState.resultColor = '#f1c40f';
        throwState.resultTimer = 2.0;
    }

    // === DYNAMITE power-up: remove enemy nail ===
    if (state.activePowerup && state.activePowerup.type === 'dynamite' && state.activePowerup.player === state.currentPlayer) {
        for (let i = 0; i < state.players.length; i++) {
            if (i === state.currentPlayer) continue;
            if (state.players[i].nails.length > 1) {
                state.players[i].nails.pop();
                if (state.players[i].lines.length > 0) state.players[i].lines.pop();
                updateInstruction('💣 Dinamit! Rakibin son çivisi söküldü!');
                break;
            }
        }
        state.activePowerup = null;
    }

    // Line crossing = current player LOSES
    if (crossResult) {
        state.gameOver = true;
        throwState.phase = 'idle';
        setTimeout(() => showWinScreen(crossResult), 1000);
        return;
    }

    // Check win condition - encirclement
    const win = checkEncirclement();
    if (win) {
        state.gameOver = true;
        throwState.phase = 'idle';
        setTimeout(() => showWinScreen(win), 1000);
        return;
    }

    // === AREA WIN: check if any player reached area threshold ===
    for (let i = 0; i < state.playerCount; i++) {
        const pct = calculateAreaPercent(i);
        if (pct >= AREA_WIN_PERCENT) {
            state.gameOver = true;
            throwState.phase = 'idle';
            setTimeout(() => showWinScreen({ winner: i, reason: `%${Math.floor(pct)} alan kontrolü!` }), 1000);
            return;
        }
    }

    // === TURN STEAL: close to enemy nail = bonus turn message ===
    const stole = checkTurnSteal(nail.x, nail.y, state.currentPlayer);

    // === EARN GOLD for successful nail (only human player) ===
    if (!aiMode || state.currentPlayer !== AI_PLAYER_IDX) {
        let goldEarned = 10; // base per nail
        const combo = getCombo(state.currentPlayer);
        if (combo >= 5) goldEarned += 50;
        else if (combo >= 3) goldEarned += 30;
        else if (combo >= 2) goldEarned += 20;
        if (hitCritical) goldEarned += 25;
        addGold(goldEarned);
    }

    // Build success message
    throwState.phase = 'idle';
    const combo = getCombo(state.currentPlayer);
    const comboMsg = combo >= 5 ? ' 🔥🔥🔥 5x SÜPER KOMBİ!' : combo >= 3 ? ' 🔥🔥 3x KOMBİ!' : combo >= 2 ? ' 🔥 SERİ!' : '';
    const stealMsg = stole ? ' 🔄 Rakibe yakın! Baskı!' : '';
    const critMsg = hitCritical ? ' ⭐ Kritik bölge bonusu!' : '';
    const shieldMsg = shieldActive ? ' 🛡️ Kalkan kullanıldı!' : '';
    updateInstruction(`✅ Çivi saplandı!${comboMsg}${stealMsg}${critMsg}${shieldMsg} Devam et!`);

    setTimeout(() => {
        throwState.round = Math.floor(state.players.reduce((s, p) => s + p.lines.length, 0) / state.playerCount);
        updateScoreBoard();
        startThrow();
    }, 600);
}

// ============ GAME LOOP ============
function gameLoop(timestamp) {
    if (!state.gameStarted) return;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    const t = timestamp / 1000;
    // Update throw phases
    if (throwState.phase === 'direction') {
        throwState.sweepAngle = throwState.baseAngle + throwState.sweepRange * Math.sin(t * throwState.sweepSpeed);
    } else if (throwState.phase === 'power') {
        throwState.powerLevel = 0.5 + 0.5 * Math.sin(t * throwState.powerSpeed);
    } else if (throwState.phase === 'accuracy') {
        throwState.ringSize = throwState.ringMin + (throwState.ringMax - throwState.ringMin) * (0.5 + 0.5 * Math.sin(t * throwState.accuracySpeed));
    }
    if (throwState.resultTimer > 0) throwState.resultTimer -= dt;
    // Update competitive timer
    updateTurnTimer(dt);
    render();
    animFrameId = requestAnimationFrame(gameLoop);
}

// ============ RENDERING ============
function render() {
    const w = state.canvasWidth, h = state.canvasHeight;
    ctx.clearRect(0, 0, w, h);

    // Update camera smoothing
    updateCamera();

    // Intro animation phase (no camera)
    if (state.introPhase !== 'none' && state.introPhase !== 'done') {
        drawMudBg(w, h);
        drawIntroAnimation();
        return;
    }

    // Apply camera transform
    ctx.save();
    applyCameraTransform();

    drawMudBg(w, h);
    drawBoundary(w, h);
    drawInitialShape();
    // Draw competitive elements in world space
    drawCriticalZones();
    drawPowerups();
    drawObstacles();
    state.players.forEach(p => drawTerritory(p));
    state.players.forEach(p => drawLines(p));
    if (throwState.phase === 'direction') drawDirectionPhase();
    else if (throwState.phase === 'power') drawPowerPhase();
    else if (throwState.phase === 'accuracy') drawAccuracyPhase();
    else if (throwState.phase === 'throwing') drawThrowAnim();
    state.players.forEach(p => drawNails(p));
    if (throwState.resultTimer > 0) drawResultLabel();

    ctx.restore();

    // Draw HUD elements WITHOUT camera transform
    if (throwState.phase === 'power') drawPowerMeter();
    drawTurnTimer();
    drawComboIndicator();
    drawAreaScore();
}

// ============ GROUND SYSTEM ============
function generateGroundZones() {
    state.groundZones = [];
    const w = state.canvasWidth, h = state.canvasHeight;
    const seed = state.groundSeed;
    // Generate zones across the MAXIMUM possible world area so all zoom levels have detail
    const maxZ = camera.maxZoom;
    const ww = w * maxZ, wh = h * maxZ;
    // World extends from center - ww/2 to center + ww/2
    const cx = w / 2, cy = h / 2;
    const left = cx - ww / 2, top = cy - wh / 2;
    // Scale zone counts by world area ratio
    const areaRatio = maxZ * maxZ;
    const rockyCount = Math.floor(12 * areaRatio);
    const hardCount = Math.floor(10 * areaRatio);
    const softCount = Math.floor(4 * areaRatio);
    // Rocky patches
    for (let i = 0; i < rockyCount; i++) {
        state.groundZones.push({
            x: left + PADDING + srand(seed + i * 31) * (ww - 2 * PADDING),
            y: top + PADDING + srand(seed + i * 37) * (wh - 2 * PADDING),
            radius: 22 + srand(seed + i * 41) * 40,
            type: 'rocky'
        });
    }
    // Hard patches
    for (let i = 0; i < hardCount; i++) {
        state.groundZones.push({
            x: left + PADDING + srand(seed + i * 53 + 200) * (ww - 2 * PADDING),
            y: top + PADDING + srand(seed + i * 59 + 200) * (wh - 2 * PADDING),
            radius: 28 + srand(seed + i * 61 + 200) * 45,
            type: 'hard'
        });
    }
    // Soft/wet patches
    for (let i = 0; i < softCount; i++) {
        state.groundZones.push({
            x: left + PADDING + srand(seed + i * 67 + 400) * (ww - 2 * PADDING),
            y: top + PADDING + srand(seed + i * 71 + 400) * (wh - 2 * PADDING),
            radius: 25 + srand(seed + i * 73 + 400) * 35,
            type: 'soft'
        });
    }
}

function getGroundType(x, y) {
    for (const z of state.groundZones) {
        if (dist({ x, y }, { x: z.x, y: z.y }) < z.radius) return z.type;
    }
    return 'normal';
}

function cacheBackground() {
    const wb = getWorldBounds();
    const w = state.canvasWidth, h = state.canvasHeight;
    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
        bgCtx = bgCanvas.getContext('2d');
    }
    bgCanvas.width = wb.width;
    bgCanvas.height = wb.height;
    bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    // Pass world origin so zone coords are correctly translated
    const bgX = w / 2 - wb.width / 2;
    const bgY = h / 2 - wb.height / 2;
    renderGroundToCtx(bgCtx, wb.width, wb.height, bgX, bgY);
    bgCached = true;
}

function renderGroundToCtx(c, w, h, ox, oy) {
    // ox, oy = world-space origin of this canvas (top-left corner in world coords)
    ox = ox || 0;
    oy = oy || 0;
    const seed = state.groundSeed;
    // Base gradient
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, '#6b5038'); g.addColorStop(0.3, '#5a3e2a'); g.addColorStop(0.6, '#4d3322'); g.addColorStop(1, '#3a2518');
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    // Soil texture - scale count with area
    const areaScale = (w * h) / (state.canvasWidth * state.canvasHeight);
    const grainCount = Math.min(Math.floor(500 * areaScale), 3000);
    for (let i = 0; i < grainCount; i++) {
        const x = srand(seed + i * 3) * w, y = srand(seed + i * 7) * h;
        const r = srand(seed + i * 11) * 4 + 1;
        const brightness = srand(seed + i * 13);
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        if (brightness > 0.7) c.fillStyle = `rgba(120,90,60,${srand(seed + i * 17) * 0.15})`;
        else if (brightness > 0.3) c.fillStyle = `rgba(70,50,30,${srand(seed + i * 17) * 0.12})`;
        else c.fillStyle = `rgba(40,25,15,${srand(seed + i * 17) * 0.1})`;
        c.fill();
    }

    // Ground zones visual rendering - translate zone world coords to local canvas coords
    for (const zone of state.groundZones) {
        const zx = zone.x - ox, zy = zone.y - oy;
        // Skip zones outside this canvas area
        if (zx < -zone.radius * 2 || zx > w + zone.radius * 2 || zy < -zone.radius * 2 || zy > h + zone.radius * 2) continue;
        if (zone.type === 'rocky') {
            const stoneCount = 3 + Math.floor(srand(zone.x * 7 + zone.y) * 5);
            for (let i = 0; i < stoneCount; i++) {
                const sx = zx + (srand(zone.x + i * 11) - 0.5) * zone.radius * 1.5;
                const sy = zy + (srand(zone.y + i * 13) - 0.5) * zone.radius * 1.5;
                const sr = 4 + srand(zone.x + i * 17) * 12;
                const sg = c.createRadialGradient(sx - 2, sy - 2, 0, sx, sy, sr);
                sg.addColorStop(0, '#9a9080'); sg.addColorStop(0.5, '#7a7060'); sg.addColorStop(1, '#5a5040');
                c.fillStyle = sg;
                c.beginPath();
                c.ellipse(sx, sy, sr, sr * 0.7, srand(zone.x + i * 19) * Math.PI, 0, Math.PI * 2);
                c.fill();
                c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 0.5; c.stroke();
                // Stone highlight
                c.fillStyle = 'rgba(255,255,255,0.08)';
                c.beginPath(); c.ellipse(sx - 1, sy - 2, sr * 0.4, sr * 0.25, -0.3, 0, Math.PI * 2); c.fill();
            }
        } else if (zone.type === 'hard') {
            const hg = c.createRadialGradient(zx, zy, 0, zx, zy, zone.radius);
            hg.addColorStop(0, 'rgba(45,30,18,0.3)'); hg.addColorStop(1, 'transparent');
            c.fillStyle = hg; c.beginPath(); c.arc(zx, zy, zone.radius, 0, Math.PI * 2); c.fill();
            c.strokeStyle = 'rgba(30,18,8,0.4)'; c.lineWidth = 0.8;
            for (let i = 0; i < 4; i++) {
                c.beginPath();
                let cx2 = zx, cy2 = zy;
                c.moveTo(cx2, cy2);
                for (let j = 0; j < 3; j++) {
                    cx2 += (srand(zone.x * 3 + i * 23 + j) - 0.5) * zone.radius * 0.8;
                    cy2 += (srand(zone.y * 5 + i * 29 + j) - 0.5) * zone.radius * 0.8;
                    c.lineTo(cx2, cy2);
                }
                c.stroke();
            }
        } else if (zone.type === 'soft') {
            const sg2 = c.createRadialGradient(zx, zy, 0, zx, zy, zone.radius);
            sg2.addColorStop(0, 'rgba(55,35,20,0.35)'); sg2.addColorStop(0.7, 'rgba(60,40,25,0.15)'); sg2.addColorStop(1, 'transparent');
            c.fillStyle = sg2; c.beginPath(); c.arc(zx, zy, zone.radius, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.03)';
            c.beginPath(); c.ellipse(zx, zy, zone.radius * 0.6, zone.radius * 0.4, 0.3, 0, Math.PI * 2); c.fill();
        }
    }

    // Worm trails - scaled
    const wormCount = Math.min(Math.floor(5 * areaScale), 30);
    c.strokeStyle = 'rgba(80,55,30,0.15)'; c.lineWidth = 1.5;
    for (let i = 0; i < wormCount; i++) {
        c.beginPath();
        let wx = srand(seed + i * 101) * w, wy = srand(seed + i * 103) * h;
        c.moveTo(wx, wy);
        for (let j = 0; j < 6; j++) {
            wx += (srand(seed + i * 107 + j * 3) - 0.5) * 30;
            wy += (srand(seed + i * 109 + j * 3) - 0.5) * 30;
            c.lineTo(wx, wy);
        }
        c.stroke();
    }

    // Cracks - scaled
    const crackCount = Math.min(Math.floor(25 * areaScale), 150);
    c.strokeStyle = 'rgba(30,18,8,0.25)'; c.lineWidth = 0.6;
    for (let i = 0; i < crackCount; i++) {
        c.beginPath();
        let cx2 = srand(seed + i * 17) * w, cy2 = srand(seed + i * 19) * h;
        c.moveTo(cx2, cy2);
        for (let j = 0; j < 4; j++) {
            cx2 += (srand(seed + i * 23 + j) - 0.5) * 50;
            cy2 += (srand(seed + i * 29 + j) - 0.5) * 50;
            c.lineTo(cx2, cy2);
        }
        c.stroke();
    }

    // Grass tufts at edges - scaled
    const grassCount = Math.min(Math.floor(30 * Math.sqrt(areaScale)), 100);
    for (let i = 0; i < grassCount; i++) {
        const side = Math.floor(srand(seed + i * 131) * 4);
        let gx, gy;
        if (side === 0) { gx = srand(seed + i * 133) * w; gy = srand(seed + i * 137) * PADDING; }
        else if (side === 1) { gx = srand(seed + i * 139) * w; gy = h - srand(seed + i * 141) * PADDING; }
        else if (side === 2) { gx = srand(seed + i * 143) * PADDING; gy = srand(seed + i * 147) * h; }
        else { gx = w - srand(seed + i * 149) * PADDING; gy = srand(seed + i * 151) * h; }
        const blades = 3 + Math.floor(srand(seed + i * 153) * 4);
        for (let b = 0; b < blades; b++) {
            const angle = -Math.PI / 2 + (srand(seed + i * 157 + b) - 0.5) * 0.8;
            const len = 6 + srand(seed + i * 159 + b) * 10;
            c.strokeStyle = `rgba(${60 + Math.floor(srand(seed + i * 161 + b) * 40)},${80 + Math.floor(srand(seed + i * 163 + b) * 50)},30,0.5)`;
            c.lineWidth = 1 + srand(seed + i * 165 + b) * 0.5;
            c.beginPath(); c.moveTo(gx + b * 2, gy);
            c.quadraticCurveTo(gx + b * 2 + Math.cos(angle) * len * 0.5, gy + Math.sin(angle) * len * 0.5,
                gx + b * 2 + Math.cos(angle) * len, gy + Math.sin(angle) * len);
            c.stroke();
        }
    }

    // Sunlight gradient
    const sunG = c.createRadialGradient(w * 0.25, h * 0.2, 0, w * 0.25, h * 0.2, w * 0.5);
    sunG.addColorStop(0, 'rgba(255,230,180,0.06)'); sunG.addColorStop(1, 'transparent');
    c.fillStyle = sunG; c.fillRect(0, 0, w, h);
}

function drawMudBg(w, h) {
    const wb = getWorldBounds();
    // Draw background centered: world extends from (cx - ww/2) to (cx + ww/2)
    const bgX = w / 2 - wb.width / 2;
    const bgY = h / 2 - wb.height / 2;
    if (bgCached && bgCanvas) {
        ctx.drawImage(bgCanvas, bgX, bgY, wb.width, wb.height);
    } else {
        ctx.save();
        ctx.translate(bgX, bgY);
        renderGroundToCtx(ctx, wb.width, wb.height, bgX, bgY);
        ctx.restore();
    }
}
function srand(s) { const x = Math.sin(s) * 10000; return x - Math.floor(x); }

function drawBoundary(w, h) {
    const wb = getWorldBounds();
    const bw = wb.right - wb.left, bh = wb.bottom - wb.top;
    ctx.strokeStyle = 'rgba(212,165,116,0.25)'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]); ctx.strokeRect(wb.left, wb.top, bw, bh); ctx.setLineDash([]);
    const cl = 15; ctx.strokeStyle = 'rgba(212,165,116,0.4)'; ctx.lineWidth = 2;
    [[wb.left, wb.top + cl, wb.left, wb.top, wb.left + cl, wb.top],
    [wb.right - cl, wb.top, wb.right, wb.top, wb.right, wb.top + cl],
    [wb.left, wb.bottom - cl, wb.left, wb.bottom, wb.left + cl, wb.bottom],
    [wb.right - cl, wb.bottom, wb.right, wb.bottom, wb.right, wb.bottom - cl]
    ].forEach(c => { ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke(); });
}

function drawInitialShape() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    state.initialShape.forEach(l => {
        // Main carved groove (dark center)
        ctx.strokeStyle = 'rgba(25,15,5,0.55)'; ctx.lineWidth = 5;
        ctx.setLineDash([]); ctx.beginPath();
        ctx.moveTo(l.from.x, l.from.y); ctx.lineTo(l.to.x, l.to.y); ctx.stroke();

        // Inner shadow (depth effect)
        ctx.strokeStyle = 'rgba(15,8,2,0.35)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.from.x + 1, l.from.y + 1); ctx.lineTo(l.to.x + 1, l.to.y + 1); ctx.stroke();

        // Light edge (carved highlight)
        ctx.strokeStyle = 'rgba(140,110,70,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.from.x - 2, l.from.y - 1); ctx.lineTo(l.to.x - 2, l.to.y - 1); ctx.stroke();

        // Right edge highlight
        ctx.strokeStyle = 'rgba(160,130,90,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.from.x + 3, l.from.y + 2); ctx.lineTo(l.to.x + 3, l.to.y + 2); ctx.stroke();

        // Displaced soil particles along the groove
        const dx = l.to.x - l.from.x, dy = l.to.y - l.from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len, ny = dx / len; // normal
        for (let t = 0; t < 1; t += 0.05) {
            const px = l.from.x + dx * t, py = l.from.y + dy * t;
            const scatter = (srand(px * 7 + py * 13) - 0.5) * 2;
            const side = srand(px * 11 + py * 17) > 0.5 ? 1 : -1;
            const dist = 4 + srand(px * 19 + py * 23) * 6;
            ctx.beginPath();
            ctx.arc(px + nx * dist * side + scatter, py + ny * dist * side + scatter,
                0.8 + srand(px * 29 + py * 31) * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(90,65,40,${0.2 + srand(px * 37 + py * 41) * 0.2})`;
            ctx.fill();
        }
    });

    // Center dot (for V/Y shapes)
    if (state.playerCount <= 3) {
        const cx = state.canvasWidth / 2, cy = state.canvasHeight / 2;
        // Carved circle
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(25,15,5,0.4)'; ctx.fill();
        ctx.strokeStyle = 'rgba(140,110,70,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    }
}

function drawTerritory(p) {
    if (p.territory.length < 3) return;
    ctx.beginPath(); ctx.moveTo(p.territory[0].x, p.territory[0].y);
    for (let i = 1; i < p.territory.length; i++) ctx.lineTo(p.territory[i].x, p.territory[i].y);
    ctx.closePath(); ctx.fillStyle = p.color.main + '1A'; ctx.fill();
    ctx.strokeStyle = p.color.main + '40'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
}

function drawLines(p) {
    if (!p.lines.length) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    p.lines.forEach((l, i) => {
        const latest = i === p.lines.length - 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = LINE_WIDTH + 3;
        ctx.beginPath(); ctx.moveTo(l.from.x + 1, l.from.y + 1); ctx.lineTo(l.to.x + 1, l.to.y + 1); ctx.stroke();
        if (latest) { ctx.strokeStyle = p.color.glow; ctx.lineWidth = LINE_WIDTH + 4; ctx.beginPath(); ctx.moveTo(l.from.x, l.from.y); ctx.lineTo(l.to.x, l.to.y); ctx.stroke(); }
        ctx.strokeStyle = latest ? p.color.light : p.color.main; ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath(); ctx.moveTo(l.from.x, l.from.y); ctx.lineTo(l.to.x, l.to.y); ctx.stroke();
    });
}

function drawNails(p) {
    p.nails.forEach((n, i) => {
        const latest = i === p.nails.length - 1, first = i === 0;
        ctx.beginPath(); ctx.arc(n.x + 1, n.y + 1, NAIL_RADIUS + 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, NAIL_RADIUS + 4, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(122,92,71,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        const ng = ctx.createRadialGradient(n.x - 2, n.y - 2, 0, n.x, n.y, NAIL_RADIUS);
        ng.addColorStop(0, '#d0d0d0'); ng.addColorStop(0.5, '#a0a0a0'); ng.addColorStop(1, '#606060');
        ctx.beginPath(); ctx.arc(n.x, n.y, NAIL_RADIUS, 0, Math.PI * 2); ctx.fillStyle = ng; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, NAIL_RADIUS, 0, Math.PI * 2); ctx.strokeStyle = p.color.main; ctx.lineWidth = 2; ctx.stroke();
        if (latest) {
            ctx.beginPath(); ctx.arc(n.x, n.y, NAIL_RADIUS + 6, 0, Math.PI * 2); ctx.strokeStyle = p.color.glow; ctx.lineWidth = 2; ctx.stroke();
            const gg = ctx.createRadialGradient(n.x, n.y, NAIL_RADIUS, n.x, n.y, NAIL_RADIUS + 10);
            gg.addColorStop(0, p.color.glow); gg.addColorStop(1, 'transparent');
            ctx.beginPath(); ctx.arc(n.x, n.y, NAIL_RADIUS + 10, 0, Math.PI * 2); ctx.fillStyle = gg; ctx.fill();
        }
        if (first) { ctx.fillStyle = p.color.main; ctx.font = 'bold 9px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.id + 1, n.x, n.y); }
        ctx.beginPath(); ctx.arc(n.x - 2, n.y - 2, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    });
}

// --- THROW PHASE VISUALS ---
function drawDirectionPhase() {
    const p = state.players[state.currentPlayer];
    const last = p.nails[p.nails.length - 1];
    const len = 130;
    // Sweep fan
    ctx.beginPath(); ctx.moveTo(last.x, last.y);
    ctx.arc(last.x, last.y, len, throwState.baseAngle - throwState.sweepRange, throwState.baseAngle + throwState.sweepRange);
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
    // Sweep edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    [-1, 1].forEach(s => {
        const a = throwState.baseAngle + s * throwState.sweepRange;
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + Math.cos(a) * len, last.y + Math.sin(a) * len); ctx.stroke();
    });
    ctx.setLineDash([]);
    // Arrow
    const ex = last.x + Math.cos(throwState.sweepAngle) * len;
    const ey = last.y + Math.sin(throwState.sweepAngle) * len;
    // Arrow glow
    ctx.strokeStyle = p.color.glow; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(ex, ey); ctx.stroke();
    // Arrow line
    ctx.strokeStyle = p.color.light; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(ex, ey); ctx.stroke();
    // Arrowhead
    const ha = 0.4, hl = 14;
    ctx.fillStyle = p.color.light; ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(throwState.sweepAngle - ha) * hl, ey - Math.sin(throwState.sweepAngle - ha) * hl);
    ctx.lineTo(ex - Math.cos(throwState.sweepAngle + ha) * hl, ey - Math.sin(throwState.sweepAngle + ha) * hl);
    ctx.closePath(); ctx.fill();
}

function drawPowerPhase() {
    const p = state.players[state.currentPlayer];
    const last = p.nails[p.nails.length - 1];
    // Show locked direction as dashed line
    const maxEnd = MAX_THROW_DIST + 20;
    ctx.strokeStyle = p.color.main + '30'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x + Math.cos(throwState.lockedDirection) * maxEnd, last.y + Math.sin(throwState.lockedDirection) * maxEnd);
    ctx.stroke(); ctx.setLineDash([]);
    // Distance markers
    for (let d = MIN_THROW_DIST; d <= MAX_THROW_DIST; d += 40) {
        const mx = last.x + Math.cos(throwState.lockedDirection) * d;
        const my = last.y + Math.sin(throwState.lockedDirection) * d;
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    }
    // Current power dot
    const dist = MIN_THROW_DIST + throwState.powerLevel * (MAX_THROW_DIST - MIN_THROW_DIST);
    const dx = last.x + Math.cos(throwState.lockedDirection) * dist;
    const dy = last.y + Math.sin(throwState.lockedDirection) * dist;
    // Dot glow
    ctx.beginPath(); ctx.arc(dx, dy, 12, 0, Math.PI * 2); ctx.fillStyle = p.color.glow; ctx.fill();
    ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fillStyle = p.color.light; ctx.fill();
    // Line from last nail to dot
    ctx.strokeStyle = p.color.light + '80'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(dx, dy); ctx.stroke();
    // Power meter bar (right side)
}

function drawPowerMeter() {
    const mx = state.canvasWidth - 55, my = 60, mw = 22, mh = state.canvasHeight - 120;
    // BG
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, mx - 5, my - 25, mw + 10, mh + 35, 10); ctx.fill();
    // Label
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Outfit'; ctx.textAlign = 'center'; ctx.fillText('GÜÇ', mx + mw / 2, my - 10);
    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, mx, my, mw, mh, 6); ctx.fill();
    // Gradient fill
    const gf = ctx.createLinearGradient(0, my + mh, 0, my);
    gf.addColorStop(0, '#27ae60'); gf.addColorStop(0.4, '#f1c40f'); gf.addColorStop(0.7, '#e67e22'); gf.addColorStop(1, '#c0392b');
    ctx.fillStyle = gf; roundRect(ctx, mx + 2, my + 2, mw - 4, mh - 4, 4); ctx.fill();
    // Dark overlay above marker
    const markerY = my + mh - throwState.powerLevel * mh;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, mx + 2, my + 2, mw - 4, markerY - my - 2, 4); ctx.fill();
    // Marker line
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx - 3, markerY); ctx.lineTo(mx + mw + 3, markerY); ctx.stroke();
    // Marker triangle
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.moveTo(mx - 8, markerY); ctx.lineTo(mx - 2, markerY - 5); ctx.lineTo(mx - 2, markerY + 5); ctx.closePath(); ctx.fill();
    // Min/Max labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '8px Outfit'; ctx.textAlign = 'center';
    ctx.fillText('MAX', mx + mw / 2, my + 14); ctx.fillText('MIN', mx + mw / 2, my + mh - 6);
}

function drawAccuracyPhase() {
    const p = state.players[state.currentPlayer];
    const tx = throwState.targetX, ty = throwState.targetY;
    // Show locked direction & power
    const last = p.nails[p.nails.length - 1];
    ctx.strokeStyle = p.color.main + '30'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    // Target crosshair
    ctx.strokeStyle = p.color.main + '60'; ctx.lineWidth = 1;
    [[-12, 0, 12, 0], [0, -12, 0, 12]].forEach(c => { ctx.beginPath(); ctx.moveTo(tx + c[0], ty + c[1]); ctx.lineTo(tx + c[2], ty + c[3]); ctx.stroke(); });
    // Concentric rings
    for (let r = throwState.ringMin; r <= throwState.ringMax; r += 12) {
        ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.strokeStyle = r === throwState.ringMin ? p.color.main + '90' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = r === throwState.ringMin ? 2 : 1; ctx.stroke();
    }
    // Bullseye center
    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fillStyle = p.color.light; ctx.fill();
    // Pulsing ring
    ctx.beginPath(); ctx.arc(tx, ty, throwState.ringSize, 0, Math.PI * 2);
    ctx.strokeStyle = p.color.light; ctx.lineWidth = 3; ctx.stroke();
    // Ring glow
    ctx.beginPath(); ctx.arc(tx, ty, throwState.ringSize, 0, Math.PI * 2);
    ctx.strokeStyle = p.color.glow; ctx.lineWidth = 8; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    // "Hit when small" indicator
    const quality = (throwState.ringSize - throwState.ringMin) / (throwState.ringMax - throwState.ringMin);
    if (quality < 0.2) { // Green zone
        ctx.beginPath(); ctx.arc(tx, ty, throwState.ringSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(46,204,113,0.6)'; ctx.lineWidth = 4; ctx.stroke();
    }
}

// ============ GSAP THROW SYSTEM ============
function startGSAPThrow() {
    const p = state.players[state.currentPlayer];
    const last = p.nails[p.nails.length - 1];
    const lx = throwState.landingX, ly = throwState.landingY;
    const throwAngle = Math.atan2(ly - last.y, lx - last.x);
    const totalDist = dist(last, { x: lx, y: ly });
    const reachDist = totalDist * 0.35;

    // Starting position (off-screen, approaching from behind)
    const startX = last.x - Math.cos(throwAngle) * 120;
    const startY = last.y - Math.sin(throwAngle) * 120;
    const reachX = last.x + Math.cos(throwAngle) * reachDist;
    const reachY = last.y + Math.sin(throwAngle) * reachDist;
    const pullBackX = reachX - Math.cos(throwAngle) * 18;
    const pullBackY = reachY - Math.sin(throwAngle) * 18;
    const pushX = reachX + Math.cos(throwAngle) * 28;
    const pushY = reachY + Math.sin(throwAngle) * 28;

    // Reset animation state
    Object.assign(armAnim, {
        x: startX, y: startY, alpha: 0, scale: 1,
        upperArmRot: 0, forearmRot: -0.15, wristRot: 0,
        fingerCurl: 0, thumbCurl: 0,
        finger0: 0, finger1: 0, finger2: 0, finger3: 0,
        nailRot: 0, nailInHand: 1,
        nailFlyProgress: -1, nailX: 0, nailY: 0,
        impactProgress: -1, impactScale: 0,
        landedScale: 0, sway: 0, tension: 0,
        throwAngle: throwAngle
    });

    // Kill previous timeline
    if (throwTimeline) throwTimeline.kill();

    const tl = gsap.timeline({
        onComplete: () => {
            landNail();
        }
    });
    throwTimeline = tl;

    // Phase 1: Arm enters from off-screen
    tl.to(armAnim, {
        x: reachX, y: reachY, alpha: 1,
        duration: 0.5,
        ease: 'power2.out'
    }, 0);

    // Subtle forearm tension as arm enters
    tl.to(armAnim, {
        forearmRot: 0.05, tension: 0.3,
        duration: 0.4,
        ease: 'power1.inOut'
    }, 0.1);

    // Phase 2: Wind-up (pull back + wrist cock)
    tl.to(armAnim, {
        x: pullBackX, y: pullBackY,
        upperArmRot: -0.12,
        forearmRot: -0.25,
        wristRot: -0.35,
        tension: 0.8,
        duration: 0.35,
        ease: 'back.in(1.5)'
    }, 0.55);

    // Fingers grip tighter during wind-up
    tl.to(armAnim, {
        fingerCurl: -0.15, thumbCurl: -0.1,
        duration: 0.25,
        ease: 'power2.in'
    }, 0.6);

    // Phase 3: Forward flick (explosive)
    tl.to(armAnim, {
        x: pushX, y: pushY,
        upperArmRot: 0.2,
        forearmRot: 0.15,
        wristRot: 0.6,
        tension: 1,
        duration: 0.18,
        ease: 'power4.out'
    }, 0.92);

    // Nail rotation during flick
    tl.to(armAnim, {
        nailRot: Math.PI * 0.9,
        duration: 0.22,
        ease: 'power3.out'
    }, 0.88);

    // Phase 4: Finger release (staggered per finger)
    tl.to(armAnim, { finger1: 1, duration: 0.08, ease: 'power2.out' }, 1.02);
    tl.to(armAnim, { finger2: 1, duration: 0.08, ease: 'power2.out' }, 1.04);
    tl.to(armAnim, { finger0: 1, duration: 0.09, ease: 'power2.out' }, 1.06);
    tl.to(armAnim, { finger3: 1, duration: 0.1, ease: 'power2.out' }, 1.08);
    tl.to(armAnim, {
        fingerCurl: 1, thumbCurl: 1,
        nailInHand: 0,
        duration: 0.12,
        ease: 'power2.out'
    }, 1.06);

    // Phase 5: Flying nail
    tl.to(armAnim, {
        nailFlyProgress: 1,
        duration: 0.4,
        ease: 'power2.in',
        onStart: () => {
            armAnim.nailFlyProgress = 0;
            armAnim.nailX = pushX + Math.cos(throwAngle) * 30;
            armAnim.nailY = pushY + Math.sin(throwAngle) * 30;
        }
    }, 1.12);

    // Phase 6: Arm retracts
    tl.to(armAnim, {
        x: startX, y: startY, alpha: 0,
        wristRot: 0.1,
        tension: 0,
        duration: 0.45,
        ease: 'power2.in'
    }, 1.2);

    // Fingers relax during retract
    tl.to(armAnim, {
        fingerCurl: 0.6, thumbCurl: 0.4,
        finger0: 0.7, finger1: 0.7, finger2: 0.7, finger3: 0.7,
        duration: 0.3,
        ease: 'power1.out'
    }, 1.3);

    // Phase 7: Impact effects
    tl.to(armAnim, {
        landedScale: 1,
        duration: 0.25,
        ease: 'back.out(3)'
    }, 1.48);

    tl.to(armAnim, {
        impactProgress: 1, impactScale: 1,
        duration: 0.35,
        ease: 'power2.out',
        onStart: () => { armAnim.impactProgress = 0; }
    }, 1.48);
}

function drawThrowAnim() {
    const a = armAnim;
    const p = state.players[state.currentPlayer];
    const lx = throwState.landingX, ly = throwState.landingY;
    const throwAngle = a.throwAngle || Math.atan2(ly - p.nails[p.nails.length - 1].y, lx - p.nails[p.nails.length - 1].x);

    // Draw arm
    if (a.alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(a.alpha, 0, 1);
        drawThrowingArm(a.x, a.y, throwAngle, a, p.color);
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Flying nail
    if (a.nailFlyProgress >= 0 && a.nailFlyProgress < 1) {
        const startNailX = a.nailX;
        const startNailY = a.nailY;
        const nx = startNailX + (lx - startNailX) * a.nailFlyProgress;
        const ny = startNailY + (ly - startNailY) * a.nailFlyProgress;

        // Shadow under flying nail
        ctx.beginPath();
        ctx.ellipse(nx + 2, ny + 4, 3 + a.nailFlyProgress * 5, 2 + a.nailFlyProgress * 2.5, throwAngle, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();

        // Motion blur trail
        for (let i = 3; i > 0; i--) {
            const trailT = Math.max(0, a.nailFlyProgress - i * 0.06);
            const tx = startNailX + (lx - startNailX) * trailT;
            const ty = startNailY + (ly - startNailY) * trailT;
            ctx.globalAlpha = 0.08 * (4 - i);
            drawSideNail(tx, ty, throwAngle + Math.PI + trailT * Math.PI * 0.4, 0.5);
        }
        ctx.globalAlpha = 1;

        // Main flying nail with spin
        const spinAngle = throwAngle + Math.PI + a.nailFlyProgress * Math.PI * 1.5;
        drawSideNail(nx, ny, spinAngle, 0.7 + a.nailFlyProgress * 0.3);
    }

    // Landed nail
    if (a.landedScale > 0) {
        ctx.save(); ctx.translate(lx, ly); ctx.scale(a.landedScale, a.landedScale);
        const ng = ctx.createRadialGradient(-2, -2, 0, 0, 0, NAIL_RADIUS);
        ng.addColorStop(0, '#d0d0d0'); ng.addColorStop(0.5, '#a0a0a0'); ng.addColorStop(1, '#606060');
        ctx.beginPath(); ctx.arc(0, 0, NAIL_RADIUS, 0, Math.PI * 2); ctx.fillStyle = ng; ctx.fill();
        ctx.strokeStyle = p.color.main; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    // Impact ring
    if (a.impactProgress >= 0 && a.impactProgress <= 1) {
        const ip = a.impactProgress;
        // Outer ring
        ctx.beginPath(); ctx.arc(lx, ly, ip * 35, 0, Math.PI * 2);
        ctx.strokeStyle = p.color.main; ctx.lineWidth = 2.5;
        ctx.globalAlpha = (1 - ip) * 0.9; ctx.stroke();
        // Inner ring
        ctx.beginPath(); ctx.arc(lx, ly, ip * 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        // Shockwave ring
        ctx.beginPath(); ctx.arc(lx, ly, ip * 50, 0, Math.PI * 2);
        ctx.strokeStyle = p.color.glow; ctx.lineWidth = 1;
        ctx.globalAlpha = (1 - ip) * 0.3; ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

// ============ IMPROVED NAIL DRAWING ============
function drawSideNail(x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);

    // Shaft gradient (more realistic metallic)
    const sg = ctx.createLinearGradient(-2.5, 0, 2.5, 0);
    sg.addColorStop(0, '#555'); sg.addColorStop(0.15, '#999');
    sg.addColorStop(0.35, '#ccc'); sg.addColorStop(0.5, '#ddd');
    sg.addColorStop(0.65, '#bbb'); sg.addColorStop(0.85, '#888'); sg.addColorStop(1, '#666');

    // Shaft body
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(2, -12);
    ctx.lineTo(2.2, 12);
    ctx.lineTo(-2.2, 12);
    ctx.closePath();
    ctx.fill();

    // Shaft edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-0.3, -11); ctx.lineTo(-0.3, 11); ctx.stroke();

    // Nail head (top) - more dimensional
    const headGrad = ctx.createRadialGradient(-1, -14, 0, 0, -13, 6);
    headGrad.addColorStop(0, '#ccc'); headGrad.addColorStop(0.5, '#aaa'); headGrad.addColorStop(1, '#777');
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(0, -13, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 0.6; ctx.stroke();

    // Head cross mark
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(2, -13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -11); ctx.stroke();

    // Nail tip (bottom) - sharper
    const tipGrad = ctx.createLinearGradient(-2, 12, 2, 12);
    tipGrad.addColorStop(0, '#666'); tipGrad.addColorStop(0.5, '#999'); tipGrad.addColorStop(1, '#555');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.moveTo(-2.2, 12);
    ctx.lineTo(2.2, 12);
    ctx.lineTo(0, 22);
    ctx.closePath();
    ctx.fill();

    // Tip highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.moveTo(-0.5, 13); ctx.lineTo(0.5, 13); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();

    ctx.restore();
}

// ============ SKELETAL ARM DRAWING ============
function drawThrowingArm(x, y, throwAngle, anim, playerColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(throwAngle - Math.PI / 2);

    const skin = '#CFA07A', skinMid = '#B8926A', skinDark = '#A07858', skinLight = '#E0C8A8';
    const tension = clamp(anim.tension || 0, 0, 1);

    // ===== UPPER ARM (shoulder to elbow) =====
    ctx.save();
    ctx.rotate(anim.upperArmRot || 0);

    // Sleeve / upper arm garment
    ctx.fillStyle = playerColor.main; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-12, -115); ctx.lineTo(12, -115);
    ctx.bezierCurveTo(13, -108, 13, -100, 12, -92);
    ctx.lineTo(-12, -92);
    ctx.bezierCurveTo(-13, -100, -13, -108, -12, -115);
    ctx.closePath(); ctx.fill();
    // Sleeve cuff detail
    ctx.fillStyle = playerColor.light; ctx.globalAlpha = 0.8;
    ctx.fillRect(-12, -94, 24, 3);
    ctx.globalAlpha = 1;

    // Bare upper arm (below sleeve)
    ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-11, -92);
    ctx.bezierCurveTo(-11.5, -75, -11, -60, -10, -50);
    ctx.lineTo(10, -50);
    ctx.bezierCurveTo(11, -60, 11.5, -75, 11, -92);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Arm highlight (muscle)
    ctx.fillStyle = skinLight; ctx.globalAlpha = 0.15 + tension * 0.1;
    ctx.beginPath(); ctx.ellipse(-2, -70, 4.5, 18, -0.08, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Muscle tension bulge
    if (tension > 0.3) {
        ctx.fillStyle = skinLight; ctx.globalAlpha = tension * 0.12;
        ctx.beginPath(); ctx.ellipse(4, -68, 3, 12, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ===== FOREARM (elbow to wrist) =====
    ctx.save();
    ctx.translate(0, -48);
    ctx.rotate(anim.forearmRot || 0);

    ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.bezierCurveTo(-10.5, 8, -10, 18, -9, 30);
    ctx.bezierCurveTo(-8, 38, -7, 42, -6, 44);
    ctx.lineTo(6, 44);
    ctx.bezierCurveTo(7, 42, 8, 38, 9, 30);
    ctx.bezierCurveTo(10, 18, 10.5, 8, 10, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Forearm tendons (more visible with tension)
    ctx.strokeStyle = skinDark; ctx.lineWidth = 0.4; ctx.globalAlpha = 0.15 + tension * 0.2;
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.bezierCurveTo(-4.5, 18, -5, 30, -5, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 5); ctx.bezierCurveTo(3.5, 18, 4, 30, 4.5, 40); ctx.stroke();
    // Center tendon
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(0, 20, -0.5, 32, -0.5, 42); ctx.stroke();
    ctx.globalAlpha = 1;

    // Veins (subtle, only during tension)
    if (tension > 0.5) {
        ctx.strokeStyle = '#9a7560'; ctx.lineWidth = 0.6; ctx.globalAlpha = (tension - 0.5) * 0.3;
        ctx.beginPath(); ctx.moveTo(5, 8); ctx.bezierCurveTo(6, 15, 5.5, 22, 6, 30); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // ===== WRIST (joint) =====
    ctx.save();
    ctx.translate(0, 44);
    ctx.rotate(anim.wristRot || 0);

    // Wrist crease
    ctx.fillStyle = skinMid; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // ===== PALM =====
    ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-11, 3);
    ctx.bezierCurveTo(-12, 8, -12, 14, -10, 18);
    ctx.bezierCurveTo(-7, 22, -3, 24, 0, 24);
    ctx.bezierCurveTo(3, 24, 7, 22, 10, 18);
    ctx.bezierCurveTo(12, 14, 12, 8, 11, 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Palm lines
    ctx.strokeStyle = skinDark; ctx.lineWidth = 0.4; ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.moveTo(-8, 10); ctx.bezierCurveTo(-4, 13, 2, 14, 8, 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 14); ctx.bezierCurveTo(-3, 16, 3, 17, 7, 15); ctx.stroke();
    ctx.globalAlpha = 1;

    // Knuckle bumps
    ctx.fillStyle = skinMid; ctx.globalAlpha = 0.2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(-7 + i * 4.8, 23, 2.5, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ===== FINGERS (each independently controlled) =====
    const fingerDefs = [
        { bx: -7.5, baseA: -0.1, openA: -0.65, l: 20, w: 4.8, curl: anim.finger0 },
        { bx: -2.8, baseA: -0.02, openA: -0.4, l: 22, w: 5, curl: anim.finger1 },
        { bx: 2.2, baseA: 0.02, openA: 0.4, l: 21, w: 4.8, curl: anim.finger2 },
        { bx: 7, baseA: 0.12, openA: 0.7, l: 17, w: 4.3, curl: anim.finger3 },
    ];

    fingerDefs.forEach((f, idx) => {
        const curl = clamp(f.curl || 0, 0, 1);
        const angle = f.baseA + curl * f.openA;

        ctx.save();
        ctx.translate(f.bx, 23);
        ctx.rotate(angle);

        const hw = f.w / 2;

        // === Segment 1: Proximal phalanx ===
        const seg1Len = f.l * 0.45;
        ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw, 0);
        ctx.bezierCurveTo(-hw, seg1Len * 0.3, -hw + 0.3, seg1Len * 0.7, -hw + 0.5, seg1Len);
        ctx.lineTo(hw - 0.5, seg1Len);
        ctx.bezierCurveTo(hw - 0.3, seg1Len * 0.7, hw, seg1Len * 0.3, hw, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Joint crease
        ctx.strokeStyle = skinDark; ctx.lineWidth = 0.4; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.moveTo(-hw + 1, seg1Len - 0.5); ctx.lineTo(hw - 1, seg1Len - 0.5); ctx.stroke();
        ctx.globalAlpha = 1;

        // === Segment 2: Middle phalanx (bends with curl) ===
        ctx.save();
        ctx.translate(0, seg1Len);
        ctx.rotate(curl * 0.15); // subtle bend at middle joint

        const seg2Len = f.l * 0.32;
        ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw + 0.5, 0);
        ctx.bezierCurveTo(-hw + 0.5, seg2Len * 0.4, -hw + 0.8, seg2Len * 0.8, -hw + 1, seg2Len);
        ctx.lineTo(hw - 1, seg2Len);
        ctx.bezierCurveTo(hw - 0.8, seg2Len * 0.8, hw - 0.5, seg2Len * 0.4, hw - 0.5, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Joint crease
        ctx.strokeStyle = skinDark; ctx.lineWidth = 0.3; ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.moveTo(-hw + 1.5, seg2Len - 0.5); ctx.lineTo(hw - 1.5, seg2Len - 0.5); ctx.stroke();
        ctx.globalAlpha = 1;

        // === Segment 3: Distal phalanx (fingertip) ===
        ctx.save();
        ctx.translate(0, seg2Len);
        ctx.rotate(curl * 0.1);

        const seg3Len = f.l * 0.25;
        ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-hw + 1, 0);
        ctx.bezierCurveTo(-hw + 1, seg3Len * 0.5, -hw + 1.5, seg3Len * 0.9, 0, seg3Len + 1);
        ctx.bezierCurveTo(hw - 1.5, seg3Len * 0.9, hw - 1, seg3Len * 0.5, hw - 1, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Fingernail
        ctx.fillStyle = '#E8D8C8'; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.ellipse(0, seg3Len - 0.5, hw * 0.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore(); // seg3
        ctx.restore(); // seg2
        ctx.restore(); // finger
    });

    // ===== THUMB =====
    const thumbCurl = clamp(anim.thumbCurl || 0, 0, 1);
    ctx.save();
    ctx.translate(-12, 8);
    ctx.rotate(-0.3 - thumbCurl * 0.9);

    // Thumb base (metacarpal)
    ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.bezierCurveTo(-4, 4, -3.8, 9, -3.5, 13);
    ctx.lineTo(3.5, 13);
    ctx.bezierCurveTo(3.8, 9, 4, 4, 3.5, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Thumb joint crease
    ctx.strokeStyle = skinDark; ctx.lineWidth = 0.3; ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.moveTo(-2.5, 12.5); ctx.lineTo(2.5, 12.5); ctx.stroke();
    ctx.globalAlpha = 1;

    // Thumb tip
    ctx.save();
    ctx.translate(0, 13);
    ctx.rotate(thumbCurl * 0.2);
    ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.bezierCurveTo(-3.5, 3, -3, 7, -1.5, 10);
    ctx.quadraticCurveTo(0, 12, 1.5, 10);
    ctx.bezierCurveTo(3, 7, 3.5, 3, 3, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Thumb nail
    ctx.fillStyle = '#E8D8C8';
    ctx.beginPath(); ctx.ellipse(0, 8.5, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // thumb tip
    ctx.restore(); // thumb

    // ===== NAIL IN HAND =====
    if (anim.nailInHand > 0.3) {
        ctx.globalAlpha = clamp(anim.nailInHand, 0, 1);
        ctx.save();
        ctx.translate(0, 32);
        ctx.rotate(Math.PI - (anim.nailRot || 0));
        drawSideNail(0, 0, 0, 0.85);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    ctx.restore(); // wrist
    ctx.restore(); // forearm
    ctx.restore(); // upper arm
    ctx.restore(); // main transform
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

function drawResultLabel() {
    if (!throwState.resultText) return;
    const alpha = Math.min(throwState.resultTimer, 1);
    const y = throwState.landingY - 30 - (1.5 - throwState.resultTimer) * 20;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Outfit';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(throwState.resultText, throwState.landingX + 1, y + 1);
    ctx.fillStyle = throwState.resultColor;
    ctx.fillText(throwState.resultText, throwState.landingX, y);
    ctx.globalAlpha = 1;
}

// ============ WIN CONDITIONS ============
function checkEncirclement() {
    for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.territory.length < 3) continue;
        for (let j = 0; j < state.players.length; j++) {
            if (i === j) continue;
            const opp = state.players[j];
            // Check if ALL opponent nails are inside this player's territory
            const allInside = opp.nails.every(nail => pointInPoly(nail, p.territory));
            if (allInside) {
                // Also verify the opponent can't throw in any direction without crossing
                // Check 8 directions from opponent's last nail
                const lastNail = opp.nails[opp.nails.length - 1];
                let escapePossible = false;
                for (let dir = 0; dir < 8; dir++) {
                    const angle = (Math.PI * 2 / 8) * dir;
                    const testPoint = {
                        x: lastNail.x + Math.cos(angle) * MAX_THROW_DIST,
                        y: lastNail.y + Math.sin(angle) * MAX_THROW_DIST
                    };
                    // Check if a line from last nail to test point would cross any of the encircling player's lines
                    let wouldCross = false;
                    for (const line of p.lines) {
                        if (segmentsIntersect(lastNail, testPoint, line.from, line.to)) {
                            wouldCross = true; break;
                        }
                    }
                    // Also check initial shape
                    if (!wouldCross) {
                        for (const line of state.initialShape) {
                            if (segmentsIntersect(lastNail, testPoint, line.from, line.to)) {
                                wouldCross = true; break;
                            }
                        }
                    }
                    if (!wouldCross && !pointInPoly(testPoint, p.territory)) {
                        escapePossible = true; break;
                    }
                }
                if (!escapePossible) {
                    return { winner: i, loser: j, type: 'encircle' };
                }
            }
        }
    }
    return null;
}

function checkAreaDominance() {
    const total = (state.canvasWidth - 2 * PADDING) * (state.canvasHeight - 2 * PADDING);
    for (let i = 0; i < state.players.length; i++) {
        if (state.players[i].territoryArea > total * 0.5) {
            let minA = Infinity, loser = -1;
            for (let j = 0; j < state.players.length; j++) {
                if (j === i) continue;
                if (state.players[j].territoryArea < minA) { minA = state.players[j].territoryArea; loser = j; }
            }
            return { winner: i, loser, type: 'dominate' };
        }
    }
    return null;
}

function checkLineCrossing(newLine, currentPlayerIdx) {
    const a = newLine.from, b = newLine.to;

    // Check against ALL players' lines
    for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        for (const line of p.lines) {
            if (segmentsIntersect(a, b, line.from, line.to)) {
                // Determine winner: if crossed own line or opponent's line, current player loses
                let winner = -1;
                for (let j = 0; j < state.players.length; j++) {
                    if (j !== currentPlayerIdx) { winner = j; break; }
                }
                const crossType = i === currentPlayerIdx ? 'cross_self' : 'cross_opponent';
                return { winner, loser: currentPlayerIdx, type: crossType, crossedPlayer: i };
            }
        }
    }

    // Check against initial shape lines
    for (const line of state.initialShape) {
        if (segmentsIntersect(a, b, line.from, line.to)) {
            let winner = -1;
            for (let j = 0; j < state.players.length; j++) {
                if (j !== currentPlayerIdx) { winner = j; break; }
            }
            return { winner, loser: currentPlayerIdx, type: 'cross_initial' };
        }
    }

    return null;
}

// ============ GEOMETRY ============
function segmentsIntersect(p1, p2, p3, p4) {
    // Check if segments p1-p2 and p3-p4 intersect (excluding shared endpoints)
    const EPS = 1e-6;
    const POINT_EPS = 3; // tolerance for shared endpoints (pixels)

    // Skip if segments share an endpoint (they connect at a nail)
    if (dist(p1, p3) < POINT_EPS || dist(p1, p4) < POINT_EPS ||
        dist(p2, p3) < POINT_EPS || dist(p2, p4) < POINT_EPS) {
        return false;
    }

    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const cross = d1x * d2y - d1y * d2x;

    if (Math.abs(cross) < EPS) return false; // parallel

    const dx = p3.x - p1.x, dy = p3.y - p1.y;
    const t = (dx * d2y - dy * d2x) / cross;
    const u = (dx * d1y - dy * d1x) / cross;

    // Strict intersection (not at endpoints)
    return t > EPS && t < (1 - EPS) && u > EPS && u < (1 - EPS);
}

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function pointInPoly(pt, poly) {
    if (poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

function convexHull(points) {
    if (points.length < 3) return [...points];
    const pts = points.map(p => ({ ...p }));
    let mi = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].y > pts[mi].y || (pts[i].y === pts[mi].y && pts[i].x < pts[mi].x)) mi = i;
    [pts[0], pts[mi]] = [pts[mi], pts[0]];
    const piv = pts[0];
    pts.sort((a, b) => {
        if (a === piv) return -1; if (b === piv) return 1;
        const aa = Math.atan2(a.y - piv.y, a.x - piv.x), ab = Math.atan2(b.y - piv.y, b.x - piv.x);
        return Math.abs(aa - ab) < 1e-10 ? dist(piv, a) - dist(piv, b) : aa - ab;
    });
    const h = [pts[0], pts[1]];
    for (let i = 2; i < pts.length; i++) {
        while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], pts[i]) <= 0) h.pop();
        h.push(pts[i]);
    }
    return h;
}
function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
function polyArea(poly) { if (poly.length < 3) return 0; let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { a += poly[j].x * poly[i].y; a -= poly[i].x * poly[j].y; } return Math.abs(a / 2); }

// ============ HELPERS ============
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
function easeOutBounce(t) { if (t < 1 / 2.75) return 7.5625 * t * t; if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; } if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; } t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375; }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// ============ EFFECTS ============
function createImpactEffect(x, y, color) {
    const ring = document.createElement('div');
    ring.className = 'impact-ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.style.borderColor = color.main;
    gameArea.appendChild(ring); setTimeout(() => ring.remove(), 600);
    for (let i = 0; i < 8; i++) {
        const s = document.createElement('div'); s.className = 'mud-splash'; s.style.left = x + 'px'; s.style.top = y + 'px';
        const a = (Math.PI * 2 / 8) * i + Math.random() * 0.5, d = 20 + Math.random() * 30;
        s.style.setProperty('--splash-x', Math.cos(a) * d + 'px'); s.style.setProperty('--splash-y', Math.sin(a) * d + 'px');
        gameArea.appendChild(s); setTimeout(() => s.remove(), 600);
    }
}

function showWinScreen(result) {
    const w = state.players[result.winner];
    let winnerName = `Oyuncu ${result.winner + 1}`;
    if (aiMode) {
        winnerName = result.winner === AI_PLAYER_IDX ? '🤖 Bilgisayar' : '🎉 Sen';
    }
    winnerText.textContent = `${winnerName} Kazandı!`;
    winnerText.style.color = w.color.light;

    // Determine description based on result type
    let desc = '';
    if (result.type === 'encircle') {
        desc = `Oyuncu ${result.loser + 1}'in çivisini başarıyla kuşattınız!`;
    } else if (result.type === 'dominate') {
        desc = 'Alanın büyük kısmını ele geçirdiniz!';
    } else if (result.type === 'cross_self') {
        desc = `Oyuncu ${result.loser + 1} kendi çizgisini kesti! ❌`;
    } else if (result.type === 'cross_opponent') {
        desc = `Oyuncu ${result.loser + 1} rakibinin çizgisini kesti! ❌`;
    } else if (result.type === 'cross_initial') {
        desc = `Oyuncu ${result.loser + 1} başlangıç çizgisini kesti! ❌`;
    }
    winnerDesc.textContent = desc;

    // === EARN GOLD for game result ===
    if (aiMode) {
        if (result.winner !== AI_PLAYER_IDX) {
            addGold(200); // you won!
        } else {
            addGold(50); // you lost but still earn some
        }
    } else {
        addGold(100); // local multiplayer reward
    }

    const cc = $('confetti'); cc.innerHTML = '';
    const cols = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22'];
    for (let i = 0; i < 30; i++) { const p = document.createElement('div'); p.className = 'confetti-piece'; p.style.left = Math.random() * 100 + '%'; p.style.background = cols[Math.floor(Math.random() * cols.length)]; p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'; p.style.width = Math.random() * 8 + 4 + 'px'; p.style.height = Math.random() * 8 + 4 + 'px'; cc.appendChild(p); }
    winModal.classList.add('show');
}

// ============ UI ============
function updateTurnIndicator() {
    const p = state.players[state.currentPlayer];
    turnDot.style.background = p.color.main;
    turnDot.style.boxShadow = `0 0 8px ${p.color.glow}`;
    const name = (aiMode && state.currentPlayer === AI_PLAYER_IDX) ? '🤖 Bilgisayar' : `Oyuncu ${state.currentPlayer + 1}`;
    turnText.textContent = `${name}'ın Sırası`;
}

function updateScoreBoard() {
    scoreBoard.innerHTML = '';
    for (let i = 0; i < state.playerCount; i++) {
        const p = state.players[i], el = document.createElement('div');
        el.className = 'score-item' + (i === state.currentPlayer ? ' active' : ''); el.style.color = p.color.main;
        el.innerHTML = `<div class="score-dot" style="background:${p.color.main}"></div><span style="color:var(--text-muted)">O${i + 1}: </span><span class="score-value">${p.nails.length - 1}</span>`;
        scoreBoard.appendChild(el);
    }
}

function updateInstruction(text) { instructionText.textContent = text; }

function updatePhaseUI(phase) {
    if (!phaseIndicator) return;
    document.querySelectorAll('.phase-step').forEach(s => s.classList.remove('active', 'done'));
    if (phase === 'direction') { $('step-direction').classList.add('active'); }
    else if (phase === 'power') { $('step-direction').classList.add('done'); $('step-power').classList.add('active'); }
    else if (phase === 'accuracy') { $('step-direction').classList.add('done'); $('step-power').classList.add('done'); $('step-accuracy').classList.add('active'); }
}

function handleMouseMove(e) {
    // Minimal - just for cursor visibility during idle
    if (throwState.phase !== 'idle' && throwState.phase !== 'throwing') {
        gameArea.style.cursor = 'pointer';
    }
}

// ============ INTRO ANIMATION SYSTEM ============
function playIntroAnimation() {
    state.introPhase = 'feet';
    throwState.phase = 'idle';
    updateInstruction('');

    const w = state.canvasWidth, h = state.canvasHeight;
    const cx = w / 2, cy = h / 2;
    const groundY = h * 0.55;

    Object.assign(introAnim, {
        legs1: { x: -80, y: groundY, alpha: 0, scale: 1.1, legPhase: 0, jump: 0 },
        legs2: { x: w + 80, y: groundY, alpha: 0, scale: 1.1, legPhase: 0, jump: 0 },
        stompEffect: 0, stompEffect2: 0,
        dustAlpha: 0, dustAlpha2: 0,
        screenShake: 0,
        handX: -100, handY: cy, handAlpha: 0, handRot: 0,
        drawProgress: 0, overlayAlpha: 0
    });

    if (introTimeline) introTimeline.kill();
    const tl = gsap.timeline();
    introTimeline = tl;

    // === Phase 1: Legs run in from both sides ===
    tl.to(introAnim.legs1, { x: cx - 55, alpha: 1, legPhase: 8, duration: 0.9, ease: 'power2.out' }, 0);
    tl.to(introAnim.legs2, { x: cx + 55, alpha: 1, legPhase: 8, duration: 0.9, ease: 'power2.out' }, 0.12);
    // Stop running
    tl.set(introAnim.legs1, { legPhase: 0 }, 0.95);
    tl.set(introAnim.legs2, { legPhase: 0 }, 1.1);

    // === Phase 2: Stomp sequence ===
    // Stomp 1 - Left legs
    tl.to(introAnim.legs1, { jump: -40, duration: 0.22, ease: 'power2.out' }, 1.2);
    tl.to(introAnim.legs1, { jump: 0, duration: 0.12, ease: 'power4.in' }, 1.42);
    tl.to(introAnim, {
        stompEffect: 1, dustAlpha: 0.7, screenShake: 6, duration: 0.15,
        onStart: () => { introAnim.stompEffect = 0; }
    }, 1.44);
    tl.to(introAnim, { dustAlpha: 0, screenShake: 0, duration: 0.5 }, 1.6);

    // Stomp 2 - Right legs
    tl.to(introAnim.legs2, { jump: -45, duration: 0.22, ease: 'power2.out' }, 1.65);
    tl.to(introAnim.legs2, { jump: 0, duration: 0.12, ease: 'power4.in' }, 1.87);
    tl.to(introAnim, {
        stompEffect2: 1, dustAlpha2: 0.7, screenShake: 7, duration: 0.15,
        onStart: () => { introAnim.stompEffect2 = 0; }
    }, 1.89);
    tl.to(introAnim, { dustAlpha2: 0, screenShake: 0, duration: 0.5 }, 2.05);

    // Shuffle closer together
    tl.to(introAnim.legs1, { x: cx - 35, duration: 0.3, ease: 'power1.inOut' }, 2.2);
    tl.to(introAnim.legs2, { x: cx + 35, duration: 0.3, ease: 'power1.inOut' }, 2.2);

    // Double stomp! Both at once
    tl.to(introAnim.legs1, { jump: -35, duration: 0.2, ease: 'power2.out' }, 2.6);
    tl.to(introAnim.legs2, { jump: -35, duration: 0.2, ease: 'power2.out' }, 2.6);
    tl.to(introAnim.legs1, { jump: 0, duration: 0.1, ease: 'power4.in' }, 2.8);
    tl.to(introAnim.legs2, { jump: 0, duration: 0.1, ease: 'power4.in' }, 2.8);
    tl.to(introAnim, {
        stompEffect: 1, stompEffect2: 1, dustAlpha: 0.6, dustAlpha2: 0.6,
        screenShake: 10, duration: 0.15,
        onStart: () => { introAnim.stompEffect = 0; introAnim.stompEffect2 = 0; }
    }, 2.82);
    tl.to(introAnim, { dustAlpha: 0, dustAlpha2: 0, screenShake: 0, duration: 0.5 }, 3.0);

    // Final big stomp - together
    tl.to(introAnim.legs1, { jump: -50, duration: 0.25, ease: 'power2.out' }, 3.3);
    tl.to(introAnim.legs2, { jump: -50, duration: 0.25, ease: 'power2.out' }, 3.3);
    tl.to(introAnim.legs1, { jump: 0, duration: 0.1, ease: 'power4.in' }, 3.55);
    tl.to(introAnim.legs2, { jump: 0, duration: 0.1, ease: 'power4.in' }, 3.55);
    tl.to(introAnim, {
        stompEffect: 1, stompEffect2: 1, dustAlpha: 0.8, dustAlpha2: 0.8,
        screenShake: 14, duration: 0.15,
        onStart: () => { introAnim.stompEffect = 0; introAnim.stompEffect2 = 0; }
    }, 3.57);
    tl.to(introAnim, { dustAlpha: 0, dustAlpha2: 0, screenShake: 0, duration: 0.6 }, 3.75);

    // === Phase 3: Legs run away ===
    tl.to(introAnim.legs1, { x: -100, alpha: 0, legPhase: 6, duration: 0.6, ease: 'power2.in' }, 4.1);
    tl.to(introAnim.legs2, { x: w + 100, alpha: 0, legPhase: 6, duration: 0.6, ease: 'power2.in' }, 4.15);

    // === Phase 4: Shape drawing ===
    tl.call(() => { state.introPhase = 'drawing'; }, null, 4.8);
    tl.to(introAnim, { handX: cx, handY: cy, handAlpha: 1, handRot: -0.2, duration: 0.5, ease: 'power2.out' }, 4.8);
    tl.to(introAnim, {
        drawProgress: 1, duration: 1.8, ease: 'power1.inOut',
        onUpdate: () => { state.introDrawProgress = introAnim.drawProgress; }
    }, 5.4);
    const shapes = state.initialShape;
    if (shapes.length > 0) {
        tl.to(introAnim, { handX: shapes[0].from.x, handY: shapes[0].from.y, duration: 0.3 }, 5.1);
        for (let i = 0; i < shapes.length; i++)
            tl.to(introAnim, { handX: shapes[i].to.x, handY: shapes[i].to.y, duration: 0.5 }, 5.4 + i * 0.6);
    }
    tl.to(introAnim, { handX: w + 100, handAlpha: 0, duration: 0.4, ease: 'power2.in' }, 7.3);
    tl.call(() => { state.introPhase = 'done'; startThrow(); }, null, 7.8);
}

function drawIntroAnimation() {
    const a = introAnim;
    const w = state.canvasWidth, h = state.canvasHeight;
    const cx = w / 2, cy = h / 2;

    // Screen shake offset
    const shakeX = a.screenShake > 0 ? (Math.random() - 0.5) * a.screenShake : 0;
    const shakeY = a.screenShake > 0 ? (Math.random() - 0.5) * a.screenShake : 0;

    if (state.introPhase === 'feet') {
        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Draw stomp cracks on ground
        if (a.stompEffect > 0.5) {
            drawStompCracks(a.legs1.x, a.legs1.y + 5, a.stompEffect, '#4a3328');
        }
        if (a.stompEffect2 > 0.5) {
            drawStompCracks(a.legs2.x, a.legs2.y + 5, a.stompEffect2, '#4a3328');
        }

        // Draw legs
        if (a.legs1.alpha > 0.01) drawLegsPair(a.legs1, false, { pants: '#2c6fbb', shoe: '#333', sole: '#8B4513', sock: '#fff', skin: '#DEB887' });
        if (a.legs2.alpha > 0.01) drawLegsPair(a.legs2, true, { pants: '#8B6914', shoe: '#555', sole: '#5c3d2e', sock: '#eee', skin: '#C4A882' });

        // Dust clouds - legs 1
        if (a.dustAlpha > 0.01) {
            drawDustCloud(a.legs1.x, a.legs1.y + 5, a.dustAlpha, a.stompEffect);
        }
        // Dust clouds - legs 2
        if (a.dustAlpha2 > 0.01) {
            drawDustCloud(a.legs2.x, a.legs2.y + 5, a.dustAlpha2, a.stompEffect2);
        }

        // Text
        ctx.globalAlpha = 0.7;
        ctx.font = 'bold 16px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#d4a574';
        ctx.fillText('Zemin düzeltiliyor...', w / 2, h - 50);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    if (state.introPhase === 'drawing') {
        const progress = introAnim.drawProgress;
        const shapes = state.initialShape;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < shapes.length; i++) {
            const lineStart = i / shapes.length, lineEnd = (i + 1) / shapes.length;
            if (progress <= lineStart) continue;
            const line = shapes[i];
            const lp = Math.min(1, (progress - lineStart) / (lineEnd - lineStart));
            const ex = line.from.x + (line.to.x - line.from.x) * lp;
            const ey = line.from.y + (line.to.y - line.from.y) * lp;
            ctx.strokeStyle = 'rgba(25,15,5,0.55)'; ctx.lineWidth = 5;
            ctx.setLineDash([]); ctx.beginPath();
            ctx.moveTo(line.from.x, line.from.y); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = 'rgba(15,8,2,0.35)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(line.from.x + 1, line.from.y + 1); ctx.lineTo(ex + 1, ey + 1); ctx.stroke();
            ctx.strokeStyle = 'rgba(140,110,70,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(line.from.x - 2, line.from.y - 1); ctx.lineTo(ex - 2, ey - 1); ctx.stroke();
            const dx = ex - line.from.x, dy = ey - line.from.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 1) {
                const nx = -dy / len;
                for (let t = 0; t < 1; t += 0.06) {
                    const px = line.from.x + dx * t, py = line.from.y + dy * t;
                    const side = srand(px * 11 + py * 17) > 0.5 ? 1 : -1;
                    const dd = 4 + srand(px * 19 + py * 23) * 5;
                    ctx.beginPath();
                    ctx.arc(px + nx * dd * side, py + (dx / len) * dd * side, 0.8 + srand(px * 29 + py * 31) * 1.2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(90,65,40,${0.2 + srand(px * 37 + py * 41) * 0.15})`;
                    ctx.fill();
                }
            }
        }
        if (a.handAlpha > 0.01) drawNailScratchHand(a.handX, a.handY, a.handRot, a.handAlpha);
        ctx.globalAlpha = 0.7;
        ctx.font = 'bold 16px Outfit'; ctx.textAlign = 'center';
        ctx.fillStyle = '#d4a574';
        ctx.fillText('Çivi ile şekil çiziliyor...', w / 2, h - 50);
        ctx.globalAlpha = 1;
    }
}

function drawStompCracks(x, y, effect, color) {
    if (effect < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = effect * 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Radial cracks
    const crackCount = 8;
    for (let i = 0; i < crackCount; i++) {
        const angle = (Math.PI * 2 / crackCount) * i + (i * 0.3);
        const len = 15 + effect * 35 + (i % 3) * 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Jagged crack
        const mid1x = Math.cos(angle) * len * 0.3 + (Math.sin(i * 7) * 4);
        const mid1y = Math.sin(angle) * len * 0.3 + (Math.cos(i * 5) * 4);
        const mid2x = Math.cos(angle) * len * 0.65 + (Math.sin(i * 11) * 6);
        const mid2y = Math.sin(angle) * len * 0.65 + (Math.cos(i * 13) * 6);
        ctx.lineTo(mid1x, mid1y);
        ctx.lineTo(mid2x, mid2y);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawDustCloud(x, y, alpha, effect) {
    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i;
        const d = 12 + effect * 60;
        const size = 5 + effect * 8 + Math.sin(i * 3) * 3;
        const px = x + Math.cos(angle) * d;
        const py = y + Math.sin(angle) * d * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,90,55,${alpha * (1 - effect * 0.4) * (0.6 + Math.sin(i * 5) * 0.4)})`;
        ctx.fill();
    }
    // Inner dust ring
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + 0.3;
        const d = 8 + effect * 25;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * d, y + Math.sin(angle) * d * 0.3, 3 + effect * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(90,65,40,${alpha * 0.5})`;
        ctx.fill();
    }
}

function drawLegsPair(legs, facingLeft, colors) {
    ctx.save();
    ctx.translate(legs.x, legs.y + legs.jump);
    if (facingLeft) ctx.scale(-legs.scale, legs.scale);
    else ctx.scale(legs.scale, legs.scale);
    ctx.globalAlpha = legs.alpha;

    const { pants, shoe, sole, sock, skin } = colors;
    const legAnim = Math.sin(legs.legPhase * Math.PI) * 0.5;

    // The view is from knee-down area, coming from outside the top of screen
    // We see: upper thigh (cut off at top), knee, calf, ankle, shoe

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 8, 28, 6, 0, 0, Math.PI * 2); ctx.fill();

    // === BACK LEG ===
    ctx.save();
    ctx.translate(-10, 0);
    ctx.rotate(-legAnim);
    drawSingleLeg(ctx, pants, skin, sock, shoe, sole, -0.05);
    ctx.restore();

    // === FRONT LEG ===
    ctx.save();
    ctx.translate(10, 0);
    ctx.rotate(legAnim);
    drawSingleLeg(ctx, pants, skin, sock, shoe, sole, 0.05);
    ctx.restore();

    // === Pants waist area (connects the two legs at top) ===
    ctx.fillStyle = pants;
    ctx.beginPath();
    ctx.moveTo(-22, -90);
    ctx.lineTo(22, -90);
    ctx.lineTo(20, -70);
    ctx.lineTo(-20, -70);
    ctx.closePath();
    ctx.fill();

    // Belt
    ctx.fillStyle = '#2a2015';
    ctx.fillRect(-21, -92, 42, 5);
    // Belt buckle
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(-4, -93, 8, 7);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-2, -92, 4, 5);

    ctx.restore();
}

function drawSingleLeg(c, pantsColor, skinColor, sockColor, shoeColor, soleColor, tilt) {
    c.save();
    c.rotate(tilt);

    const skinDark = darkenColor(skinColor, 20);

    // === THIGH (pants visible portion - top is cut off as if body continues above) ===
    c.fillStyle = pantsColor;
    c.strokeStyle = darkenColor(pantsColor, 30);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-10, -90);
    c.bezierCurveTo(-11, -75, -11.5, -60, -11, -50);
    c.lineTo(11, -50);
    c.bezierCurveTo(11.5, -60, 11, -75, 10, -90);
    c.closePath();
    c.fill(); c.stroke();

    // Pants wrinkle details
    c.strokeStyle = darkenColor(pantsColor, 15);
    c.lineWidth = 0.5;
    c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(-6, -78); c.bezierCurveTo(-3, -75, 2, -73, 6, -76); c.stroke();
    c.beginPath(); c.moveTo(-5, -62); c.bezierCurveTo(-1, -59, 3, -58, 7, -61); c.stroke();
    c.globalAlpha = 1;

    // === KNEE area ===
    c.fillStyle = pantsColor;
    c.beginPath();
    c.moveTo(-11, -50);
    c.bezierCurveTo(-12, -45, -12, -40, -10.5, -38);
    c.lineTo(10.5, -38);
    c.bezierCurveTo(12, -40, 12, -45, 11, -50);
    c.closePath();
    c.fill();
    // Knee bump
    c.fillStyle = darkenColor(pantsColor, -10);
    c.beginPath(); c.ellipse(0, -44, 8, 5, 0, 0, Math.PI * 2); c.fill();

    // === CALF (skin visible) ===
    c.fillStyle = skinColor;
    c.strokeStyle = skinDark;
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(-10, -38);
    c.bezierCurveTo(-11, -30, -10.5, -20, -9, -12);
    c.bezierCurveTo(-8, -6, -7, -2, -6.5, 0);
    c.lineTo(6.5, 0);
    c.bezierCurveTo(7, -2, 8, -6, 9, -12);
    c.bezierCurveTo(10.5, -20, 11, -30, 10, -38);
    c.closePath();
    c.fill(); c.stroke();

    // Calf muscle definition
    c.fillStyle = darkenColor(skinColor, -10);
    c.globalAlpha = 0.15;
    c.beginPath(); c.ellipse(1.5, -25, 6, 10, 0.05, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    // Shin highlight
    c.strokeStyle = darkenColor(skinColor, -20);
    c.lineWidth = 1;
    c.globalAlpha = 0.12;
    c.beginPath(); c.moveTo(-3, -35); c.bezierCurveTo(-4, -25, -4, -15, -3, -5); c.stroke();
    c.globalAlpha = 1;

    // === ANKLE ===
    c.fillStyle = skinColor;
    c.beginPath(); c.ellipse(0, -1, 7, 4, 0, 0, Math.PI * 2); c.fill();
    // Ankle bone bumps
    c.fillStyle = darkenColor(skinColor, -8);
    c.beginPath(); c.ellipse(-6.5, -2, 2.5, 2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(6.5, -2, 2.5, 2, 0, 0, Math.PI * 2); c.fill();

    // === SOCK (short sport sock) ===
    c.fillStyle = sockColor;
    c.strokeStyle = darkenColor(sockColor, 30);
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(-7, -1);
    c.lineTo(-7.5, 4);
    c.lineTo(7.5, 4);
    c.lineTo(7, -1);
    c.closePath();
    c.fill(); c.stroke();
    // Sock stripe
    c.strokeStyle = darkenColor(sockColor, 40);
    c.lineWidth = 1;
    c.globalAlpha = 0.2;
    c.beginPath(); c.moveTo(-7, 1); c.lineTo(7, 1); c.stroke();
    c.globalAlpha = 1;

    // === SHOE ===
    c.fillStyle = shoeColor;
    c.strokeStyle = darkenColor(shoeColor, 30);
    c.lineWidth = 1;
    c.beginPath();
    // Shoe body
    c.moveTo(-9, 3);
    c.bezierCurveTo(-10, 5, -10, 9, -9, 12);
    c.lineTo(-9, 14);
    // Sole front
    c.bezierCurveTo(-6, 16, 8, 16, 16, 13);
    // Toe
    c.bezierCurveTo(18, 11, 18, 8, 16, 6);
    // Top of shoe
    c.bezierCurveTo(12, 3, 4, 2, -2, 2);
    c.bezierCurveTo(-6, 2, -8, 2.5, -9, 3);
    c.closePath();
    c.fill(); c.stroke();

    // Shoe sole
    c.fillStyle = soleColor;
    c.beginPath();
    c.moveTo(-9, 13);
    c.bezierCurveTo(-6, 16, 8, 16, 16, 13);
    c.lineTo(16, 15);
    c.bezierCurveTo(8, 18, -6, 18, -9, 15);
    c.closePath();
    c.fill();

    // Shoe tongue
    c.fillStyle = darkenColor(shoeColor, -15);
    c.beginPath();
    c.moveTo(-2, 2);
    c.lineTo(-1, -1);
    c.lineTo(5, -1);
    c.lineTo(4, 2);
    c.closePath();
    c.fill();

    // Laces
    c.strokeStyle = '#fff';
    c.lineWidth = 0.8;
    c.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) {
        const ly = 4 + i * 2.8;
        c.beginPath();
        c.moveTo(-2 + i * 0.5, ly);
        c.lineTo(6 - i * 0.5, ly);
        c.stroke();
    }
    c.globalAlpha = 1;

    // Shoe logo dot
    c.fillStyle = '#fff';
    c.globalAlpha = 0.4;
    c.beginPath(); c.arc(8, 8, 2, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    // Mud splatter on shoe
    c.fillStyle = 'rgba(90,60,30,0.3)';
    c.beginPath(); c.ellipse(12, 11, 3, 1.5, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-5, 10, 2, 1, -0.3, 0, Math.PI * 2); c.fill();

    c.restore();
}

function darkenColor(color, amount) {
    if (color[0] === '#') {
        const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) - amount));
        const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) - amount));
        const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) - amount));
        return `rgb(${r},${g},${b})`;
    }
    return color;
}

function drawNailScratchHand(x, y, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot + Math.PI / 4);
    ctx.globalAlpha = alpha;
    const skin = '#CFA07A', skinDark = '#A07858';

    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(0, -8, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = skinDark; ctx.lineWidth = 0.5; ctx.stroke();

    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.ellipse(-6 + i * 4, -2, 3.5, 4, 0.1 * (i - 1.5), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.3; ctx.stroke();
        ctx.fillStyle = 'rgba(160,120,88,0.4)';
        ctx.beginPath(); ctx.ellipse(-6 + i * 4, -5, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(-8, -10, 4, 6, 0.5, 0, Math.PI * 2); ctx.fill();

    const ng = ctx.createLinearGradient(-1.5, 5, 1.5, 5);
    ng.addColorStop(0, '#777'); ng.addColorStop(0.3, '#bbb'); ng.addColorStop(0.5, '#ddd');
    ng.addColorStop(0.7, '#aaa'); ng.addColorStop(1, '#666');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.moveTo(-1.5, 2); ctx.lineTo(1.5, 2); ctx.lineTo(1.2, 25); ctx.lineTo(-1.2, 25); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#999';
    ctx.beginPath(); ctx.moveTo(-1.2, 25); ctx.lineTo(0, 32); ctx.lineTo(1.2, 25); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.ellipse(0, 1, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 0.4; ctx.stroke();

    ctx.restore();
}

document.addEventListener('DOMContentLoaded', init);

