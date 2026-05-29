// ==========================================
// Hybrid Greedy-GA Scheduling Engine - App.js
// ==========================================

// Global variables for algorithm state
let animationFrameId = null;
let isRunning = false;
let chart = null;

// Preset Data
const presets = {
    medium: {
        dosen: "Dr. Amirhud, Novialdi Ashari, Sulis Nuralia, Dr. Hendi, Prof. Budi",
        mk: "Matematika Terapan, Basis Data, Jaringan Komputer, Aljabar Linear, Kecerdasan Buatan",
        ruang: "Ruang A, Ruang B, Ruang C, Ruang D, Ruang E",
        waktu: "08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00"
    },
    large: {
        dosen: "Dr. Amirhud, Novialdi Ashari, Sulis Nuralia, Dr. Hendi, Prof. Budi, Bu Clarissa, Pak David, Bu Esti, Pak Fahri, Bu Grace",
        mk: "Matematika Terapan, Basis Data, Jaringan Komputer, Aljabar Linear, Kecerdasan Buatan, Kriptografi, Pemrograman Web, Sistem Operasi, Analisis Numerik, Riset Operasi",
        ruang: "Ruang A, Ruang B, Ruang C, Ruang D, Ruang E",
        waktu: "08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00"
    }
};

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

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    initAccordion();
    setupInputToggles();
    setupEventListeners();
    setupRawInputSync();
    
    // Start with empty state
    renderVisualInput();
    syncStateToRawInputs();
    writeLog("Sistem siap. Mulailah memilih kelas, ruangan, dan waktu melalui GUI di bawah ini.", "system");
    
    initTabs();
});

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
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab);
            target.classList.add("active");
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
        syncStateToRawInputs(); // Synchronize visual state to raw inputs
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
                <input type="text" placeholder="Mata Kuliah (e.g. Basis Data)" value="${cls.course}" oninput="updateClass(${idx}, 'course', this.value)">
                <input type="text" placeholder="Dosen Pengajar (e.g. Novialdi)" value="${cls.lecturer}" oninput="updateClass(${idx}, 'lecturer', this.value)">
                <button class="btn-delete-row" onclick="deleteClass(${idx})" title="Hapus Kelas" type="button">
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
                ${room}
                <button class="pill-tag-remove" onclick="deletePill('rooms', ${idxInDataset})" type="button">×</button>
            `;
            roomContainer.appendChild(pill);
        });
    }
    
    // Add custom room input pill
    roomContainer.innerHTML += `
        <div class="pill-tag-input-wrapper" id="addRoomInputWrapper">
            <input type="text" class="pill-tag-input" id="addRoomInput" onkeydown="handlePillInput(event, 'rooms')" onblur="hidePillInput('rooms')">
        </div>
        <button class="pill-tag-add" id="btnAddRoom" onclick="showPillInput('rooms')" type="button">➕ Kustom Ruang</button>
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
                ${time}
                <button class="pill-tag-remove" onclick="deletePill('timeslots', ${idxInDataset})" type="button">×</button>
            `;
            waktuContainer.appendChild(pill);
        });
    }
    
    // Add custom waktu input pill
    waktuContainer.innerHTML += `
        <div class="pill-tag-input-wrapper" id="addWaktuInputWrapper">
            <input type="text" class="pill-tag-input" id="addWaktuInput" onkeydown="handlePillInput(event, 'timeslots')" onblur="hidePillInput('timeslots')">
        </div>
        <button class="pill-tag-add" id="btnAddWaktu" onclick="showPillInput('timeslots')" type="button">➕ Kustom Waktu</button>
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
                <span class="template-class-title">${tpl.course}</span>
                <span class="template-class-lecturer">👨‍🏫 ${tpl.lecturer}</span>
            </div>
            <button class="btn-add-template-class ${isAdded ? 'active' : ''}" onclick="toggleTemplateClass('${tpl.course}', '${tpl.lecturer}')" type="button">
                ${isAdded ? '✓ Terpilih' : '➕ Tambah'}
            </button>
        `;
        picker.appendChild(item);
    });
}

window.toggleTemplateClass = function(course, lecturer) {
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
window.updateClass = function(idx, field, val) {
    dataset.classes[idx][field] = val;
    syncStateToRawInputsSilent();
};

window.deleteClass = function(idx) {
    dataset.classes.splice(idx, 1);
    renderVisualInput();
    syncStateToRawInputsSilent();
};

window.addClass = function() {
    dataset.classes.push({ course: "", lecturer: "" });
    renderVisualInput();
    syncStateToRawInputsSilent();
};

window.deletePill = function(type, idx) {
    dataset[type].splice(idx, 1);
    renderVisualInput();
    syncStateToRawInputsSilent();
};

window.showPillInput = function(type) {
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

window.hidePillInput = function(type) {
    setTimeout(() => {
        const wrapperId = type === 'rooms' ? 'addRoomInputWrapper' : 'addWaktuInputWrapper';
        const btnId = type === 'rooms' ? 'btnAddRoom' : 'btnAddWaktu';
        
        const wrapper = document.getElementById(wrapperId);
        if (wrapper) wrapper.style.display = 'none';
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = 'inline-block';
    }, 200);
};

window.handlePillInput = function(event, type) {
    if (event.key === 'Enter') {
        const inputVal = event.target.value.trim();
        if (inputVal.length > 0) {
            dataset[type].push(inputVal);
            renderVisualInput();
            syncStateToRawInputsSilent();
        }
        hidePillInput(type);
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

function syncStateToRawInputs() {
    syncStateToRawInputsSilent();
}

// Sync Raw Textareas back to State Object
function syncRawInputsToState() {
    const parseList = (id) => {
        return document.getElementById(id).value
            .split(/[,\n]/)
            .map(x => x.trim())
            .filter(x => x.length > 0);
    };

    const dosenList = parseList("inputDosen");
    const mkList = parseList("inputMK");
    const ruangList = parseList("inputRuang");
    const waktuList = parseList("inputWaktu");

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
    const ctx = document.getElementById("mainChart").getContext("2d");
    
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
function writeLog(msg, type = 'normal') {
    const logWindow = document.getElementById("logWindow");
    if (!logWindow) return;

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const line = document.createElement("div");
    line.className = `console-line ${type}`;
    line.innerHTML = `[${time}] > ${msg}`;
    
    logWindow.appendChild(line);
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
    document.getElementById("runBtn").disabled = running;
    document.getElementById("runCompareBtn").disabled = running;
    document.getElementById("stopBtn").disabled = !running;

    const statusBadge = document.getElementById("badgeStatus");
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
    writeLog("Simulasi dihentikan secara manual oleh pengguna.", "error");
}

// ========================================================
// CORE ALGORITHM IMPLEMENTATION
// ========================================================

// Parse CSV inputs
function parseInputs() {
    const parseList = (id) => {
        return document.getElementById(id).value
            .split(/[,\n]/) // split by comma or newline
            .map(x => x.trim())
            .filter(x => x.length > 0);
    };

    const dosenList = parseList("inputDosen");
    const mkList = parseList("inputMK");
    const ruangList = parseList("inputRuang");
    const waktuList = parseList("inputWaktu");

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
            const [room, timeSlot] = key.split('#');
            const courseNames = genes.map(g => sessions[g.sessionId].course);
            
            // Mark flags for all genes in this group
            genes.forEach(g => {
                const idx = geneFlags.findIndex(flag => flag.sessionId === g.sessionId);
                if (idx !== -1) {
                    geneFlags[idx].roomConflict = true;
                    // Other classes that this gene is conflicting with
                    geneFlags[idx].roomConflictingClasses = courseNames.filter(name => name !== sessions[g.sessionId].course);
                }
            });

            // Pairwise count for fitness calculation: N * (N - 1) / 2
            const pairs = (genes.length * (genes.length - 1)) / 2;
            roomConflicts += pairs;

            conflictDetails.push({
                type: 'room',
                desc: `<strong>Bentrokan Ruangan:</strong> ${genes.length} kelas (<em>${courseNames.join(', ')}</em>) dijadwalkan di ruangan yang sama (<strong>${room}</strong>) pada slot <strong>${timeSlot}</strong>.`
            });
        }
    }

    // Evaluate lecturer conflicts
    for (const key in lecturerGroups) {
        const genes = lecturerGroups[key];
        if (genes.length > 1) {
            const [lecturer, timeSlot] = key.split('#');
            const courseNames = genes.map(g => sessions[g.sessionId].course);

            // Mark flags for all genes in this group
            genes.forEach(g => {
                const idx = geneFlags.findIndex(flag => flag.sessionId === g.sessionId);
                if (idx !== -1) {
                    geneFlags[idx].lecturerConflict = true;
                    geneFlags[idx].lecturerConflictingClasses = courseNames.filter(name => name !== sessions[g.sessionId].course);
                }
            });

            // Pairwise count for fitness calculation: N * (N - 1) / 2
            const pairs = (genes.length * (genes.length - 1)) / 2;
            lecturerConflicts += pairs;

            conflictDetails.push({
                type: 'lecturer',
                desc: `<strong>Bentrokan Dosen:</strong> <strong>${lecturer}</strong> dijadwalkan mengajar ${genes.length} kelas sekaligus (<em>${courseNames.join(', ')}</em>) pada slot <strong>${timeSlot}</strong>.`
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
    const shuffledSessions = [...sessions].sort(() => Math.random() - 0.5);

    for (const session of shuffledSessions) {
        let bestRoom = rooms[0];
        let bestTimeSlot = timeSlots[0];
        let minConflicts = Infinity;

        // Shuffle rooms and timeslots selection order
        const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5);
        const shuffledTimeSlots = [...timeSlots].sort(() => Math.random() - 0.5);

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
    return JSON.parse(JSON.stringify(best));
}

// Crossover operator: Uniform / Single-Point Crossover
function crossover(parentA, parentB, crossoverRate = 0.8) {
    if (Math.random() > crossoverRate) {
        return [
            JSON.parse(JSON.stringify(parentA.chromosome)),
            JSON.parse(JSON.stringify(parentB.chromosome))
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
    const mutated = JSON.parse(JSON.stringify(chromosome));
    
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
    nextGeneration.push(JSON.parse(JSON.stringify(population[0])));
    if (population.length > 1) {
        nextGeneration.push(JSON.parse(JSON.stringify(population[1])));
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
        html += `<th>${r}</th>`;
    });
    
    html += `
                </tr>
            </thead>
            <tbody>
    `;

    timeSlots.forEach(t => {
        html += `
            <tr>
                <td class="time-header">${t}</td>
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
                        warningBadges += `<div class="badge-conflict-detail room">🚫 Ruang Bentrok (${c.roomConflictingClasses.join(', ')})</div>`;
                    }
                    if (hasLecturerConf) {
                        warningBadges += `<div class="badge-conflict-detail lecturer">👤 Dosen Bentrok (${c.lecturer})</div>`;
                    }

                    html += `
                        <div class="class-badge ${conflictClass}" style="${borderStyle} ${bgStyle}">
                            <div class="class-title">${c.course}</div>
                            <div class="class-details">
                                <span>👨‍🏫 ${c.lecturer}</span>
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
                <td class="fw-bold text-start text-primary py-3">${session.course}</td>
                <td class="text-start text-dark">${session.lecturer}</td>
                <td><span class="badge bg-light text-dark border px-3 py-2">${gene.room}</span></td>
                <td><span class="badge bg-secondary-subtle text-primary border px-3 py-2 font-monospace fw-bold">${gene.timeSlot}</span></td>
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
                <td class="fw-bold text-start text-primary py-3">${session.course} <span class="small text-muted" style="font-size:0.75rem; display:block; font-weight:normal;">👨‍🏫 ${session.lecturer}</span></td>
                <td class="text-start text-danger" style="font-size:0.8rem; line-height: 1.5;">
                    🏢 ${initGene.room}<br>
                    ⏰ ${initGene.timeSlot}
                </td>
                <td class="text-start text-success fw-bold" style="font-size:0.8rem; line-height: 1.5;">
                    🏢 ${finalGene.room}<br>
                    ⏰ ${finalGene.timeSlot}
                </td>
                <td>${actionLabel}</td>
            </tr>
        `;
    });

    adjBody.innerHTML = html;
}

