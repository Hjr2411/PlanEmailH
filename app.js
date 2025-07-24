// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBCAnTFGReRhjXKeSeGrcH3enK6lL_Uf_Y",
    authDomain: "planh-55e03.firebaseapp.com",
    databaseURL: "https://planh-55e03-default-rtdb.firebaseio.com",
    projectId: "planh-55e03",
    storageBucket: "planh-55e03.firebasestorage.app",
    messagingSenderId: "288085753915",
    appId: "1:288085753915:web:f413cff93946f357f71c1e",
    measurementId: "G-6N2W83NT2N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Global variables
let chamados = [];
let currentUser = null;
let isAdmin = false;

// Função para mostrar alertas
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Função para validar conexão com Firebase
async function validateFirebaseConnection() {
    try {
        const testRef = ref(database, '.info/connected');
        const snapshot = await get(testRef);
        console.log('Conexão Firebase validada:', snapshot.exists());
        return true;
    } catch (error) {
        console.error('Erro na conexão Firebase:', error);
        showAlert('Erro na conexão com o Firebase', 'error');
        return false;
    }
}

// Função para inicializar usuário master
async function initializeMasterUser() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            // Criar usuário master se não existir
            const masterUserRef = ref(database, 'users/master');
            await set(masterUserRef, {
                email: 'HelioGoes@admin.com',
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
            console.log('Usuário master criado');
        }
    } catch (error) {
        console.error('Erro ao inicializar usuário master:', error);
    }
}

// Função de login
async function login(email, password) {
    try {
        // Verificar se é o usuário master
        if (email === 'HelioGoes@admin.com' && password === '976168') {
            currentUser = { email: email, uid: 'master' };
            isAdmin = true;
            localStorage.setItem('planEmailH_user', JSON.stringify(currentUser));
            localStorage.setItem('planEmailH_isAdmin', 'true');
            showLoginSuccess();
            return true;
        }
        
        // Tentar login com Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verificar se é admin no database
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUser = { email: user.email, uid: user.uid };
            isAdmin = userData.isAdmin || false;
            localStorage.setItem('planEmailH_user', JSON.stringify(currentUser));
            localStorage.setItem('planEmailH_isAdmin', isAdmin.toString());
            showLoginSuccess();
            return true;
        } else {
            throw new Error('Usuário não encontrado no sistema');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showAlert('Erro no login: ' + error.message, 'error');
        return false;
    }
}

// Função para mostrar sucesso no login
function showLoginSuccess() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('logoutButton').classList.remove('hidden');
    
    if (isAdmin) {
        document.getElementById('adminButton').classList.remove('hidden');
    }
    
    showAlert('Login realizado com sucesso!');
    loadChamados();
}

// Função de logout
async function logout() {
    try {
        if (currentUser && currentUser.uid !== 'master') {
            await signOut(auth);
        }
        
        currentUser = null;
        isAdmin = false;
        localStorage.removeItem('planEmailH_user');
        localStorage.removeItem('planEmailH_isAdmin');
        
        document.getElementById('loginModal').style.display = 'block';
        document.getElementById('logoutButton').classList.add('hidden');
        document.getElementById('adminButton').classList.add('hidden');
        
        // Limpar o board
        clearKanbanBoard();
        
        showAlert('Logout realizado com sucesso!');
    } catch (error) {
        console.error('Erro no logout:', error);
        showAlert('Erro no logout: ' + error.message, 'error');
    }
}

// Função para verificar autenticação persistente
function checkAuthState() {
    const savedUser = localStorage.getItem('planEmailH_user');
    const savedIsAdmin = localStorage.getItem('planEmailH_isAdmin');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = savedIsAdmin === 'true';
        
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('logoutButton').classList.remove('hidden');
        
        if (isAdmin) {
            document.getElementById('adminButton').classList.remove('hidden');
        }
        
        loadChamados();
    } else {
        document.getElementById('loginModal').style.display = 'block';
    }
}

// Função para criar novo usuário (apenas admin)
async function createUser(email, password, isAdminUser = false) {
    if (!isAdmin) {
        showAlert('Apenas administradores podem criar usuários', 'error');
        return false;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Salvar dados do usuário no database
        const userRef = ref(database, `users/${user.uid}`);
        await set(userRef, {
            email: email,
            isAdmin: isAdminUser,
            createdAt: new Date().toISOString()
        });
        
        showAlert('Usuário criado com sucesso!');
        loadUsers();
        return true;
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        showAlert('Erro ao criar usuário: ' + error.message, 'error');
        return false;
    }
}

