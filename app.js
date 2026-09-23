// ==========================================
// Hybrid Greedy-GA Scheduling Engine - App.js
// ==========================================

// Global variables for algorithm state
let animationFrameId = null;
let isRunning = false;
let chart = null;

// Render throttle: re-render heavy views every N generations
const RENDER_EVERY_N_GENS = 5;
// Soft warning threshold: popSize * maxGen * sessions.length
const HEAVY_SIM_WARNING = 5000000;

// Template Constants for GUI selection
const ROOM_TEMPLATES = ["Ruang A", "Ruang B", "Ruang C", "Ruang D", "Ruang E"];
const TIME_TEMPLATES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const CLASS_TEMPLATES = [
    { course: "Matematika Terapan", lecturer: "Dr. Amirhud" },
    { course: "Basis Data", lecturer: "Novialdi Ashari" },
    { course: "Jaringan Komputer", lecturer: "Sulis Nuralia" },
    { course: "Aljabar Linear", lecturer: "Dr. Hendi" },
    { course: "Kecerdasan Buatan", lecturer: "Prof. Budi" },
    { course: "Kriptografi", lecturer: "Bu Clarissa" },
    { course: "Pemrograman Web", lecturer: "Pak David" },
    { course: "Sistem Operasi", lecturer: "Bu Esti" },
    { course: "Analisis Numerik", lecturer: "Pak Fahri" },
    { course: "Riset Operasi", lecturer: "Bu Grace" }
];

// Preset Data (built from templates to avoid duplication)
function buildPreset(templateCount) {
    const kelas = CLASS_TEMPLATES.slice(0, templateCount);
    return {
        dosen: kelas.map(t => t.lecturer).join(", "),
        mk: kelas.map(t => t.course).join(", "),
        ruang: ROOM_TEMPLATES.join(", "),
        waktu: TIME_TEMPLATES.join(", ")
    };
}
const presets = {
    medium: buildPreset(5),
    large: buildPreset(10)
};

// Escape user-controlled text for safe HTML interpolation
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Clamp a numeric form value; "0" is valid (unlike || fallback)
function clampNumber(value, min, max, fallback) {
    if (value === "" || value === null || value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function readNumber(id, min, max, fallback) {
    const el = document.getElementById(id);
    return clampNumber(el ? el.value : null, min, max, fallback);
}

function parseListFromText(value) {
    return String(value)
        .split(/[,\n]/)
        .map(x => x.trim())
        .filter(x => x.length > 0);
}

// Uniform Fisher–Yates shuffle (returns new array)
function shuffleArray(input) {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function cloneGene(gene) {
    return { sessionId: gene.sessionId, room: gene.room, timeSlot: gene.timeSlot };
}

function cloneChromosome(chromosome) {
    return chromosome.map(cloneGene);
}

function cloneIndividual(ind) {
    return { chromosome: cloneChromosome(ind.chromosome), evaluation: ind.evaluation };
}

// Expose handlers on globalThis so browser inline handlers work and Node can load this file
const globalScope = typeof globalThis !== "undefined" ? globalThis : window;

// Initialize app when DOM is fully loaded
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        initChart();
        initAccordion();
        setupInputToggles();
        setupEventListeners();
        setupRawInputSync();

        // Start with empty state
        renderVisualInput();
        syncStateToRawInputsSilent();
        writeLog("Sistem siap. Mulailah memilih kelas, ruangan, dan waktu melalui GUI di bawah ini.", "system");

        initTabs();

        const footerYear = document.getElementById("footerYear");
        if (footerYear) footerYear.innerText = String(new Date().getFullYear());
    });
}

// Global state for Visual Editor
let dataset = {
    classes: [],
    rooms: [],
    timeslots: []
};

// Setup Collapsible Accordion for Advanced Parameters
function initAccordion() {
    const btn = document.getElementById("accordionBtn");
    const arrow = document.getElementById("accordionArrow");
    const content = document.getElementById("accordionContent");
    if (!btn || !arrow || !content) return;

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        const isShown = content.classList.toggle("show");
        arrow.classList.toggle("rotated", isShown);
        if (isShown) {
            arrow.innerText = "▲";
            btn.parentElement.style.borderColor = "var(--color-primary)";
        } else {
            arrow.innerText = "▼";
            btn.parentElement.style.borderColor = "";
        }
    });
}

// Setup Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll(".tab-link");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
        tab.addEventListener("click", () => {
            tabs.forEach(t => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add("active");
        });
    });
}

// Setup Editor Input Toggles
function setupInputToggles() {
    const btnVisual = document.getElementById("toggleModeVisual");
    const btnRaw = document.getElementById("toggleModeRaw");
    const containerVisual = document.getElementById("visualInputContainer");
    const containerRaw = document.getElementById("rawInputContainer");
    
    btnVisual.addEventListener("click", (e) => {
        e.preventDefault();
        btnVisual.classList.add("active");
        btnRaw.classList.remove("active");
        containerVisual.style.display = "block";
        containerRaw.style.display = "none";
        syncRawInputsToState(); // Synchronize raw inputs to visual state
    });
    
    btnRaw.addEventListener("click", (e) => {
        e.preventDefault();
        btnRaw.classList.add("active");
        btnVisual.classList.remove("active");
        containerVisual.style.display = "none";
        containerRaw.style.display = "block";
        syncStateToRawInputsSilent(); // Synchronize visual state to raw inputs
    });
}

// Setup Event Listeners on textareas for live sync back to visual
function setupRawInputSync() {
    const ids = ["inputDosen", "inputMK", "inputRuang", "inputWaktu"];
    ids.forEach(id => {
        document.getElementById(id).addEventListener("input", syncRawInputsToState);
    });
    
    document.getElementById("btnAddClass").addEventListener("click", addClass);
}

// Load preset data and populate BOTH modes
function loadPreset(type) {
    const data = presets[type];
    if (!data) return;

    document.getElementById("inputDosen").value = data.dosen;
    document.getElementById("inputMK").value = data.mk;
    document.getElementById("inputRuang").value = data.ruang;
    document.getElementById("inputWaktu").value = data.waktu;
    
    syncRawInputsToState(); // Convert to visual state
    
    writeLog(`Preset '${type.toUpperCase()}' berhasil dimuat secara visual dan teks!`, 'system');
}

