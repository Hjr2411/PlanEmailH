import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let currentUser = null;
let isAdmin = false;

// Função para mostrar alertas
function showAlert(message, type = 'success') {
    alert(`${type.toUpperCase()}: ${message}`);
}

// Função de login
async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userRef = ref(database, `usuarios/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUser = { email: user.email, uid: user.uid };
            isAdmin = userData.admin || false;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('isAdmin', isAdmin.toString());
            showAlert('Login realizado com sucesso!');
            loadChamados();
            document.getElementById('logoutButton').classList.remove('hidden');
            document.getElementById('adminButton').classList.toggle('hidden', !isAdmin);
            document.getElementById('exportButton').classList.toggle('hidden', !isAdmin);
        } else {
            throw new Error('Usuário não encontrado');
        }
    } catch (error) {
        showAlert('Erro no login: ' + error.message, 'error');
    }
}

// Função para logout
async function logout() {
    await signOut(auth);
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    showAlert('Logout realizado com sucesso!');
    document.getElementById('cardContainer').innerHTML = '';
    document.getElementById('logoutButton').classList.add('hidden');
    document.getElementById('adminButton').classList.add('hidden');
    document.getElementById('exportButton').classList.add('hidden');
}

// Função para carregar chamados
async function loadChamados() {
    if (!currentUser) return;

    const chamadosRef = ref(database, `usuarios/${currentUser.uid}/chamados`);
    const snapshot = await get(chamadosRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
        renderCards(data);
    } else {
        showAlert('Nenhum chamado encontrado para este usuário.', 'info');
    }
}

// Função para renderizar cards
function renderCards(chamados) {
    const container = document.getElementById('cardContainer');
    container.innerHTML = '';

    Object.entries(chamados).forEach(([id, chamado]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${chamado.titulo}</h3>
            <p>${chamado.descricao}</p>
            <button onclick="updateChamado('${id}')">Atualizar</button>
            <button onclick="deleteChamado('${id}')">Excluir</button>
        `;
        container.appendChild(card);
    });
}

// Função para atualizar chamado
async function updateChamado(id) {
    const descricao = prompt('Insira nova descrição:');
    if (descricao) {
        await set(ref(database, `usuarios/${currentUser.uid}/chamados/${id}`), { descricao });
        loadChamados();
    }
}

// Função para excluir chamado
async function deleteChamado(id) {
    if (confirm('Você tem certeza que deseja excluir este chamado?')) {
        await remove(ref(database, `usuarios/${currentUser.uid}/chamados/${id}`));
        loadChamados();
    }
}

// Função para criar novo chamado
document.getElementById('chamadoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;

    const newChamadoRef = ref(database, `usuarios/${currentUser.uid}/chamados`).child(Date.now().toString());
    await set(newChamadoRef, { titulo, descricao });
    loadChamados();
    closeModal();
});

// Função para abrir modal
function openModal() {
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
    loadUsers();
    document.getElementById('adminModal').style.display = 'block';
}

// Função para fechar modal admin
function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

// Função para carregar usuários
async function loadUsers() {
    const usersRef = ref(database, 'usuarios');
    const snapshot = await get(usersRef);
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    if (snapshot.exists()) {
        const users = snapshot.val();
        Object.entries(users).forEach(([uid, userData]) => {
            const row = `
                <tr>
                    <td class="px-3 py-4 text-sm text-gray-900">${userData.email}</td>
                    <td class="px-3 py-4 text-sm text-gray-900">${userData.admin ? 'Sim' : 'Não'}</td>
                    <td class="px-3 py-4">
                        <button class="btn-danger" onclick="deleteUser('${uid}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }
}

// Função para excluir usuário
async function deleteUser(uid) {
    if (confirm('Você tem certeza que deseja excluir este usuário?')) {
        await remove(ref(database, `usuarios/${uid}`));
        loadUsers();
    }
}

// Função para criar novo usuário
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await set(ref(database, `usuarios/${user.uid}`), {
            email: email,
            admin: false
        });

        showAlert('Usuário criado com sucesso!');
        loadUsers();
        document.getElementById('userForm').reset();
    } catch (error) {
        showAlert('Erro ao criar usuário: ' + error.message, 'error');
    }
});

// Função para exportar para Excel
function exportToExcel() {
    if (!currentUser) {
        showAlert('Faça login para exportar dados', 'error');
        return;
    }

    const data = []; // Prepare data for export
    const chamadosRef = ref(database, `usuarios/${currentUser.uid}/chamados`);
    get(chamadosRef).then(snapshot => {
        if (snapshot.exists()) {
            const chamados = snapshot.val();
            Object.entries(chamados).forEach(([id, chamado]) => {
                data.push({
                    'Título': chamado.titulo,
                    'Descrição': chamado.descricao,
                });
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
            XLSX.writeFile(wb, `Chamados_${new Date().toISOString().split('T')[0]}.xlsx`);
            showAlert('Arquivo Excel exportado com sucesso!');
        } else {
            showAlert('Nenhum chamado encontrado para exportar.', 'info');
        }
    }).catch(error => {
        showAlert('Erro ao exportar: ' + error.message, 'error');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });

    // Check for existing user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = localStorage.getItem('isAdmin') === 'true';
        loadChamados();
        document.getElementById('logoutButton').classList.remove('hidden');
        document.getElementById('adminButton').classList.toggle('hidden', !isAdmin);
        document.getElementById('exportButton').classList.toggle('hidden', !isAdmin);
    }
});

// Fechar modais clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    const loginModal = document.getElementById('loginModal');
    const adminModal = document.getElementById('adminModal');
    
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === loginModal) {
        closeModal();
    }
    if (event.target === adminModal) {
        closeAdminModal();
    }
};

// Expor funções globais
window.openModal = openModal;
window.closeModal = closeModal;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.logout = logout;
window.updateChamado = updateChamado;
window.deleteChamado = deleteChamado;
window.deleteUser = deleteUser;
window.exportToExcel = exportToExcel;
