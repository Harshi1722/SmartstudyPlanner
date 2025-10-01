
class StudyPlanner {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('studyPlannerTasks')) || [];
        this.subjects = JSON.parse(localStorage.getItem('studyPlannerSubjects')) || [];
        this.currentView = 'dashboard';
        this.currentFilter = 'all';
        this.currentTimelinePeriod = 'week';
        this.editingTaskId = null;
        
        this.initializeApp();
        this.loadTasks();
        this.setupEventListeners();
        this.updateStats();
        this.renderUpcomingTasks();
        this.renderAllTasks();
        this.renderTimeline();
        this.renderProgress();
    }
    
    initializeApp() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-due-date').min = today;
        
        this.initializeCharts();
        
        this.updateSubjectSuggestionsFromTasks();
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
        });
        
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.openTaskModal();
        });
        
        // Task modal
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        document.getElementById('cancel-task').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });
        
        // Timeline period buttons
        document.querySelectorAll('.timeline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTimelinePeriod(e.currentTarget.dataset.period);
            });
        });
        
        // Theme toggle
        document.querySelector('.theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Search functionality
        document.getElementById('task-search').addEventListener('input', (e) => {
            this.filterTasksBySearch(e.target.value);
        });
        
        // Close modal when clicking outside
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
        
        // Auto-save new subjects when typing
        document.getElementById('task-subject').addEventListener('blur', (e) => {
            const subject = e.target.value.trim();
            if (subject) {
                this.addNewSubject(subject);
            }
        });
    }
    
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        // Update header title
        const titles = {
            dashboard: 'Dashboard',
            tasks: 'My Tasks',
            timeline: 'Timeline',
            progress: 'Progress'
        };
        
        const subtitles = {
            dashboard: 'Welcome to your study planner',
            tasks: 'Manage your study tasks',
            timeline: 'Visualize your study schedule',
            progress: 'Track your learning progress'
        };
        
        document.getElementById('view-title').textContent = titles[viewName];
        document.getElementById('view-subtitle').textContent = subtitles[viewName];
        
        this.currentView = viewName;
        
        // Refresh view-specific content
        if (viewName === 'timeline') {
            this.renderTimeline();
        } else if (viewName === 'progress') {
            this.renderProgress();
        } else if (viewName === 'dashboard') {
            this.updateProgressChart();
        }
    }
    
    setFilter(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.currentFilter = filter;
        this.renderAllTasks();
    }
    
    setTimelinePeriod(period) {
        document.querySelectorAll('.timeline-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        this.currentTimelinePeriod = period;
        this.renderTimeline();
    }
    
    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('task-modal');
        
        if (taskId) {
            // Editing existing task
            document.getElementById('modal-title').textContent = 'Edit Task';
            const task = this.tasks.find(t => t.id === taskId);
            
            if (task) {
                document.getElementById('task-title').value = task.title;
                document.getElementById('task-subject').value = task.subject;
                document.getElementById('task-description').value = task.description || '';
                document.getElementById('task-due-date').value = task.dueDate;
                document.getElementById('task-priority').value = task.priority;
                document.getElementById('task-estimated-time').value = task.estimatedTime;
            }
        } else {
            // Adding new task
            document.getElementById('modal-title').textContent = 'Add New Task';
            document.getElementById('task-form').reset();
        }
        
        modal.classList.add('active');
    }
    
    closeTaskModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.editingTaskId = null;
    }
    
    saveTask() {
        const subjectInput = document.getElementById('task-subject');
        const subject = subjectInput.value.trim();
        
        if (!subject) {
            this.showNotification('Please enter a subject', true);
            subjectInput.focus();
            return;
        }
        
        const taskData = {
            title: document.getElementById('task-title').value.trim(),
            subject: subject,
            description: document.getElementById('task-description').value.trim(),
            dueDate: document.getElementById('task-due-date').value,
            priority: document.getElementById('task-priority').value,
            estimatedTime: parseFloat(document.getElementById('task-estimated-time').value),
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        // Validate required fields
        if (!taskData.title || !taskData.dueDate) {
            this.showNotification('Please fill in all required fields', true);
            return;
        }
        
        if (this.editingTaskId) {
            // Update existing task
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
            }
        } else {
            // Add new task
            taskData.id = Date.now().toString();
            this.tasks.push(taskData);
            
            // Add new subject to suggestions
            this.addNewSubject(subject);
        }
        
        this.saveToLocalStorage();
        this.closeTaskModal();
        this.updateStats();
        this.renderUpcomingTasks();
        this.renderAllTasks();
        this.renderTimeline();
        this.renderProgress();
        this.updateProgressChart();
        
        this.showNotification('Task saved successfully!');
    }
    
    addNewSubject(subject) {
        if (subject && !this.subjects.includes(subject)) {
            this.subjects.push(subject);
            this.subjects.sort();
            this.saveSubjectsToLocalStorage();
            this.updateSubjectSuggestions();
        }
    }
    
    updateSubjectSuggestionsFromTasks() {
        // Extract unique subjects from all tasks
        const taskSubjects = [...new Set(this.tasks.map(task => task.subject))];
        this.subjects = [...new Set([...this.subjects, ...taskSubjects])].sort();
        this.saveSubjectsToLocalStorage();
        this.updateSubjectSuggestions();
    }
    
    updateSubjectSuggestions() {
        const datalist = document.getElementById('subject-suggestions');
        datalist.innerHTML = this.subjects.map(subject => 
            `<option value="${subject}">`
        ).join('');
    }
    
    saveSubjectsToLocalStorage() {
        localStorage.setItem('studyPlannerSubjects', JSON.stringify(this.subjects));
    }
    
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveToLocalStorage();
            this.updateStats();
            this.renderUpcomingTasks();
            this.renderAllTasks();
            this.renderTimeline();
            this.renderProgress();
            this.updateProgressChart();
            
            this.showNotification('Task deleted successfully!');
        }
    }
    
    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveToLocalStorage();
            this.updateStats();
            this.renderUpcomingTasks();
            this.renderAllTasks();
            this.renderProgress();
            this.updateProgressChart();
            
            this.showNotification(`Task marked as ${task.completed ? 'completed' : 'pending'}!`);
        }
    }
    
    filterTasksBySearch(query) {
        this.renderAllTasks(query);
    }
    
    loadTasks() {
        // Sample tasks for initial setup
        if (this.tasks.length === 0) {
            const sampleTasks = [
                {
                    id: '1',
                    title: 'Complete Math Assignment',
                    subject: 'Mathematics',
                    description: 'Finish chapter 5 problems',
                    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    priority: 'high',
                    estimatedTime: 2,
                    completed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    title: 'Read Science Chapter',
                    subject: 'Science',
                    description: 'Read and summarize chapter 3',
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    priority: 'medium',
                    estimatedTime: 1.5,
                    completed: true,
                    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '3',
                    title: 'History Essay',
                    subject: 'History',
                    description: 'Write essay on World War II',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    priority: 'medium',
                    estimatedTime: 3,
                    completed: false,
                    createdAt: new Date().toISOString()
                }
            ];
            
            this.tasks = sampleTasks;
            this.saveToLocalStorage();
            
            // Add sample subjects to suggestions
            sampleTasks.forEach(task => {
                this.addNewSubject(task.subject);
            });
        }
        
        // Always update subject suggestions from current tasks
        this.updateSubjectSuggestionsFromTasks();
    }
    
    saveToLocalStorage() {
        localStorage.setItem('studyPlannerTasks', JSON.stringify(this.tasks));
    }
    
    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        
        // Calculate overdue tasks
        const today = new Date().toISOString().split('T')[0];
        const overdueTasks = this.tasks.filter(task => 
            !task.completed && task.dueDate < today
        ).length;
        
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('overdue-tasks').textContent = overdueTasks;
    }
    
    renderUpcomingTasks() {
        const container = document.getElementById('upcoming-tasks-list');
        const upcomingTasks = this.tasks
            .filter(task => !task.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
        
        if (upcomingTasks.length === 0) {
            container.innerHTML = '<p>No upcoming tasks. Add a new task to get started!</p>';
            return;
        }
        
        container.innerHTML = upcomingTasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <div class="task-meta">
                        <span>${task.subject}</span>
                        <span>Due: ${this.formatDate(task.dueDate)}</span>
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="planner.toggleTaskCompletion('${task.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon" onclick="planner.openTaskModal('${task.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderAllTasks(searchQuery = '') {
        const container = document.getElementById('all-tasks-list');
        let filteredTasks = this.tasks;
        
        // Apply filter
        if (this.currentFilter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (this.currentFilter === 'overdue') {
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => 
                !task.completed && task.dueDate < today
            );
        }
        
        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(query) || 
                task.description.toLowerCase().includes(query) ||
                task.subject.toLowerCase().includes(query)
            );
        }
        
        // Sort by due date (pending first, then by date)
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
        
        if (filteredTasks.length === 0) {
            container.innerHTML = '<p>No tasks found. Add a new task to get started!</p>';
            return;
        }
        
        container.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-info">
                    <h4>${task.title} ${task.completed ? '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : ''}</h4>
                    <div class="task-meta">
                        <span>${task.subject}</span>
                        <span>Due: ${this.formatDate(task.dueDate)}</span>
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        <span>Est: ${task.estimatedTime}h</span>
                    </div>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="planner.toggleTaskCompletion('${task.id}')">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon" onclick="planner.openTaskModal('${task.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="planner.deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderTimeline() {
        const container = document.getElementById('timeline');
        let timelineTasks = [...this.tasks];
        
        // Filter based on timeline period
        const today = new Date();
        let startDate, endDate;
        
        switch (this.currentTimelinePeriod) {
            case 'day':
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - startDate.getDay());
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
        }
        
        timelineTasks = timelineTasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= startDate && taskDate <= endDate;
        });
        
        // Sort by date
        timelineTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (timelineTasks.length === 0) {
            container.innerHTML = '<p>No tasks scheduled for this period.</p>';
            return;
        }
        
        // Group tasks by date
        const tasksByDate = {};
        timelineTasks.forEach(task => {
            const dateKey = task.dueDate;
            if (!tasksByDate[dateKey]) {
                tasksByDate[dateKey] = [];
            }
            tasksByDate[dateKey].push(task);
        });
        
        container.innerHTML = Object.keys(tasksByDate)
            .sort()
            .map(date => `
                <div class="timeline-item">
                    <div class="timeline-date">${this.formatDate(date)}</div>
                    <div class="timeline-content">
                        ${tasksByDate[date].map(task => `
                            <div class="task-item">
                                <div class="task-info">
                                    <h4>${task.title} ${task.completed ? '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : ''}</h4>
                                    <div class="task-meta">
                                        <span>${task.subject}</span>
                                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    }
    
    renderProgress() {
        // Update study hours
        const completedTasks = this.tasks.filter(task => task.completed);
        const totalStudyHours = completedTasks.reduce((sum, task) => sum + task.estimatedTime, 0);
        
        document.getElementById('study-hours').textContent = `${totalStudyHours}h`;
        
        // Update progress circle
        const progressPercent = Math.min((totalStudyHours / 20) * 100, 100);
        const progressBar = document.querySelector('.progress-bar');
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progressPercent / 100) * circumference;
        
        progressBar.style.strokeDashoffset = offset;
        
        // Update subject breakdown
        const subjectBreakdown = this.calculateSubjectBreakdown();
        const container = document.getElementById('subject-breakdown');
        
        if (Object.keys(subjectBreakdown).length === 0) {
            container.innerHTML = '<p>No study data available yet.</p>';
            return;
        }
        
        // Generate colors for subjects dynamically
        const subjectColors = this.generateSubjectColors(subjectBreakdown);
        
        container.innerHTML = Object.entries(subjectBreakdown)
            .map(([subject, data]) => `
                <div class="subject-item">
                    <div class="subject-name">
                        <div class="subject-color" style="background-color: ${subjectColors[subject]};"></div>
                        <span>${subject}</span>
                    </div>
                    <div class="subject-stats">
                        <span>${data.hours.toFixed(1)}h (${data.percentage}%)</span>
                    </div>
                </div>
            `).join('');
        
        // Update study history chart with real data
        this.updateStudyHistoryChart();
    }
    
    generateSubjectColors(breakdown) {
        const colors = [
            '#4361ee', '#4cc9f0', '#f72585', '#7209b7', '#38b000',
            '#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#45b7d1',
            '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'
        ];
        
        const subjectColors = {};
        let colorIndex = 0;
        
        Object.keys(breakdown).forEach(subject => {
            subjectColors[subject] = colors[colorIndex % colors.length];
            colorIndex++;
        });
        
        return subjectColors;
    }
    
    calculateSubjectBreakdown() {
        const completedTasks = this.tasks.filter(task => task.completed);
        const totalHours = completedTasks.reduce((sum, task) => sum + task.estimatedTime, 0);
        
        if (totalHours === 0) return {};
        
        const breakdown = {};
        
        completedTasks.forEach(task => {
            if (!breakdown[task.subject]) {
                breakdown[task.subject] = { hours: 0, percentage: 0 };
            }
            breakdown[task.subject].hours += task.estimatedTime;
        });
        
        // Calculate percentages
        Object.keys(breakdown).forEach(subject => {
            breakdown[subject].percentage = Math.round((breakdown[subject].hours / totalHours) * 100);
        });
        
        return breakdown;
    }
    
    initializeCharts() {
        // Progress chart (dashboard)
        const progressCtx = document.getElementById('progress-chart').getContext('2d');
        this.progressChart = new Chart(progressCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Study Hours',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });
        
        // Study history chart (progress view)
        const historyCtx = document.getElementById('study-history-chart').getContext('2d');
        this.historyChart = new Chart(historyCtx, {
            type: 'line',
            data: {
                labels: ['Week 4', 'Week 3', 'Week 2', 'Week 1'],
                datasets: [{
                    label: 'Study Hours',
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });
        
        // Update charts with real data
        this.updateProgressChart();
        this.updateStudyHistoryChart();
    }
    
    updateProgressChart() {
        const completedTasks = this.tasks.filter(task => task.completed);
        
        if (completedTasks.length === 0) {
            this.progressChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
            this.progressChart.update();
            return;
        }

        const dailyData = this.calculateDailyStudyHours(completedTasks);
        this.progressChart.data.datasets[0].data = dailyData;
        this.progressChart.update();
    }
    
    calculateDailyStudyHours(completedTasks) {
        const dailyHours = [0, 0, 0, 0, 0, 0, 0]; // Monday to Sunday
        
        completedTasks.forEach(task => {
            if (!task.completedAt) return;
            
            const completedDate = new Date(task.completedAt);
            const today = new Date();
            
            // Get the start of the current week (Monday)
            const startOfWeek = new Date(today);
            const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
            startOfWeek.setDate(today.getDate() + diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Get the end of the current week (Sunday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            // Check if task was completed this week
            if (completedDate >= startOfWeek && completedDate <= endOfWeek) {
                let completedDayOfWeek = completedDate.getDay(); // 0=Sunday, 1=Monday, etc.
                
                // Convert to Monday-based index (0=Monday, 6=Sunday)
                let dayIndex = completedDayOfWeek - 1;
                if (dayIndex < 0) dayIndex = 6; // Sunday becomes index 6
                
                dailyHours[dayIndex] += task.estimatedTime;
            }
        });
        
        return dailyHours;
    }
    
    updateStudyHistoryChart() {
        const completedTasks = this.tasks.filter(task => task.completed);
        
        if (completedTasks.length === 0) {
            this.historyChart.data.datasets[0].data = [0, 0, 0, 0];
            this.historyChart.update();
            return;
        }

        const weeklyData = this.calculateWeeklyStudyHours(completedTasks);
        this.historyChart.data.datasets[0].data = weeklyData;
        this.historyChart.update();
    }
    
    calculateWeeklyStudyHours(completedTasks) {
        const weeklyHours = [0, 0, 0, 0];
        const today = new Date();
        
        completedTasks.forEach(task => {
            if (!task.completedAt) return;
            
            const completedDate = new Date(task.completedAt);
            const weeksAgo = this.getWeeksDifference(completedDate, today);
            
            if (weeksAgo >= 0 && weeksAgo < 4) {
                weeklyHours[3 - weeksAgo] += task.estimatedTime;
            }
        });
        
        return weeklyHours;
    }
    
    getWeeksDifference(date1, date2) {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const diffTime = Math.abs(date2 - date1);
        return Math.floor(diffTime / oneWeek);
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const themeIcon = document.getElementById('theme-icon');
        
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        
        localStorage.setItem('studyPlannerTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }
    
    showNotification(message, isError = false) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        notificationText.textContent = message;
        
        if (isError) {
            notification.classList.add('error');
        } else {
            notification.classList.remove('error');
        }
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.planner = new StudyPlanner();
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('studyPlannerTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-icon').classList.remove('fa-moon');
        document.getElementById('theme-icon').classList.add('fa-sun');
    }
});