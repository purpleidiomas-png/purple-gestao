# Purple Gestão — Auditoria do legado remanescente

Data de referência: 2026-08-28

Critério usado:

- bloco legado = função `*LegacyN` criada na Fase 0;
- caller = qualquer referência além da própria declaração dentro de `app.js`.

Resultado objetivo:

- todos os blocos `Legacy` atuais ficaram com `0` callers.

## Classificação

### PODE REMOVER

Blocos sem caller e sem uso observado:

- TWR legado:
  - `setTwrTeacherLegacy1`
  - `twrOpenLessonLegacy1`
  - `renderTWRLegacy1`

- Financeiro ERP/legado:
  - `financialEntriesLegacy1`
  - `financialFilteredEntriesLegacy1`
  - `financialStatusForLegacy1`
  - `financialTotalsLegacy1`
  - `financialTabsLegacy1`
  - `renderFinancialHubLegacy1`
  - `renderFinancialOverviewLegacy1`
  - `renderFinancialLedgerLegacy1`
  - `financialRowLegacy1`
  - `editFinancialEntryLegacy1..7`
  - `saveFinancialEntryLegacy1..6`
  - `markFinancialPaidLegacy1`
  - `deleteFinancialEntryLegacy1`
  - `openFinancialActionLegacy1..3`
  - `openFinancialDetailsLegacy1..2`
  - `confirmCancelFinancialChargeLegacy1`
  - `cancelFinancialChargeLegacy1`
  - `financialIsAsaasLegacy1..4`
  - `financialPrimaryLinkLegacy1..4`
  - `financialExternalCodeLegacy1..4`
  - `financialInstallmentLabelLegacy1..2`
  - `financialCurrentValueLegacy1..2`
  - `financialScheduleFromFormLegacy1..3`
  - `refreshFinancialPreviewLegacy1..2`
  - `updateFinancialStudentDefaultsLegacy1..4`
  - `financialEntryFromChargeLegacy1`
  - `openFinancialChargeResultModalLegacy1`

- Financeiro do aluno / UI intermediária:
  - `studentTabsLegacy1`
  - `studentMoneyRowsLegacy1`
  - `studentFinancialTotalsLegacy1..4`
  - `studentFirstOpenFinancialEntryLegacy1`
  - `studentFinancialMenuActionsLegacy1..2`
  - `closeStudentFinancialMenuLegacy1`
  - `positionStudentFinancialMenuLegacy1`
  - `openStudentFinancialMenuLegacy1`
  - `toggleStudentFinancialMenuLegacy1`
  - `handleStudentFinancialMenuActionLegacy1..2`
  - `bindStudentFinancialMenuDelegationLegacy1`
  - `studentFinancialQuickActionsLegacy1..4`
  - `openStudentFinancialPaymentLegacy1`
  - `saveStudentFinancialPaymentLegacy1`
  - `confirmArchiveHistoricalPaymentLegacy1`
  - `archiveHistoricalPaymentLegacy1..2`
  - `openHistoricalPaymentLegacy1`
  - `saveHistoricalPaymentsLegacy1`
  - `studentPaymentsContentFullLegacy1..5`

- Student UI duplicada:
  - `studentDetailContentNextV2Legacy1..4`
  - `renderStudentRecordLegacy1..2`
  - `studentDataContentFullLegacy1`

- Helpers soltos:
  - `financialChargeRowToRecordLegacy1`
  - `formatBRLLegacy1`
  - `parseBRLInputLegacy1`
  - `formatFinancialMoneyInputLegacy1..2`
  - `financialMoneyInputLegacy1..2`
  - `financialReadMoneyLegacy1..2`
  - `financialCompetenceFromDueLegacy1`
  - `financialCompetenceHumanLegacy1`
  - `financialDescriptionFromPartsLegacy1`
  - `financialStatusLabelLegacy1`
  - `financialStatusToneLegacy1..2`
  - `financialOriginLabelLegacy1..2`
  - `studentFinancialDefaultMethodLegacy1`
  - `uppercaseTypedValueLegacy1`
  - `meetingVisibleLegacy1`

### AINDA POSSUI CALLER

- nenhum bloco `Legacy` encontrado

### COMPATIBILIDADE NECESSÁRIA

- nenhum bloco `Legacy` comprovadamente necessário hoje

### PRECISA FUNDIR

- nenhum bloco `Legacy` comprovadamente precisando fusão após a Fase 0;
- a fusão necessária passou a ser de fonte de dados, não mais de funções homônimas.

### DESCONHECIDO

- nenhum bloco `Legacy` ficou sem classificação operacional;
- a única incerteza remanescente é de negócio/dados, não de caller de função.

## Conclusão

A Fase 0 resolveu a quality gate estática, mas deixou um passivo objetivo:

- o legado não está mais colidindo por nome;
- porém ele ainda ocupa volume real dentro de `app.js`;
- a próxima remoção pode ser feita com segurança técnica, porque os blocos renomeados não têm caller observado.

Recomendação:

- remover fisicamente esses blocos numa fase dedicada de limpeza estrutural;
- fazer isso depois de fixar a fonte canônica dos domínios híbridos, para não misturar limpeza textual com mudança de arquitetura.
