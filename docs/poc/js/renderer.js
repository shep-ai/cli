import { PHASES } from './constants.js';

export class Renderer {
  constructor(state, layout) {
    this.state = state;
    this.layout = layout;
  }

  render(onNodeClick, onAddChild, onDeepDive, onTaskClick) {
    const container = document.getElementById('node-layer');
    const svgLayer = document.getElementById('connector-layer');
    container.innerHTML = '';
    svgLayer.innerHTML = '';

    // Check view mode - seamless canvas switching
    if (this.state.viewMode === 'tasks') {
      this.renderTasksView(container, svgLayer, onTaskClick);
      this.updateCanvasHeader(true);
    } else {
      this.renderFeaturesView(container, svgLayer, onNodeClick, onAddChild, onDeepDive);
      this.updateCanvasHeader(false);
    }
  }

  updateCanvasHeader(isTaskView) {
    const backBtn = document.getElementById('back-btn');
    const canvasTitle = document.getElementById('canvas-title');

    if (isTaskView) {
      const feature = this.state.getFeature(this.state.focusedFeatureId);
      backBtn.classList.remove('hidden');
      // Clear and rebuild title safely
      canvasTitle.textContent = '';
      const titleText = document.createTextNode(feature?.title || 'Tasks');
      const br = document.createElement('br');
      const subtitleSpan = document.createElement('span');
      subtitleSpan.className = 'text-slate-300';
      subtitleSpan.textContent = 'Task Breakdown';
      canvasTitle.appendChild(titleText);
      canvasTitle.appendChild(br);
      canvasTitle.appendChild(subtitleSpan);
    } else {
      backBtn.classList.add('hidden');
      canvasTitle.textContent = '';
      const titleText = document.createTextNode('Features');
      const br = document.createElement('br');
      const subtitleSpan = document.createElement('span');
      subtitleSpan.className = 'text-slate-300';
      subtitleSpan.textContent = 'Control Center';
      canvasTitle.appendChild(titleText);
      canvasTitle.appendChild(br);
      canvasTitle.appendChild(subtitleSpan);
    }
  }

  renderFeaturesView(container, svgLayer, onNodeClick, onAddChild, onDeepDive) {
    const roots = this.state.getHierarchy();
    const { positions, totalHeight } = this.layout.calculate(roots);
    const containerHeight = document.getElementById('canvas-container').clientHeight;

    let offsetY = (containerHeight - (totalHeight + 96)) / 2;
    if (offsetY < 50) offsetY = 50;

    positions.forEach((pos) => {
      pos.y += offsetY;
    });

    // Render connectors
    this.renderConnectors(positions, svgLayer);

    // Render nodes
    this.renderNodes(positions, onNodeClick, onAddChild, onDeepDive);

    // Render "New Feature" button
    this.renderNewFeatureButton(container, totalHeight, offsetY, onAddChild);
  }

  renderTasksView(container, svgLayer, onTaskClick) {
    const tasks = this.state.getCanvasTasks();

    if (tasks.length === 0) {
      this.renderEmptyTasksView(container);
      return;
    }

    // Sort tasks by order
    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

    // Calculate layout (left to right flow with dependency lines)
    // Lower position to avoid title overlap
    const startX = 100;
    const startY = 200;
    const spacing = 300;

    // Render tasks
    sortedTasks.forEach((task, index) => {
      const x = startX + index * spacing;
      const y = startY;

      const el = document.createElement('div');
      el.className = 'absolute w-[260px] h-24 group cursor-pointer node-enter';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.onclick = () => onTaskClick(task.id);

      const taskCard = this.createTaskCard(task);
      el.appendChild(taskCard);

      container.appendChild(el);
    });

    // Render dependency lines (if tasks have dependsOn)
    this.renderTaskDependencies(sortedTasks, svgLayer, startX, startY, spacing);
  }

  renderEmptyTasksView(container) {
    const el = document.createElement('div');
    el.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center';

    const icon = document.createElement('i');
    icon.className = 'fas fa-tasks text-slate-300 text-4xl mb-4';

    const text = document.createElement('p');
    text.className = 'text-slate-400 text-sm';
    text.textContent = 'No tasks yet for this feature';

    el.appendChild(icon);
    el.appendChild(text);
    container.appendChild(el);
  }

