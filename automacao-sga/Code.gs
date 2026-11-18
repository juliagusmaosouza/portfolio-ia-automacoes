// ==========================================
// CRIAÇÃO DO MENU
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Cria um menu exclusivo no topo da planilha
  ui.createMenu('🤖 Automações')
    .addItem('🚗 Importar Corridas (Mobilidade)', 'importarCorridasDrive')
    .addItem('✈️ Importar Viagens (Extrator)', 'importarRelatorioViagens')
    .addToUi();
}

function importarCorridasDrive() {
  // 1. PARAMETRIZAÇÃO DO TERMO DE BUSCA
  var termoBusca = 'subject:("compartilhada") subject:(mobilidade OR corridas) is:unread';
  var nomeAbaDestino = "Relatório de Corrida";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaDestino = ss.getSheetByName(nomeAbaDestino);

  if (!abaDestino) {
    SpreadsheetApp.getUi().alert("Erro: A aba 'Relatório de Corrida' não foi encontrada!");
    return;
  }

  // Dicionário de Meses (Motor de Tradução)
  var mapaMeses = {
    "jan": 0, "fev": 1, "mar": 2, "abr": 3,
    "mai": 4, "jun": 5, "jul": 6, "ago": 7,
    "set": 8, "out": 9, "nov": 10, "dez": 11
  };

  // 2. BUSCA NO GMAIL
  var threads = GmailApp.search(termoBusca);

  if (threads.length == 0) {
    Logger.log("Nenhum e-mail não lido de compartilhamento foi encontrado.");
    return;
  }

  for (var i = 0; i < threads.length; i++) {
    var mensagens = threads[i].getMessages();

    for (var j = 0; j < mensagens.length; j++) {
      var mensagem = mensagens[j];

      if (mensagem.isUnread()) {
        var corpoHtml = mensagem.getBody();

        // 3. CAPTURA DO LINK DA PLANILHA
        var regex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
        var match = corpoHtml.match(regex);

        if (match && match[1]) {
          var idPlanilhaOrigem = match[1];

          try {
            // 4. ABRE A PLANILHA EM SEGUNDO PLANO
            var ssOrigem = SpreadsheetApp.openById(idPlanilhaOrigem);
            var abaOrigem = ssOrigem.getSheets()[0];

            var ultimaLinhaOrigem = abaOrigem.getLastRow();

            // 5. COPIA OS DADOS E FAZ A TRANSFORMAÇÃO DE DATA
            if (ultimaLinhaOrigem > 1) {
              var dados = abaOrigem.getRange(2, 1, ultimaLinhaOrigem - 1, 20).getValues();

              for (var r = 0; r < dados.length; r++) {
                var dataOriginal = String(dados[r][2]).trim(); // Coluna C
                if (dataOriginal.indexOf("'") !== -1) {
                  var partes = dataOriginal.split("'");
                  var mesStr = partes[0].toLowerCase();
                  var anoStr = partes[1];

                  if (mapaMeses[mesStr] !== undefined) {
                    var mesNum = mapaMeses[mesStr];
                    var anoCompleto = parseInt(anoStr.length === 2 ? "20" + anoStr : anoStr);
                    dados[r][2] = new Date(anoCompleto, mesNum, 1);
                  }
                }
              }

              // 6. CÓDIGO BLINDADO: ACHA A ÚLTIMA LINHA REAL DA COLUNA A
              var valoresColunaA = abaDestino.getRange("A:A").getValues();
              var linhaAlvo = 0;
              for (var row = valoresColunaA.length - 1; row >= 0; row--) {
                if (valoresColunaA[row][0] !== "") {
                  linhaAlvo = row + 1;
                  break;
                }
              }

              if (linhaAlvo === 0) {
                linhaAlvo = 2; // Logo abaixo do cabeçalho
              } else {
                linhaAlvo = linhaAlvo + 1;
              }

              // 7. COLA NA PLANILHA BASE
              abaDestino.getRange(linhaAlvo, 1, dados.length, 20).setValues(dados);

              // 8. ARRASTA AS FÓRMULAS NAS COLUNAS U e V
              // Só arrasta se houver uma linha de dados acima para copiar a fórmula
              if (linhaAlvo > 2) {
                var linhaBaseFormulas = linhaAlvo - 1;
                var rangeOrigem = abaDestino.getRange(linhaBaseFormulas, 21, 1, 2); // Pega U e V da linha acima
                var rangeDestino = abaDestino.getRange(linhaBaseFormulas, 21, dados.length + 1, 2); // Desce até o fim dos dados novos
                rangeOrigem.autoFill(rangeDestino, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES);
              }

              Logger.log("Importado e formatado com sucesso: " + dados.length + " corridas.");
            }
          } catch (e) {
            Logger.log("Erro de permissão ou leitura ao acessar a planilha compartilhada: " + e);
          }
        }
        // 9. MARCA O E-MAIL COMO LIDO
        mensagem.markRead();
      }
    }
  }
}

