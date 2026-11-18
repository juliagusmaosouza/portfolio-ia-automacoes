// Roadmap do ciclo de iniciativas - lógica do dashboard (front-end)
// Trecho do <script> do HTML servido pelo Apps Script. Usa classes do Tailwind CSS.
// Os dados chegam do Apps Script via google.script.run e são passados para iniciarDashboard().

let dadosReais = [];
let mesesDinamicos = [];
let dicionarioCores = {};

function iniciarDashboard(dadosBrutos) {
    dadosReais = dadosBrutos;
    calcularMesesDinamicos(dadosReais);
    preencherMultiFiltrosEConstruirCores();
    atualizarDashboard();
}

function parseCustomDate(dtString) {
    if (!dtString) return null;
    let d = new Date(dtString + 'T12:00:00');
    if (!isNaN(d)) return d;
    let partes = dtString.split('/');
    if (partes.length === 3) {
        d = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
        if (!isNaN(d)) return d;
    }
    return null;
}

function extractMonthStr(dtString) {
    const d = parseCustomDate(dtString);
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function calcularMesesDinamicos(dados) {
    let min = parseCustomDate('2026-01-01');
    let max = parseCustomDate('2026-12-31');
    let temData = false;

    for (let d = 0; dados.length > d; d++) {
        let init = dados[d];
        if ((init.status || "").toLowerCase().includes('cancelada')) continue;

        for (let t = 0; init.techs.length > t; t++) {
            let dIni = parseCustomDate(init.techs[t].inicio);
            let dFim = parseCustomDate(init.techs[t].fim);
            if (dIni) { if (!temData || min > dIni) min = dIni; temData = true; }
            if (dFim) { if (!temData || dFim > max) max = dFim; temData = true; }
        }
    }

    if (!temData) { min = new Date(); max = new Date(); max.setMonth(max.getMonth() + 5); }
    min.setDate(1); max.setDate(1);

    const nomeMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let result = [];
    let curr = new Date(min.getTime());

    while (max >= curr && 60 > result.length) {
        result.push({
            id: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`,
            label: `<span class="uppercase text-[10px] font-bold">${nomeMeses[curr.getMonth()]}</span><br><span class="text-[9px] font-normal opacity-70">${String(curr.getFullYear()).slice(2)}</span>`
        });
        curr.setMonth(curr.getMonth() + 1);
    }
    mesesDinamicos = result;
}

function preencherMultiFiltrosEConstruirCores() {
    const sGrsr = new Set(); const sTech = new Set();
    const sMgr = new Set(); const sStatus = new Set();
    const sTipo = new Set(); const sOrigem = new Set();

    dadosReais.forEach(init => {
        if (init.gr_sr) init.gr_sr.split(',').forEach(g => sGrsr.add(g.trim()));
        if (init.gerentes) init.gerentes.split(',').forEach(g => sMgr.add(g.trim()));
        if (init.status) sStatus.add(init.status);
        if (init.tipo) sTipo.add(init.tipo);
        if (init.origem) sOrigem.add(init.origem);
        init.techs.forEach(t => sTech.add(t.nome.trim()));
    });

    const defaultPalette = ["bg-[#6B7280]", "bg-[#3B82F6]", "bg-[#Ec4899]", "bg-[#14B8A6]", "bg-[#6366F1]"];
    let pIdx = 0;

    sTech.forEach(tech => {
        const l = tech.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        let c = "";
        if (l.includes('risco')) c = "bg-[#264FEC] text-white"; // Azul Royal
        else if (l.includes('venda')) c = "bg-[#10B981] text-white"; // Verde
        else if (l === 'produtos de dados') c = "bg-[#8B5CF6] text-white"; // Roxo
        else if (l === 'dados e analytics') c = "bg-[#F59E0B] text-white"; // Laranja/Ambar
        else if (l.includes('f&a') || l.includes('fea')) c = "bg-[#FFBC82] text-brand-marinho"; // Salmão
        else { c = `${defaultPalette[pIdx % defaultPalette.length]} text-white`; pIdx++; }
        dicionarioCores[tech] = c;
    });

    function renderCheckbox(set, containerId, clsName) {
        const c = document.getElementById(containerId);
        c.innerHTML = '';
        Array.from(set).sort().forEach(item => {
            if (!item) return;
            c.innerHTML += `
                <label class="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer group">
                    <input type="checkbox" value="${item}" class="${clsName} brand-checkbox" onchange="atualizarDashboard()">
                    <span class="text-xs text-gray-700 font-medium group-hover:text-brand-marinho">${item}</span>
                </label>`;
        });
    }

    renderCheckbox(sGrsr, 'filter-grsr-container', 'chk-grsr');
    renderCheckbox(sTech, 'filter-tech-container', 'chk-tech');
    renderCheckbox(sMgr, 'filter-mgr-container', 'chk-mgr');
    renderCheckbox(sStatus, 'filter-status-container', 'chk-status');
    renderCheckbox(sTipo, 'filter-tipo-container', 'chk-tipo');
    renderCheckbox(sOrigem, 'filter-origem-container', 'chk-origem');

    const legC = document.getElementById('legend-container');
    legC.innerHTML = '';
    Object.keys(dicionarioCores).sort().forEach(tech => {
        const bg = dicionarioCores[tech].split(' ')[0];
        legC.innerHTML += `<div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded shadow-sm ${bg}"></div><span class="text-xs text-gray-600 font-medium">${tech}</span></div>`;
    });
}

function getCheckedValues(clsName) {
    return Array.from(document.querySelectorAll(`.${clsName}:checked`)).map(cb => cb.value);
}

function atualizarDashboard() {
    const vGrsr = getCheckedValues('chk-grsr');
    const vTech = getCheckedValues('chk-tech');
    const vMgr = getCheckedValues('chk-mgr');
    const vStatus = getCheckedValues('chk-status');
    const vTipo = getCheckedValues('chk-tipo');
    const vOrigem = getCheckedValues('chk-origem');

    // Pega o valor da busca, limpa acentos e transforma em minúscula
    const termoBusca = document.getElementById('search-input').value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

    const atualizaLabel = (valores, idLabel, clsName) => {
        const el = document.getElementById(idLabel);
        const totalCheckboxes = document.querySelectorAll(`.${clsName}`).length;
        if (!el) return;

        if (valores.length === 0) el.textContent = 'Selecionar...';
        else if (valores.length === totalCheckboxes) el.textContent = 'Todos';
        else el.textContent = valores.join(', ');
    };

    atualizaLabel(vGrsr, 'label-grsr', 'chk-grsr');
    atualizaLabel(vTech, 'label-tech', 'chk-tech');
    atualizaLabel(vMgr, 'label-mgr', 'chk-mgr');
    atualizaLabel(vStatus, 'label-status', 'chk-status');
    atualizaLabel(vTipo, 'label-tipo', 'chk-tipo');
    atualizaLabel(vOrigem, 'label-origem', 'chk-origem');

    let df = dadosReais.filter(d => {
        let pGrsr = vGrsr.length === 0 || vGrsr.some(v => d.gr_sr.includes(v));
        let pMgr = vMgr.length === 0 || vMgr.some(v => d.gerentes.includes(v));
        let pStatus = vStatus.length === 0 || vStatus.includes(d.status);
        let pTipo = vTipo.length === 0 || vTipo.includes(d.tipo);
        let pOrigem = vOrigem.length === 0 || vOrigem.includes(d.origem);

        let pBusca = true;
        if (termoBusca !== "") {
            const cod = (d.codigo || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            const tit = (d.titulo || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            pBusca = cod.includes(termoBusca) || tit.includes(termoBusca);
        }

        let temTech = false;
        if (vTech.length === 0) temTech = true;
        else {
            for (let i = 0; d.techs.length > i; i++) {
                if (vTech.includes(d.techs[i].nome)) temTech = true;
            }
        }
        return pGrsr && pMgr && pStatus && pTipo && pOrigem && temTech && pBusca;
    });

    let dataParaRenderizar = JSON.parse(JSON.stringify(df));

    if (vTech.length > 0) {
        for (let i = 0; dataParaRenderizar.length > i; i++) {
            dataParaRenderizar[i].techs = dataParaRenderizar[i].techs.filter(t => vTech.includes(t.nome));
        }
    }

    renderSummaryCards(dataParaRenderizar);
    renderPredictability(dataParaRenderizar);
    renderGantt(dataParaRenderizar);
}

function renderSummaryCards(data) {
    const c = document.getElementById('summary-cards');
    let cInternas = 0; let cInit = 0;
    let andamento = 0; let naoInic = 0; let cancel = 0;

    for (let i = 0; data.length > i; i++) {
        const d = data[i];
        if (d.codigo && d.codigo.toString().toUpperCase().includes('DA')) cInternas++;
        else cInit++;

        let sts = (d.status || "").toLowerCase();
        if (sts.includes('andamento')) andamento++;
        else if (sts.includes('cancelada')) cancel++;
        else naoInic++;
    }

    c.innerHTML = `
        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-brand-marinho flex flex-col justify-center">
            <p class="text-[10px] text-gray-500 font-bold uppercase">Iniciativas</p>
            <p class="text-2xl font-bold text-brand-marinho leading-none mt-1">${cInit}</p>
        </div>
        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-brand-salmao flex flex-col justify-center">
            <p class="text-[10px] text-gray-500 font-bold uppercase">Inic. Internas</p>
            <p class="text-2xl font-bold text-brand-salmao leading-none mt-1">${cInternas}</p>
        </div>
        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-green-500 flex flex-col justify-center">
            <p class="text-[10px] text-gray-500 font-bold uppercase">Em Andamento</p>
            <p class="text-2xl font-bold text-green-600 leading-none mt-1">${andamento}</p>
        </div>
        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-gray-300 flex flex-col justify-center">
            <p class="text-[10px] text-gray-500 font-bold uppercase">Não Iniciadas</p>
            <p class="text-2xl font-bold text-gray-600 leading-none mt-1">${naoInic}</p>
        </div>
        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-red-500 flex flex-col justify-center">
            <p class="text-[10px] text-gray-500 font-bold uppercase">Canceladas</p>
            <p class="text-2xl font-bold text-red-500 leading-none mt-1">${cancel}</p>
        </div>
    `;
}

function renderPredictability(data) {
    const container = document.getElementById('predictability-cards');
    container.innerHTML = '';

    mesesDinamicos.forEach(mes => {
        let entregasFinais = 0;
        let entregasParciais = 0;

        data.forEach(init => {
            if ((init.status || "").toLowerCase().includes('cancelada')) return;

            init.techs.forEach(tech => {
                if (extractMonthStr(tech.fim) === mes.id) entregasFinais++;
                if (extractMonthStr(tech.parcial1) === mes.id) entregasParciais++;
                if (extractMonthStr(tech.parcial2) === mes.id) entregasParciais++;
            });
        });

        const dateObj = parseCustomDate(mes.id + "-01");
        const nomeMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const titleMes = dateObj ? `${nomeMeses[dateObj.getMonth()]} ${String(dateObj.getFullYear()).slice(2)}` : mes.id;

        container.innerHTML += `
            <div class="bg-white min-w-[90px] flex-1 p-2 rounded-xl shadow-sm border border-gray-100 text-center flex flex-col justify-between h-full shrink-0">
                <p class="text-[10px] font-bold text-brand-marinho uppercase mb-2 bg-brand-offwhite py-1 rounded">${titleMes}</p>
                <div>
                    <p class="text-xl font-bold text-brand-royal leading-none">${entregasFinais}</p>
                    <p class="text-[9px] text-gray-500 uppercase font-semibold mt-1">Finais</p>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-50">
                    <p class="text-lg font-bold text-brand-salmao leading-none">${entregasParciais}</p>
                    <p class="text-[9px] text-gray-500 uppercase mt-1">Parciais</p>
                </div>
            </div>
        `;
    });
}

function getManagerTagColor(nomeGerente) {
    if (!nomeGerente) return 'border-gray-300 text-gray-600 bg-gray-50';

    const n = nomeGerente.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

    // Nomes fictícios: substitua pelos responsáveis de cada time
    const listPfInt = ['responsavel a', 'responsavel b', 'responsavel c', 'responsavel d', 'responsavel e'];
    const listPj = ['responsavel f', 'responsavel g', 'responsavel h', 'responsavel i', 'responsavel j'];
    const listAntifraude = ['responsavel k', 'responsavel l', 'responsavel m', 'responsavel n', 'responsavel o'];
    const listCross = ['responsavel p'];

    if (listPfInt.some(gerente => n.includes(gerente))) return 'border-[#264FEC] text-[#264FEC] bg-[#264FEC]/5'; // Azul Royal
    if (listPj.some(gerente => n.includes(gerente))) return 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5'; // Laranja
    if (listAntifraude.some(gerente => n.includes(gerente))) return 'border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/5'; // Roxo
    if (listCross.some(gerente => n.includes(gerente))) return 'border-[#10B981] text-[#10B981] bg-[#10B981]/5'; // Verde

    return 'border-gray-400 text-gray-600 bg-gray-50';
}

function renderGantt(data) {
    document.getElementById('gantt-container').classList.remove('hidden');
    const hMonths = document.getElementById('gantt-header-months');
    const body = document.getElementById('gantt-body');
    const nMeses = mesesDinamicos.length;

    let hHTML = '';
    for (let i = 0; nMeses > i; i++) hHTML += `<div class="flex-1 p-2 text-center border-r border-slate-700 leading-tight flex flex-col justify-center">${mesesDinamicos[i].label}</div>`;
    hMonths.innerHTML = hHTML;

    body.innerHTML = '';
    if (data.length === 0) {
        body.innerHTML = `<div class="p-8 text-center text-gray-500 text-sm font-medium italic w-full">Nenhum resultado.</div>`;
        return;
    }

    const dataHoje = new Date();

    for (let d = 0; data.length > d; d++) {
        const init = data[d];
        let stsL = (init.status || "").toLowerCase();
        let isCancelada = stsL.includes('cancelada');

        let statusColor = 'bg-gray-300';
        if (stsL.includes('andamento')) statusColor = 'bg-green-500';
        else if (isCancelada) statusColor = 'bg-red-500';

        let badgeClass = 'bg-gray-100 border-gray-200 text-gray-600';
        if (init.codigo) {
            const cU = init.codigo.toUpperCase();
            if (cU.includes('DA')) badgeClass = 'bg-purple-100 border-purple-200 text-purple-700';
            else if (cU.includes('CF')) badgeClass = 'bg-blue-100 border-blue-200 text-blue-700';
        }
        let cBadge = init.codigo ? `<span class="px-1.5 py-0.5 rounded text-[10px] border font-bold font-mono uppercase ${badgeClass}">${init.codigo}</span>` : '';

        const row = document.createElement('div');
        row.className = `flex border-b border-gray-100 group transition-colors w-full items-stretch min-h-[50px] ${isCancelada ? 'bg-red-50/40' : 'hover:bg-gray-50'}`;

        let html = `
            <div class="w-[20%] p-3 border-r border-gray-200 bg-white group-hover:bg-gray-50 flex flex-col justify-center shrink-0">
                <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                    ${cBadge}
                    <span class="text-[9px] font-bold text-gray-500 uppercase">${init.gr_sr}</span>
                </div>
                <span class="text-xs font-semibold text-brand-marinho leading-snug break-words whitespace-normal ${isCancelada ? 'line-through text-gray-400' : ''}">${init.titulo}</span>
            </div>
        `;

        html += `<div class="flex-1 flex relative border-r border-gray-200 shrink-0">`;
        html += `<div class="absolute inset-0 flex pointer-events-none z-0">`;
        for (let i = 0; nMeses > i; i++) html += `<div class="flex-1 border-r border-dashed border-gray-200 h-full"></div>`;
        html += `</div>`;

        html += `<div class="w-full py-2 flex flex-col gap-1.5 z-10 relative justify-center h-full">`;

        let validTechs = [];
        let dIniReal = null;
        let dFimReal = null;

        for (let k = 0; init.techs.length > k; k++) {
            const tech = init.techs[k];
            let dataI = parseCustomDate(tech.inicio);
            let dataF = parseCustomDate(tech.fim);
            if (dataI) { if (!dIniReal || dIniReal > dataI) dIniReal = dataI; }
            if (dataF) { if (!dFimReal || dataF > dFimReal) dFimReal = dataF; }

            const sM = extractMonthStr(tech.inicio);
            const eM = extractMonthStr(tech.fim);
            let startIdx = -1; let endIdx = -1;

            for (let x = 0; nMeses > x; x++) {
                if (mesesDinamicos[x].id === sM) startIdx = x;
                if (mesesDinamicos[x].id === eM) endIdx = x;
            }
            if (-1 !== startIdx || -1 !== endIdx) validTechs.push({ tech, startIdx, endIdx });
        }

        // Lógica de Contingência (Fall-back Logic)
        let pctTime = 0;
        let hasManualPct = init.pct_manual !== null && init.pct_manual !== undefined && init.pct_manual !== "";

        if (isCancelada) {
            pctTime = 0;
        } else if (hasManualPct) {
            let val = parseFloat(init.pct_manual);
            if (!isNaN(val)) {
                if (val >= 0 && val <= 1 && (val === 0 || val === 1 || init.pct_manual.toString().includes('.'))) {
                    pctTime = Math.round(val * 100);
                } else {
                    pctTime = Math.round(val);
                }
                if (pctTime > 100) pctTime = 100;
            } else {
                hasManualPct = false;
            }
        }

        if (!isCancelada && !hasManualPct) {
            if (dIniReal && dFimReal) {
                if (dataHoje >= dFimReal) pctTime = 100;
                else if (dIniReal >= dataHoje) pctTime = 0;
                else {
                    let total = dFimReal.getTime() - dIniReal.getTime();
                    let andado = dataHoje.getTime() - dIniReal.getTime();
                    pctTime = Math.round((andado / total) * 100);
                    if (0 > pctTime) pctTime = 0;
                    if (pctTime > 100) pctTime = 100;
                }
            } else if (dIniReal && !dFimReal) {
                pctTime = dataHoje >= dIniReal ? 50 : 0;
            }
        }

        if (isCancelada) {
            html += `
                <div class="relative w-full h-full flex items-center justify-center opacity-80 pointer-events-none">
                    <div class="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold border border-red-200 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        INICIATIVA CANCELADA
                    </div>
                </div>
            `;
        } else {
            for (let v = 0; validTechs.length > v; v++) {
                const item = validTechs[v];
                const sI = -1 === item.startIdx ? 0 : item.startIdx;
                const eI = -1 === item.endIdx ? nMeses - 1 : item.endIdx;

                const leftPercent = (sI / nMeses) * 100;
                const widthPercent = (((eI - sI) + 1) / nMeses) * 100;

                let cClassAndText = dicionarioCores[item.tech.nome] || "bg-[#6B7280] text-white";

                let parciaisHtml = '';
                [item.tech.parcial1, item.tech.parcial2].forEach((dtParcial) => {
                    if (dtParcial) {
                        const pMonth = extractMonthStr(dtParcial);
                        let pIdx = -1;
                        for (let x = 0; nMeses > x; x++) {
                            if (mesesDinamicos[x].id === pMonth) pIdx = x;
                        }
                        if (pIdx !== -1) {
                            const pLeftPercent = ((pIdx + 0.5) / nMeses) * 100;
                            parciaisHtml += `<div class="absolute w-2.5 h-2.5 bg-brand-salmao rotate-45 border border-white top-0 -mt-[4px] z-20 shadow-sm pointer-events-auto" style="left: calc(${pLeftPercent}% - 5px);" title="Entrega Parcial em ${dtParcial}"></div>`;
                        }
                    }
                });

                html += `
                    <div class="relative h-6 pointer-events-auto w-full shrink-0 group/bar">
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bar:block w-max max-w-[200px] bg-white text-brand-marinho text-xs px-3 py-1.5 rounded shadow-lg border border-gray-200 z-[100] font-bold whitespace-normal text-center pointer-events-none">
                            ${item.tech.nome}
                            <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-white"></div>
                        </div>
                        <div class="absolute inset-y-0 rounded shadow-sm flex items-center justify-center overflow-hidden text-[9px] font-bold ${cClassAndText}"
                             style="left: ${leftPercent}%; width: calc(${widthPercent}% - 2px); margin-left: 1px;">
                            <span class="truncate z-10 pointer-events-none px-1.5">${item.tech.nome}</span>
                        </div>
                        ${parciaisHtml}
                    </div>
                `;
            }
        }
        html += `</div></div>`;

        let displayPct = isCancelada ? '-' : `${pctTime}%`;
        html += `
            <div class="w-[8%] p-2 border-r border-gray-200 flex flex-col items-center justify-center text-center shrink-0">
                <span class="text-sm font-bold ${isCancelada ? 'text-gray-400' : 'text-brand-marinho'} leading-none" title="${hasManualPct ? 'Atualizado Manualmente' : 'Cálculo por Tempo'}">${displayPct}</span>
            </div>
        `;

        let gerentesArr = init.gerentes.split(',').map(g => g.trim()).filter(g => g !== "" && g !== "Não Atribuído");
        let mgrHtml = `<span class="text-[10px] text-gray-400 italic">N/A</span>`;

        if (gerentesArr.length > 0) {
            mgrHtml = gerentesArr.map(mgr => {
                let isEmail = mgr.includes('@');
                let nomeLimpo = isEmail ? mgr.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : mgr;
                const tagColorClass = getManagerTagColor(mgr);
                return `<span class="text-[9px] font-bold truncate w-full text-center block mb-1 border-2 rounded-full px-2 py-0.5 ${tagColorClass}" title="${nomeLimpo}">${nomeLimpo}</span>`;
            }).join('');
        }
        html += `<div class="w-[12%] p-2 border-r border-gray-200 flex flex-col justify-center items-center shrink-0 overflow-hidden">${mgrHtml}</div>`;

        html += `
            <div class="w-[10%] p-2 flex flex-col items-center justify-center gap-1 shrink-0 overflow-hidden">
                <div class="flex items-center gap-1.5 w-full justify-center">
                    <div class="w-2.5 h-2.5 rounded-full shadow-inner shrink-0 ${statusColor}"></div>
                    <span class="text-xs font-semibold ${isCancelada ? 'text-red-500 line-through' : 'text-brand-marinho'} leading-tight truncate text-center" title="${init.status}">${init.status || "Não Iniciado"}</span>
                </div>
            </div>
        `;

        row.innerHTML = html;
        body.appendChild(row);
    }
}