// Switch Results Sub-Tabs (Status vs Adjustments)
window.switchResTab = function(type) {
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
    } else {
        tabStatus.style.display = "none";
        tabAdjust.style.display = "block";
        btnAdjust.classList.add("active");
        btnStatus.classList.remove("active");
    }
};

// Update Real-Time Stat cards
function updateStatsUI(gen, bestFitness, conflicts, executionTime) {
    document.getElementById("statGen").innerText = gen;
    document.getElementById("statFitness").innerText = bestFitness.toFixed(4);
    document.getElementById("statConflicts").innerText = conflicts;
    document.getElementById("statTime").innerText = `${executionTime} ms`;
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
        alert(err.message);
        return;
    }

    const { sessions, rooms, timeSlots } = parseData;

    // Get UI parameters
    const popSize = parseInt(document.getElementById("inputPopSize").value) || 50;
    const maxGen = parseInt(document.getElementById("inputMaxGen").value) || 100;
    const cr = parseFloat(document.getElementById("inputCr").value) || 0.8;
    const mr = parseFloat(document.getElementById("inputMr").value) || 0.1;
    const greedyRatio = parseFloat(document.getElementById("inputGreedyRatio").value) || 0.5;

    // Log experiment variables
    writeLog(`Dataset valid: ${sessions.length} Kelas, ${rooms.length} Ruangan, ${timeSlots.length} Slot Waktu.`, "success");
    writeLog(`Parameter: PopSize=${popSize}, MaxGen=${maxGen}, Cr=${cr}, Mr=${mr}, GreedyRatio=${greedyRatio}`, "system");

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
    writeLog(`Membuat populasi Hybrid (Greedy Ratio: ${greedyRatio * 100}%)...`);
    let populationHybrid = initializePopulation(popSize, sessions, rooms, timeSlots, greedyRatio);
    
    // Capture a raw random chromosome to represent the initial unoptimized state (before optimization) for adjustment comparison
    const rawRandomChrom = createRandomChromosome(sessions, rooms, timeSlots);
    window.initialBestIndividual = {
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
        writeLog(`Membuat populasi Pure GA (Greedy Ratio: 0%)...`);
        populationPure = initializePopulation(popSize, sessions, rooms, timeSlots, 0.0);
    }
    
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

        // 1. Evolve Hybrid population
        if (!hybridDone) {
            populationHybrid = evolveGeneration(populationHybrid, popSize, sessions, rooms, timeSlots, cr, mr);
            if (populationHybrid[0].evaluation.fitness >= 1.0 || currentGen >= maxGen) {
                hybridDone = true;
            }
        }

        // 2. Evolve Pure GA population
        if (compareMode && !pureDone) {
            populationPure = evolveGeneration(populationPure, popSize, sessions, rooms, timeSlots, cr, mr);
            if (populationPure[0].evaluation.fitness >= 1.0 || currentGen >= maxGen) {
                pureDone = true;
            }
        }

        // Get current records
        const bestHybrid = populationHybrid[0];
        const bestPure = compareMode ? populationPure[0] : null;

        const duration = Math.round(performance.now() - startTime);

        // Update Stats UI (Based on Hybrid GA)
        updateStatsUI(currentGen, bestHybrid.evaluation.fitness, bestHybrid.evaluation.totalConflicts, duration);

        // Add generation points to Chart.js
        chart.data.labels.push(`Gen ${currentGen}`);
        chart.data.datasets[0].data.push(bestHybrid.evaluation.fitness);
        if (compareMode) {
            chart.data.datasets[1].data.push(bestPure.evaluation.fitness);
        }
        
        // Update Chart smoothly
        chart.update();

        // Dynamically render schedule matrix and list on the fly for interactive feedback
        renderScheduleMatrix(bestHybrid.chromosome, sessions, rooms, timeSlots, bestHybrid.evaluation.geneFlags);
        renderConflicts(bestHybrid.evaluation);
        renderResultTable(bestHybrid.chromosome, sessions, bestHybrid.evaluation.geneFlags);

        // Log logs periodically or on special events
        if (currentGen % 10 === 0 || currentGen === 1 || hybridDone || (compareMode && pureDone)) {
            let logMsg = `Gen ${currentGen}: Best Hybrid Fitness = ${bestHybrid.evaluation.fitness.toFixed(4)}`;
            if (compareMode) {
                logMsg += ` | Best Pure Fitness = ${bestPure.evaluation.fitness.toFixed(4)}`;
            }
            writeLog(logMsg);
        }

        // Check if finished
        const isSimulationFinished = compareMode 
            ? (hybridDone && pureDone) || currentGen >= maxGen
            : hybridDone || currentGen >= maxGen;

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
    renderAdjustmentTable(window.initialBestIndividual, bestHybrid, sessions);

    if (compareMode && bestPure) {
        writeLog(`Fitness Akhir Pure GA: ${bestPure.evaluation.fitness.toFixed(5)} (${bestPure.evaluation.totalConflicts} Bentrokan)`, "warning");
        if (bestHybrid.evaluation.fitness > bestPure.evaluation.fitness || (bestHybrid.evaluation.fitness === bestPure.evaluation.fitness && bestHybrid.evaluation.totalConflicts === 0 && bestPure.evaluation.totalConflicts > 0)) {
            writeLog(`Kesimpulan: Algoritma Hybrid terbukti mengungguli Pure GA dalam pencarian jadwal optimal!`, "success");
        } else {
            writeLog(`Kesimpulan: Kedua algoritma berhasil mencapai optimasi jadwal.`, "system");
        }
    }

    const statusBadge = document.getElementById("badgeStatus");
    statusBadge.className = "badge-custom bg-success text-dark border-success";
    statusBadge.style.backgroundColor = "var(--color-success)";
    statusBadge.style.color = "var(--text-dark)";
    statusBadge.style.borderColor = "var(--color-success)";
    statusBadge.innerText = "Done";
}