// Render Visual Form Editor & Templates
function renderVisualInput() {
    // 1. Render Class Templates Grid
    renderClassTemplates();

    // 2. Render Room Templates Grid
    renderRoomTemplates();

    // 3. Render Time Templates Grid
    renderTimeTemplates();

    // 4. Render Active Classes list
    const classList = document.getElementById("visualClassList");
    classList.innerHTML = "";
    
    if (dataset.classes.length === 0) {
        classList.innerHTML = `
            <div class="empty-state-visual">
                Belum ada kelas terpilih. Pilih kelas cepat di atas atau tambah kelas kustom.
            </div>
        `;
    } else {
        dataset.classes.forEach((cls, idx) => {
            const row = document.createElement("div");
            row.className = "class-editor-row";
            row.innerHTML = `
                <input type="text" placeholder="Mata Kuliah (e.g. Basis Data)" value="${escapeHtml(cls.course)}" oninput="updateClass(${idx}, 'course', this.value)">
                <input type="text" placeholder="Dosen Pengajar (e.g. Novialdi)" value="${escapeHtml(cls.lecturer)}" oninput="updateClass(${idx}, 'lecturer', this.value)">
                <button class="btn-delete-row" onclick="deleteClass(${idx})" title="Hapus Kelas" aria-label="Hapus kelas" type="button">
                    🗑️
                </button>
            `;
            classList.appendChild(row);
        });
    }
    
    document.getElementById("classCounter").innerText = `${dataset.classes.length} Kelas`;

    // 5. Render Custom Rooms pill tags
    const roomContainer = document.getElementById("visualRoomContainer");
    roomContainer.innerHTML = "";
    
    const customRooms = dataset.rooms.filter(r => !ROOM_TEMPLATES.includes(r));
    if (customRooms.length > 0) {
        customRooms.forEach((room) => {
            const idxInDataset = dataset.rooms.indexOf(room);
            const pill = document.createElement("span");
            pill.className = "pill-tag";
            pill.innerHTML = `
                ${escapeHtml(room)}
                <button class="pill-tag-remove" onclick="deletePill('rooms', ${idxInDataset})" type="button" aria-label="Hapus ruang ${escapeHtml(room)}">×</button>
            `;
            roomContainer.appendChild(pill);
        });
    }
    
    // Add custom room input pill
    roomContainer.innerHTML += `
        <div class="pill-tag-input-wrapper" id="addRoomInputWrapper">
            <input type="text" class="pill-tag-input" id="addRoomInput" onkeydown="handlePillInput(event, 'rooms')" onfocusout="handlePillFocusOut(event, 'rooms')">
        </div>
        <button class="pill-tag-add" id="btnAddRoom" onclick="showPillInput('rooms')" type="button" aria-label="Tambah ruang kustom">➕ Kustom Ruang</button>
    `;

    // 6. Render Custom Waktu pill tags
    const waktuContainer = document.getElementById("visualWaktuContainer");
    waktuContainer.innerHTML = "";
    
    const customTimeslots = dataset.timeslots.filter(t => !TIME_TEMPLATES.includes(t));
    if (customTimeslots.length > 0) {
        customTimeslots.forEach((time) => {
            const idxInDataset = dataset.timeslots.indexOf(time);
            const pill = document.createElement("span");
            pill.className = "pill-tag";
            pill.innerHTML = `
                ${escapeHtml(time)}
                <button class="pill-tag-remove" onclick="deletePill('timeslots', ${idxInDataset})" type="button" aria-label="Hapus slot waktu ${escapeHtml(time)}">×</button>
            `;
            waktuContainer.appendChild(pill);
        });
    }
    
    // Add custom waktu input pill
    waktuContainer.innerHTML += `
        <div class="pill-tag-input-wrapper" id="addWaktuInputWrapper">
            <input type="text" class="pill-tag-input" id="addWaktuInput" onkeydown="handlePillInput(event, 'timeslots')" onfocusout="handlePillFocusOut(event, 'timeslots')">
        </div>
        <button class="pill-tag-add" id="btnAddWaktu" onclick="showPillInput('timeslots')" type="button" aria-label="Tambah slot waktu kustom">➕ Kustom Waktu</button>
    `;
}

// Helpers for Templates
function renderClassTemplates() {
    const picker = document.getElementById("templateClassPicker");
    if (!picker) return;
    picker.innerHTML = "";
    
    CLASS_TEMPLATES.forEach(tpl => {
        const isAdded = dataset.classes.some(c => c.course === tpl.course && c.lecturer === tpl.lecturer);
        
        const item = document.createElement("div");
        item.className = "template-class-item";
        item.innerHTML = `
            <div class="template-class-info">
                <span class="template-class-title">${escapeHtml(tpl.course)}</span>
                <span class="template-class-lecturer">👨‍🏫 ${escapeHtml(tpl.lecturer)}</span>
            </div>
            <button class="btn-add-template-class ${isAdded ? 'active' : ''}" onclick="toggleTemplateClass('${escapeHtml(tpl.course)}', '${escapeHtml(tpl.lecturer)}')" type="button">
                ${isAdded ? '✓ Terpilih' : '➕ Tambah'}
            </button>
        `;
        picker.appendChild(item);
    });
}

globalScope.toggleTemplateClass = function(course, lecturer) {
    const index = dataset.classes.findIndex(c => c.course === course && c.lecturer === lecturer);
    if (index !== -1) {
        dataset.classes.splice(index, 1);
    } else {
        dataset.classes.push({ course, lecturer });
    }
    renderVisualInput();
    syncStateToRawInputsSilent();
};

function renderRoomTemplates() {
    const grid = document.getElementById("roomTemplateGrid");
    if (!grid) return;
    grid.innerHTML = "";
    
    ROOM_TEMPLATES.forEach(room => {
        const isActive = dataset.rooms.includes(room);
        const btn = document.createElement("button");
        btn.className = `template-pill-btn ${isActive ? 'active' : ''}`;
        btn.innerText = room;
        btn.type = "button";
        btn.onclick = () => toggleRoomTemplate(room);
        grid.appendChild(btn);
    });
}

function toggleRoomTemplate(room) {
    const idx = dataset.rooms.indexOf(room);
    if (idx !== -1) {
        dataset.rooms.splice(idx, 1);
    } else {
        dataset.rooms.push(room);
    }
    renderVisualInput();
    syncStateToRawInputsSilent();
}

function renderTimeTemplates() {
    const grid = document.getElementById("waktuTemplateGrid");
    if (!grid) return;
    grid.innerHTML = "";
    
    TIME_TEMPLATES.forEach(time => {
        const isActive = dataset.timeslots.includes(time);
        const btn = document.createElement("button");
        btn.className = `template-pill-btn ${isActive ? 'active' : ''}`;
        btn.innerText = time;
        btn.type = "button";
        btn.onclick = () => toggleTimeTemplate(time);
        grid.appendChild(btn);
    });
}

function toggleTimeTemplate(time) {
    const idx = dataset.timeslots.indexOf(time);
    if (idx !== -1) {
        dataset.timeslots.splice(idx, 1);
    } else {
        dataset.timeslots.push(time);
    }
    renderVisualInput();
    syncStateToRawInputsSilent();
}

// Visual Editor Handlers (Exposed globally for inline onclick/oninput)
globalScope.updateClass = function(idx, field, val) {
    dataset.classes[idx][field] = val;
    syncStateToRawInputsSilent();
};

globalScope.deleteClass = function(idx) {
    dataset.classes.splice(idx, 1);
    renderVisualInput();
    syncStateToRawInputsSilent();
};

globalScope.addClass = function() {
    dataset.classes.push({ course: "", lecturer: "" });
    renderVisualInput();
    syncStateToRawInputsSilent();
};

globalScope.deletePill = function(type, idx) {
    dataset[type].splice(idx, 1);
    renderVisualInput();
    syncStateToRawInputsSilent();
};

