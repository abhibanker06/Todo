// Load modal HTML
document.addEventListener('DOMContentLoaded', () => {
  fetch('todo-app.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('modalContainer').innerHTML = html;
      initTodoApp();
    })
    .catch(error => {
      console.error('Failed to load modal HTML:', error);
    });
});

let todos = [];
let filteredTodos = [];
let currentPage = 1;
const todosPerPage = 4;

function initTodoApp() {
  showLoading(); 
  const storedTodos = localStorage.getItem('todos');
  try {
    if (storedTodos) {
      todos = JSON.parse(storedTodos);
      filteredTodos = todos.slice();
      renderTodos();
      setTimeout(hideLoading, 500);
    } else {
      fetchTodosFromAPI();
    }
  } catch (error) {
    console.error('Failed to parse todos from localStorage:', error);
    fetchTodosFromAPI();
  }
  bindEvents();
  setDefaultDate();
}

async function fetchTodosFromAPI() {
  showLoading();
  try {
    const res = await fetch('https://dummyjson.com/todos');
    const data = await res.json();
    // Convert API todos to your local format
    todos = data.todos.map(todo => ({
      id: todo.id,
      title: todo.todo,
      date: new Date().toISOString().split('T')[0], 
      status: todo.completed ? 'completed' : 'pending',
      createdAt: new Date().toISOString()
    }));
    filteredTodos = todos.slice();
    saveTodos(); // Store in localStorage
    renderTodos();
  } catch (error) {
    console.error('Failed to fetch todos:', error);
  }
  setTimeout(hideLoading(),500);
}

function bindEvents() {
  document.getElementById('addTaskBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('taskForm').addEventListener('submit', handleSubmit);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('fromDate').addEventListener('change', applyFilters);
  document.getElementById('toDate').addEventListener('change', applyFilters);
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target.id === 'taskModal') closeModal();
  });
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('taskDate').value = today;
}

function openModal() {
  document.getElementById('taskModal').classList.remove('hidden');
  document.getElementById('taskModal').classList.add('flex');
  document.getElementById('taskTitle').focus();
}

function closeModal() {
  document.getElementById('taskModal').classList.add('hidden');
  document.getElementById('taskForm').reset();
  setDefaultDate();
}

async function handleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('taskTitle').value.trim();
  const date = document.getElementById('taskDate').value;
  const status = document.getElementById('taskStatus').value;

  if (!title || !date) return;

  closeModal();
  showLoading();
  await delay(600);

  const newTodo = {
    id: Date.now(),
    title,
    date,
    status,
    createdAt: new Date().toISOString()
  };

  todos.unshift(newTodo);
  saveTodos();
  applyFilters();
  hideLoading();
}

async function deleteTodo(id) {
  showLoading();
  await delay(500);
  todos = todos.filter(todo => todo.id !== id);
  filteredTodos = filteredTodos.filter(todo => todo.id !== id);

  saveTodos();
  renderTodos();
  hideLoading();
}

async function updateTodoStatus(id, newStatus) {
  showLoading();
  await delay(300);
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.status = newStatus;
    saveTodos();
    renderTodos();
  }
  hideLoading();
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;

  filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm);
    const matchesFromDate = !fromDate || todo.date >= fromDate;
    const matchesToDate = !toDate || todo.date <= toDate;
    return matchesSearch && matchesFromDate && matchesToDate;
  });

  currentPage = 1; // reset to first page on filter
  renderTodos();
}

function renderTodos() {
  const container = document.getElementById('todoContainer');
  const emptyState = document.getElementById('emptyState');

  const startIndex = (currentPage - 1) * todosPerPage;
  const endIndex = startIndex + todosPerPage;
  const paginatedTodos = filteredTodos.slice(startIndex, endIndex);

  if (filteredTodos.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    renderPagination();
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = paginatedTodos.map(todo => `
    <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(todo.title)}</h3>
          <p class="text-sm text-gray-500 mb-2">
            <i class="fas fa-calendar-alt mr-1"></i>
            ${formatDate(todo.date)}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <select 
            class="px-3 py-1 rounded-full text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 ${todo.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}"
            onchange="updateTodoStatus(${todo.id}, this.value)"
          >
            <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
          <button 
            onclick="deleteTodo(${todo.id})"
            class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Delete task"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  renderPagination();
}

function renderPagination() {
  const paginationContainer = document.getElementById('paginationControls');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredTodos.length / todosPerPage);
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '';

  if (currentPage > 1) {
    html += `<button onclick="goToPage(${currentPage - 1})" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer">Previous</button>`;
  }

  html += `<span class="px-4 py-1 text-sm">Page ${currentPage} of ${totalPages}</span>`;

  if (currentPage < totalPages) {
    html += `<button onclick="goToPage(${currentPage + 1})" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer">Next</button>`;
  }

  paginationContainer.innerHTML = html;
}


function showLoading() {
  document.getElementById('loadingSpinner').classList.remove('hidden');
  document.getElementById('loadingSpinner').classList.add('flex');
  document.getElementById('todoContainer').style.opacity = '0.5';
}

function hideLoading() {
  document.getElementById('loadingSpinner').classList.add('hidden');
  document.getElementById('todoContainer').style.opacity = '1';
}

function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredTodos.length / todosPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderTodos();
  }
}

window.goToPage = goToPage;

window.deleteTodo = deleteTodo;
window.updateTodoStatus = updateTodoStatus;