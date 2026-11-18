# Roadmap do ciclo de iniciativas

**Objetivo:** dar uma visão única das iniciativas do ciclo estratégico: cronograma por time, entregas parciais e finais por mês, avanço de cada iniciativa e responsáveis.

## Funcionamento

1. O Apps Script lê a planilha de iniciativas e envia os dados para a página HTML. `iniciarDashboard()` recebe esses dados e calcula o intervalo de meses do roadmap.
2. A página monta filtros múltiplos (área, time, responsável, status, tipo, origem), uma busca por código ou título, cartões-resumo e a previsão de entregas por mês.
3. Desenha um gráfico de Gantt com uma barra por time, marcadores de entregas parciais e o % de avanço. O avanço usa o valor manual da planilha e, se ele estiver vazio, é calculado pelo tempo decorrido entre início e fim.

## Como configurar

- Este arquivo contém a lógica do front-end (`dashboard.js`, trecho do `<script>` da página). O layout HTML e a função `.gs` que lê a planilha não foram incluídos.
- No Apps Script, a função de leitura deve abrir a planilha com `SpreadsheetApp.openById("SEU_ID_AQUI")` e devolver uma lista de objetos com `codigo`, `titulo`, `gr_sr`, `gerentes`, `status`, `tipo`, `origem`, `pct_manual` e `techs` (`nome`, `inicio`, `fim`, `parcial1`, `parcial2`).
- Em `getManagerTagColor()`, troque os nomes fictícios (`responsavel a`, `responsavel b`...) pelos responsáveis de cada time.
- Usa Tailwind CSS. As cores `brand-*` devem ser definidas na configuração do Tailwind.
