// Firebase Configuration - SINGLE INITIALIZATION
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    push, 
    remove, 
    onDisconnect,
    onValue,
    off
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase config - substitua pelos seus dados
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase - ONLY ONCE
let app, database;
let currentUser = null;
let chamadosData = {};
let connectionRef = null;

// Connection monitoring
let isConnected = false;
let reconnectInterval = null;

// Initialize Firebase and setup connection monitoring
function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        // Monitor connection status
        connectionRef = ref(database, '.info/connected');
        onValue(connectionRef, (snapshot) => {
            isConnected = snapshot.val();
            updateConnectionStatus();
            
            if (isConnected && reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            } else if (!isConnected && !reconnectInterval) {
                startReconnectionAttempts();
            }
        });
        
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showConnectionStatus('Erro na conexão', 'error');
        return false;
    }
}

// Connection status management
function updateConnectionStatus() {
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (isConnected) {
        statusDiv.className = 'mb-4 p-3 rounded-lg bg-green-100 border-l-4 border-green-500';
        statusText.innerHTML = '<i class="fas fa-check-circle text-green-600 mr-2"></i>Conectado';
        statusText.className = 'text-green-800';
        
        // Hide after 3 seconds if connected
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    } else {
        statusDiv.className = 'mb-4 p-3 rounded-lg bg-red-100 border-l-4 border-red-500';
        statusText.innerHTML = '<i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>Desconectado - Tentando reconectar...';
        statusText.className = 'text-red-800';
        statusDiv.style.display = 'block';
    }
}

function showConnectionStatus(message, type = 'info') {
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    let className, iconClass;
    switch (type) {
        case 'success':
            className = 'mb-4 p-3 rounded-lg bg-green-100 border-l-4 border-green-500';
            iconClass = 'fas fa-check-circle text-green-600 mr-2';
            statusText.className = 'text-green-800';
            break;
        case 'error':
            className = 'mb-4 p-3 rounded-lg bg-red-100 border-l-4 border-red-500';
            iconClass = 'fas fa-exclamation-triangle text-red-600 mr-2';
            statusText.className = 'text-red-800';
            break;
        default:
            className = 'mb-4 p-3 rounded-lg bg-yellow-100 border-l-4 border-yellow-500';
            iconClass = 'fas fa-info-circle text-yellow-600 mr-2';
            statusText.className = 'text-yellow-800';
    }
    
    statusDiv.className = className;
    statusText.innerHTML = `<i class="${iconClass}"></i>${message}`;
    statusDiv.style.display = 'block';
}

function startReconnectionAttempts() {
    reconnectInterval = setInterval(() => {
        if (!isConnected) {
            console.log('Attempting to reconnect...');
            // Firebase handles reconnection automatically, we just monitor
        }
    }, 5000);
}

// Simplified login system using only Realtime Database
async function login(username, password) {
    try {
        showConnectionStatus('Verificando credenciais...', 'info');
        
        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.password === password) {
                currentUser = {
                    username: username,
                    admin: userData.admin || false,
                    ...userData
                };
                
                // Update last login
                await set(ref(database, `users/${username}/lastLogin`), new Date().toISOString());
                
                showConnectionStatus('Login realizado com sucesso!', 'success');
                showMainInterface();
                loadChamados();
                return true;
            }
        }
        
        showConnectionStatus('Usuário ou senha inválidos', 'error');
        return false;
    } catch (error) {
        console.error('Login error:', error);
        showConnectionStatus('Erro ao fazer login. Tente novamente.', 'error');
        return false;
    }
}

// Show main interface after login
function showMainInterface() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('statsCards').style.display = 'block';
    document.getElementById('chamadosContainer').style.display = 'block';
    
    document.getElementById('currentUser').textContent = currentUser.username;
}

