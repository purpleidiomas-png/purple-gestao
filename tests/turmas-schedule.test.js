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
const template = api.scheduleTemplate('discover-1-1-oficial-v1');
const connectTemplate = api.scheduleTemplate('connect-1-2-oficial-v1');
const exploreTemplate = api.scheduleTemplate('explore-oficial-v1');
const changeTemplate = api.scheduleTemplate('change-oficial-v1');
const inspireTemplate = api.scheduleTemplate('inspire-oficial-v1');
const travelTemplate = api.scheduleTemplate('travel-oficial-v1');
const yl3Template = api.scheduleTemplate('young-learners-3-oficial-v1');
const skStarterTemplate = api.scheduleTemplate('super-kids-starter-oficial-v1');
const sk1Template = api.scheduleTemplate('super-kids-1-oficial-v1');
const sk2Template = api.scheduleTemplate('super-kids-2-oficial-v1');
const sk3Template = api.scheduleTemplate('super-kids-3-oficial-v1');
const sk4Template = api.scheduleTemplate('super-kids-4-oficial-v1');
assert(template, 'template DISCOVER 1.1 oficial carrega');
assert(connectTemplate, 'template CONNECT 1.2 oficial carrega');
assert(exploreTemplate, 'template EXPLORE oficial carrega');
assert(changeTemplate, 'template CHANGE oficial carrega');
assert(inspireTemplate, 'template INSPIRE oficial carrega');
assert(travelTemplate, 'template TRAVEL oficial carrega');
assert(yl3Template, 'template YOUNG LEARNERS 3 oficial carrega');
assert(skStarterTemplate, 'template SUPER KIDS STARTER oficial carrega');
assert(sk1Template, 'template SUPER KIDS 1 oficial carrega');
assert(sk2Template, 'template SUPER KIDS 2 oficial carrega');
assert(sk3Template, 'template SUPER KIDS 3 oficial carrega');
assert(sk4Template, 'template SUPER KIDS 4 oficial carrega');
assert.strictEqual(api.scheduleTemplates().length, 12, 'modelos oficiais ficam disponíveis');
assert.strictEqual(template.blocks.length, 42, 'template preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(template).length, 21, 'template preserva 21 encontros');
assert.deepStrictEqual(template.blocks.slice(0, 4).map(block => block.order), [1, 2, 3, 4], 'ordem inicial preservada');
assert.strictEqual(template.blocks[2].bookPages, '8-10', 'paginas do bloco 3 preservadas');
assert.strictEqual(template.blocks[20].title, 'CONVERSATION CLASS', 'Conversation Class preservada');
assert.strictEqual(template.blocks[38].title, 'REVIEW FINAL TEST', 'Review Final Test preservado');
assert.strictEqual(template.blocks[40].title, 'FINAL TEST', 'Final Test preservado');
assert(!template.blocks.some(block => /2025|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'template nao depende das datas de 2025');
assert.strictEqual(connectTemplate.blocks.length, 42, 'Connect preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(connectTemplate).length, 21, 'Connect preserva 21 encontros');
assert.strictEqual(connectTemplate.blocks[2].bookPages, '10', 'Connect preserva páginas do bloco 3');
assert.strictEqual(connectTemplate.blocks[18].title, 'REVIEW', 'Connect preserva Review');
assert.strictEqual(connectTemplate.blocks[34].title, 'CONVERSATION CLASS', 'Connect preserva Conversation Class');
assert.strictEqual(connectTemplate.blocks[38].title, 'SKILLCHECK REVIEW', 'Connect preserva Skillcheck Review');
assert.strictEqual(connectTemplate.blocks[40].title, 'SKILLCHECK', 'Connect preserva Skillcheck');
assert(!connectTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Connect nao depende das datas do PDF');
assert.strictEqual(exploreTemplate.blocks.length, 42, 'Explore preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(exploreTemplate).length, 21, 'Explore preserva 21 encontros');
assert.strictEqual(exploreTemplate.blocks[2].bookPages, '10-14', 'Explore preserva páginas do bloco 3');
assert.strictEqual(exploreTemplate.blocks[16].title, 'CONVERSATION CLASS', 'Explore preserva Conversation Class');
assert.strictEqual(exploreTemplate.blocks[20].content, 'Oral practice', 'Explore preserva foco oral da Unit 8');
assert.strictEqual(exploreTemplate.blocks[38].title, 'REVIEW FINAL TEST', 'Explore preserva Review Final Test');
assert.strictEqual(exploreTemplate.blocks[40].title, 'FINAL TEST', 'Explore preserva Final Test');
assert(!exploreTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Explore nao depende das datas do PDF');
assert.strictEqual(changeTemplate.blocks.length, 44, 'Change preserva 44 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(changeTemplate).length, 22, 'Change preserva 22 encontros');
assert.strictEqual(changeTemplate.blocks[2].bookPages, '6-13', 'Change preserva páginas do bloco 3');
assert.strictEqual(changeTemplate.blocks[20].title, 'CONVERSATION CLASS', 'Change preserva Conversation Class');
assert.strictEqual(changeTemplate.blocks[40].title, 'REVIEW FINAL TEST', 'Change preserva Review Final Test');
assert.strictEqual(changeTemplate.blocks[42].title, 'FINAL TEST', 'Change preserva Final Test');
assert(!changeTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Change nao depende das datas do PDF');
assert.strictEqual(inspireTemplate.blocks.length, 42, 'Inspire preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(inspireTemplate).length, 21, 'Inspire preserva 21 encontros');
assert.strictEqual(inspireTemplate.blocks[2].bookPages, '10-12', 'Inspire preserva páginas do bloco 3');
assert.strictEqual(inspireTemplate.blocks[14].title, 'CONVERSATION CLASS', 'Inspire preserva Conversation Class');
assert.strictEqual(inspireTemplate.blocks[20].content, 'Oral practice', 'Inspire preserva foco oral da Unit 7');
assert.strictEqual(inspireTemplate.blocks[38].title, 'REVIEW FINAL TEST', 'Inspire preserva Review Final Test');
assert.strictEqual(inspireTemplate.blocks[40].title, 'FINAL TEST', 'Inspire preserva Final Test');
assert(!inspireTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Inspire nao depende das datas do PDF');
assert.strictEqual(travelTemplate.blocks.length, 42, 'Travel preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(travelTemplate).length, 21, 'Travel preserva 21 encontros');
assert.strictEqual(travelTemplate.blocks[2].bookPages, '4-12', 'Travel preserva páginas do bloco 3');
assert.strictEqual(travelTemplate.blocks[14].title, 'CONVERSATION CLASS', 'Travel preserva Conversation Class');
assert.strictEqual(travelTemplate.blocks[30].unit, 'Unit 16', 'Travel preserva Unit 16');
assert.strictEqual(travelTemplate.blocks[40].unit, 'Unit 22', 'Travel preserva Unit 22');
assert.strictEqual(travelTemplate.blocks[41].unit, 'Unit 23', 'Travel preserva Unit 23');
assert(!travelTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Travel nao depende das datas do PDF');
assert.strictEqual(yl3Template.blocks.length, 38, 'Young Learners 3 preserva 38 linhas extraidas da tabela');
assert.strictEqual(api.groupedTemplateBlocks(yl3Template).length, 19, 'Young Learners 3 preserva 19 encontros extraidos');
assert.strictEqual(yl3Template.blocks[2].bookPages, '07-12', 'Young Learners 3 preserva paginas do bloco 3');
assert.strictEqual(yl3Template.blocks[13].unit, 'UNIT 6', 'Young Learners 3 normaliza UNIT6');
assert.strictEqual(yl3Template.blocks[18].title, 'CONVERSATION CLASS', 'Young Learners 3 preserva Conversation Class');
assert.strictEqual(yl3Template.blocks[34].title, 'SKILLCHECK REVIEW', 'Young Learners 3 preserva Skillcheck Review');
assert.strictEqual(yl3Template.blocks[36].title, 'SKILLCHECK', 'Young Learners 3 preserva Skillcheck');
assert(!yl3Template.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Young Learners 3 nao depende das datas do PDF');
assert.strictEqual(skStarterTemplate.blocks.length, 42, 'Super Kids Starter preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(skStarterTemplate).length, 21, 'Super Kids Starter preserva 21 encontros');
assert.strictEqual(skStarterTemplate.blocks[2].bookPages, '4-9/ 111-116', 'Super Kids Starter preserva páginas do bloco 3');
assert.strictEqual(skStarterTemplate.blocks[2].unit, 'Say Hello', 'Super Kids Starter preserva Say Hello');
assert.strictEqual(skStarterTemplate.blocks[22].title, 'PROJECT I', 'Super Kids Starter preserva Project I');
assert.strictEqual(skStarterTemplate.blocks[40].title, 'PROJECT II', 'Super Kids Starter preserva Project II');
assert(!skStarterTemplate.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Super Kids Starter nao depende das datas do PDF');
assert.strictEqual(sk1Template.blocks.length, 42, 'Super Kids 1 preserva 42 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(sk1Template).length, 21, 'Super Kids 1 preserva 21 encontros');
assert.strictEqual(sk1Template.blocks[1].unit, 'Friends', 'Super Kids 1 preserva Friends');
assert.strictEqual(sk1Template.blocks[20].title, 'PROJECT I', 'Super Kids 1 preserva Project I');
assert.strictEqual(sk1Template.blocks[22].type, 'Exam', 'Super Kids 1 preserva Unit 6 como Exam');
assert.strictEqual(sk1Template.blocks[35].bookPages, '109-111', 'Super Kids 1 corrige e preserva páginas do bloco 36');
assert.strictEqual(sk1Template.blocks[38].title, 'CONVERSATION CLASS', 'Super Kids 1 preserva Conversation Class');
assert.strictEqual(sk1Template.blocks[40].title, 'PROJECT II', 'Super Kids 1 preserva Project II');
assert(!sk1Template.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Super Kids 1 nao depende das datas do PDF');
assert.strictEqual(sk2Template.blocks.length, 44, 'Super Kids 2 preserva 44 horas-aula');
assert.strictEqual(api.groupedTemplateBlocks(sk2Template).length, 22, 'Super Kids 2 preserva 22 encontros');
assert.strictEqual(sk2Template.blocks[2].unit, 'Back to school', 'Super Kids 2 preserva Back to school');
assert.strictEqual(sk2Template.blocks[24].title, 'PROJECT I', 'Super Kids 2 preserva Project I');
assert.strictEqual(sk2Template.blocks[40].type, 'Final Exam', 'Super Kids 2 preserva Final Exam');
assert.strictEqual(sk2Template.blocks[42].title, 'PROJECT II', 'Super Kids 2 preserva Project II');
assert(!sk2Template.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Super Kids 2 nao depende das datas do PDF');
assert.strictEqual(sk3Template.blocks.length, 44, 'Super Kids 3 preserva 44 linhas da tabela');
assert.strictEqual(api.groupedTemplateBlocks(sk3Template).length, 22, 'Super Kids 3 preserva 22 encontros');
assert.strictEqual(sk3Template.blocks[2].unit, 'Meet the explorers', 'Super Kids 3 preserva Meet the explorers');
assert.strictEqual(sk3Template.blocks[20].type, 'Exam', 'Super Kids 3 preserva Unit 5 como Exam');
assert.strictEqual(sk3Template.blocks[24].title, 'PROJECT I', 'Super Kids 3 preserva Project I');
assert.strictEqual(sk3Template.blocks[42].title, 'FINAL EXAM', 'Super Kids 3 preserva Final Exam');
assert.strictEqual(sk3Template.blocks[43].title, 'PROJECT II', 'Super Kids 3 preserva Project II');
assert(!sk3Template.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Super Kids 3 nao depende das datas do PDF');
assert.strictEqual(sk4Template.blocks.length, 44, 'Super Kids 4 preserva 44 linhas da tabela');
assert.strictEqual(api.groupedTemplateBlocks(sk4Template).length, 22, 'Super Kids 4 preserva 22 encontros');
assert.strictEqual(sk4Template.blocks[2].unit, 'Well done', 'Super Kids 4 preserva Well done');
assert.strictEqual(sk4Template.blocks[20].type, 'Exam', 'Super Kids 4 preserva Unit 5 como Exam');
assert.strictEqual(sk4Template.blocks[24].title, 'PROJECT I', 'Super Kids 4 preserva Project I');
assert.strictEqual(sk4Template.blocks[38].bookPages, '106-111', 'Super Kids 4 normaliza paginas do bloco 39');
assert.strictEqual(sk4Template.blocks[42].title, 'FINAL EXAM', 'Super Kids 4 preserva Final Exam');
assert.strictEqual(sk4Template.blocks[43].title, 'PROJECT II', 'Super Kids 4 preserva Project II');
assert(!sk4Template.blocks.some(block => /2026|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(`${block.bookPages} ${block.content} ${block.title}`)), 'Super Kids 4 nao depende das datas do PDF');

const klass = window.PurpleState.db.classes[0];
const preview = api.generateSchedulePreview(klass, template.id, klass.startDate);
assert.strictEqual(preview.blockCount, 42, 'preview preserva quantidade de blocos');
assert.strictEqual(preview.meetingCount, 21, 'preview preserva quantidade de encontros');
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

const brokenSchedule = {
  ...preview,
  meetings: [
    { ...preview.meetings[0], encounterOrder: 1, date: '2026-09-12' },
    { ...preview.meetings[20], encounterOrder: 21, date: '2026-09-05' },
    { ...preview.meetings[1], encounterOrder: 2, date: '2026-09-26' },
    { ...preview.meetings[2], id: 'repeat-meeting-old', encounterOrder: 22, date: '2026-09-12', changeReason: 'Repeticao do encontro 1' }
  ]
};
assert.deepStrictEqual(api.scheduleMeetings(brokenSchedule).map(m => m.encounterOrder), [1, 2, 21, 22], 'cronograma ordena pela sequência pedagógica, não pela data');
assert.strictEqual(api.normalizeScheduleOrder(brokenSchedule), true, 'normalizacao detecta repeticao antiga');
assert.deepStrictEqual(brokenSchedule.meetings.map(m => m.encounterOrder), [1, 2, 3], 'normalizacao remove repeticao e reordena encontros');

window.PurpleState.db.settings.turmas.generatedSchedules = { [klass.id]: { ...preview, status: 'published' } };
window.PurpleState.db.settings.turmas.blockExecution = {
  [`${klass.id}::${preview.meetings[0].blocks[0].id}`]: { status: 'done' },
  [`${klass.id}::${preview.meetings[0].blocks[1].id}`]: { status: 'partial' }
};
window.PurpleState.db.settings.turmas.pendingBlocks = { [klass.id]: [preview.meetings[0].blocks[1]] };
const progress = api.progressFor(klass);
assert.strictEqual(progress.planned, 42, 'progresso conta blocos planejados');
assert.strictEqual(progress.done, 1, 'progresso conta realizados');
assert.strictEqual(progress.partial, 1, 'progresso conta parciais');
assert.strictEqual(progress.pending, 1, 'progresso conta pendentes');

console.log('turmas-schedule tests passed');