globalScope.showPillInput = function(type) {
    const wrapperId = type === 'rooms' ? 'addRoomInputWrapper' : 'addWaktuInputWrapper';
    const btnId = type === 'rooms' ? 'btnAddRoom' : 'btnAddWaktu';
    const inputId = type === 'rooms' ? 'addRoomInput' : 'addWaktuInput';
    
    document.getElementById(btnId).style.display = 'none';
    const wrapper = document.getElementById(wrapperId);
    wrapper.style.display = 'inline-flex';
    const input = document.getElementById(inputId);
    input.value = "";
    input.focus();
};

globalScope.hidePillInput = function(type) {
    const wrapperId = type === 'rooms' ? 'addRoomInputWrapper' : 'addWaktuInputWrapper';
    const btnId = type === 'rooms' ? 'btnAddRoom' : 'btnAddWaktu';

    const wrapper = document.getElementById(wrapperId);
    if (wrapper) wrapper.style.display = 'none';
    const btn = document.getElementById(btnId);
    if (btn) btn.style.display = 'inline-block';
};

globalScope.handlePillFocusOut = function(event, type) {
    const related = event.relatedTarget;
    if (related) {
        const wrapperId = type === 'rooms' ? 'addRoomInputWrapper' : 'addWaktuInputWrapper';
        const wrapper = document.getElementById(wrapperId);
        if (wrapper && wrapper.contains(related)) return;
    }
    globalScope.hidePillInput(type);
};

globalScope.handlePillInput = function(event, type) {
    if (event.key === 'Enter') {
        const inputVal = event.target.value.trim();
        if (inputVal.length > 0) {
            const exists = dataset[type].some(v => v.toLowerCase() === inputVal.toLowerCase());
            if (exists) {
                writeLog(`Nilai duplikat ditolak: "${inputVal}" sudah ada.`, "warning");
            } else {
                dataset[type].push(inputVal);
                renderVisualInput();
                syncStateToRawInputsSilent();
            }
        }
        globalScope.hidePillInput(type);
    }
};

// Sync State Objects to Raw Textareas silently
function syncStateToRawInputsSilent() {
    const dosenList = dataset.classes.map(c => c.lecturer || "").filter(x => x !== "");
    const mkList = dataset.classes.map(c => c.course || "").filter(x => x !== "");
    const uniqueDosen = [...new Set(dosenList)];
    
    document.getElementById("inputDosen").value = uniqueDosen.join(", ");
    document.getElementById("inputMK").value = mkList.join(", ");
    document.getElementById("inputRuang").value = dataset.rooms.join(", ");
    document.getElementById("inputWaktu").value = dataset.timeslots.join(", ");
}

// Sync Raw Textareas back to State Object
function syncRawInputsToState() {
    const dosenList = parseListFromText(document.getElementById("inputDosen").value);
    const mkList = parseListFromText(document.getElementById("inputMK").value);
    const ruangList = parseListFromText(document.getElementById("inputRuang").value);
    const waktuList = parseListFromText(document.getElementById("inputWaktu").value);

    // Populate dataset classes
    dataset.classes = mkList.map((course, idx) => {
        return {
            course: course,
            lecturer: dosenList[idx % dosenList.length] || "Dosen Pengganti"
        };
    });
    dataset.rooms = ruangList;
    dataset.timeslots = waktuList;

    renderVisualInput();
}

// Initialize Chart.js
function initChart() {
    const canvas = document.getElementById("mainChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Destroy existing chart if any
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Fitness Hybrid (Greedy-GA)',
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    data: [],
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.25,
                    pointRadius: 1,
                    pointHoverRadius: 5
                },
                {
                    label: 'Fitness Pure GA (Random Init)',
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.04)',
                    data: [],
                    borderWidth: 1.8,
                    fill: true,
                    borderDash: [5, 5],
                    tension: 0.25,
                    pointRadius: 1,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#475569',
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } },
                    title: { display: true, text: 'Generasi', color: '#64748b', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } },
                    min: 0,
                    max: 1.05,
                    title: { display: true, text: 'Nilai Fitness', color: '#64748b', font: { family: 'Outfit' } }
                }
            }
        }
    });
}

// Log writer helper
const MAX_LOG_LINES = 500;
function writeLog(msg, type = 'normal') {
    const logWindow = document.getElementById("logWindow");
    if (!logWindow) return;

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const line = document.createElement("div");
    line.className = `console-line ${type}`;
    line.innerHTML = `[${time}] > ${escapeHtml(msg)}`;

    logWindow.appendChild(line);
    while (logWindow.children.length > MAX_LOG_LINES) {
        logWindow.removeChild(logWindow.firstChild);
    }
    logWindow.scrollTop = logWindow.scrollHeight;
}

// Clear log helper
function clearLog() {
    const logWindow = document.getElementById("logWindow");
    if (logWindow) logWindow.innerHTML = "";
}

// Event Listeners setup
function setupEventListeners() {
    document.getElementById("btnPresetMedium").addEventListener("click", () => loadPreset('medium'));
    document.getElementById("btnPresetLarge").addEventListener("click", () => loadPreset('large'));
    
    document.getElementById("runBtn").addEventListener("click", () => startSimulate(false));
    document.getElementById("runCompareBtn").addEventListener("click", () => startSimulate(true));
    
    document.getElementById("stopBtn").addEventListener("click", stopSimulation);
}

// Update simulation control states
function toggleControlState(running) {
    isRunning = running;
    const runBtn = document.getElementById("runBtn");
    const compareBtn = document.getElementById("runCompareBtn");
    const stopBtn = document.getElementById("stopBtn");
    if (runBtn) runBtn.disabled = running;
    if (compareBtn) compareBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;

    const statusBadge = document.getElementById("badgeStatus");
    if (!statusBadge) return;
    if (running) {
        statusBadge.className = "badge-custom bg-gradient-blue text-warning border-warning";
        statusBadge.innerText = "Running";
        statusBadge.style.color = "#f59e0b";
        statusBadge.style.borderColor = "rgba(245, 158, 11, 0.3)";
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active', 'completed'));
    } else {
        statusBadge.className = "badge-custom bg-gradient-blue";
        statusBadge.innerText = "Idle";
        statusBadge.style.color = "";
        statusBadge.style.borderColor = "";
    }
}

// Setup Stepper highlight
function setStep(stepNum, status = 'active') {
    const el = document.getElementById("step" + stepNum);
    if (!el) return;
    
    if (status === 'active') {
        el.className = "step-item active";
    } else if (status === 'completed') {
        el.className = "step-item completed";
    }
}

// Stop current running simulation
function stopSimulation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    toggleControlState(false);
    writeLog("Simulasi dihentikan secara manual oleh pengguna.", "system");
}

// ========================================================
// CORE ALGORITHM IMPLEMENTATION
// ========================================================