// Load chamados from database
async function loadChamados() {
    try {
        showConnectionStatus('Carregando chamados...', 'info');
        
        const chamadosRef = ref(database, 'chamados');
        const snapshot = await get(chamadosRef);
        
        if (snapshot.exists()) {
            chamadosData = snapshot.val();
        } else {
            chamadosData = {};
        }
        
        displayChamados();
        updateStatistics();
        
        setTimeout(() => {
            document.getElementById('connectionStatus').style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('Error loading chamados:', error);
        showConnectionStatus('Erro ao carregar chamados', 'error');
    }
}

// Display chamados in the interface
function displayChamados(filteredData = null) {
    const container = document.getElementById('chamadosList');
    const data = filteredData || chamadosData;
    
    if (!data || Object.keys(data).length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>Nenhum chamado encontrado</p>
            </div>
        `;
        return;
    }
    
    const chamadosArray = Object.entries(data).map(([id, chamado]) => ({
        id,
        ...chamado
    }));
    
    // Sort by date (most recent first)
    chamadosArray.sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));
    
    container.innerHTML = chamadosArray.map(chamado => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-4 mb-2">
                        <h3 class="font-semibold text-gray-800">${chamado.chamado}</h3>
                        <span class="px-2 py-1 text-xs rounded-full ${getStatusClass(chamado.status)}">
                            ${chamado.status}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-1">
                        <i class="fas fa-user mr-1"></i>Analista: ${chamado.analista}
                    </p>
                    <p class="text-sm text-gray-600 mb-1">
                        <i class="fas fa-desktop mr-1"></i>Sistema: ${chamado.sistema}
                    </p>
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-1"></i>Abertura: ${formatDate(chamado.dataAbertura)}
                    </p>
                </div>
                <div class="flex gap-2">
                    <button onclick="editChamado('${chamado.id}')" 
                            class="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteChamado('${chamado.id}')" 
                            class="text-red-600 hover:text-red-800 p-1" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="bg-gray-50 rounded p-3">
                <p class="text-sm text-gray-700">
                    <strong>Assunto:</strong> ${chamado.assunto}
                </p>
                ${chamado.atualizacaoInicial ? `
                    <p class="text-sm text-gray-700 mt-2">
                        <strong>Atualização:</strong> ${chamado.atualizacaoInicial}
                    </p>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Helper functions
function getStatusClass(status) {
    switch (status) {
        case 'Pendente':
            return 'bg-yellow-100 text-yellow-800';
        case 'Em Andamento':
            return 'bg-blue-100 text-blue-800';
        case 'Concluído':
            return 'bg-green-100 text-green-800';
        case 'Cancelado':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Update statistics
function updateStatistics() {
    const chamados = Object.values(chamadosData);
    
    document.getElementById('totalChamados').textContent = chamados.length;
    document.getElementById('pendenteChamados').textContent = 
        chamados.filter(c => c.status === 'Pendente').length;
    document.getElementById('andamentoChamados').textContent = 
        chamados.filter(c => c.status === 'Em Andamento').length;
    document.getElementById('concluidoChamados').textContent = 
        chamados.filter(c => c.status === 'Concluído').length;
}

// Search and filter functionality
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    function filterChamados() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusFilter_value = statusFilter.value;
        
        let filtered = { ...chamadosData };
        
        if (searchTerm) {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([id, chamado]) =>
                    chamado.analista.toLowerCase().includes(searchTerm) ||
                    chamado.chamado.toLowerCase().includes(searchTerm) ||
                    chamado.assunto.toLowerCase().includes(searchTerm) ||
                    chamado.sistema.toLowerCase().includes(searchTerm)
                )
            );
        }
        
        if (statusFilter_value) {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([id, chamado]) =>
                    chamado.status === statusFilter_value
                )
            );
        }
        
        displayChamados(filtered);
    }
    
    searchInput.addEventListener('input', filterChamados);
    statusFilter.addEventListener('change', filterChamados);
}

// CRUD Operations
async function saveChamado(chamadoData) {
    try {
        const chamadosRef = ref(database, 'chamados');
        await push(chamadosRef, {
            ...chamadoData,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.username
        });
        
        await loadChamados();
        showConnectionStatus('Chamado salvo com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Error saving chamado:', error);
        showConnectionStatus('Erro ao salvar chamado', 'error');
        return false;
    }
}

async function updateChamado(id, chamadoData) {
    try {
        await set(ref(database, `chamados/${id}`), {
            ...chamadoData,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.username
        });
        
        await loadChamados();
        showConnectionStatus('Chamado atualizado com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Error updating chamado:', error);
        showConnectionStatus('Erro ao atualizar chamado', 'error');
        return false;
    }
}

