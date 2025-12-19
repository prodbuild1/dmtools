// =====================================================================
// Configuration
// =====================================================================

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbziXMS_YZq8_YDMxrkBNbLWzA3CBEzQoQwlGXY2o2QixAsBSSb4HhuSN6okQZiuA31xmg/exec';

// =====================================================================
// DIGITAL PRODUCT EXECUTION FRAMEWORK
// =====================================================================

const FRAMEWORK_STAGES = {
    1: { id: 'discover', title: 'Stage 1: Discover', goal: 'Find what people already want', plan: 'Free' },
    2: { id: 'understand', title: 'Stage 2: Understand', goal: 'Know your customer deeply', plan: 'Premium' },
    3: { id: 'design', title: 'Stage 3: Design', goal: 'Define product promise & structure', plan: 'Premium' },
    4: { id: 'build', title: 'Stage 4: Build', goal: 'Create the digital product', plan: 'Premium' },
    5: { id: 'sell', title: 'Stage 5: Sell', goal: 'Convert visitors into buyers', plan: 'Premium' },
    6: { id: 'scale', title: 'Stage 6: Scale', goal: 'Drive traffic & growth', plan: 'Premium' }
};

// =====================================================================
// TOOLS MANAGEMENT - UPDATED TO FETCH FROM BACKEND
// =====================================================================

let tools = []; // Will be populated from backend

async function fetchToolsFromBackend() {
    try {
        const formData = new FormData();
        formData.append('action', 'getTools');
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success && data.tools) {
            tools = data.tools;
            return true;
        } else {
            console.error('Failed to fetch tools:', data.message);
            // Fallback to empty array
            tools = [];
            return false;
        }
    } catch (error) {
        console.error('Error fetching tools:', error);
        tools = [];
        return false;
    }
}

// =====================================================================
// GLOBAL STATE
// =====================================================================

let currentTool = null;
let isToolOpen = false;

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;
    
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.add('show');
    
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 5000);
}

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '👁️';
            } else {
                input.type = 'password';
                this.textContent = '👁️‍🗨️';
            }
        });
    });
}

// =====================================================================
// AUTHENTICATION FUNCTIONS - UPDATED FOR PREMIUM CHECK
// =====================================================================

function getUserStatus(user) {
    if (!user) return 'Free';
    
    // Check if user has expired premium
    if (user.expiryDate) {
        const today = new Date();
        const expiryDate = new Date(user.expiryDate);
        
        // If expiry date is in the past
        if (expiryDate < today) {
            return 'Expired';
        }
    }
    
    // Check plan status
    if (user.plan === 'Premium' && user.status !== 'Expired') {
        return 'Premium';
    }
    
    return user.status || 'Free';
}

async function login(email, password) {
    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Calculate user status based on expiry date
            const today = new Date();
            const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
            
            let status = data.plan;
            if (expiryDate && expiryDate < today) {
                status = 'Expired';
            }
            
            const userData = {
                userId: data.userId,
                name: data.name,
                email: email,
                status: status,
                plan: data.plan,
                expiryDate: data.expiryDate,
                lastLogin: new Date().toISOString()
            };
            
            localStorage.setItem('dmlabsbot_user', JSON.stringify(userData));
            
            showMessage(`Welcome back, ${data.name}!`, 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
            return true;
        } else {
            showMessage(data.message || 'Login failed', 'error');
            return false;
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
        console.error('Login error:', error);
        return false;
    }
}

async function signup(name, email, password, phone = '') {
    try {
        const formData = new FormData();
        formData.append('action', 'signup');
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone', phone);
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const userData = {
                userId: data.userId,
                name: data.name,
                email: email,
                status: 'Free',
                plan: 'Free',
                expiryDate: data.expiryDate,
                lastLogin: new Date().toISOString()
            };
            
            localStorage.setItem('dmlabsbot_user', JSON.stringify(userData));
            
            showMessage(`Account created! Welcome to DMLabsbot, ${name}!`, 'success');
            
            // Reset progress for new user
            localStorage.removeItem('dmlabsbot_progress');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
            return true;
        } else {
            showMessage(data.message || 'Signup failed', 'error');
            return false;
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
        console.error('Signup error:', error);
        return false;
    }
}