// Parse CSV inputs (visual mode reads dataset.classes directly to preserve pairing)
function parseInputs() {
    const containerVisual = document.getElementById("visualInputContainer");
    const visualActive = containerVisual && containerVisual.style.display !== "none";

    if (visualActive) {
        const sessions = [];
        dataset.classes.forEach(c => {
            const course = (c.course || "").trim();
            const lecturer = (c.lecturer || "").trim();
            if (course.length > 0) {
                sessions.push({ id: sessions.length, course, lecturer });
            }
        });
        const rooms = dataset.rooms.filter(r => (r || "").trim().length > 0);
        const timeSlots = dataset.timeslots.filter(t => (t || "").trim().length > 0);

        if (sessions.length === 0) throw new Error("Daftar Mata Kuliah tidak boleh kosong.");
        if (sessions.some(s => s.lecturer.length === 0)) throw new Error("Setiap kelas harus memiliki dosen pengajar.");
        if (rooms.length === 0) throw new Error("Daftar Ruangan tidak boleh kosong.");
        if (timeSlots.length === 0) throw new Error("Daftar Slot Waktu tidak boleh kosong.");

        return { sessions, rooms, timeSlots };
    }

    const dosenList = parseListFromText(document.getElementById("inputDosen").value);
    const mkList = parseListFromText(document.getElementById("inputMK").value);
    const ruangList = parseListFromText(document.getElementById("inputRuang").value);
    const waktuList = parseListFromText(document.getElementById("inputWaktu").value);

    if (mkList.length === 0) throw new Error("Daftar Mata Kuliah tidak boleh kosong.");
    if (dosenList.length === 0) throw new Error("Daftar Dosen tidak boleh kosong.");
    if (ruangList.length === 0) throw new Error("Daftar Ruangan tidak boleh kosong.");
    if (waktuList.length === 0) throw new Error("Daftar Slot Waktu tidak boleh kosong.");

    // Map Course to Lecturer. Match one-to-one, wrap around if dimensions mismatch.
    const sessions = mkList.map((course, idx) => {
        return {
            id: idx,
            course: course,
            lecturer: dosenList[idx % dosenList.length]
        };
    });

    return { sessions, rooms: ruangList, timeSlots: waktuList };
}

// Calculate fitness of a chromosome
function evaluateChromosome(chromosome, sessions) {
    let roomConflicts = 0;
    let lecturerConflicts = 0;
    const conflictDetails = [];

    // Initialize conflict flags for each gene (session)
    const geneFlags = chromosome.map((gene) => ({
        sessionId: gene.sessionId,
        roomConflict: false,
        lecturerConflict: false,
        roomConflictingClasses: [],
        lecturerConflictingClasses: []
    }));
    const flagMap = new Map(geneFlags.map(f => [f.sessionId, f]));

    // Group by Room + TimeSlot
    const roomGroups = {};
    // Group by Lecturer + TimeSlot
    const lecturerGroups = {};

    chromosome.forEach((gene) => {
        const session = sessions[gene.sessionId];
        const roomKey = `${gene.room}#${gene.timeSlot}`;
        const lectKey = `${session.lecturer}#${gene.timeSlot}`;

        if (!roomGroups[roomKey]) roomGroups[roomKey] = [];
        roomGroups[roomKey].push(gene);

        if (!lecturerGroups[lectKey]) lecturerGroups[lectKey] = [];
        lecturerGroups[lectKey].push(gene);
    });

    // Evaluate room conflicts
    for (const key in roomGroups) {
        const genes = roomGroups[key];
        if (genes.length > 1) {
            const hashIdx = key.indexOf('#');
            const room = key.slice(0, hashIdx);
            const timeSlot = key.slice(hashIdx + 1);
            const courseNames = genes.map(g => sessions[g.sessionId].course);

            // Mark flags for all genes in this group
            genes.forEach(g => {
                const flag = flagMap.get(g.sessionId);
                if (flag) {
                    flag.roomConflict = true;
                    // Other classes that this gene is conflicting with
                    flag.roomConflictingClasses = courseNames.filter(name => name !== sessions[g.sessionId].course);
                }
            });

            // Pairwise count for fitness calculation: N * (N - 1) / 2
            const pairs = (genes.length * (genes.length - 1)) / 2;
            roomConflicts += pairs;

            conflictDetails.push({
                type: 'room',
                desc: `<strong>Bentrokan Ruangan:</strong> ${genes.length} kelas (<em>${escapeHtml(courseNames.join(', '))}</em>) dijadwalkan di ruangan yang sama (<strong>${escapeHtml(room)}</strong>) pada slot <strong>${escapeHtml(timeSlot)}</strong>.`
            });
        }
    }

    // Evaluate lecturer conflicts
    for (const key in lecturerGroups) {
        const genes = lecturerGroups[key];
        if (genes.length > 1) {
            const hashIdx = key.indexOf('#');
            const lecturer = key.slice(0, hashIdx);
            const timeSlot = key.slice(hashIdx + 1);
            const courseNames = genes.map(g => sessions[g.sessionId].course);

            // Mark flags for all genes in this group
            genes.forEach(g => {
                const flag = flagMap.get(g.sessionId);
                if (flag) {
                    flag.lecturerConflict = true;
                    flag.lecturerConflictingClasses = courseNames.filter(name => name !== sessions[g.sessionId].course);
                }
            });

            // Pairwise count for fitness calculation: N * (N - 1) / 2
            const pairs = (genes.length * (genes.length - 1)) / 2;
            lecturerConflicts += pairs;

            conflictDetails.push({
                type: 'lecturer',
                desc: `<strong>Bentrokan Dosen:</strong> <strong>${escapeHtml(lecturer)}</strong> dijadwalkan mengajar ${genes.length} kelas sekaligus (<em>${escapeHtml(courseNames.join(', '))}</em>) pada slot <strong>${escapeHtml(timeSlot)}</strong>.`
            });
        }
    }

    const totalConflicts = roomConflicts + lecturerConflicts;
    // Fitness mathematical formula: 1 / (1 + total conflicts)
    const fitness = 1 / (1 + totalConflicts);

    return {
        fitness: parseFloat(fitness.toFixed(5)),
        totalConflicts,
        roomConflicts,
        lecturerConflicts,
        conflictDetails,
        geneFlags
    };
}

// Create completely random chromosome
function createRandomChromosome(sessions, rooms, timeSlots) {
    return sessions.map(session => ({
        sessionId: session.id,
        room: rooms[Math.floor(Math.random() * rooms.length)],
        timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)]
    }));
}

// Create greedy-guided chromosome (Hybrid aspect)
function createGreedyChromosome(sessions, rooms, timeSlots) {
    const chromosome = [];
    
    // Shuffle sessions to introduce stochastic diversity (prevents identical greedy clones)
    const shuffledSessions = shuffleArray(sessions);

    for (const session of shuffledSessions) {
        let bestRoom = rooms[0];
        let bestTimeSlot = timeSlots[0];
        let minConflicts = Infinity;

        // Shuffle rooms and timeslots selection order
        const shuffledRooms = shuffleArray(rooms);
        const shuffledTimeSlots = shuffleArray(timeSlots);

        for (const r of shuffledRooms) {
            for (const t of shuffledTimeSlots) {
                let conflicts = 0;

                // Check conflict with already assigned classes in this chromosome
                for (const assigned of chromosome) {
                    const assignedSession = sessions[assigned.sessionId];

                    // Room overlap check
                    if (assigned.room === r && assigned.timeSlot === t) {
                        conflicts++;
                    }
                    // Lecturer overlap check
                    if (assignedSession.lecturer === session.lecturer && assigned.timeSlot === t) {
                        conflicts++;
                    }
                }

                if (conflicts < minConflicts) {
                    minConflicts = conflicts;
                    bestRoom = r;
                    bestTimeSlot = t;
                }

                // If perfectly safe conflict-free slot found, assign immediately (pure greedy heuristic)
                if (minConflicts === 0) break;
            }
            if (minConflicts === 0) break;
        }

        chromosome.push({
            sessionId: session.id,
            room: bestRoom,
            timeSlot: bestTimeSlot
        });
    }

    // Sort genes by sessionId to match standard alignment
    chromosome.sort((a, b) => a.sessionId - b.sessionId);
    return chromosome;
}

