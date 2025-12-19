// =====================================================================
// Configuration
// =====================================================================

// IMPORTANT: REPLACE THIS WITH YOUR ACTUAL DEPLOYED GAS URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbziXMS_YZq8_YDMxrkBNbLWzA3CBEzQoQwlGXY2o2QixAsBSSb4HhuSN6okQZiuA31xmg/exec';

// =====================================================================
// GLOBAL STATE
// =====================================================================

let currentTool = null;
let isToolOpen = false;
let tools = [];
let FRAMEWORK_STAGES = {};

// =====================================================================
// UTILITY FUNCTIONS - FIXED PASSWORD TOGGLE
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
    console.log('Setting up password toggles...');
    
    document.querySelectorAll('.password-toggle-container').forEach(container => {
        const input = container.querySelector('input[type="password"], input[type="text"]');
        const toggle = container.querySelector('.toggle-password');
        
        if (input && toggle) {
            // Set initial state
            toggle.textContent = input.type === 'password' ? '👁️‍🗨️' : '👁️';
            
            // Add click handler
            toggle.addEventListener('click', function() {
                console.log('Toggle clicked, current type:', input.type);
                if (input.type === 'password') {
                    input.type = 'text';
                    this.textContent = '👁️';
                } else {
                    input.type = 'password';
                    this.textContent = '👁️‍🗨️';
                }
                console.log('New type:', input.type);
            });
        }
    });
}

// =====================================================================
// FETCH TOOLS FROM BACKEND - SECURED VERSION
// =====================================================================

async function loadToolsFromBackend() {
    try {
        console.log('Loading tools from backend...');
        const formData = new FormData();
        formData.append('action', 'getTools');
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        if (data.success) {
            tools = data.tools || [];
            FRAMEWORK_STAGES = data.frameworkStages || {};
            
            // Remove URLs from frontend to prevent exposure
            tools = tools.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                icon: tool.icon,
                plan: tool.plan,
                stage: tool.stage,
                type: tool.type
                // URL is NOT stored in frontend
            }));
            
            console.log('Tools metadata loaded from backend');
            console.log('Tools count:', tools.length);
            console.log('Framework stages:', FRAMEWORK_STAGES);
            return true;
        } else {
            console.error('Backend returned error:', data.message);
            showMessage('Failed to load tools: ' + data.message, 'error');
            return false;
        }
    } catch (error) {
        console.error('Error loading tools from backend:', error);
        showMessage('Connection error. Please check your network and refresh.', 'error');
        return false;
    }
}

// =====================================================================
// AUTHENTICATION FUNCTIONS
// =====================================================================

function getUserStatus(user) {
    if (!user) return 'Free';
    
    if (user.expiryDate) {
        const today = new Date();
        const expiryDate = new Date(user.expiryDate);
        
        if (expiryDate < today) {
            return 'Expired';
        }
    }
    
    if (user.plan === 'Premium' && user.status !== 'Expired') {
        return 'Premium';
    }
    
    return user.status || 'Free';
}

async function login(email, password) {
    try {
        showMessage('Logging in...', 'info');
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
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
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
            return true;
        } else {
            showMessage(data.message || 'Login failed. Check your credentials.', 'error');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Connection error. Please try again.', 'error');
        return false;
    }
}

async function signup(name, email, password, phone = '') {
    try {
        showMessage('Creating account...', 'info');
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
        console.log('Signup response:', data);
        
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
            
            localStorage.removeItem('dmlabsbot_progress');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
            return true;
        } else {
            showMessage(data.message || 'Signup failed. Please try again.', 'error');
            return false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Connection error. Please try again.', 'error');
        return false;
    }
}

