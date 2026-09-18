const assert = require('assert');

global.window = {
  PurpleState: {
    user: { name: 'Teste', role: 'direction', sector: 'pedagogico', accessScope: 'all_sectors', permissions: { 'panel.view': true, 'reports.view': true } },
    db: {
      settings: {
        classHolidays: [{ id: 'hol-1', date: '2026-09-19', name: 'Feriado teste' }]
      },
      classHolidays: [],
      classes: [{
        id: 'class-test',
        name: 'LL4 Teste',
        status: 'Ativa',
        startDate: '2026-09-12',
        scheduleBlocks: [{ day: 'SABADO', time: '10:20', room: '1' }],
        recessPeriods: [{ start: '2026-10-03', end: '2026-10-10' }]
      }],
      students: [],
      teachers: [],
      inventoryItems: []
    }
  },
  PurpleStorage: { save: async () => {} },
  App: { toast: () => {}, renderPage: () => {}, closeModal: () => {} }
};
global.document = {
  querySelector: () => null,
  getElementById: () => null,
  body: { classList: { add: () => {} } }
};
global.CSS = { escape: value => String(value) };

require('../modules/turmas/turmas.js');

const api = window.PurpleTurmas._test;
const template = api.scheduleTemplate('little-learners-4-02-v1');
assert(template, 'template Little Learners 4.02 carrega');
assert.strictEqual(template.blocks.length, 38, 'template preserva 38 blocos');
assert.strictEqual(api.groupedTemplateBlocks(template).length, 19, 'template preserva 19 encontros');
assert.deepStrictEqual(template.blocks.slice(0, 4).map(block => block.order), [1, 2, 3, 4], 'ordem inicial preservada');
assert.strictEqual(template.blocks[1].bookPages, '9', 'pagina do bloco 2 preservada');
assert.strictEqual(template.blocks[2].bookPages, '11 - 15', 'paginas do bloco 3 preservadas');
assert.strictEqual(template.blocks[18].title, 'PROJECT I', 'Project I preservado');
assert.strictEqual(template.blocks[36].title, 'PROJECT II', 'Project II preservado');
assert(!template.blocks.some(block => /2025|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'template nao depende das datas de 2025');

const klass = window.PurpleState.db.classes[0];
const preview = api.generateSchedulePreview(klass, template.id, klass.startDate);
assert.strictEqual(preview.blockCount, 38, 'preview preserva quantidade de blocos');
assert.strictEqual(preview.meetingCount, 19, 'preview preserva quantidade de encontros');
assert(preview.ignored.some(item => item.date === '2026-09-19'), 'feriado aparece como ignorado');
assert(preview.ignored.some(item => item.date === '2026-10-03'), 'recesso aparece como ignorado');
assert.strictEqual(preview.meetings[0].date, '2026-09-12', 'primeiro encontro usa data inicial valida');
assert.strictEqual(preview.meetings[1].date, '2026-09-26', 'feriado nao consome encontro');
assert.strictEqual(preview.meetings[1].blocks[0].order, 3, 'feriado nao consome bloco');
assert.strictEqual(preview.meetings[2].date, '2026-10-17', 'recesso nao consome encontro');

const otherClass = { ...klass, id: 'class-other', startDate: '2026-09-16', scheduleBlocks: [{ day: 'QUARTA', time: '19:00' }], recessPeriods: [] };
const otherPreview = api.generateSchedulePreview(otherClass, template.id, otherClass.startDate);
assert.notStrictEqual(preview.meetings[0].date, otherPreview.meetings[0].date, 'turmas em dias diferentes geram datas diferentes');
assert.deepStrictEqual(preview.meetings.map(m => m.blockIds), otherPreview.meetings.map(m => m.blockIds), 'sequencia pedagogica permanece igual');

window.PurpleState.db.settings.turmas.generatedSchedules = { [klass.id]: { ...preview, status: 'published' } };
window.PurpleState.db.settings.turmas.blockExecution = {
  [`${klass.id}::${preview.meetings[0].blocks[0].id}`]: { status: 'done' },
  [`${klass.id}::${preview.meetings[0].blocks[1].id}`]: { status: 'partial' }
};
window.PurpleState.db.settings.turmas.pendingBlocks = { [klass.id]: [preview.meetings[0].blocks[1]] };
const progress = api.progressFor(klass);
assert.strictEqual(progress.planned, 38, 'progresso conta blocos planejados');
assert.strictEqual(progress.done, 1, 'progresso conta realizados');
assert.strictEqual(progress.partial, 1, 'progresso conta parciais');
assert.strictEqual(progress.pending, 1, 'progresso conta pendentes');

console.log('turmas-schedule tests passed');