// Initialize Genetic Population
function initializePopulation(popSize, sessions, rooms, timeSlots, greedyRatio) {
    const population = [];
    const greedyCount = Math.floor(popSize * greedyRatio);
    const randomCount = popSize - greedyCount;

    // 1. Generate Greedy Chromosomes
    for (let i = 0; i < greedyCount; i++) {
        const chrom = createGreedyChromosome(sessions, rooms, timeSlots);
        population.push({
            chromosome: chrom,
            evaluation: evaluateChromosome(chrom, sessions)
        });
    }

    // 2. Generate Random Chromosomes
    for (let i = 0; i < randomCount; i++) {
        const chrom = createRandomChromosome(sessions, rooms, timeSlots);
        population.push({
            chromosome: chrom,
            evaluation: evaluateChromosome(chrom, sessions)
        });
    }

    // Sort descending by fitness
    population.sort((a, b) => b.evaluation.fitness - a.evaluation.fitness);
    return population;
}

// Selection operator: Tournament Selection
function tournamentSelection(population, tournamentSize = 3) {
    let best = null;
    for (let i = 0; i < tournamentSize; i++) {
        const ind = population[Math.floor(Math.random() * population.length)];
        if (best === null || ind.evaluation.fitness > best.evaluation.fitness) {
            best = ind;
        }
    }
    // Return deeply cloned chromosome
    return cloneIndividual(best);
}

// Crossover operator: Uniform / Single-Point Crossover
function crossover(parentA, parentB, crossoverRate = 0.8) {
    if (Math.random() > crossoverRate) {
        return [
            cloneChromosome(parentA.chromosome),
            cloneChromosome(parentB.chromosome)
        ];
    }

    const size = parentA.chromosome.length;
    // Uniform crossover works extremely well for scheduling genes
    const childA = [];
    const childB = [];

    for (let i = 0; i < size; i++) {
        if (Math.random() < 0.5) {
            childA.push({ ...parentA.chromosome[i] });
            childB.push({ ...parentB.chromosome[i] });
        } else {
            childA.push({ ...parentB.chromosome[i] });
            childB.push({ ...parentA.chromosome[i] });
        }
    }

    return [childA, childB];
}

// Mutation operator: swaps timeslot or room
function mutate(chromosome, rooms, timeSlots, mutationRate = 0.1) {
    const mutated = cloneChromosome(chromosome);
    
    for (let i = 0; i < mutated.length; i++) {
        if (Math.random() < mutationRate) {
            if (Math.random() < 0.5) {
                // Mutate room
                mutated[i].room = rooms[Math.floor(Math.random() * rooms.length)];
            } else {
                // Mutate timeslot
                mutated[i].timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
            }
        }
    }
    return mutated;
}

// Evolve single population by 1 generation step
function evolveGeneration(population, popSize, sessions, rooms, timeSlots, crossoverRate, mutationRate) {
    const nextGeneration = [];

    // 1. Elitism: Keep 2 best individuals unchanged
    nextGeneration.push(cloneIndividual(population[0]));
    if (population.length > 1) {
        nextGeneration.push(cloneIndividual(population[1]));
    }

    // 2. Replenish rest of population with offspring
    while (nextGeneration.length < popSize) {
        const parentA = tournamentSelection(population);
        const parentB = tournamentSelection(population);

        const [childAChrom, childBChrom] = crossover(parentA, parentB, crossoverRate);

        const mutatedA = mutate(childAChrom, rooms, timeSlots, mutationRate);
        const mutatedB = mutate(childBChrom, rooms, timeSlots, mutationRate);

        nextGeneration.push({
            chromosome: mutatedA,
            evaluation: evaluateChromosome(mutatedA, sessions)
        });

        if (nextGeneration.length < popSize) {
            nextGeneration.push({
                chromosome: mutatedB,
                evaluation: evaluateChromosome(mutatedB, sessions)
            });
        }
    }

    // Sort descending by fitness
    nextGeneration.sort((a, b) => b.evaluation.fitness - a.evaluation.fitness);
    return nextGeneration;
}

// ========================================================
// GRAPHICS & INTERACTIVE UI RENDERERS
// ========================================================

// Generate unique harmonic colors for course badges
const courseColors = {};
function getCourseColor(courseName) {
    if (courseColors[courseName]) return courseColors[courseName];
    
    // Generate HSL color based on string hash for consistency
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    // Use pastel/harmonic saturation and light suitable for dark UI
    const color = `hsl(${hue}, 70%, 40%)`;
    courseColors[courseName] = color;
    return color;
}