async function resetPassword(email) {
    try {
        const formData = new FormData();
        formData.append('action', 'reset-password');
        formData.append('email', email);
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Password reset instructions sent to your email.', 'success');
            return true;
        } else {
            showMessage(data.message || 'Password reset failed', 'error');
            return false;
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
        console.error('Reset password error:', error);
        return false;
    }
}

function logout() {
    localStorage.removeItem('dmlabsbot_user');
    showMessage('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function checkAuth() {
    const storedUser = localStorage.getItem('dmlabsbot_user');
    if (!storedUser) {
        return null;
    }
    
    const user = JSON.parse(storedUser);
    
    // Update status based on expiry date
    const currentStatus = getUserStatus(user);
    if (user.status !== currentStatus) {
        user.status = currentStatus;
        localStorage.setItem('dmlabsbot_user', JSON.stringify(user));
    }
    
    return user;
}

function checkPremiumAccess() {
    const user = checkAuth();
    if (!user) return false;
    
    const status = getUserStatus(user);
    return status === 'Premium';
}

// =====================================================================
// TOOL IFRAME MANAGEMENT
// =====================================================================

function createToolIframeContainer() {
    // Create iframe container if it doesn't exist
    let iframeContainer = document.getElementById('tool-iframe-container');
    if (!iframeContainer) {
        iframeContainer = document.createElement('div');
        iframeContainer.id = 'tool-iframe-container';
        iframeContainer.className = 'tool-iframe-container';
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'tool-backdrop';
        backdrop.className = 'tool-backdrop';
        backdrop.onclick = closeTool;
        
        // Create iframe wrapper
        const iframeWrapper = document.createElement('div');
        iframeWrapper.className = 'tool-iframe-wrapper';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'tool-header';
        header.innerHTML = `
            <div class="tool-header-info">
                <span class="tool-header-icon" id="tool-header-icon">💡</span>
                <span class="tool-header-title" id="tool-header-title">Loading Tool...</span>
            </div>
            <button class="tool-close-button" onclick="closeTool()">Close</button>
        `;
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'tool-iframe';
        iframe.className = 'tool-iframe';
        iframe.frameBorder = '0';
        iframe.allow = 'fullscreen';
        
        // Create loading state
        const loadingState = document.createElement('div');
        loadingState.id = 'tool-loading';
        loadingState.className = 'tool-loading';
        loadingState.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text" id="loading-text">Loading tool...</div>
        `;
        
        // Create error state
        const errorState = document.createElement('div');
        errorState.id = 'tool-error';
        errorState.className = 'tool-error';
        errorState.style.display = 'none';
        errorState.innerHTML = `
            <div class="error-icon">⚠️</div>
            <h3 class="error-title">Unable to Load Tool</h3>
            <p class="error-message" id="error-message">There was a problem loading the tool.</p>
            <button class="retry-button" onclick="retryTool()">Try Again</button>
            <button class="retry-button" onclick="closeTool()" style="margin-top: 10px; background: var(--gray);">Close</button>
        `;
        
        // Assemble everything
        iframeWrapper.appendChild(header);
        iframeWrapper.appendChild(loadingState);
        iframeWrapper.appendChild(errorState);
        iframeWrapper.appendChild(iframe);
        iframeContainer.appendChild(iframeWrapper);
        
        document.body.appendChild(backdrop);
        document.body.appendChild(iframeContainer);
    }
    
    return iframeContainer;
}

async function openTool(toolId) {
    // Ensure tools are loaded
    if (tools.length === 0) {
        showMessage('Loading tools...', 'info');
        const loaded = await fetchToolsFromBackend();
        if (!loaded) {
            showMessage('Failed to load tools. Please try again.', 'error');
            return;
        }
    }
    
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
        showMessage('Tool not found', 'error');
        return;
    }
    
    const user = checkAuth();
    const currentStatus = getUserStatus(user);
    
    // Check access permissions with proper premium validation
    if (tool.plan === 'Premium') {
        if (currentStatus !== 'Premium') {
            if (currentStatus === 'Expired') {
                showMessage('Your Premium plan has expired. Please renew to access premium tools.', 'error');
            } else {
                showMessage('Upgrade to Premium to access this tool', 'error');
            }
            return;
        }
    }
    
    currentTool = tool;
    isToolOpen = true;
    
    // Create or get iframe container
    const iframeContainer = createToolIframeContainer();
    const backdrop = document.getElementById('tool-backdrop');
    
    // Update header with tool info
    document.getElementById('tool-header-icon').textContent = tool.icon;
    document.getElementById('tool-header-title').textContent = tool.name;
    document.getElementById('loading-text').textContent = `Loading ${tool.name}...`;
    
    // Show loading state
    document.getElementById('tool-loading').style.display = 'flex';
    document.getElementById('tool-error').style.display = 'none';
    document.getElementById('tool-iframe').style.display = 'none';
    
    // Show container and backdrop
    iframeContainer.classList.add('active');
    backdrop.classList.add('active');
    
    // Update progress
    PROGRESS_TRACKER.markToolCompleted(toolId);
    
    // Load iframe
    loadToolIframe(tool);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function loadToolIframe(tool) {
    const iframe = document.getElementById('tool-iframe');
    const loadingState = document.getElementById('tool-loading');
    const errorState = document.getElementById('tool-error');
    
    // Set iframe source
    iframe.src = tool.url;
    
    // Handle iframe load
    iframe.onload = function() {
        setTimeout(() => {
            loadingState.style.display = 'none';
            iframe.style.display = 'block';
            showMessage(`${tool.name} loaded successfully`, 'success');
        }, 500);
    };
    
    // Handle iframe errors
    iframe.onerror = function() {
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        document.getElementById('error-message').textContent = 
            `Failed to load ${tool.name}. Please check your internet connection and try again.`;
    };
}

function closeTool() {
    const iframeContainer = document.getElementById('tool-iframe-container');
    const backdrop = document.getElementById('tool-backdrop');
    const iframe = document.getElementById('tool-iframe');
    
    if (iframeContainer && backdrop) {
        iframeContainer.classList.remove('active');
        backdrop.classList.remove('active');
        
        // Reset iframe
        if (iframe) {
            iframe.src = '';
            iframe.style.display = 'none';
        }
        
        // Reset states
        document.getElementById('tool-loading').style.display = 'flex';
        document.getElementById('tool-error').style.display = 'none';
    }
    
    isToolOpen = false;
    currentTool = null;
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Refresh dashboard to show updated progress
    if (window.location.pathname.includes('dashboard.html')) {
        renderProgressTracker();
        renderStageSections();
    }
}

function retryTool() {
    if (currentTool) {
        document.getElementById('tool-error').style.display = 'none';
        document.getElementById('tool-loading').style.display = 'flex';
        loadToolIframe(currentTool);
    }
}

// =====================================================================
// PROGRESS TRACKING SYSTEM
// =====================================================================

const PROGRESS_TRACKER = {
    STORAGE_KEY: 'dmlabsbot_progress',
    
    getProgress() {
        const progress = localStorage.getItem(this.STORAGE_KEY);
        return progress ? JSON.parse(progress) : {
            completedTools: [],
            lastToolOpened: null,
            currentStage: 1,
            firstTime: true
        };
    },
    
    saveProgress(progress) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    },
    
    markToolCompleted(toolId) {
        const progress = this.getProgress();
        if (!progress.completedTools.includes(toolId)) {
            progress.completedTools.push(toolId);
            
            // Update current stage based on completed tools
            const tool = tools.find(t => t.id === toolId);
            if (tool) {
                // Store last opened tool
                progress.lastToolOpened = toolId;
                
                // Move to next stage if all tools in current stage are completed
                const stageTools = tools.filter(t => t.stage === tool.stage);
                const completedStageTools = stageTools.filter(t => 
                    progress.completedTools.includes(t.id)
                );
                
                if (completedStageTools.length === stageTools.length && tool.stage < 6) {
                    progress.currentStage = tool.stage + 1;
                }
            }
            
            this.saveProgress(progress);
        }
    },
    
    getNextRecommendedTool() {
        const progress = this.getProgress();
        const currentStage = progress.currentStage;
        
        // Get tools in current stage that aren't completed
        const stageTools = tools.filter(t => t.stage === currentStage);
        const incompleteTools = stageTools.filter(t => 
            !progress.completedTools.includes(t.id)
        );
        
        // Return first incomplete tool in current stage
        if (incompleteTools.length > 0) {
            return incompleteTools[0];
        }
        
        // If all tools in current stage are completed, move to next stage
        if (currentStage < 6) {
            const nextStageTools = tools.filter(t => t.stage === currentStage + 1);
            if (nextStageTools.length > 0) {
                return nextStageTools[0];
            }
        }
        
        return null;
    },
    
    getStageProgress(stageId) {
        const progress = this.getProgress();
        const stageTools = tools.filter(t => t.stage === stageId);
        const completedTools = stageTools.filter(t => 
            progress.completedTools.includes(t.id)
        );
        
        return {
            total: stageTools.length,
            completed: completedTools.length,
            percentage: stageTools.length > 0 ? (completedTools.length / stageTools.length) * 100 : 0
        };
    }
};

// =====================================================================
// DASHBOARD FUNCTIONS - UPDATED FOR PREMIUM ACCESS CHECK
// =====================================================================

function renderProgressTracker() {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;
    
    const progress = PROGRESS_TRACKER.getProgress();
    
    let html = `
        <div class="progress-header">
            <h2 class="progress-title">Your Digital Product Creation Journey</h2>
            <p class="progress-description">Complete each stage to build your digital product from idea to sales</p>
        </div>
        
        <div class="progress-tracker">
            <div class="progress-bar" style="width: ${((progress.currentStage - 1) / 5) * 100}%"></div>
    `;
    
    for (let stageNum = 1; stageNum <= 6; stageNum++) {
        const stage = FRAMEWORK_STAGES[stageNum];
        const stageProgress = PROGRESS_TRACKER.getStageProgress(stageNum);
        
        let circleClass = '';
        if (stageNum < progress.currentStage) {
            circleClass = 'completed';
        } else if (stageNum === progress.currentStage) {
            circleClass = 'current';
        }
        
        html += `
            <div class="progress-step">
                <div class="step-circle ${circleClass}">${stageNum}</div>
                <div class="step-label">Stage ${stageNum}</div>
                <div class="step-goal">${stage.goal}</div>
                <div class="completion-indicator ${stageProgress.completed === stageProgress.total ? 'completed' : ''}">
                    ${stageProgress.completed}/${stageProgress.total}
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // Add next tool recommendation
    const nextTool = PROGRESS_TRACKER.getNextRecommendedTool();
    if (nextTool) {
        const user = checkAuth();
        const currentStatus = getUserStatus(user);
        const canAccess = nextTool.plan === 'Free' || currentStatus === 'Premium';
        
        html += `
            <div class="next-tool-recommendation">
                <h3>🎯 Next Recommended Tool</h3>
                <p>Continue with <strong>${nextTool.name}</strong> to progress through Stage ${nextTool.stage}</p>
                <button class="next-tool-button" onclick="openTool('${nextTool.id}')" ${!canAccess ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    ${canAccess ? `Open ${nextTool.name}` : '🔒 Premium Tool'}
                </button>
            </div>
        `;
    }
    
    progressContainer.innerHTML = html;
}

async function renderStageSections() {
    const toolsContainer = document.getElementById('tools-grid-container');
    if (!toolsContainer) return;
    
    // Ensure tools are loaded
    if (tools.length === 0) {
        const loaded = await fetchToolsFromBackend();
        if (!loaded) {
            toolsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Failed to load tools. Please refresh the page.</p>
                </div>
            `;
            return;
        }
    }
    
    const user = checkAuth();
    const currentStatus = getUserStatus(user);
    const isPremium = currentStatus === 'Premium';
    const progress = PROGRESS_TRACKER.getProgress();
    
    toolsContainer.innerHTML = '';
    
    for (let stageNum = 1; stageNum <= 6; stageNum++) {
        const stage = FRAMEWORK_STAGES[stageNum];
        const stageTools = tools.filter(t => t.stage === stageNum);
        const stageProgress = PROGRESS_TRACKER.getStageProgress(stageNum);
        
        // Skip stages that are locked for free users
        if (!isPremium && stageNum > 1 && progress.currentStage < stageNum) {
            continue;
        }
        
        let stageHtml = `
            <div class="stage-section">
                <div class="stage-header">
                    <h3 class="stage-title">
                        ${stage.title}
                        <span class="stage-plan-tag ${stage.plan.toLowerCase()}">${stage.plan}</span>
                    </h3>
                    <p class="stage-goal">🎯 ${stage.goal}</p>
                    <p class="stage-description">
                        ${stageNum === 1 ? 'Find proven ideas by analyzing market demand and trending questions' :
                          stageNum === 2 ? 'Understand your ideal customer and analyze competitors' :
                          stageNum === 3 ? 'Design your product structure and value proposition' :
                          stageNum === 4 ? 'Build your product content and add valuable bonuses' :
                          stageNum === 5 ? 'Create sales assets and build your email list' :
                          'Scale your product with advertising and social media content'}
                    </p>
                    <div class="completion-indicator ${stageProgress.completed === stageProgress.total ? 'completed' : ''}">
                        ${stageProgress.completed}/${stageProgress.total} tools completed
                    </div>
                </div>
                <div class="tools-grid">
        `;
        
        stageTools.forEach(tool => {
            const isCompleted = progress.completedTools.includes(tool.id);
            const canAccess = tool.plan === 'Free' || isPremium;
            const isLocked = !canAccess;
            
            stageHtml += `
                <div class="tool-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}" 
                     data-tool-id="${tool.id}">
                    <div class="tool-icon">${tool.icon}</div>
                    <div class="tool-content">
                        <h3>${tool.name}</h3>
                        <p>${tool.description}</p>
                        <div class="tool-type">${tool.type}</div>
                        <button class="tool-button ${isLocked ? 'locked' : ''}" 
                                data-tool-id="${tool.id}"
                                ${isLocked ? 'disabled' : ''}>
                            ${isCompleted ? '✓ Completed' : 
                              isLocked ? '🔒 Premium Tool' : 
                              'Try Now'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Add upsell for premium stages for free users
        if (!isPremium && stageNum > 1 && stageNum <= progress.currentStage) {
            stageHtml += `
                <div class="stage-upsell">
                    <h4>🔓 Unlock Stage ${stageNum}</h4>
                    <p>Upgrade to Premium to access ${stageTools.length} tools in ${stage.title}</p>
                    <a href="https://paydev-web.github.io/dmframework/" target="_blank" class="premium-button">
                        Upgrade Now (N2,500/month)
                    </a>
                </div>
            `;
        }
        
        stageHtml += `</div></div>`;
        toolsContainer.innerHTML += stageHtml;
    }
    
    // Setup tool button event listeners
    setupToolButtonListeners();
}

function setupToolButtonListeners() {
    document.querySelectorAll('.tool-button:not(.locked)').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.stopPropagation();
            const toolId = this.getAttribute('data-tool-id');
            await openTool(toolId);
        });
    });
    
    document.querySelectorAll('.tool-card:not(.locked)').forEach(card => {
        card.addEventListener('click', async function(e) {
            if (!e.target.closest('.tool-button')) {
                const button = this.querySelector('.tool-button');
                if (button && !button.classList.contains('locked')) {
                    const toolId = button.getAttribute('data-tool-id');
                    await openTool(toolId);
                }
            }
        });
    });
}