// Função para excluir usuário
async function deleteUser(userId) {
    if (!isAdmin) {
        showAlert('Apenas administradores podem excluir usuários', 'error');
        return false;
    }
    
    if (userId === 'master') {
        showAlert('Não é possível excluir o usuário master', 'error');
        return false;
    }
    
    try {
        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);
        showAlert('Usuário excluído com sucesso!');
        loadUsers();
        return true;
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        showAlert('Erro ao excluir usuário: ' + error.message, 'error');
        return false;
    }
}

// Função para carregar usuários
async function loadUsers() {
    if (!isAdmin) return;
    
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';
        
        if (snapshot.exists()) {
            const users = snapshot.val();
            
            // Adicionar usuário master manualmente
            const masterRow = `
                <tr>
                    <td class="px-3 py-4 text-sm text-gray-900">HelioGoes@admin.com</td>
                    <td class="px-3 py-4 text-sm text-gray-900">Sim</td>
                    <td class="px-3 py-4 text-sm text-gray-500">Master</td>
                </tr>
            `;
            tbody.innerHTML += masterRow;
            
            Object.entries(users).forEach(([userId, userData]) => {
                if (userId !== 'master') {
                    const row = `
                        <tr>
                            <td class="px-3 py-4 text-sm text-gray-900">${userData.email}</td>
                            <td class="px-3 py-4 text-sm text-gray-900">${userData.isAdmin ? 'Sim' : 'Não'}</td>
                            <td class="px-3 py-4">
                                <button class="btn-danger" onclick="deleteUser('${userId}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showAlert('Erro ao carregar usuários', 'error');
    }
}

// Função para carregar chamados do Firebase
async function loadChamados() {
    if (!currentUser) return;
    
    try {
        const chamadosRef = ref(database, 'chamados');
        const snapshot = await get(chamadosRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            chamados = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...value
            }));
        } else {
            chamados = [];
        }
        
        renderKanbanBoard();
    } catch (error) {
        console.error('Erro ao carregar chamados:', error);
        // Fallback para localStorage se Firebase falhar
        chamados = JSON.parse(localStorage.getItem('planEmailH_chamados')) || [];
        renderKanbanBoard();
        showAlert('Carregando dados locais (Firebase indisponível)', 'error');
    }
}

// Função para salvar chamados no Firebase
async function saveChamados() {
    if (!currentUser) return;
    
    try {
        const chamadosRef = ref(database, 'chamados');
        const chamadosData = {};
        
        chamados.forEach(chamado => {
            const { id, ...data } = chamado;
            chamadosData[id || Date.now().toString()] = data;
        });
        
        await set(chamadosRef, chamadosData);
        
        // Backup local
        localStorage.setItem('planEmailH_chamados', JSON.stringify(chamados));
    } catch (error) {
        console.error('Erro ao salvar no Firebase:', error);
        // Salvar apenas localmente se Firebase falhar
        localStorage.setItem('planEmailH_chamados', JSON.stringify(chamados));
        showAlert('Dados salvos localmente (Firebase indisponível)', 'error');
    }
}

// Função para calcular prioridade do card
function getCardPriority(dataAtualizacao) {
    if (!dataAtualizacao) return 'red';
    
    const hoje = new Date();
    const dataUpdate = new Date(dataAtualizacao);
    const diffTime = Math.abs(hoje - dataUpdate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'green';
    if (diffDays === 1) return 'green';
    if (diffDays === 2) return 'yellow';
    return 'red';
}

// Função para formatar data abreviada
function formatShortDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Função para formatar data e hora completa
function formatFullDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Função para criar card HTML
function createCardHTML(chamado, index) {
    const priority = getCardPriority(chamado.dataAtualizacao);
    const updates = chamado.updates || [];
    
    let updatesHTML = '';
    if (updates.length > 0) {
        updatesHTML = `
            <div class="card-updates">
                <div class="card-updates-title">Histórico de Atualizações</div>
                ${updates.slice(-3).map(update => `
                    <div class="update-item">
                        <span class="update-date">${formatFullDateTime(update.data)}</span>: ${update.texto}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return `
        <div class="kanban-card priority-${priority}" data-index="${index}">
            <div class="card-header">
                <h3 class="card-title">${chamado.chamado}</h3>
                <div class="card-priority ${priority}"></div>
            </div>
            
            <div class="card-description" onclick="toggleDescription(this)">
                ${chamado.atualizacao || chamado.assunto || 'Sem descrição'}
            </div>
            
            <div class="card-meta">
                <span class="card-analyst">${chamado.analista}</span>
                <span class="card-date">${formatFullDateTime(chamado.dataCriacao || chamado.dataAbertura)}</span>
            </div>
            
            ${updatesHTML}
            
            <div class="card-actions">
                <button class="card-btn edit" onclick="editCard(${index})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="card-btn update" onclick="updateCard(${index})" title="Atualizar">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="card-btn finish" onclick="finishCard(${index})" title="Finalizar">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `;
}

// Função para renderizar o board Kanban
function renderKanbanBoard() {
    const ativosColumn = document.getElementById('ativosColumn');
    const criticosColumn = document.getElementById('criticosColumn');
    const atencaoColumn = document.getElementById('atencaoColumn');
    
    // Limpar colunas
    ativosColumn.innerHTML = '';
    criticosColumn.innerHTML = '';
    atencaoColumn.innerHTML = '';
    
    // Filtrar apenas chamados não finalizados
    const chamadosAtivos = chamados.filter(c => !c.finalizado);
    
    chamadosAtivos.forEach((chamado, index) => {
        const priority = getCardPriority(chamado.dataAtualizacao);
        const cardHTML = createCardHTML(chamado, index);
        
        switch (priority) {
            case 'green':
                ativosColumn.innerHTML += cardHTML;
                break;
            case 'yellow':
                atencaoColumn.innerHTML += cardHTML;
                break;
            case 'red':
                criticosColumn.innerHTML += cardHTML;
                break;
        }
    });
    
    updateStats();
}

// Função para limpar o board
function clearKanbanBoard() {
    document.getElementById('ativosColumn').innerHTML = '';
    document.getElementById('criticosColumn').innerHTML = '';
    document.getElementById('atencaoColumn').innerHTML = '';
    updateStats();
}

// Função para alternar descrição expandida
function toggleDescription(element) {
    element.classList.toggle('expanded');
}

// Função para atualizar estatísticas
function updateStats() {
    const chamadosAtivos = chamados.filter(c => !c.finalizado);
    const ativos = chamadosAtivos.filter(c => getCardPriority(c.dataAtualizacao) === 'green').length;
    const criticos = chamadosAtivos.filter(c => getCardPriority(c.dataAtualizacao) === 'red').length;
    const atencao = chamadosAtivos.filter(c => getCardPriority(c.dataAtualizacao) === 'yellow').length;
    const concluidos = chamados.filter(c => c.finalizado).length;

    document.getElementById('totalAtivos').textContent = ativos;
    document.getElementById('totalVermelho').textContent = criticos;
    document.getElementById('totalAmarelo').textContent = atencao;
    document.getElementById('totalConcluido').textContent = concluidos;
}

// Função para abrir modal
function openModal() {
    if (!currentUser) {
        showAlert('Faça login para criar chamados', 'error');
        return;
    }
    document.getElementById('modal').style.display = 'block';
}

// Função para fechar modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('chamadoForm').reset();
}

// Função para abrir modal admin
function openAdminModal() {
    if (!isAdmin) {
        showAlert('Apenas administradores podem acessar esta área', 'error');
        return;
    }
    document.getElementById('adminModal').style.display = 'block';
    loadUsers();
}

// Função para fechar modal admin
function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

// Função para editar card
function editCard(index) {
    if (!currentUser) return;
    
    const chamado = chamados[index];
    
    // Preencher formulário com dados do chamado
    document.getElementById('analista').value = chamado.analista;
    document.getElementById('chamado').value = chamado.chamado;
    document.getElementById('sistema').value = chamado.sistema || '';
    document.getElementById('cenario').value = chamado.cenario || '';
    document.getElementById('assunto').value = chamado.assunto || '';
    document.getElementById('dataAbertura').value = chamado.dataAbertura || '';
    document.getElementById('dataEnvioN3').value = chamado.dataEnvioN3 || '';
    document.getElementById('fila').value = chamado.fila || '';
    document.getElementById('status').value = chamado.status || '';
    document.getElementById('atualizacao').value = chamado.atualizacao || '';
    
    // Marcar como edição
    document.getElementById('chamadoForm').dataset.editIndex = index;
    document.querySelector('#modal h2').textContent = 'Editar Chamado';
    
    openModal();
}

// Função para atualizar card
function updateCard(index) {
    if (!currentUser) return;
    
    const novaAtualizacao = prompt('Digite a atualização do chamado:');
    if (novaAtualizacao && novaAtualizacao.trim()) {
        const chamado = chamados[index];
        
        // Inicializar array de updates se não existir
        if (!chamado.updates) {
            chamado.updates = [];
        }
        
        // Adicionar nova atualização
        chamado.updates.push({
            texto: novaAtualizacao.trim(),
            data: new Date().toISOString(),
            usuario: currentUser.email
        });
        
        // Atualizar data de última atualização
        chamado.dataAtualizacao = new Date().toISOString();
        
        saveChamados();
        renderKanbanBoard();
        showAlert('Chamado atualizado com sucesso!');
    }
}

// Função para finalizar card
function finishCard(index) {
    if (!currentUser) return;
    
    if (confirm('Tem certeza que deseja finalizar este chamado? Ele não será mais exibido no board.')) {
        chamados[index].finalizado = true;
        chamados[index].dataFinalizacao = new Date().toISOString();
        
        saveChamados();
        renderKanbanBoard();
        showAlert('Chamado finalizado com sucesso!');
    }
}

// Função para exportar para Excel
function exportToExcel() {
    if (!currentUser) {
        showAlert('Faça login para exportar dados', 'error');
        return;
    }
    
    try {
        const ws = XLSX.utils.json_to_sheet(chamados.map(c => ({
            'Analista': c.analista,
            'Chamado': c.chamado,
            'Atualização': c.atualizacao || '',
            'Data Atualização': c.dataAtualizacao ? formatFullDateTime(c.dataAtualizacao) : '',
            'Sistema': c.sistema || '',
            'Cenário': c.cenario || '',
            'Assunto do E-mail': c.assunto || '',
            'Data de Abertura': formatShortDate(c.dataAbertura),
            'Data de Envio para o N3': formatFullDateTime(c.dataEnvioN3),
            'Fila': c.fila || '',
            'Status': c.status || '',
            'Situação': c.finalizado ? 'Finalizado' : 'Ativo',
            'Data Finalização': c.dataFinalizacao ? formatFullDateTime(c.dataFinalizacao) : '',
            'Número de Atualizações': c.updates ? c.updates.length : 0
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PlanEmailH');
        XLSX.writeFile(wb, `PlanEmailH_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showAlert('Arquivo Excel exportado com sucesso!');
    } catch (error) {
        console.error('Erro na exportação:', error);
        showAlert('Erro ao exportar arquivo Excel', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
    // Validar conexão Firebase
    await validateFirebaseConnection();
    await initializeMasterUser();
    
    // Verificar estado de autenticação
    checkAuthState();
    
    // Event listener para login
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });
    
    // Event listener para formulário de chamado
    document.getElementById('chamadoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            showAlert('Faça login para criar chamados', 'error');
            return;
        }
        
        const editIndex = this.dataset.editIndex;
        const isEdit = editIndex !== undefined;
        
        const chamadoData = {
            analista: document.getElementById('analista').value,
            chamado: document.getElementById('chamado').value,
            atualizacao: document.getElementById('atualizacao').value,
            sistema: document.getElementById('sistema').value,
            cenario: document.getElementById('cenario').value,
            assunto: document.getElementById('assunto').value,
            dataAbertura: document.getElementById('dataAbertura').value,
            dataEnvioN3: document.getElementById('dataEnvioN3').value,
            fila: document.getElementById('fila').value,
            status: document.getElementById('status').value,
            dataAtualizacao: new Date().toISOString(),
            finalizado: false,
            criadoPor: currentUser.email
        };
        
        if (isEdit) {
            // Atualizar chamado existente
            const index = parseInt(editIndex);
            chamados[index] = { ...chamados[index], ...chamadoData };
            delete this.dataset.editIndex;
            document.querySelector('#modal h2').textContent = 'Novo Chamado';
            showAlert('Chamado atualizado com sucesso!');
        } else {
            // Criar novo chamado
            chamadoData.id = Date.now().toString();
            chamadoData.dataCriacao = new Date().toISOString();
            chamados.push(chamadoData);
            showAlert('Chamado cadastrado com sucesso!');
        }
        
        saveChamados();
        renderKanbanBoard();
        closeModal();
    });
    
    // Event listener para formulário de usuário
    document.getElementById('userForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const isAdminUser = document.getElementById('isAdmin').checked;
        
        const success = await createUser(email, password, isAdminUser);
        if (success) {
            document.getElementById('userForm').reset();
        }
    });
    
    // Definir data atual como padrão
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataAbertura').value = today;
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dataEnvioN3').value = now.toISOString().slice(0, 16);
});

// Fechar modais clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    const loginModal = document.getElementById('loginModal');
    const adminModal = document.getElementById('adminModal');
    
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === adminModal) {
        closeAdminModal();
    }
    // Não permitir fechar o modal de login clicando fora
}

// Atualizar board a cada minuto
setInterval(() => {
    if (currentUser) {
        renderKanbanBoard();
    }
}, 60000);

// Expor funções globais
window.openModal = openModal;
window.closeModal = closeModal;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.logout = logout;
window.editCard = editCard;
window.updateCard = updateCard;
window.finishCard = finishCard;
window.deleteUser = deleteUser;
window.exportToExcel = exportToExcel;
window.toggleDescription = toggleDescription;