// Render the detailed Schedule Grid (Matrix Room vs TimeSlot)
function renderScheduleMatrix(chromosome, sessions, rooms, timeSlots, geneFlags) {
    const matrixContainer = document.getElementById("matrixContainer");
    if (!matrixContainer) return;

    if (!chromosome) {
        matrixContainer.innerHTML = `<div class="text-center text-muted py-4">Jadwal tidak tersedia.</div>`;
        return;
    }

    // Create unique matrix mapping time -> room -> list of classes
    const gridData = {};
    timeSlots.forEach(t => {
        gridData[t] = {};
        rooms.forEach(r => {
            gridData[t][r] = [];
        });
    });

    chromosome.forEach(gene => {
        const session = sessions[gene.sessionId];
        
        // Find corresponding geneFlag if any
        const flags = geneFlags ? geneFlags.find(f => f.sessionId === gene.sessionId) : null;

        if (gridData[gene.timeSlot] && gridData[gene.timeSlot][gene.room]) {
            gridData[gene.timeSlot][gene.room].push({
                course: session.course,
                lecturer: session.lecturer,
                room: gene.room,
                timeSlot: gene.timeSlot,
                roomConflict: flags ? flags.roomConflict : false,
                lecturerConflict: flags ? flags.lecturerConflict : false,
                roomConflictingClasses: flags ? flags.roomConflictingClasses : [],
                lecturerConflictingClasses: flags ? flags.lecturerConflictingClasses : []
            });
        }
    });

    // Build the dynamic Table HTML
    let html = `
        <table class="schedule-matrix">
            <thead>
                <tr>
                    <th>Slot Waktu</th>
    `;
    
    rooms.forEach(r => {
        html += `<th>${escapeHtml(r)}</th>`;
    });
    
    html += `
                </tr>
            </thead>
            <tbody>
    `;

    timeSlots.forEach(t => {
        html += `
            <tr>
                <td class="time-header">${escapeHtml(t)}</td>
        `;

        rooms.forEach(r => {
            const classes = gridData[t][r];
            html += `<td class="schedule-cell">`;

            if (classes && classes.length > 0) {
                classes.forEach(c => {
                    const hasRoomConf = c.roomConflict;
                    const hasLecturerConf = c.lecturerConflict;
                    
                    let conflictClass = "";
                    if (hasRoomConf && hasLecturerConf) conflictClass = "conflict-both";
                    else if (hasRoomConf) conflictClass = "conflict-room";
                    else if (hasLecturerConf) conflictClass = "conflict-lecturer";

                    let borderStyle = "";
                    let bgStyle = "";

                    // If no conflict at all, color the card nicely with the HSL custom course palette
                    if (!conflictClass) {
                        const themeColor = getCourseColor(c.course);
                        borderStyle = `border-left: solid 4px ${themeColor};`;
                        bgStyle = 'background: rgba(255, 255, 255, 0.95);';
                    }

                    // Build warning detail HTML tags
                    let warningBadges = "";
                    if (hasRoomConf) {
                        warningBadges += `<div class="badge-conflict-detail room">🚫 Ruang Bentrok (${escapeHtml(c.roomConflictingClasses.join(', '))})</div>`;
                    }
                    if (hasLecturerConf) {
                        warningBadges += `<div class="badge-conflict-detail lecturer">👤 Dosen Bentrok (${escapeHtml(c.lecturer)})</div>`;
                    }

                    html += `
                        <div class="class-badge ${conflictClass}" style="${borderStyle} ${bgStyle}">
                            <div class="class-title">${escapeHtml(c.course)}</div>
                            <div class="class-details">
                                <span>👨‍🏫 ${escapeHtml(c.lecturer)}</span>
                            </div>
                            ${warningBadges}
                        </div>
                    `;
                });
            } else {
                html += `<span class="text-muted" style="font-size:0.75rem;">- Kosong -</span>`;
            }

            html += `</td>`;
        });

        html += `</tr>`;
    });

    html += `
            </tbody>
        </table>
    `;

    matrixContainer.innerHTML = html;
}