function updateUserStatusDisplay() {
    const user = checkAuth();
    if (!user) return;
    
    const nameEl = document.getElementById('user-name-display');
    const statusEl = document.getElementById('user-status-display');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (nameEl && statusEl) {
        nameEl.textContent = user.name || 'User';
        
        // Get current status
        const currentStatus = getUserStatus(user);
        statusEl.textContent = currentStatus;
        statusEl.className = `user-info-status ${currentStatus.toLowerCase()}`;
        
        if (logoutBtn) {
            logoutBtn.onclick = logout;
        }
    }
    
    // Add expiry warning if applicable
    const expiryContainer = document.getElementById('user-expiration-container');
    if (expiryContainer) {
        const currentStatus = getUserStatus(user);
        
        if (currentStatus === 'Expired') {
            expiryContainer.innerHTML = `
                <p class="expiration-message expired-warning">
                    ⚠️ Your Premium plan has expired. Please renew to access premium tools.
                </p>
            `;
        } else if (user.expiryDate) {
            const today = new Date();
            const expiryDate = new Date(user.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                expiryContainer.innerHTML = `
                    <p class="expiration-message expired-warning">
                        ⚠️ Your Premium plan expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}
                    </p>
                `;
            } else if (currentStatus === 'Premium') {
                expiryContainer.innerHTML = `
                    <p class="expiration-message">
                        Premium valid until: ${new Date(user.expiryDate).toLocaleDateString()}
                    </p>
                `;
            }
        }
    }
}

