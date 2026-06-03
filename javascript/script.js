let clients = JSON.parse(localStorage.getItem('marmita_v4_data')) || [];
let precoMarmitaPadrao = parseFloat(localStorage.getItem('marmita_preco_padrao')) || 15.00;
let currentClientId = null;



// Persistência local segura
function save() {
    localStorage.setItem('marmita_v4_data', JSON.stringify(clients));
    render();
}

// Manipuladores globais de interface
function openModal(id) { 
    document.getElementById(id).style.display = "block"; 
}

function closeModal(id) { 
    document.getElementById(id).style.display = "none"; 
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// --- CONTROLE DE CLIENTES (SALVANDO SEMPRE EM MAIÚSCULO) ---
function addClient() {
    const name = document.getElementById('name').value.toUpperCase().trim();
    const phone = document.getElementById('phone').value.trim();
    const limit = document.getElementById('limit').value;

    if (!name || !phone) return alert("Preencha Nome e WhatsApp.");

    clients.push({
        id: Date.now(),
        name: name, // Forçado em caixa alta
        phone: phone,
        limit: parseFloat(limit) || 0,
        debt: 0,
        totalMarmitas: 0,
        history: []
    });

    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('limit').value = '';
    closeModal('modalAdd');
    save();
}

function openEditModal(id) {
    const client = clients.find(c => c.id === id);
    document.getElementById('editId').value = client.id;
    document.getElementById('editName').value = client.name;
    document.getElementById('editPhone').value = client.phone;
    document.getElementById('editLimit').value = client.limit;
    openModal('modalEdit');
}

function saveEdit() {
    const id = parseInt(document.getElementById('editId').value);
    const client = clients.find(c => c.id === id);
    
    // Atualiza forçando caixa alta e limpando espaços espalhados
    client.name = document.getElementById('editName').value.toUpperCase().trim();
    client.phone = document.getElementById('editPhone').value.trim();
    client.limit = parseFloat(document.getElementById('editLimit').value) || 0;

    closeModal('modalEdit');
    save();
}

function deleteClient(id) {
    const client = clients.find(c => c.id === id);
    if (confirm(`Excluir definitivamente ${client.name}?`)) {
        clients = clients.filter(c => c.id !== id);
        save();
    }
}

// --- LÓGICA DO PENDURA COM BARREIRA DE LIMITE ---
function pendura(id) {
    const client = clients.find(c => c.id === id);
    document.getElementById('penduraId').value = id;
    document.getElementById('penduraTitle').innerText = `Venda para ${client.name}`;
    
    // Injeta automaticamente o preço padrão configurado
    document.getElementById('penduraValor').value = precoMarmitaPadrao.toFixed(2);
    document.getElementById('penduraQtd').value = "1";
    
    openModal('modalPendura');
}

// Função para alterar o preço padrão ao clicar na pílula de saldo geral
// Abre o modal customizado já preenchendo o valor atual no campo de texto
function alterarPrecoMarmita() {
    const input = document.getElementById('inputNovoPreco');
    if (input) {
        input.value = precoMarmitaPadrao.toFixed(2);
    }
    openModal('modalPreco');
}

// Valida e salva o novo preço vindo do modal
function salvarNovoPrecoModal() {
    const input = document.getElementById('inputNovoPreco');
    if (!input) return;

    // Converte e trata caso o usuário digite com vírgula
    const novoPreco = parseFloat(input.value.replace(',', '.'));

    if (!isNaN(novoPreco) && novoPreco > 0) {
        precoMarmitaPadrao = novoPreco;
        localStorage.setItem('marmita_preco_padrao', novoPreco); // Garante a persistência local
        
        closeModal('modalPreco');
        
        // Feedback visual rápido se você já tiver um sistema de alertas ou use o nativo temporariamente
        alert(`Preço padrão atualizado para R$ ${novoPreco.toFixed(2)}!`);
    } else {
        alert("Por favor, insira um valor válido maior que zero.");
    }
}



function confirmarPendura() {
    const id = parseInt(document.getElementById('penduraId').value);
    const valorUnitario = parseFloat(document.getElementById('penduraValor').value);
    const qtd = parseInt(document.getElementById('penduraQtd').value);
    const client = clients.find(c => c.id === id);

    if (valorUnitario > 0 && qtd > 0) {
        const valorTotalVenda = valorUnitario * qtd;
        const novaDivida = (client.debt || 0) + valorTotalVenda;

        // SISTEMA DE VALIDAÇÃO DE CRÉDITO
        if (client.limit > 0 && novaDivida > client.limit) {
            const msgElement = document.getElementById('limiteMsg');
            
            msgElement.innerHTML = `
                <p><strong>⛔ Venda Bloqueada para ${client.name}</strong></p>
                <p>O limite deste cliente é de <b>R$ ${client.limit.toFixed(2)}</b>.</p>
                <p>Com este pedido, a conta chegaria a <b>R$ ${novaDivida.toFixed(2)}</b>.</p>
                <p>Para não virar uma "bola de neve" e evitar prejuízos, receba um pagamento antes de liberar novas Quentinha(s).</p>
            `;
            
            closeModal('modalPendura'); 
            openModal('modalLimite');    
            return; 
        }

        client.debt = (client.debt || 0) + valorTotalVenda;
        client.totalMarmitas = (client.totalMarmitas || 0) + qtd;
        
        client.history.push({ 
            tipo: 'Venda', 
            valor: valorTotalVenda, 
            qtd: qtd, 
            data: new Date().toLocaleString('pt-BR') 
        });

        closeModal('modalPendura');
        save();
    } else {
        alert("Insira valores válidos!");
    }
}

// --- NOVO SISTEMA DE PAGAMENTO BONITO EM 2 PASSOS ---
function pagar(id) {
    const client = clients.find(c => c.id === id);
    document.getElementById('pagarId').value = id;
    document.getElementById('infoDividaAtual').innerText = `Dívida total atual: R$ ${client.debt.toFixed(2)}`;
    document.getElementById('inputValorPago').value = client.debt.toFixed(2);
    
    openModal('modalPagarValor');
}

function proximoPassoPagamento() {
    const id = parseInt(document.getElementById('pagarId').value);
    const valorPago = parseFloat(document.getElementById('inputValorPago').value);
    const client = clients.find(c => c.id === id);

    if (isNaN(valorPago) || valorPago <= 0) return alert("Insira um valor válido!");

    // Abatimento automático calculado por ticket médio de consumo
    let sugestao = 0;
    if (client.debt > 0 && client.totalMarmitas > 0) {
        const precoMedio = client.debt / client.totalMarmitas;
        sugestao = Math.floor(valorPago / precoMedio);
    }

    document.getElementById('infoPagamentoFeito').innerText = `Valor recebido: R$ ${valorPago.toFixed(2)}`;
    document.getElementById('spanMarmitasPendentes').innerText = client.totalMarmitas;
    document.getElementById('inputQtdAbatida').value = sugestao;

    closeModal('modalPagarValor');
    openModal('modalPagarMarmitas');
}

function confirmarPagamentoFinal() {
    const id = parseInt(document.getElementById('pagarId').value);
    const valorPago = parseFloat(document.getElementById('inputValorPago').value);
    const qtdAbatida = parseInt(document.getElementById('inputQtdAbatida').value);
    const client = clients.find(c => c.id === id);

    if (!client) return alert("Cliente não encontrado!");

    // 1. Primeiro salva a ação no histórico do cliente com os valores originais informados
    client.history.push({ 
        tipo: 'Pago', 
        valor: valorPago, 
        qtdAbatida: qtdAbatida || 0,
        data: new Date().toLocaleString('pt-BR') 
    });

    // 2. Realiza o abatimento dos valores no saldo do cliente
    client.debt -= valorPago;
    if (!isNaN(qtdAbatida)) {
        client.totalMarmitas = Math.max(0, (client.totalMarmitas || 0) - qtdAbatida);
    }

    // 3. Trava de segurança: Se a dívida foi totalmente quitada (ou ficou negativa por digitação), zera as pendências
    // Sem mexer ou apagar o array client.history!
    if (client.debt <= 0) {
        client.debt = 0;
        client.totalMarmitas = 0;
    }

    // 4. Fecha a tela e sincroniza no LocalStorage
    closeModal('modalPagarMarmitas');
    save();
}


// --- EXTRATO EXCLUSIVO COM SCROLL VERTICAL ---
function showHistory(id) {
    currentClientId = id; // Guarda o ID para o filtro
    const client = clients.find(c => c.id === id);
    const content = document.getElementById('historyContent');
    const filtroMes = document.getElementById('filtroMes');
    const resumoMensal = document.getElementById('resumoMensal');
    
    if (!client) return;
    document.getElementById('modalTitle').innerText = client.name;
    
    // Armazena o mês que já estava selecionado antes de atualizar a tela (se houver)
    const mesPreSelecionado = filtroMes ? filtroMes.value : 'todos';
    
    // 1. Preencher opções de meses isolando estritamente os caracteres de MM/AAAA (ex: 06/2026)
    if (!client.history || client.history.length === 0) {
        filtroMes.innerHTML = '<option value="todos">Todos os meses</option>';
    } else {
        // Pega apenas do caractere 0 ao 10 (data pura), depois remove o dia pegando a partir do caractere 3 (MM/AAAA)
        const meses = [...new Set(client.history.map(h => {
            const dataPura = h.data.split(' ')[0]; // Separa a data do horário pelo espaço
            return dataPura.substring(3); // Devolve apenas MM/AAAA
        }))].filter(m => m); // Remove valores inválidos

        filtroMes.innerHTML = '<option value="todos">Todos os meses</option>' + 
                              meses.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    // Restaura o valor selecionado se ele ainda existir nas opções
    if ([...filtroMes.options].some(opt => opt.value === mesPreSelecionado)) {
        filtroMes.value = mesPreSelecionado;
    } else {
        filtroMes.value = 'todos';
    }

    // 2. Filtrar dados tratando a string da data da mesma forma limpa
    const mesSelecionado = filtroMes.value;
    const historicoFiltrado = mesSelecionado === 'todos' 
        ? (client.history || []) 
        : (client.history || []).filter(h => {
            const dataPura = h.data.split(' ')[0];
            return dataPura.substring(3) === mesSelecionado;
        });

    // 3. Calcular resumo financeiro com base no filtro aplicado
    const totalVendas = historicoFiltrado.filter(h => h.tipo === 'Venda').reduce((acc, h) => acc + (h.valor || 0), 0);
    const totalPagos = historicoFiltrado.filter(h => h.tipo === 'Pago').reduce((acc, h) => acc + (h.valor || 0), 0);
    
    resumoMensal.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-family: sans-serif; font-weight: 600;">
            <span style="color:#475569;">Vendas: <b style="color:#e74c3c;">R$ ${totalVendas.toFixed(2)}</b></span>
            <span style="color:#475569;">Pagos: <b style="color:#27ae60;">R$ ${totalPagos.toFixed(2)}</b></span>
        </div>
    `;

    // 4. Renderizar a lista de transações na tela
    if (historicoFiltrado.length === 0) {
        content.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8; font-family: sans-serif;">Nenhum registro neste mês.</p>';
    } else {
        content.innerHTML = [...historicoFiltrado].reverse().map(h => {
            const isVenda = h.tipo === 'Venda';
            const color = isVenda ? '#e74c3c' : '#27ae60';
            const icon = isVenda ? 'arrow-down-circle' : 'arrow-up-circle';
            
            let detalheMarmitas = isVenda 
                ? (h.qtd ? `<span>${h.qtd} - Quentinha</span>` : '')
                : `<br><small style="color:#27ae60; font-weight:500;">↳ Quitadas: ${h.qtdAbatida || 0} Quentinha</small>`;

            return `
                <div style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-family: sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: ${color}; font-size: 0.9rem;">
                                <i class="bi bi-${icon}"></i> ${h.tipo.toUpperCase()}
                            </strong>
                            ${isVenda ? detalheMarmitas : ''}
                        </div>
                        <span style="font-weight: bold; color: ${color};">
                            ${isVenda ? '-' : '+'} R$ ${h.valor.toFixed(2)}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                        <small style="color: #888;">${h.data}</small>
                        ${!isVenda ? detalheMarmitas : ''}
                    </div>
                </div>`;
        }).join('');
    }

    openModal('modalHistory');
}



function sendWhatsApp(id) {
    const client = clients.find(c => c.id === id);
    const msg = `Olá ${client.name}! Seu saldo pendente no momento é R$ ${client.debt.toFixed(2)} (${client.totalMarmitas || 0} quentinhas pendentes).`;
    window.open(`https://api.whatsapp.com/send?phone=55${client.phone.replace(/\D/g,'')}&text=${encodeURIComponent(msg)}`, '_blank');
}

// --- RENDERIZADOR COMPLETO DA INTERFACE ---
function render() {
    const list = document.getElementById('clientList');
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    if (!list) return;
    list.innerHTML = '';

    // Filtragem bidirecional (nome ou número)
    const filtered = clients.filter(c => {
        const nome = (c.name || "").toLowerCase();
        const telefone = (c.phone || "");
        return nome.includes(search) || telefone.includes(search);
    });

    const totalDevedorGeral = clients.reduce((acc, c) => acc + (c.debt || 0), 0);

    // Ordenação inteligente: Clientes com maiores dívidas aparecem primeiro
    filtered.sort((a,b) => (b.debt || 0) - (a.debt || 0)).forEach(c => {
        const badgeMarmitas = c.totalMarmitas > 0 
            ? `<span class="badge-marmitas">Devendo: ${c.totalMarmitas}</span>` 
            : "✅";
            
        const classeStatus = (c.debt > 0) ? 'card-devedor' : 'card-quitado';

        list.innerHTML += `
            <div class="card ${classeStatus}">
                <div class="client-header">
                    <div class="client-info-box">
                        <span class="client-name">${c.name}</span><br>
                        <small>WhatsApp: ${c.phone}</small> 
                    </div>
                    <span class="debt-value">R$ ${(c.debt || 0).toFixed(2)}</span>
                </div>
                
                <div class="admin-actions">
                    <button class="btn-mini btn-mini-edit" onclick="openEditModal(${c.id})">✏️ Editar</button>
                    <button class="btn-mini btn-mini-del" onclick="deleteClient(${c.id})">🗑️ Excluir</button>
                    ${badgeMarmitas}
                </div>

                <div class="grid-actions">
                    <button class="btn-action btn-pendura" onclick="pendura(${c.id})">+ Pendurar</button>
                    <button class="btn-action btn-pagar" onclick="pagar(${c.id})">Pagou</button>
                    <button class="btn-action btn-hist" onclick="showHistory(${c.id})">Extrato</button>
                    <button class="btn-action btn-whats" onclick="sendWhatsApp(${c.id})">
                        <i class="bi bi-whatsapp"></i> Cobrar via WhatsApp
                    </button>
                </div>
            </div>`;
    });
    
    const totalDisplay = document.querySelector('#total-geral .total-value');
    if (totalDisplay) {
        totalDisplay.innerText = `R$ ${totalDevedorGeral.toFixed(2)}`;
    }
}



// Inicialização segura da aplicação
window.onload = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = ''; 
    render();
};