// Render Conflict Details in Tab 3
function renderConflicts(evaluation) {
    const listContainer = document.getElementById("conflictList");
    if (!listContainer) return;

    if (evaluation.totalConflicts === 0) {
        listContainer.innerHTML = `
            <div class="no-conflicts">
                <div class="no-conflicts-icon">🎉</div>
                <h4 class="fw-bold">Semua Konflik Terselesaikan!</h4>
                <p class="small text-muted mt-2">Jadwal yang dihasilkan 100% valid dan siap digunakan.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="conflict-list">`;
    evaluation.conflictDetails.forEach((conf, idx) => {
        html += `
            <div class="conflict-item">
                <div class="conflict-icon">${idx + 1}</div>
                <div class="conflict-desc">
                    ${conf.desc}
                    <div class="conflict-meta">Tipe: ${conf.type === 'room' ? 'Bentrokan Ruang' : 'Dosen Mengajar Ganda'}</div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    listContainer.innerHTML = html;
}

// Render static basic list as secondary visualizer
function renderResultTable(chromosome, sessions, geneFlags) {
    const tableBody = document.getElementById("resultBody");
    if (!tableBody) return;

    if (!chromosome) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-muted py-3">Menunggu simulasi...</td></tr>`;
        return;
    }

    let html = "";
    chromosome.forEach(gene => {
        const session = sessions[gene.sessionId];
        const flags = geneFlags ? geneFlags.find(f => f.sessionId === gene.sessionId) : null;

        let hasRoom = flags ? flags.roomConflict : false;
        let hasLecturer = flags ? flags.lecturerConflict : false;

        let statusLabel = "";
        let rowStyle = "";

        if (hasRoom && hasLecturer) {
            statusLabel = `<span class="badge bg-danger-subtle text-danger border px-2 py-1">⚠️ Bentrok Ruang & Dosen</span>`;
            rowStyle = "background: rgba(239, 68, 68, 0.03);";
        } else if (hasRoom) {
            statusLabel = `<span class="badge bg-danger-subtle text-danger border px-2 py-1">⚠️ Bentrok Ruangan</span>`;
            rowStyle = "background: rgba(239, 68, 68, 0.03);";
        } else if (hasLecturer) {
            statusLabel = `<span class="badge bg-warning-subtle text-warning border px-2 py-1">⚠️ Bentrok Dosen</span>`;
            rowStyle = "background: rgba(245, 158, 11, 0.03);";
        } else {
            statusLabel = `<span class="badge bg-success-subtle text-success border px-2 py-1">✅ Aman & Valid</span>`;
            rowStyle = "";
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.12); ${rowStyle}">
                <td class="fw-bold text-start text-primary py-3">${escapeHtml(session.course)}</td>
                <td class="text-start text-dark">${escapeHtml(session.lecturer)}</td>
                <td><span class="badge bg-light text-dark border px-3 py-2">${escapeHtml(gene.room)}</span></td>
                <td><span class="badge bg-secondary-subtle text-primary border px-3 py-2 font-monospace fw-bold">${escapeHtml(gene.timeSlot)}</span></td>
                <td>${statusLabel}</td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// Render dynamic schedule adjustment comparison resolved by the system (Before vs After)
function renderAdjustmentTable(initialBest, finalBest, sessions) {
    const adjBody = document.getElementById("adjustmentBody");
    if (!adjBody) return;

    if (!initialBest || !finalBest) {
        adjBody.innerHTML = `<tr><td colspan="4" class="text-muted py-4">Data perbaikan tidak tersedia.</td></tr>`;
        return;
    }

    // Identify sessions that had a conflict in initialBest
    const conflictedSessionIds = new Set();
    if (initialBest.evaluation && initialBest.evaluation.geneFlags) {
        initialBest.evaluation.geneFlags.forEach(flag => {
            if (flag.roomConflict || flag.lecturerConflict) {
                conflictedSessionIds.add(flag.sessionId);
            }
        });
    }

    const filteredSessions = sessions.filter(s => conflictedSessionIds.has(s.id));

    if (filteredSessions.length === 0) {
        adjBody.innerHTML = `<tr><td colspan="4" class="text-success fw-bold py-4">✅ Tidak ada jadwal yang bentrok sejak awal! Semua langsung aman.</td></tr>`;
        return;
    }

    let html = "";
    
    filteredSessions.forEach(session => {
        const initGene = initialBest.chromosome.find(g => g.sessionId === session.id);
        const finalGene = finalBest.chromosome.find(g => g.sessionId === session.id);
        if (!initGene || !finalGene) return;

        const roomChanged = initGene.room !== finalGene.room;
        const timeChanged = initGene.timeSlot !== finalGene.timeSlot;

        const finalFlags = finalBest.evaluation.geneFlags.find(f => f.sessionId === session.id);
        const stillConflicted = finalFlags ? (finalFlags.roomConflict || finalFlags.lecturerConflict) : false;

        let actionLabel = "";
        let rowStyle = "";

        if (stillConflicted) {
            actionLabel = `<span class="badge bg-danger-subtle text-danger border px-2 py-1">❌ Masih Bentrok</span>`;
            rowStyle = "background: rgba(239, 68, 68, 0.02);";
        } else if (roomChanged && timeChanged) {
            actionLabel = `<span class="badge bg-primary-subtle text-primary border px-2 py-1">🔄 Pindah Ruang & Jam</span>`;
            rowStyle = "background: rgba(2, 132, 199, 0.02);";
        } else if (roomChanged) {
            actionLabel = `<span class="badge bg-info-subtle text-info border px-2 py-1">🏢 Pindah Ruangan</span>`;
            rowStyle = "background: rgba(14, 165, 233, 0.02);";
        } else if (timeChanged) {
            actionLabel = `<span class="badge bg-warning-subtle text-warning border px-2 py-1">⏰ Pergeseran Jam</span>`;
            rowStyle = "background: rgba(245, 158, 11, 0.02);";
        } else {
            // Had a conflict initially, but did not change, meaning the conflict was resolved because the OTHER class moved!
            actionLabel = `<span class="badge bg-success-subtle text-success border px-2 py-1">🛡️ Aman (Kelas Lain Dipindah)</span>`;
            rowStyle = "background: rgba(5, 150, 105, 0.02);";
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.12); ${rowStyle}">
                <td class="fw-bold text-start text-primary py-3">${escapeHtml(session.course)} <span class="small text-muted" style="font-size:0.75rem; display:block; font-weight:normal;">👨‍🏫 ${escapeHtml(session.lecturer)}</span></td>
                <td class="text-start text-danger" style="font-size:0.8rem; line-height: 1.5;">
                    🏢 ${escapeHtml(initGene.room)}<br>
                    ⏰ ${escapeHtml(initGene.timeSlot)}
                </td>
                <td class="text-start text-success fw-bold" style="font-size:0.8rem; line-height: 1.5;">
                    🏢 ${escapeHtml(finalGene.room)}<br>
                    ⏰ ${escapeHtml(finalGene.timeSlot)}
                </td>
                <td>${actionLabel}</td>
            </tr>
        `;
    });

    adjBody.innerHTML = html;
}

// Switch Results Sub-Tabs (Status vs Adjustments)
globalScope.switchResTab = function(type) {
    const tabStatus = document.getElementById("resTabStatus");
    const tabAdjust = document.getElementById("resTabAdjust");
    const btnStatus = document.getElementById("btnResTabStatus");
    const btnAdjust = document.getElementById("btnResTabAdjust");
    
    if (!tabStatus || !tabAdjust) return;

    if (type === 'status') {
        tabStatus.style.display = "block";
        tabAdjust.style.display = "none";
        btnStatus.classList.add("active");
        btnAdjust.classList.remove("active");
        if (btnStatus) btnStatus.setAttribute("aria-selected", "true");
        if (btnAdjust) btnAdjust.setAttribute("aria-selected", "false");
    } else {
        tabStatus.style.display = "none";
        tabAdjust.style.display = "block";
        btnAdjust.classList.add("active");
        btnStatus.classList.remove("active");
        if (btnAdjust) btnAdjust.setAttribute("aria-selected", "true");
        if (btnStatus) btnStatus.setAttribute("aria-selected", "false");
    }
};

// Update Real-Time Stat cards
function updateStatsUI(gen, bestFitness, conflicts, executionTime) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    set("statGen", gen);
    set("statFitness", bestFitness.toFixed(4));
    set("statConflicts", conflicts);
    set("statTime", `${executionTime} ms`);
}

// ========================================================
// SIMULATION RUNNER & STEPS EXECUTION
// ========================================================

async function startSimulate(compareMode = false) {
    if (isRunning) return;

    // Safety sync visual state to textareas before starting the engines
    syncStateToRawInputsSilent();

    clearLog();
    writeLog("Menyiapkan parameter eksperimen...", "system");
    
    // Parse Input values
    let parseData;
    try {
        parseData = parseInputs();
    } catch (err) {
        writeLog(err.message, "error");
        return;
    }

    const { sessions, rooms, timeSlots } = parseData;

    // Get UI parameters (Number.isFinite-safe: 0 is a valid value)
    const popSize = readNumber("inputPopSize", 10, 500, 50);
    const maxGen = readNumber("inputMaxGen", 10, 1000, 100);
    const cr = readNumber("inputCr", 0, 1, 0.8);
    const mr = readNumber("inputMr", 0, 1, 0.1);
    const greedyRatio = readNumber("inputGreedyRatio", 0, 1, 0.5);

    // Log experiment variables
    writeLog(`Dataset valid: ${sessions.length} Kelas, ${rooms.length} Ruangan, ${timeSlots.length} Slot Waktu.`, "success");
    writeLog(`Parameter: PopSize=${popSize}, MaxGen=${maxGen}, Cr=${cr}, Mr=${mr}, GreedyRatio=${greedyRatio}`, "system");

    const evalEstimate = popSize * maxGen * sessions.length;
    if (evalEstimate > HEAVY_SIM_WARNING) {
        writeLog(`Peringatan: estimasi ${evalEstimate.toLocaleString('id-ID')} evaluasi gen — simulasi mungkin berat/lambat.`, "warning");
    }

    toggleControlState(true);
    
    // Step 1: Identifikasi Data
    setStep(1, 'active');
    await new Promise(r => setTimeout(r, 600));
    setStep(1, 'completed');

    // Reset Chart
    initChart();
    if (!compareMode) {
        // Hide Pure GA dataset if not comparing
        chart.data.datasets[1].hidden = true;
    } else {
        chart.data.datasets[1].hidden = false;
    }
    chart.update();

    // Step 2: Inisialisasi Populasi
    setStep(2, 'active');
    writeLog(`Menginisialisasi populasi awal...`, "system");
    
    const startTime = performance.now();

    // Generate hybrid population
    writeLog(`Membuat populasi Hybrid (Greedy Ratio: ${greedyRatio * 100}%)...`, "system");
    let populationHybrid = initializePopulation(popSize, sessions, rooms, timeSlots, greedyRatio);
    
    // Capture a raw random chromosome to represent the initial unoptimized state (before optimization) for adjustment comparison
    const rawRandomChrom = createRandomChromosome(sessions, rooms, timeSlots);
    globalScope.initialBestIndividual = {
        chromosome: rawRandomChrom,
        evaluation: evaluateChromosome(rawRandomChrom, sessions)
    };

    // Reset adjustment table text
    const adjBody = document.getElementById("adjustmentBody");
    if (adjBody) {
        adjBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-muted py-4">Sistem sedang mengoptimasi jadwal. Penyesuaian perbaikan akan ditampilkan setelah simulasi selesai...</td>
            </tr>
        `;
    }
    
    // Generate pure GA population if compareMode
    let populationPure = null;
    if (compareMode) {
        writeLog(`Membuat populasi Pure GA (Greedy Ratio: 0%)...`, "system");
        populationPure = initializePopulation(popSize, sessions, rooms, timeSlots, 0.0);
    }

    // Record Gen 0: initial population fitness (chart always has a starting point)
    const initialBest = populationHybrid[0];
    chart.data.labels.push("Gen 0");
    chart.data.datasets[0].data.push(initialBest.evaluation.fitness);
    if (compareMode && populationPure) {
        chart.data.datasets[1].data.push(populationPure[0].evaluation.fitness);
    }
    updateStatsUI(0, initialBest.evaluation.fitness, initialBest.evaluation.totalConflicts, 0);
    writeLog(`Gen 0: Best Hybrid Fitness = ${initialBest.evaluation.fitness.toFixed(4)} (${initialBest.evaluation.totalConflicts} Bentrokan)${compareMode && populationPure ? ` | Best Pure Fitness = ${populationPure[0].evaluation.fitness.toFixed(4)}` : ""}`, "system");
    chart.update();
    
    await new Promise(r => setTimeout(r, 600));
    setStep(2, 'completed');

    // Step 3: Siklus Genetika
    setStep(3, 'active');
    writeLog(`Memulai evolusi optimasi penjadwalan...`, "system");

    let currentGen = 0;
    let hybridDone = false;
    let pureDone = false;

    // Main Asynchronous loop using requestAnimationFrame
    function runEvolutionStep() {
        if (!isRunning) return;

        currentGen++;

        let hybridConverged = false;
        let pureConverged = false;

        // 1. Evolve Hybrid population
        if (!hybridDone) {
            populationHybrid = evolveGeneration(populationHybrid, popSize, sessions, rooms, timeSlots, cr, mr);
            if (populationHybrid[0].evaluation.fitness >= 1.0) {
                hybridDone = true;
                hybridConverged = true;
                writeLog(`Hybrid konvergen optimal (fitness 1.0, 0 bentrok) di Gen ${currentGen} — grafik menampilkan Gen 0 s/d Gen ${currentGen}.`, "success");
            } else if (currentGen >= maxGen) {
                hybridDone = true;
            }
        }

        // 2. Evolve Pure GA population
        if (compareMode && !pureDone) {
            populationPure = evolveGeneration(populationPure, popSize, sessions, rooms, timeSlots, cr, mr);
            if (populationPure[0].evaluation.fitness >= 1.0) {
                pureDone = true;
                pureConverged = true;
                writeLog(`Pure GA konvergen optimal (fitness 1.0) di Gen ${currentGen}.`, "warning");
            } else if (currentGen >= maxGen) {
                pureDone = true;
            }
        }

        // Get current records
        const bestHybrid = populationHybrid[0];
        const bestPure = compareMode ? populationPure[0] : null;

        const duration = Math.round(performance.now() - startTime);

        // Update Stats UI (Based on Hybrid GA)
        updateStatsUI(currentGen, bestHybrid.evaluation.fitness, bestHybrid.evaluation.totalConflicts, duration);

        // Add generation points to Chart.js (always record; visual update throttled)
        chart.data.labels.push(`Gen ${currentGen}`);
        chart.data.datasets[0].data.push(bestHybrid.evaluation.fitness);
        if (compareMode) {
            chart.data.datasets[1].data.push(bestPure.evaluation.fitness);
        }

        // Check if finished
        const isSimulationFinished = compareMode 
            ? (hybridDone && pureDone) || currentGen >= maxGen
            : hybridDone || currentGen >= maxGen;

        // Throttle heavy re-renders (matrix/list/chart paint) every N generations
        const shouldPaint = currentGen % RENDER_EVERY_N_GENS === 0
            || currentGen === 1
            || hybridConverged
            || pureConverged
            || isSimulationFinished;

        if (shouldPaint) {
            chart.update();

            // Dynamically render schedule matrix and list on the fly for interactive feedback
            renderScheduleMatrix(bestHybrid.chromosome, sessions, rooms, timeSlots, bestHybrid.evaluation.geneFlags);
            renderConflicts(bestHybrid.evaluation);
            renderResultTable(bestHybrid.chromosome, sessions, bestHybrid.evaluation.geneFlags);
        }

        // Log logs periodically or on special events
        if (currentGen % 10 === 0 || currentGen === 1 || hybridConverged || pureConverged || isSimulationFinished) {
            let logMsg = `Gen ${currentGen}: Best Hybrid Fitness = ${bestHybrid.evaluation.fitness.toFixed(4)}`;
            if (compareMode) {
                logMsg += ` | Best Pure Fitness = ${bestPure.evaluation.fitness.toFixed(4)}`;
            }
            writeLog(logMsg);
        }

        if (isSimulationFinished) {
            finishSimulation(currentGen, populationHybrid[0], duration, compareMode, populationPure ? populationPure[0] : null, sessions);
        } else {
            animationFrameId = requestAnimationFrame(runEvolutionStep);
        }
    }

    // Trigger loop execution
    animationFrameId = requestAnimationFrame(runEvolutionStep);
}

// Finish simulation successfully
function finishSimulation(finalGen, bestHybrid, duration, compareMode, bestPure, sessions) {
    isRunning = false;
    toggleControlState(false);
    
    setStep(3, 'completed');
    
    // Step 4: Evaluasi Fitness Final
    setStep(4, 'completed');

    writeLog(`========================================`, "success");
    writeLog(`Simulasi selesai dalam ${finalGen} generasi! (${duration} ms)`, "success");
    writeLog(`Fitness Akhir Hybrid: ${bestHybrid.evaluation.fitness.toFixed(5)} (${bestHybrid.evaluation.totalConflicts} Bentrokan)`, "success");
    
    // Draw the final system schedule adjustment table comparison (Conflicted Initial vs Perfect Final)
    renderAdjustmentTable(globalScope.initialBestIndividual, bestHybrid, sessions);

    if (compareMode && bestPure) {
        writeLog(`Fitness Akhir Pure GA: ${bestPure.evaluation.fitness.toFixed(5)} (${bestPure.evaluation.totalConflicts} Bentrokan)`, "warning");
        if (bestHybrid.evaluation.fitness > bestPure.evaluation.fitness || (bestHybrid.evaluation.fitness === bestPure.evaluation.fitness && bestHybrid.evaluation.totalConflicts === 0 && bestPure.evaluation.totalConflicts > 0)) {
            writeLog(`Kesimpulan: Algoritma Hybrid terbukti mengungguli Pure GA dalam pencarian jadwal optimal!`, "success");
        } else {
            writeLog(`Kesimpulan: Kedua algoritma berhasil mencapai optimasi jadwal.`, "system");
        }
    }

    const statusBadge = document.getElementById("badgeStatus");
    if (statusBadge) {
        statusBadge.className = "badge-custom bg-success text-dark border-success";
        statusBadge.style.backgroundColor = "var(--color-success)";
        statusBadge.style.color = "var(--text-dark)";
        statusBadge.style.borderColor = "var(--color-success)";
        statusBadge.innerText = "Done";
    }
}

// Export pure helpers for Node unit tests (browser ignores this)
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        escapeHtml,
        clampNumber,
        parseListFromText,
        shuffleArray,
        cloneChromosome,
        evaluateChromosome,
        createRandomChromosome,
        createGreedyChromosome,
        initializePopulation,
        evolveGeneration,
        crossover,
        mutate,
        tournamentSelection
    };
}