function showFrameworkIntroduction() {
    const modal = document.getElementById('framework-modal');
    if (!modal) return;
    
    const progress = PROGRESS_TRACKER.getProgress();
    if (progress.firstTime) {
        modal.classList.add('active');
        
        // Update firstTime flag
        progress.firstTime = false;
        PROGRESS_TRACKER.saveProgress(progress);
    }
}

function closeFrameworkModal() {
    const modal = document.getElementById('framework-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// =====================================================================
// PAGE INITIALIZATION
// =====================================================================

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            await login(email, password);
        });
        
        // Forgot password link
        const forgotLink = document.getElementById('forgot-password-link');
        if (forgotLink) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = document.getElementById('forgot-password-modal');
                if (modal) {
                    modal.classList.add('active');
                }
            });
        }
        
        // Reset password form
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('reset-email').value;
                await resetPassword(email);
                closeForgotPasswordModal();
            });
        }
    }
}

function initSignupPage() {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const phone = document.getElementById('signup-phone').value;
            const password = document.getElementById('signup-password').value;
            
            await signup(name, email, password, phone);
        });
    }
}

async function initDashboard() {
    // Check authentication
    const user = checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update UI
    updateUserStatusDisplay();
    renderProgressTracker();
    await renderStageSections();
    
    // Show framework introduction for first-time users
    setTimeout(showFrameworkIntroduction, 1000);
}

// Handle escape key to close tool
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isToolOpen) {
        closeTool();
    }
});

// =====================================================================
// MAIN INITIALIZATION
// =====================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Setup password toggles on all pages
    setupPasswordToggles();
    
    // Initialize based on current page
    const path = window.location.pathname;
    
    if (path.includes('login.html')) {
        initLoginPage();
    } else if (path.includes('signup.html')) {
        initSignupPage();
    } else if (path.includes('dashboard.html')) {
        initDashboard();
    } else if (path.includes('index.html')) {
        // Check if user is already logged in
        const user = checkAuth();
        if (user) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Make functions globally available
window.openTool = openTool;
window.closeTool = closeTool;
window.closeFrameworkModal = closeFrameworkModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.logout = logout;
window.retryTool = retryTool;