  renderTaskDependencies(tasks, svgLayer, startX, startY, spacing) {
    // Simple connecting lines between sequential tasks
    for (let i = 0; i < tasks.length - 1; i++) {
      const startPosX = startX + i * spacing + 260;
      const endPosX = startX + (i + 1) * spacing;
      const posY = startY + 48;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cpx = startPosX + (endPosX - startPosX) / 2;
      path.setAttribute(
        'd',
        `M ${startPosX} ${posY} C ${cpx} ${posY}, ${cpx} ${posY}, ${endPosX} ${posY}`
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#e2e8f0');
      path.setAttribute('stroke-width', '1.5');
      svgLayer.appendChild(path);
    }
  }

  renderConnectors(positions, svgLayer) {
    this.state.nodes.forEach((node) => {
      if (node.parentId && positions.has(node.id) && positions.has(node.parentId)) {
        const start = positions.get(node.parentId);
        const end = positions.get(node.id);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cp1x = start.x + 260 + (end.x - start.x - 260) / 2;
        path.setAttribute(
          'd',
          `M ${start.x + 260} ${start.y + 48} C ${cp1x} ${start.y + 48}, ${cp1x} ${end.y + 48}, ${end.x} ${end.y + 48}`
        );
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e2e8f0');
        path.setAttribute('stroke-width', '1.5');
        svgLayer.appendChild(path);
      }
    });
  }

  renderNodes(positions, onNodeClick, onAddChild, onDeepDive) {
    const container = document.getElementById('node-layer');

    this.state.nodes.forEach((node) => {
      if (!positions.has(node.id)) return;
      const pos = positions.get(node.id);
      const phase = PHASES.find((p) => p.id === node.phaseId) || PHASES[0];
      const isSelected = this.state.selectedNodeId === node.id;
      const isActionNeeded = phase.actionRequired;

      // Determine feature status (for color scheme)
      const status = this.getFeatureStatus(node);

      // Get granular progress (includes sub-progress within phase)
      const granularProgress = this.state.getGranularProgress(node.id);
      const rawPercent = granularProgress.totalProgress;
      const displayPercent = Math.max(5, rawPercent);

      let animationClass = '';
      let glowClass = '';
      let borderColor = '';

      if (status === 'awaiting-action') {
        // Yellow heartbeat glow for action required
        animationClass = 'heartbeat-glow';
        borderColor = 'border-amber-400/70';
      } else if (status === 'blocked') {
        // Muted gray for blocked features
        borderColor = 'border-slate-300';
      } else if (status === 'running') {
        // Blue construction jigsaw for in-progress features
        animationClass = 'construction-progress';
        borderColor = 'border-blue-500/70';
      } else {
        // Completed features - grayed out
        borderColor = 'border-slate-300';
      }

      // Check if this card already exists in the DOM
      const existingEl = container.querySelector(`[data-feature-id="${node.id}"]`);
      const isNewCard = !existingEl;

      const el = document.createElement('div');
      // Only apply node-enter animation to newly created cards
      el.className = `absolute w-[260px] h-24 group cursor-pointer${isNewCard ? ' node-enter' : ''}`;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.dataset.featureId = node.id; // Add data attribute for easy lookup
      el.dataset.status = status; // Add status for drawer styling
      el.onclick = () => onNodeClick(node.id);

      // Remove animation class after it completes to prevent flickering on re-renders
      if (isNewCard) {
        el.addEventListener(
          'animationend',
          () => {
            el.classList.remove('node-enter');
          },
          { once: true }
        );
      }

      const nodeHTML = this.createNodeHTML(
        node,
        phase,
        isSelected,
        animationClass,
        rawPercent,
        displayPercent,
        status,
        glowClass,
        borderColor
      );
      el.appendChild(nodeHTML);

      const addBtn = this.createAddButton(node.id, onAddChild);
      el.appendChild(addBtn);

      // Add feature drawer (includes deep dive button now)
      const drawer = this.createFeatureDrawer(node.id, onDeepDive);
      el.appendChild(drawer);

      // Add environment indicator
      const envIndicator = this.createEnvironmentIndicator(node.id);
      el.appendChild(envIndicator);

      container.appendChild(el);
    });
  }

  /**
   * Determine feature status based on phase and parent state
   * @param {Object} node - Feature node
   * @returns {string} 'awaiting-action' | 'blocked' | 'running' | 'completed'
   */
  getFeatureStatus(node) {
    const phase = PHASES.find((p) => p.id === node.phaseId) || PHASES[0];

    // Check if completed
    if (node.phaseId >= 8) return 'completed';

    // Check if awaiting user action
    if (phase.actionRequired) return 'awaiting-action';

    // Check if blocked by parent
    if (node.parentId) {
      const parent = this.state.nodes.find((n) => n.id === node.parentId);
      if (parent) {
        // Children can do requirements/planning (phases 0-4) but cannot enter Implementation (phase 5+)
        // until parent completes Implementation (phase 5)
        if (node.phaseId >= 5 && parent.phaseId < 5) {
          return 'blocked';
        }
      }
    }

    // Otherwise, feature is actively running
    return 'running';
  }

  createNodeHTML(
    node,
    phase,
    isSelected,
    animationClass,
    rawPercent,
    displayPercent,
    status,
    glowClass = '',
    borderColor = ''
  ) {
    const nodeHTML = document.createElement('div');
    // Always use gray border - status shown via left border only
    const borderClass = isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200';
    nodeHTML.className = `w-full h-full rounded glass flex flex-col justify-between border overflow-hidden transition-all duration-200 ${glowClass} ${borderClass} ${animationClass}`;

    const content = document.createElement('div');
    content.className = 'relative flex-1 px-3 pt-2 pb-0 flex flex-col overflow-hidden bg-white';

    // Phase indicator - always gray (status shown via left border only)
    const indicatorColor = 'bg-slate-300';

    const indicator = document.createElement('div');
    indicator.className = `phase-indicator ${indicatorColor}`;
    content.appendChild(indicator);

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center flex-shrink-0 mb-0.5';

    const phaseLabel = document.createElement('span');
    phaseLabel.className =
      'text-[8px] font-bold uppercase tracking-wider text-slate-400 truncate pr-2';
    phaseLabel.textContent = phase.label;
    header.appendChild(phaseLabel);

    // Status icon
    if (status === 'awaiting-action') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-user-clock text-amber-500 text-[10px] animate-pulse';
      icon.title = 'User action required';
      header.appendChild(icon);
    } else if (status === 'blocked') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-lock text-slate-400 text-[9px]';
      icon.title = 'Blocked by parent feature';
      header.appendChild(icon);
    } else if (status === 'running') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-cog fa-spin text-emerald-500 text-[9px]';
      icon.title = 'In progress';
      header.appendChild(icon);
    } else if (status === 'completed') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-check-circle text-slate-400 text-[9px]';
      icon.title = 'Completed';
      header.appendChild(icon);
    }
    content.appendChild(header);

    const title = document.createElement('h3');
    title.className = 'text-xs font-bold text-slate-700 leading-tight truncate flex-shrink-0';
    title.textContent = node.title;
    content.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'text-[9px] text-slate-400 mt-0.5 leading-tight line-clamp-1';
    desc.textContent = node.description || 'No specifications.';
    content.appendChild(desc);

    nodeHTML.appendChild(content);

    const footer = document.createElement('div');
    footer.className = 'px-3 pb-1.5 pt-1 bg-slate-50 flex-shrink-0';

    const footerTop = document.createElement('div');
    footerTop.className = 'flex justify-between items-center mb-0.5';

    const nodeId = document.createElement('span');
    nodeId.className = 'text-[8px] text-slate-400 font-mono';
    nodeId.textContent = `#${node.id.substr(-3)}`;
    footerTop.appendChild(nodeId);

    const percent = document.createElement('span');
    percent.className = 'text-[8px] text-slate-400 font-medium';
    percent.textContent = `${Math.round(rawPercent)}%`;
    footerTop.appendChild(percent);

    footer.appendChild(footerTop);

    // Show message instead of progress bar when action is required
    if (status === 'awaiting-action') {
      const actionMessage = document.createElement('div');
      actionMessage.className =
        'text-[9px] text-amber-600 font-medium text-center py-0.5 bg-amber-50 rounded';
      actionMessage.innerHTML = '<i class="fas fa-user-clock mr-1"></i>User action required';
      footer.appendChild(actionMessage);
    } else {
      // Regular progress bar for other statuses
      const progressBar = document.createElement('div');
      progressBar.className = 'w-full h-0.5 bg-slate-100 rounded-full overflow-hidden';

      // Match progress bar color to status indicator
      const progressColor =
        {
          blocked: 'bg-slate-400',
          running: 'bg-emerald-500',
          completed: 'bg-slate-400',
        }[status] || phase.color;

      const progressFill = document.createElement('div');
      progressFill.className = `h-full rounded-full ${progressColor} transition-all duration-700 ease-out`;
      progressFill.style.width = `${displayPercent}%`;
      progressBar.appendChild(progressFill);

      footer.appendChild(progressBar);
    }

    nodeHTML.appendChild(footer);

    return nodeHTML;
  }

  createAddButton(nodeId, onAddChild) {
    const addBtn = document.createElement('button');
    addBtn.className =
      'absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:shadow-lg z-20 ring-2 ring-white';

    const icon = document.createElement('i');
    icon.className = 'fas fa-plus text-[9px]';
    addBtn.appendChild(icon);

    addBtn.onclick = (e) => {
      e.stopPropagation();
      onAddChild(nodeId);
    };
    return addBtn;
  }

  createDeepDiveButton(nodeId, onDeepDive) {
    const deepDiveBtn = document.createElement('button');
    deepDiveBtn.className =
      'absolute -right-2.5 -bottom-2.5 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:shadow-lg z-20 ring-2 ring-white';
    deepDiveBtn.title = 'View tasks';

    const icon = document.createElement('i');
    icon.className = 'fas fa-search text-[9px]';
    deepDiveBtn.appendChild(icon);

    deepDiveBtn.onclick = (e) => {
      e.stopPropagation();
      onDeepDive(nodeId);
    };
    return deepDiveBtn;
  }

  createFeatureDrawer(nodeId, onDeepDive) {
    const drawer = document.createElement('div');
    drawer.className = 'feature-drawer';
    drawer.dataset.featureId = nodeId;

    // Environment button - Full width first row
    const runBtn = document.createElement('button');
    runBtn.className = 'drawer-btn run-env-btn full-width';
    runBtn.dataset.featureId = nodeId;
    runBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.startEnvironment(nodeId);
    };
    runBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Start Dev Server</span>';

    drawer.appendChild(runBtn);

    // Icon-only actions - Single row
    const iconRow = document.createElement('div');
    iconRow.className = 'drawer-icon-row';

    // PR button
    const prBtn = document.createElement('button');
    prBtn.className = 'drawer-icon-btn';
    prBtn.title = 'Pull Request';
    prBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.openPR(nodeId);
    };
    prBtn.innerHTML = '<i class="fab fa-github"></i>';

    // VSCode button
    const vscodeBtn = document.createElement('button');
    vscodeBtn.className = 'drawer-icon-btn';
    vscodeBtn.title = 'VSCode';
    vscodeBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.openInVSCode(nodeId);
    };
    vscodeBtn.innerHTML = '<i class="fab fa-microsoft"></i>';

    // Web Preview button
    const webBtn = document.createElement('button');
    webBtn.className = 'drawer-icon-btn';
    webBtn.title = 'Web Preview';
    webBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.openWebPreview(nodeId);
    };
    webBtn.innerHTML = '<i class="fas fa-globe"></i>';

    // Terminal button
    const terminalBtn = document.createElement('button');
    terminalBtn.className = 'drawer-icon-btn';
    terminalBtn.title = 'Terminal';
    terminalBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.openTerminal(nodeId);
    };
    terminalBtn.innerHTML = '<i class="fas fa-terminal"></i>';

    // IDE Preview button
    const ideBtn = document.createElement('button');
    ideBtn.className = 'drawer-icon-btn';
    ideBtn.title = 'IDE Preview';
    ideBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.openIDEPreview(nodeId);
    };
    ideBtn.innerHTML = '<i class="fas fa-code"></i>';

    // Deep Dive button - Highlighted icon
    const deepDiveBtn = document.createElement('button');
    deepDiveBtn.className = 'drawer-icon-btn deep-dive-icon-btn';
    deepDiveBtn.title = 'Deep Dive';
    deepDiveBtn.onclick = (e) => {
      e.stopPropagation();
      onDeepDive(nodeId);
    };
    deepDiveBtn.innerHTML = '<i class="fas fa-search"></i>';

    iconRow.appendChild(prBtn);
    iconRow.appendChild(vscodeBtn);
    iconRow.appendChild(webBtn);
    iconRow.appendChild(terminalBtn);
    iconRow.appendChild(ideBtn);
    iconRow.appendChild(deepDiveBtn);

    drawer.appendChild(iconRow);
    return drawer;
  }

  createEnvironmentIndicator(nodeId) {
    const indicator = document.createElement('div');
    indicator.className = 'env-indicator';
    indicator.dataset.featureId = nodeId;
    indicator.innerHTML = '<i class="fas fa-circle"></i>';
    return indicator;
  }

  renderNewFeatureButton(container, totalHeight, offsetY, onNewFeature) {
    const addBtnContainer = document.createElement('div');
    addBtnContainer.className = 'absolute w-[260px] h-24 node-enter';
    addBtnContainer.style.left = '50px';
    addBtnContainer.style.top = `${totalHeight + offsetY}px`;

    const newFeatureBtn = document.createElement('button');
    newFeatureBtn.className =
      'group flex flex-col items-center justify-center w-full h-full border border-dashed border-slate-200 rounded hover:border-blue-400 hover:bg-slate-50 transition-all duration-200 bg-white/40';
    newFeatureBtn.onclick = () => onNewFeature(null);

    const iconContainer = document.createElement('div');
    iconContainer.className =
      'w-6 h-6 rounded bg-slate-100 flex items-center justify-center mb-1.5 group-hover:bg-blue-600 transition-colors shadow-sm';

    const icon = document.createElement('i');
    icon.className = 'fas fa-plus text-xs text-slate-300 group-hover:text-white';
    iconContainer.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'text-slate-400 text-[10px] font-semibold group-hover:text-blue-500';
    label.textContent = 'NEW FEATURE';

    newFeatureBtn.appendChild(iconContainer);
    newFeatureBtn.appendChild(label);
    addBtnContainer.appendChild(newFeatureBtn);
    container.appendChild(addBtnContainer);
  }

  /**
   * Render tasks in the deep dive modal
   * @param {Function} onTaskClick - Callback when task is clicked
   */
  renderModal(onTaskClick) {
    const modalContainer = document.getElementById('modal-node-layer');
    const modalSvgLayer = document.getElementById('modal-connector-layer');
    modalContainer.innerHTML = '';
    modalSvgLayer.innerHTML = '';

    const tasks = this.state.getModalTasks();

    if (tasks.length === 0) {
      this.renderEmptyModalView(modalContainer);
      return;
    }

    // Sort tasks by order
    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

    // Calculate layout (left to right flow with dependency lines)
    const startX = 100;
    const startY = 120;
    const spacing = 300;

    // Render tasks
    sortedTasks.forEach((task, index) => {
      const x = startX + index * spacing;
      const y = startY;

      const el = document.createElement('div');
      el.className = 'absolute w-[260px] group cursor-pointer node-enter';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.onclick = () => onTaskClick(task.id);

      const taskCard = this.createTaskCard(task);
      el.appendChild(taskCard);

      modalContainer.appendChild(el);
    });

    // Render dependency lines (if tasks have dependsOn)
    this.renderModalDependencies(sortedTasks, modalSvgLayer, startX, startY, spacing);
  }

  renderEmptyModalView(container) {
    const el = document.createElement('div');
    el.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center';

    const icon = document.createElement('i');
    icon.className = 'fas fa-tasks text-slate-300 text-4xl mb-4';

    const text = document.createElement('p');
    text.className = 'text-slate-400 text-sm';
    text.textContent = 'No tasks yet for this feature';

    el.appendChild(icon);
    el.appendChild(text);
    container.appendChild(el);
  }

  renderModalDependencies(tasks, svgLayer, startX, startY, spacing) {
    // TODO: Implement dependency line rendering
    // For now, just render simple connecting lines between sequential tasks
    for (let i = 0; i < tasks.length - 1; i++) {
      const startPosX = startX + i * spacing + 260; // Right edge of current card
      const endPosX = startX + (i + 1) * spacing; // Left edge of next card
      const posY = startY + 48; // Middle of card height

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cpx = startPosX + (endPosX - startPosX) / 2;
      path.setAttribute(
        'd',
        `M ${startPosX} ${posY} C ${cpx} ${posY}, ${cpx} ${posY}, ${endPosX} ${posY}`
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#e2e8f0');
      path.setAttribute('stroke-width', '1.5');
      svgLayer.appendChild(path);
    }
  }

  createTaskCard(task) {
    // Map task status to feature-like status
    const taskStatus =
      task.status === 'progress'
        ? 'running'
        : task.status === 'done'
          ? 'completed'
          : task.status === 'blocked'
            ? 'blocked'
            : 'running'; // 'todo' defaults to running

    // Calculate progress from acceptance criteria
    let progress = 0;
    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      const completedCount = task.acceptanceCriteria.filter((ac) => ac.completed).length;
      progress = (completedCount / task.acceptanceCriteria.length) * 100;
    }
    const displayPercent = Math.max(5, progress);

    // Status-based styling (matching feature cards exactly)
    let animationClass = '';
    let borderColor = '';

    if (taskStatus === 'running') {
      animationClass = 'construction-progress';
      borderColor = 'border-blue-500/70';
    } else if (taskStatus === 'blocked') {
      borderColor = 'border-slate-300';
    } else if (taskStatus === 'completed') {
      borderColor = 'border-slate-300';
    }

    // Main card container
    const card = document.createElement('div');
    card.className = `w-full h-full rounded glass flex flex-col justify-between border overflow-hidden transition-all duration-200 ${borderColor} ${animationClass}`;

    // Content section
    const content = document.createElement('div');
    content.className = 'relative flex-1 px-3 pt-2 pb-0 flex flex-col overflow-hidden bg-white';

    // Top indicator (status color)
    const indicatorColor =
      {
        running: 'bg-blue-500',
        blocked: 'bg-slate-400',
        completed: 'bg-slate-400',
      }[taskStatus] || 'bg-blue-500';

    const indicator = document.createElement('div');
    indicator.className = `phase-indicator ${indicatorColor}`;
    content.appendChild(indicator);

    // Header with status label and icon
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center flex-shrink-0 mb-0.5';

    const statusLabel = document.createElement('span');
    statusLabel.className =
      'text-[8px] font-bold uppercase tracking-wider text-slate-400 truncate pr-2';
    statusLabel.textContent = task.status.toUpperCase();
    header.appendChild(statusLabel);

    // Status icon
    if (taskStatus === 'blocked') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-lock text-slate-400 text-[9px]';
      icon.title = 'Blocked';
      header.appendChild(icon);
    } else if (taskStatus === 'running') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-cog fa-spin text-blue-500 text-[9px]';
      icon.title = 'In progress';
      header.appendChild(icon);
    } else if (taskStatus === 'completed') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-check-circle text-slate-400 text-[9px]';
      icon.title = 'Completed';
      header.appendChild(icon);
    }
    content.appendChild(header);

    // Title
    const title = document.createElement('h3');
    title.className = 'text-xs font-bold text-slate-700 leading-tight truncate flex-shrink-0';
    title.textContent = task.title || 'Untitled Task';
    content.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.className = 'text-[9px] text-slate-400 mt-0.5 leading-tight line-clamp-1';
    desc.textContent = task.description || 'No description.';
    content.appendChild(desc);

    // Show commits badge for completed tasks
    if (taskStatus === 'completed' && task.commits && task.commits.length > 0) {
      const commitsBadge = document.createElement('div');
      commitsBadge.className = 'flex items-center gap-1.5 mt-1.5';

      const badge = document.createElement('span');
      badge.className =
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[8px] font-semibold text-emerald-700';
      badge.innerHTML = `<i class="fas fa-code-commit text-[7px]"></i>${task.commits.length} commits`;
      commitsBadge.appendChild(badge);

      if (task.changesSummary) {
        const changesBadge = document.createElement('span');
        changesBadge.className = 'text-[8px] text-slate-400';
        changesBadge.innerHTML = `<i class="fas fa-plus text-emerald-500 text-[7px]"></i>${task.changesSummary.additions} <i class="fas fa-minus text-red-500 text-[7px] ml-0.5"></i>${task.changesSummary.deletions}`;
        commitsBadge.appendChild(changesBadge);
      }

      content.appendChild(commitsBadge);
    }

    // Show blocked reason for blocked tasks
    if (taskStatus === 'blocked' && task.blockedReason) {
      const blockedMsg = document.createElement('div');
      blockedMsg.className =
        'flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200';

      const icon = document.createElement('i');
      icon.className = 'fas fa-lock text-slate-400 text-[7px]';
      blockedMsg.appendChild(icon);

      const text = document.createElement('span');
      text.className = 'text-[8px] text-slate-600';
      text.textContent = task.blockedReason;
      blockedMsg.appendChild(text);

      content.appendChild(blockedMsg);
    }

    card.appendChild(content);

    // Footer with ID and progress
    const footer = document.createElement('div');
    footer.className = 'px-3 pb-1.5 pt-1 bg-slate-50 flex-shrink-0';

    const footerTop = document.createElement('div');
    footerTop.className = 'flex justify-between items-center mb-0.5';

    const taskId = document.createElement('span');
    taskId.className = 'text-[8px] text-slate-400 font-mono';
    taskId.textContent = `#${task.id.substr(-3)}`;
    footerTop.appendChild(taskId);

    const percent = document.createElement('span');
    percent.className = 'text-[8px] text-slate-400 font-medium';
    percent.textContent = `${Math.round(progress)}%`;
    footerTop.appendChild(percent);

    footer.appendChild(footerTop);

    // Progress bar
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'absolute bottom-0 left-0 right-0 h-1 bg-slate-100';

    const progressBarColor =
      {
        running: 'bg-blue-500',
        blocked: 'bg-slate-400',
        completed: 'bg-slate-400',
      }[taskStatus] || 'bg-blue-500';

    const progressBar = document.createElement('div');
    progressBar.className = `h-full ${progressBarColor} transition-all duration-500`;
    progressBar.style.width = `${displayPercent}%`;
    progressBarContainer.appendChild(progressBar);

    footer.appendChild(progressBarContainer);
    card.appendChild(footer);

    return card;
  }

  /**
   * Render environment cards on the right side of canvas
   */
  renderEnvironmentCards() {
    const container = document.getElementById('env-cards-container');
    if (!container) return;

    container.innerHTML = '';

    // Get all running environments
    const runningEnvironments = Object.entries(this.state.featureEnvironments)
      .filter(([_, env]) => env.status === 'running')
      .map(([featureId, env]) => ({ featureId, ...env }));

    // Sort by most recent first (or just render in order)
    runningEnvironments.forEach((env) => {
      const feature = this.state.getFeature(env.featureId);
      if (!feature) return;

      const card = this.createEnvironmentCard(env, feature);
      container.appendChild(card);
    });
  }

  /**
   * Create a single environment card
   */
  createEnvironmentCard(env, feature) {
    const card = document.createElement('div');
    card.className = 'env-card';
    card.dataset.featureId = env.featureId;

    // Header with title and delete button
    const header = document.createElement('div');
    header.className = 'env-card-header';

    const title = document.createElement('div');
    title.className = 'env-card-title';
    title.textContent = feature.title;
    title.title = feature.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'env-card-delete';
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fas fa-times text-xs';
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      window.app.deleteEnvironment(env.featureId);
    };
    deleteBtn.title = 'Stop and remove';

    header.appendChild(title);
    header.appendChild(deleteBtn);
    card.appendChild(header);

    // Status indicator
    const status = document.createElement('div');
    status.className = 'env-card-status';

    const statusDot = document.createElement('div');
    statusDot.className = 'env-card-status-dot';

    const statusText = document.createElement('span');
    statusText.className = 'env-card-status-text';
    statusText.textContent = 'Server Running';

    status.appendChild(statusDot);
    status.appendChild(statusText);
    card.appendChild(status);

    // URL (clickable)
    const urlContainer = document.createElement('div');
    urlContainer.className = 'env-card-url';
    urlContainer.onclick = () => {
      window.app.openDesktopModal(env.featureId, env.url);
    };
    urlContainer.title = 'Click to open environment';

    const urlIcon = document.createElement('i');
    urlIcon.className = 'fas fa-link env-card-url-icon';

    const urlText = document.createElement('span');
    urlText.className = 'env-card-url-text';
    urlText.textContent = env.url;

    urlContainer.appendChild(urlIcon);
    urlContainer.appendChild(urlText);
    card.appendChild(urlContainer);

    // Footer with ID and port
    const footer = document.createElement('div');
    footer.className = 'env-card-footer';

    const id = document.createElement('span');
    id.className = 'env-card-id';
    id.textContent = `#${env.featureId.substr(-3)}`;

    const port = document.createElement('span');
    port.className = 'env-card-port';
    port.textContent = `PORT ${env.port}`;

    footer.appendChild(id);
    footer.appendChild(port);
    card.appendChild(footer);

    return card;
  }
}