async function deleteChamado(id) {
    if (!confirm('Tem certeza que deseja excluir este chamado?')) {
        return;
    }
    
    try {
        await remove(ref(database, `chamados/${id}`));
        await loadChamados();
        showConnectionStatus('Chamado excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Error deleting chamado:', error);
        showConnectionStatus('Erro ao excluir chamado', 'error');
    }
}

function editChamado(id) {
    const chamado = chamadosData[id];
    if (!chamado) return;
    
    // Fill form with existing data
    document.getElementById('analista').value = chamado.analista || '';
    document.getElementById('chamado').value = chamado.chamado || '';
    document.getElementById('sistema').value = chamado.sistema || '';
    document.getElementById('cenario').value = chamado.cenario || '';
    document.getElementById('assunto').value = chamado.assunto || '';
    document.getElementById('dataAbertura').value = chamado.dataAbertura || '';
    document.getElementById('dataEnvioN3').value = chamado.dataEnvioN3 || '';
    document.getElementById('fila').value = chamado.fila || '';
    document.getElementById('status').value = chamado.status || '';
    document.getElementById('atualizacaoInicial').value = chamado.atualizacaoInicial || '';
    
    document.getElementById('modalTitle').textContent = 'Editar Chamado';
    document.getElementById('chamadoModal').style.display = 'flex';
    document.getElementById('chamadoForm').dataset.editId = id;
}

// Export functionality
function exportToExcel() {
    try {
        const chamados = Object.values(chamadosData);
        
        if (chamados.length === 0) {
            alert('Não há dados para exportar');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(chamados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chamados");
        
        const filename = `chamados_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showConnectionStatus('Dados exportados com sucesso!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showConnectionStatus('Erro ao exportar dados', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    if (!initializeFirebase()) {
        return;
    }
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            document.getElementById('loginError').classList.remove('hidden');
            document.getElementById('loginErrorText').textContent = 'Preencha todos os campos';
            return;
        }
        
        document.getElementById('loginError').classList.add('hidden');
        
        const success = await login(username, password);
        if (!success) {
            document.getElementById('loginError').classList.remove('hidden');
            document.getElementById('loginErrorText').textContent = 'Usuário ou senha incorretos';
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        currentUser = null;
        chamadosData = {};
        
        // Hide main interface
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('statsCards').style.display = 'none';
        document.getElementById('chamadosContainer').style.display = 'none';
        
        // Show login modal
        document.getElementById('loginModal').style.display = 'flex';
        
        // Clear form
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('hidden');
    });
    
    // Add chamado button
    document.getElementById('addChamadoBtn').addEventListener('click', function() {
        document.getElementById('modalTitle').textContent = 'Novo Chamado';
        document.getElementById('chamadoForm').reset();
        document.getElementById('chamadoForm').removeAttribute('data-edit-id');
        document.getElementById('chamadoModal').style.display = 'flex';
    });
    
    // Close modal buttons
    document.getElementById('closeModalBtn').addEventListener('click', function() {
        document.getElementById('chamadoModal').style.display = 'none';
    });
    
    document.getElementById('cancelBtn').addEventListener('click', function() {
        document.getElementById('chamadoModal').style.display = 'none';
    });
    
    // Chamado form submission
    document.getElementById('chamadoForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const chamadoData = Object.fromEntries(formData.entries());
        
        // Validate required fields
        const requiredFields = ['analista', 'chamado', 'sistema', 'cenario', 'assunto', 'dataAbertura', 'dataEnvioN3', 'fila', 'status'];
        const missingFields = requiredFields.filter(field => !chamadoData[field]);
        
        if (missingFields.length > 0) {
            alert('Por favor, preencha todos os campos obrigatórios: ' + missingFields.join(', '));
            return;
        }
        
        const editId = e.target.dataset.editId;
        let success;
        
        if (editId) {
            success = await updateChamado(editId, chamadoData);
        } else {
            success = await saveChamado(chamadoData);
        }
        
        if (success) {
            document.getElementById('chamadoModal').style.display = 'none';
        }
    });
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    
    // Setup search and filter
    setupSearchAndFilter();
    
    // Set up today's date as default for new chamados
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataAbertura').value = today;
    document.getElementById('dataEnvioN3').value = today;
});

// Global functions for HTML onclick events
window.editChamado = editChamado;
window.deleteChamado = deleteChamado;

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (connectionRef) {
        off(connectionRef);
    }
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }
});
