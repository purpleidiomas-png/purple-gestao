const assert = require('assert');

const fields = {};
const field = value => ({ value, classList: { add(){}, remove(){}, contains(){ return false; } }, textContent: '' });

global.window = {
  PurpleState: {
    user: { name: 'Teste', role: 'direction', sector: 'pedagogico', accessScope: 'all_sectors', permissions: { 'panel.view': true, 'reports.view': true } },
    db: {
      settings: { turmas: { attendance: {}, generatedSchedules: {} }, studentGradeTypes: ['Speaking'] },
      classes: [{ id: 'class-test', name: 'DISCOVER 3', course: 'DISCOVER', status: 'Ativa', scheduleBlocks: [{ day: 'QUARTA', time: '08:00' }] }, { id: 'class-sk2', name: 'SUPER KIDS 2', course: 'SUPER KIDS', status: 'Ativa' }],
      students: [{ id: 'stu-test', name: 'NICOLE MIRANDA FUENTES', classId: 'class-test', situation: 'Ativo', gradeEntries: [], attendanceEntries: [] }, { id: 'stu-sk2', name: 'ALUNO SUPER KIDS', className: 'SUPER KIDS 2', situation: 'Ativo', gradeEntries: [], attendanceEntries: [] }],
      teachers: [],
      inventoryItems: [{ id: 'book-next', name: 'DISCOVER 4', course: 'DISCOVER', level: '4' }]
    }
  },
  PurpleStorage: { save: async () => {} },
  App: { toast: () => {}, renderPage: () => {}, closeModal: () => {} }
};
global.document = {
  querySelector: selector => fields[selector] || null,
  getElementById: () => ({ innerHTML: '' }),
  body: { classList: { add: () => {} } }
};
global.CSS = { escape: value => String(value) };
global.confirm = () => true;

require('../modules/turmas/turmas.js');

(async () => {
  const api = window.PurpleTurmas;
  const test = api._test;

  assert(test.gradeTypes().includes('Homework'), 'tipo homework único fica disponível');
  assert(!test.gradeTypes().includes('Homework Unit 14'), 'homework por unidade sai do campo tipo');
  assert.strictEqual(test.classStudents('class-sk2').length, 1, 'turma recupera aluno salvo com className legado');

  await api.setAttendance('class-test', 'stu-test', 'absent', '', { force: true });
  assert.strictEqual(test.attendanceStats('stu-test', 'class-test').percent, 0, 'falta reduz frequência');
  assert.strictEqual(test.attendanceStats('stu-test', 'class-test').absences, 1, 'falta conta como falta');

  await api.setAttendance('class-test', 'stu-test', 'replacement', '', { force: true });
  const stats = test.attendanceStats('stu-test', 'class-test');
  assert.strictEqual(stats.percent, 100, 'reposição realizada não reduz frequência');
  assert.strictEqual(stats.absences, 1, 'reposição mantém falta registrada');
  assert.strictEqual(stats.replacements, 1, 'reposição conta no indicador');
  assert.strictEqual(window.PurpleState.db.students[0].attendanceEntries[0].present, false, 'perfil do aluno mantém falta como não presente');
  assert.strictEqual(window.PurpleState.db.students[0].attendanceEntries[0].replacementDone, true, 'perfil do aluno marca reposição realizada');

  fields['#classGradeStudent'] = field('stu-test');
  fields['#classGradeType'] = field('Speaking');
  fields['#classGradeScore'] = field('92');
  fields['#classGradeDate'] = field('2026-09-23');
  fields['#classGradeModule'] = field('DISCOVER 3');
  fields['#classGradeStatus'] = field('Lançado');
  fields['#classGradeNotes'] = field('Nota lançada pela turma');
  await api.saveClassGrade('class-test');

  assert.strictEqual(window.PurpleState.db.classes[0].gradeEntries.length, 1, 'nota fica vinculada à turma');
  assert.strictEqual(window.PurpleState.db.students[0].gradeEntries.length, 1, 'nota espelha no perfil do aluno');
  assert.strictEqual(window.PurpleState.db.students[0].gradeEntries[0].classId, 'class-test', 'nota do aluno mantém vínculo da turma');
  async function launch(type, score, unit = ''){
    fields['#classGradeType'] = field(type);
    fields['#classGradeScore'] = field(String(score));
    fields['#classGradeUnit'] = field(unit);
    await api.saveClassGrade('class-test');
  }
  await launch('Participation', 100);
  await launch('Listening', 90);
  await launch('Writing', 80);
  await launch('Reading', 87);
  await launch('Midterm Exam', 75);
  await launch('Final Term', 79);
  await launch('Homework', 100, 'Unit 13');
  await launch('Homework', 80, 'Unit 14');
  const summary = test.studentClassGradeSummary('stu-test', 'class-test');
  assert(Math.abs(summary.finalAverage - 86.6) < 0.2, 'média final deve usar apenas avaliações permitidas e homework consolidado');
  assert.strictEqual(summary.homeworkAverage, 90, 'homework 13/14 entra na média de homework');
  fields['#nextClassName'] = field('DISCOVER 4');
  fields['#nextClassStart'] = field('2026-10-01');
  await api.createNextClassFromCompleted('class-test');
  const nextClass = window.PurpleState.db.classes.find(item => item.name === 'DISCOVER 4');
  assert(nextClass, 'concluir deve criar próxima turma sugerida');
  assert.strictEqual(window.PurpleState.db.classes.find(item => item.id === 'class-test').status, 'Concluída', 'turma anterior fica concluída');
  assert.strictEqual(window.PurpleState.db.students[0].classId, nextClass.id, 'aluno é transferido para a próxima turma');
  assert.strictEqual(nextClass.studentIds.includes('stu-test'), true, 'nova turma recebe lista de alunos');
  assert.strictEqual(window.PurpleState.db.students[0].moduleHistories.length, 1, 'concluir turma grava histórico do módulo no aluno');
  assert.strictEqual(window.PurpleState.db.students[0].moduleHistories[0].status, 'Aprovado', 'histórico do módulo salva situação final');

  console.log('turmas grades and attendance tests passed');
})();