function importarRelatorioViagens() {
  // 1. PARAMETRIZAÇÃO DO TERMO DE BUSCA
  var termoBusca = 'subject:("Relatório de Viagens") is:unread';
  var nomeAbaDestino = "Relatório de Viagens";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaDestino = ss.getSheetByName(nomeAbaDestino);

  if (!abaDestino) {
    SpreadsheetApp.getUi().alert("Erro: A aba 'Relatório de Viagens' não foi encontrada!");
    return;
  }

  var listaMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  var threads = GmailApp.search(termoBusca);
  if (threads.length == 0) {
    Logger.log("Nenhum e-mail de Viagens não lido encontrado.");
    return;
  }

  // 2. MATRIZ DE COLUNAS ORIGINAIS (A=0, B=1... CK=88, CL=89)
  var colunasDesejadas = [
    1, 3, 12, 13, 14, 15, 17, 18, 20, 21, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    39, 45, 46, 47, 50, 51, 52, 54, 55, 56, 57, 62, 63, 66, 67, 68, 71, 72, 73, 74,
    88, 75, 76, 77, 78, 79, 80, 81, 82, 89
  ];

  for (var i = 0; i < threads.length; i++) {
    var mensagens = threads[i].getMessages();

    for (var j = 0; j < mensagens.length; j++) {
      var mensagem = mensagens[j];

      if (mensagem.isUnread()) {
        var assunto = mensagem.getSubject().toLowerCase();
        var corpoHtml = mensagem.getBody();

        // --- INTEGRAÇÃO FP&A: DESCOBRIR MÊS E ANO NO ASSUNTO ---
        var dataCompetencia = new Date(); // Fallback de segurança
        var anoPadrao = dataCompetencia.getFullYear();

        for (var m = 0; m < listaMeses.length; m++) {
          var mesNome = listaMeses[m];

          if (assunto.indexOf(mesNome) !== -1) {
            var anoEncontrado = anoPadrao;

            // Motor Regex: Caça o ano de 2 ou 4 dígitos associado ao mês
            // Identifica: "março 26", "março/26", "março de 2026", "março'26"
            var regexAno = new RegExp(mesNome + "\\s*(?:de\\s*)?['\\/\\-]?\\s*(20\\d{2}|\\d{2})\\b", "i");
            var matchAno = assunto.match(regexAno);

            if (matchAno) {
              var anoStr = matchAno[1];
              // Se tiver apenas 2 dígitos (ex: 26), concatena com "20" para virar 2026
              anoEncontrado = parseInt(anoStr.length === 2 ? "20" + anoStr : anoStr);
            } else {
              // Plano B: Se o ano não estiver colado ao mês, procura qualquer "20XX" solto no assunto
              var fallbackAno = assunto.match(/\b(20\d{2})\b/);
              if (fallbackAno) {
                anoEncontrado = parseInt(fallbackAno[1]);
              }
            }

            // O dia "0" gera matematicamente o último dia do mês calculado
            dataCompetencia = new Date(anoEncontrado, m + 1, 0);
            break; // Mês e ano encontrados, sai do loop
          }
        }
        // -----------------------------------------------------------------

        // 3. CAÇA AO LINK DE DOWNLOAD
        var regexLink = /href="([^"]+)"[^>]*>\s*Efetuar Download/i;
        var matchLink = corpoHtml.match(regexLink);

        if (matchLink && matchLink[1]) {
          var urlDownload = matchLink[1].replace(/&amp;/g, "&");

          try {
            // 4. BAIXA E CONVERTE O ARQUIVO .XLS
            var response = UrlFetchApp.fetch(urlDownload);
            var blob = response.getBlob();

            var tempFile = Drive.Files.insert(
              {
                title: "Temp_Viagens_Import",
                mimeType: MimeType.GOOGLE_SHEETS
              },
              blob,
              { convert: true }
            );

            var ssTemp = SpreadsheetApp.openById(tempFile.id);
            var abaTemp = ssTemp.getSheets()[0];
            var ultimaLinhaTemp = abaTemp.getLastRow();

            if (ultimaLinhaTemp > 1) {
              var dadosBrutos = abaTemp.getRange(2, 1, ultimaLinhaTemp - 1, abaTemp.getLastColumn()).getValues();

              // 5. PINÇA AS COLUNAS NA ORDEM SOLICITADA
              var dadosFiltrados = [];
              for (var r = 0; r < dadosBrutos.length; r++) {
                var linhaOriginal = dadosBrutos[r];
                var linhaFiltrada = [];

                for (var c = 0; c < colunasDesejadas.length; c++) {
                  var idx = colunasDesejadas[c];
                  linhaFiltrada.push(linhaOriginal[idx] !== undefined ? linhaOriginal[idx] : "");
                }
                dadosFiltrados.push(linhaFiltrada);
              }

              // 6. CÓDIGO BLINDADO: ÚLTIMA LINHA REAL DA ABA DESTINO
              var valoresColunaA = abaDestino.getRange("A:A").getValues();
              var linhaAlvo = 0;
              for (var row = valoresColunaA.length - 1; row >= 0; row--) {
                if (valoresColunaA[row][0] !== "") {
                  linhaAlvo = row + 1;
                  break;
                }
              }

              if (linhaAlvo === 0) {
                linhaAlvo = 2;
              } else {
                linhaAlvo = linhaAlvo + 1;
              }

              // 7. COLA OS DADOS ATÉ A COLUNA CL
              abaDestino.getRange(linhaAlvo, 1, dadosFiltrados.length, dadosFiltrados[0].length).setValues(dadosFiltrados);

              // 8. PREENCHER COLUNA BD COM A DATA (MÊS E ANO)
              var arrayDatas = [];
              for (var d = 0; d < dadosFiltrados.length; d++) {
                arrayDatas.push([dataCompetencia]);
              }
              abaDestino.getRange(linhaAlvo, 56, dadosFiltrados.length, 1).setValues(arrayDatas);

              // 9. ARRASTAR FÓRMULAS (AZ até BC)
              if (linhaAlvo > 2) {
                var linhaBaseFormulas = linhaAlvo - 1;
                var rangeOrigemFormulas = abaDestino.getRange(linhaBaseFormulas, 52, 1, 4);
                var rangeDestinoFormulas = abaDestino.getRange(linhaBaseFormulas, 52, dadosFiltrados.length + 1, 4);
                rangeOrigemFormulas.autoFill(rangeDestinoFormulas, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES);
              }

              Logger.log("Importado com sucesso: " + dadosFiltrados.length + " viagens. Competência cravada: " + Utilities.formatDate(dataCompetencia, "GMT-3", "dd/MM/yyyy"));
            }

            // LIMPEZA DO DRIVE
            Drive.Files.remove(tempFile.id);

          } catch (e) {
            Logger.log("Erro de download ou conversão: " + e);
          }
        } else {
          Logger.log("Link 'Efetuar Download' não foi encontrado.");
        }

        mensagem.markRead();
      }
    }
  }
}
