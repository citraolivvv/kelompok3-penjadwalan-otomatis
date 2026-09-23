const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
    escapeHtml,
    clampNumber,
    parseListFromText,
    shuffleArray,
    evaluateChromosome,
    createGreedyChromosome,
    createRandomChromosome,
    initializePopulation,
    evolveGeneration
} = require("../app.js");

const sessions = [
    { id: 0, course: "Matematika Terapan", lecturer: "Dr. Amirhud" },
    { id: 1, course: "Basis Data", lecturer: "Novialdi Ashari" },
    { id: 2, course: "Aljabar Linear", lecturer: "Dr. Hendi" }
];
const rooms = ["Ruang A", "Ruang B"];
const timeSlots = ["08:00", "09:00"];

test("clampNumber: 0 is valid (not replaced by fallback)", () => {
    assert.equal(clampNumber("0", 0, 1, 0.5), 0);
    assert.equal(clampNumber("0.0", 0, 1, 0.5), 0);
    assert.equal(clampNumber("", 0, 1, 0.5), 0.5);
    assert.equal(clampNumber("abc", 0, 1, 0.5), 0.5);
    assert.equal(clampNumber("2", 0, 1, 0.5), 1);
    assert.equal(clampNumber("-1", 0, 1, 0.5), 0);
    assert.equal(clampNumber("9999", 10, 500, 50), 500);
});

test("escapeHtml escapes HTML special characters", () => {
    assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    assert.equal(escapeHtml("O'Neil & Co"), "O&#39;Neil &amp; Co");
});

test("parseListFromText splits by comma and newline", () => {
    assert.deepEqual(parseListFromText("A, B\nC,,  "), ["A", "B", "C"]);
});

test("shuffleArray returns permutation of same length", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input);
    assert.equal(out.length, 5);
    assert.deepEqual([...out].sort((a, b) => a - b), input);
    assert.notEqual(out, input);
});

test("evaluateChromosome: no conflicts => fitness 1", () => {
    const chromosome = [
        { sessionId: 0, room: "Ruang A", timeSlot: "08:00" },
        { sessionId: 1, room: "Ruang B", timeSlot: "08:00" },
        { sessionId: 2, room: "Ruang A", timeSlot: "09:00" }
    ];
    const result = evaluateChromosome(chromosome, sessions);
    assert.equal(result.totalConflicts, 0);
    assert.equal(result.fitness, 1);
});

test("evaluateChromosome: room + lecturer conflicts counted pairwise", () => {
    const chromosome = [
        { sessionId: 0, room: "Ruang A", timeSlot: "08:00" },
        { sessionId: 1, room: "Ruang A", timeSlot: "08:00" }
    ];
    const twoSessions = sessions.slice(0, 2);
    twoSessions[0].lecturer = "Dr. X";
    twoSessions[1].lecturer = "Dr. X";
    const result = evaluateChromosome(chromosome, twoSessions);
    assert.equal(result.roomConflicts, 1);
    assert.equal(result.lecturerConflicts, 1);
    assert.equal(result.totalConflicts, 2);
    assert.equal(result.fitness, 0.33333);
});

test("createGreedyChromosome produces conflict-free schedule on easy instance", () => {
    const chrom = createGreedyChromosome(sessions, rooms, timeSlots);
    assert.equal(chrom.length, 3);
    const result = evaluateChromosome(chrom, sessions);
    assert.equal(result.totalConflicts, 0);
});

test("createRandomChromosome aligns with session ids", () => {
    const chrom = createRandomChromosome(sessions, rooms, timeSlots);
    assert.deepEqual(chrom.map(g => g.sessionId), [0, 1, 2]);
});

test("initializePopulation + evolveGeneration keep population size and improve fitness", () => {
    const popSize = 10;
    let population = initializePopulation(popSize, sessions, rooms, timeSlots, 0.5);
    assert.equal(population.length, popSize);

    const before = population[0].evaluation.fitness;
    population = evolveGeneration(population, popSize, sessions, rooms, timeSlots, 0.8, 0.1);
    assert.equal(population.length, popSize);
    assert.ok(population[0].evaluation.fitness >= before);
});

test("greedyRatio 0 produces only random init (pure GA path)", () => {
    const population = initializePopulation(8, sessions, rooms, timeSlots, 0);
    assert.equal(population.length, 8);
    assert.ok(population.every(ind => ind.evaluation && typeof ind.evaluation.fitness === "number"));
});