async function resetPassword(email) {
    try {
        showMessage('Sending reset instructions...', 'info');
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
    
    try {
        const user = JSON.parse(storedUser);
        
        const currentStatus = getUserStatus(user);
        if (user.status !== currentStatus) {
            user.status = currentStatus;
            localStorage.setItem('dmlabsbot_user', JSON.stringify(user));
        }
        
        return user;
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

function checkPremiumAccess() {
    const user = checkAuth();
    if (!user) return false;
    
    const status = getUserStatus(user);
    return status === 'Premium';
}

// =====================================================================
// TOOL MANAGEMENT - URLS SECURED IN BACKEND
// =====================================================================

async function getToolUrlFromBackend(toolId) {
    try {
        console.log('Fetching tool URL for:', toolId);
        const formData = new FormData();
        formData.append('action', 'getTool');
        formData.append('toolId', toolId);
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Tool URL response:', data);
        
        if (data.success && data.tool && data.tool.url) {
            return data.tool.url;
        } else {
            throw new Error(data.message || 'Tool URL not found');
        }
    } catch (error) {
        console.error('Error fetching tool URL:', error);
        throw error;
    }
}

function createToolIframeContainer() {
    let iframeContainer = document.getElementById('tool-iframe-container');
    if (!iframeContainer) {
        iframeContainer = document.createElement('div');
        iframeContainer.id = 'tool-iframe-container';
        iframeContainer.className = 'tool-iframe-container';
        
        const backdrop = document.createElement('div');
        backdrop.id = 'tool-backdrop';
        backdrop.className = 'tool-backdrop';
        backdrop.onclick = closeTool;
        
        const iframeWrapper = document.createElement('div');
        iframeWrapper.className = 'tool-iframe-wrapper';
        
        const header = document.createElement('div');
        header.className = 'tool-header';
        header.innerHTML = `
            <div class="tool-header-info">
                <span class="tool-header-icon" id="tool-header-icon">💡</span>
                <span class="tool-header-title" id="tool-header-title">Loading Tool...</span>
            </div>
            <button class="tool-close-button" onclick="closeTool()">Close</button>
        `;
        
        const iframe = document.createElement('iframe');
        iframe.id = 'tool-iframe';
        iframe.className = 'tool-iframe';
        iframe.frameBorder = '0';
        iframe.allow = 'fullscreen';
        
        const loadingState = document.createElement('div');
        loadingState.id = 'tool-loading';
        loadingState.className = 'tool-loading';
        loadingState.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text" id="loading-text">Loading tool...</div>
        `;
        
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
    console.log('Opening tool:', toolId);
    
    // Find tool metadata (without URL)
    const toolMetadata = tools.find(t => t.id === toolId);
    if (!toolMetadata) {
        showMessage('Tool not found in local data', 'error');
        return;
    }
    
    const user = checkAuth();
    if (!user) {
        showMessage('Please login to access tools', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const currentStatus = getUserStatus(user);
    
    // Check access permissions
    if (toolMetadata.plan === 'Premium') {
        if (currentStatus !== 'Premium') {
            if (currentStatus === 'Expired') {
                showMessage('Your Premium plan has expired. Please renew to access premium tools.', 'error');
            } else {
                showMessage('Upgrade to Premium to access this tool', 'error');
            }
            return;
        }
    }
    
    // Show loading state immediately
    const iframeContainer = createToolIframeContainer();
    const backdrop = document.getElementById('tool-backdrop');
    
    document.getElementById('tool-header-icon').textContent = toolMetadata.icon;
    document.getElementById('tool-header-title').textContent = toolMetadata.name;
    document.getElementById('loading-text').textContent = `Loading ${toolMetadata.name}...`;
    
    document.getElementById('tool-loading').style.display = 'flex';
    document.getElementById('tool-error').style.display = 'none';
    document.getElementById('tool-iframe').style.display = 'none';
    
    iframeContainer.classList.add('active');
    backdrop.classList.add('active');
    
    document.body.style.overflow = 'hidden';
    
    try {
        // SECURE: Fetch URL from backend only when tool is opened
        const toolUrl = await getToolUrlFromBackend(toolId);
        console.log('Got tool URL:', toolUrl);
        
        // Store current tool data
        currentTool = {
            ...toolMetadata,
            url: toolUrl
        };
        
        isToolOpen = true;
        
        // Update progress
        PROGRESS_TRACKER.markToolCompleted(toolId);
        
        // Load iframe with secured URL
        const iframe = document.getElementById('tool-iframe');
        iframe.src = toolUrl;
        
        iframe.onload = function() {
            setTimeout(() => {
                document.getElementById('tool-loading').style.display = 'none';
                iframe.style.display = 'block';
                showMessage(`${toolMetadata.name} loaded successfully`, 'success');
            }, 500);
        };
        
        iframe.onerror = function() {
            console.error('Iframe loading error');
            document.getElementById('tool-loading').style.display = 'none';
            document.getElementById('tool-error').style.display = 'flex';
            document.getElementById('error-message').textContent = 
                `Failed to load ${toolMetadata.name}. The tool might be temporarily unavailable.`;
        };
        
    } catch (error) {
        console.error('Error opening tool:', error);
        document.getElementById('tool-loading').style.display = 'none';
        document.getElementById('tool-error').style.display = 'flex';
        document.getElementById('error-message').textContent = 
            `Error: Unable to load tool. ${error.message}`;
    }
}

function closeTool() {
    const iframeContainer = document.getElementById('tool-iframe-container');
    const backdrop = document.getElementById('tool-backdrop');
    const iframe = document.getElementById('tool-iframe');
    
    if (iframeContainer && backdrop) {
        iframeContainer.classList.remove('active');
        backdrop.classList.remove('active');
        
        if (iframe) {
            iframe.src = '';
            iframe.style.display = 'none';
        }
        
        document.getElementById('tool-loading').style.display = 'flex';
        document.getElementById('tool-error').style.display = 'none';
    }
    
    isToolOpen = false;
    currentTool = null;
    
    document.body.style.overflow = '';
    
    if (window.location.pathname.includes('dashboard.html')) {
        renderProgressTracker();
        renderStageSections();
    }
}

function retryTool() {
    if (currentTool) {
        document.getElementById('tool-error').style.display = 'none';
        document.getElementById('tool-loading').style.display = 'flex';
        
        const iframe = document.getElementById('tool-iframe');
        iframe.src = currentTool.url;
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
            
            const tool = tools.find(t => t.id === toolId);
            if (tool) {
                progress.lastToolOpened = toolId;
                
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
        
        const stageTools = tools.filter(t => t.stage === currentStage);
        const incompleteTools = stageTools.filter(t => 
            !progress.completedTools.includes(t.id)
        );
        
        if (incompleteTools.length > 0) {
            return incompleteTools[0];
        }
        
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
// DASHBOARD FUNCTIONS
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
        if (!stage) continue;
        
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

function getStageDescription(stageNum) {
    const descriptions = {
        1: 'Find proven ideas by analyzing market demand and trending questions',
        2: 'Understand your ideal customer and analyze competitors',
        3: 'Design your product structure and value proposition',
        4: 'Build your product content and add valuable bonuses',
        5: 'Create sales assets and build your email list',
        6: 'Scale your product with advertising and social media content'
    };
    return descriptions[stageNum] || '';
}

function renderStageSections() {
    const toolsContainer = document.getElementById('tools-grid-container');
    if (!toolsContainer) return;
    
    const user = checkAuth();
    const currentStatus = getUserStatus(user);
    const isPremium = currentStatus === 'Premium';
    const progress = PROGRESS_TRACKER.getProgress();
    
    toolsContainer.innerHTML = '';
    
    for (let stageNum = 1; stageNum <= 6; stageNum++) {
        const stage = FRAMEWORK_STAGES[stageNum];
        if (!stage) continue;
        
        const stageTools = tools.filter(t => t.stage === stageNum);
        const stageProgress = PROGRESS_TRACKER.getStageProgress(stageNum);
        
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
                        ${getStageDescription(stageNum)}
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
    
    setupToolButtonListeners();
}

function setupToolButtonListeners() {
    document.querySelectorAll('.tool-button:not(.locked)').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const toolId = this.getAttribute('data-tool-id');
            openTool(toolId);
        });
    });
    
    document.querySelectorAll('.tool-card:not(.locked)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.tool-button')) {
                const button = this.querySelector('.tool-button');
                if (button && !button.classList.contains('locked')) {
                    const toolId = button.getAttribute('data-tool-id');
                    openTool(toolId);
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
        
        const currentStatus = getUserStatus(user);
        statusEl.textContent = currentStatus;
        statusEl.className = `user-info-status ${currentStatus.toLowerCase()}`;
        
        if (logoutBtn) {
            logoutBtn.onclick = logout;
        }
    }
    
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

async function initLoginPage() {
    console.log('Initializing login page');
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            await login(email, password);
        });
        
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

async function initSignupPage() {
    console.log('Initializing signup page');
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
    console.log('Initializing dashboard');
    const user = checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load tools metadata (without URLs) from backend
    const toolsLoaded = await loadToolsFromBackend();
    if (!toolsLoaded) {
        showMessage('Unable to load tools. Please refresh the page.', 'error');
        return;
    }
    
    updateUserStatusDisplay();
    renderProgressTracker();
    renderStageSections();
    
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

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, setting up password toggles');
    setupPasswordToggles();
    
    const path = window.location.pathname;
    console.log('Current path:', path);
    
    if (path.includes('login.html') || path.endsWith('login.html')) {
        await initLoginPage();
    } else if (path.includes('signup.html') || path.endsWith('signup.html')) {
        await initSignupPage();
    } else if (path.includes('dashboard.html') || path.endsWith('dashboard.html')) {
        await initDashboard();
    } else if (path.includes('index.html') || path.endsWith('/') || path.endsWith('index.html')) {
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
