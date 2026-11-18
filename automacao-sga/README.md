# Automação de SG&A

**Objetivo:** alimentar a base de SG&A com os relatórios de despesas de mobilidade (corridas) e de viagens que chegam por e-mail, sem copiar e colar manualmente. Feita para a Diretoria de Crédito, Cobrança e Fraude.

## Funcionamento

1. Um menu "Automações" na planilha dispara duas rotinas. Cada uma busca no Gmail os e-mails não lidos pelo assunto (palavras-chave).
2. **Corridas:** captura o link da planilha compartilhada no corpo do e-mail, lê os dados e converte a data do formato `mês'aa` em data. **Viagens:** captura o link "Efetuar Download", baixa o .xls, converte para Google Sheets, seleciona as colunas necessárias e identifica o mês de competência pelo assunto.
3. Cola os dados após a última linha preenchida da aba de destino, estende as fórmulas das colunas calculadas, apaga o arquivo temporário e marca o e-mail como lido.

## Como configurar

- Copie `Code.gs` para o editor do Apps Script (Extensões > Apps Script) da planilha de destino.
- Crie as abas `Relatório de Corrida` e `Relatório de Viagens` com o cabeçalho na linha 1 (ou altere `nomeAbaDestino`).
- Ajuste `termoBusca` em cada função para o assunto dos e-mails que você recebe.
- Ative o serviço avançado **Drive API (v2)** em Serviços, usado para converter o .xls.
- Não há IDs fixos no código: o ID da planilha de origem é lido do link no e-mail.
