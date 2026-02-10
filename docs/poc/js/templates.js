export function getOverviewTabHTML() {
  return `
        <div class="p-3 space-y-3">
            <div>
                <label class="dense-label">Feature Name</label>
                <input type="text" id="input-title" class="dense-input text-xs w-full rounded px-3 py-2 text-slate-800 font-semibold" placeholder="Feature Name...">
            </div>
            <!-- Hidden fields (still needed for form submission) -->
            <input type="hidden" id="input-phase" value="0">
            <input type="hidden" id="input-priority" value="medium">
            <div>
                <label class="dense-label">Description</label>
                <textarea id="input-desc" rows="4" class="dense-input w-full rounded px-3 py-2 resize-none leading-relaxed text-slate-600 text-xs" placeholder="Add detailed specifications..."></textarea>
            </div>
            <div class="collapsible-section">
                <div class="collapsible-header flex items-center justify-between py-2 px-2" onclick="app.toggleSection('files')">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-paperclip text-slate-400 text-xs"></i>
                        <span class="text-xs font-semibold text-slate-700">Attachments</span>
                        <span class="tag bg-slate-100 text-slate-600 text-[10px]">3</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button class="attachment-icon-btn" title="Upload File" onclick="event.stopPropagation()">
                            <i class="fas fa-upload"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from Jira" onclick="event.stopPropagation()">
                            <i class="fab fa-jira"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from Confluence" onclick="event.stopPropagation()">
                            <i class="fab fa-confluence"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from Google Drive" onclick="event.stopPropagation()">
                            <i class="fab fa-google-drive"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from GitHub" onclick="event.stopPropagation()">
                            <i class="fab fa-github"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from URL" onclick="event.stopPropagation()">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from Figma" onclick="event.stopPropagation()">
                            <i class="fab fa-figma"></i>
                        </button>
                        <button class="attachment-icon-btn" title="Add from Slack" onclick="event.stopPropagation()">
                            <i class="fab fa-slack"></i>
                        </button>
                        <div class="w-px h-4 bg-slate-200 mx-0.5"></div>
                        <i id="icon-files" class="fas fa-chevron-down text-slate-400 text-xs transition-transform cursor-pointer" style="transform: rotate(180deg);"></i>
                    </div>
                </div>
                <div id="content-files" class="collapsible-content open">
                    <div class="space-y-3 px-2 pb-4">
                        <div class="grid grid-cols-3 gap-2">
                            <div class="bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer overflow-hidden">
                                <div class="p-3 flex gap-3">
                                    <i class="fas fa-file-pdf text-red-500 text-xl flex-shrink-0 mt-1"></i>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-semibold text-slate-700 truncate mb-0.5">requirements.pdf</div>
                                                <div class="text-[11px] text-slate-400">1.2 MB</div>
                                            </div>
                                            <button class="text-slate-400 hover:text-slate-600 ml-2"><i class="fas fa-download text-xs"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer overflow-hidden">
                                <div class="p-3 flex gap-3">
                                    <i class="fas fa-file-image text-blue-500 text-xl flex-shrink-0 mt-1"></i>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-semibold text-slate-700 truncate mb-0.5">mockup.png</div>
                                                <div class="text-[11px] text-slate-400">845 KB</div>
                                            </div>
                                            <button class="text-slate-400 hover:text-slate-600 ml-2"><i class="fas fa-download text-xs"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer overflow-hidden">
                                <div class="p-3 flex gap-3">
                                    <i class="fas fa-file-code text-emerald-500 text-xl flex-shrink-0 mt-1"></i>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-semibold text-slate-700 truncate mb-0.5">api-spec.yaml</div>
                                                <div class="text-[11px] text-slate-400">12 KB</div>
                                            </div>
                                            <button class="text-slate-400 hover:text-slate-600 ml-2"><i class="fas fa-download text-xs"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collapsible-section">
                <div class="collapsible-header flex items-center justify-between py-2 px-2" onclick="app.toggleSection('meta')">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-users text-slate-400 text-xs"></i>
                        <span class="text-xs font-semibold text-slate-700">Team & Metadata</span>
                    </div>
                    <i id="icon-meta" class="fas fa-chevron-down text-slate-400 text-xs transition-transform"></i>
                </div>
                <div id="content-meta" class="collapsible-content">
                    <div class="space-y-3 px-2 pb-4">
                        <div class="flex items-center justify-between">
                            <span class="dense-label mb-0">Owner</span>
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">U</div>
                                <span class="text-xs text-slate-600 font-medium">User</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5 pt-2">
                            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                                <span class="dense-label mb-1">Created</span>
                                <span class="text-xs text-slate-600 font-mono block" id="input-date">--</span>
                            </div>
                            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                                <span class="dense-label mb-1">Updated</span>
                                <span class="text-xs text-slate-600 font-mono block" id="input-updated">--</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collapsible-section">
                <div class="collapsible-header flex items-center justify-between py-2 px-2" onclick="app.toggleSection('deps')">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-diagram-project text-slate-400 text-xs"></i>
                        <span class="text-xs font-semibold text-slate-700">Dependencies</span>
                    </div>
                    <i id="icon-deps" class="fas fa-chevron-down text-slate-400 text-xs transition-transform"></i>
                </div>
                <div id="content-deps" class="collapsible-content">
                    <div class="space-y-2 px-2 pb-4">
                        <div class="text-xs text-slate-500 flex items-center gap-2 py-2 px-3 bg-slate-50 rounded border border-slate-100">
                            <i class="fas fa-link text-[10px]"></i>No dependencies yet
                        </div>
                        <button class="w-full text-xs text-blue-600 hover:text-blue-700 font-semibold py-2 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-2">
                            <i class="fas fa-plus text-[10px]"></i>Add Dependency
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function getTasksTabHTML() {
  return `
        <div class="p-3 space-y-3">
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h3 class="text-sm font-bold text-slate-700">Task Breakdown</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Track implementation progress</p>
                </div>
                <button class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5">
                    <i class="fas fa-plus text-[10px]"></i>Add Task
                </button>
            </div>
            <div class="bg-slate-50 p-4 rounded border border-slate-100">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-slate-700">Overall Progress</span>
                    <span class="text-xs font-bold text-blue-600">60%</span>
                </div>
                <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style="width: 60%"></div>
                </div>
                <div class="flex items-center gap-2.5 mt-3 text-[10px]">
                    <div class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span class="text-slate-600"><span class="font-bold">3</span> Done</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span class="text-slate-600"><span class="font-bold">2</span> In Progress</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full bg-slate-300"></div>
                        <span class="text-slate-600"><span class="font-bold">3</span> Todo</span>
                    </div>
                </div>
            </div>
            <div class="space-y-2.5">
                ${getTaskItems()}
            </div>
        </div>
    `;
}

function getTaskItems() {
  const tasks = [
    {
      title: 'Setup database schema',
      desc: 'PostgreSQL tables and relationships',
      status: 'done',
      time: '2 days ago',
    },
    {
      title: 'Create API endpoints',
      desc: 'RESTful API with authentication',
      status: 'done',
      time: '1 day ago',
    },
    {
      title: 'Write unit tests',
      desc: 'Test coverage for core functionality',
      status: 'done',
      time: '4 hours ago',
    },
    {
      title: 'Implement caching layer',
      desc: 'Redis integration for performance',
      status: 'progress',
      assignee: 'U',
    },
    {
      title: 'Add error handling',
      desc: 'Comprehensive error management and logging',
      status: 'progress',
      assignee: 'A',
    },
    { title: 'Deploy to staging', desc: 'Deploy and test in staging environment', status: 'todo' },
    { title: 'Code review', desc: 'Peer review and approval', status: 'todo' },
    { title: 'Production deployment', desc: 'Final deployment to production', status: 'blocked' },
  ];

  return tasks
    .map((task) => {
      const statusConfig = {
        done: {
          class: 'completed',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: 'fa-check',
          label: 'Done',
        },
        progress: {
          class: '',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: 'fa-spinner',
          label: 'In Progress',
        },
        todo: {
          class: 'opacity-75',
          badge: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: 'fa-circle',
          label: 'Todo',
        },
        blocked: {
          class: 'opacity-60',
          badge: 'bg-red-50 text-red-700 border-red-200',
          icon: 'fa-lock',
          label: 'Blocked',
        },
      };
      const config = statusConfig[task.status];
      const checked = task.status === 'done' ? 'checked' : '';
      const disabled = task.status === 'blocked' ? 'disabled' : '';
      const lineThrough = task.status === 'done' ? 'line-through' : '';

      return `
            <div class="task-item ${config.class}">
                <div class="flex items-start gap-3">
                    <input type="checkbox" ${checked} ${disabled} class="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <div class="flex-1">
                        <div class="text-sm font-${task.status === 'done' ? 'medium' : 'semibold'} text-slate-${task.status === 'done' ? '700' : '800'} ${lineThrough}">${task.title}</div>
                        <div class="text-xs text-slate-500 mt-1">${task.desc}</div>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="tag ${config.badge} text-[10px]">
                                <i class="fas ${config.icon} text-[8px]"></i>${config.label}
                            </span>
                            ${task.time ? `<span class="text-[10px] text-slate-400">${task.status === 'done' ? 'Completed ' : ''}${task.time}</span>` : ''}
                            ${task.assignee ? `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-${task.assignee === 'U' ? 'indigo-500 to-purple' : 'emerald-500 to-teal'}-600 text-white flex items-center justify-center text-[10px] font-bold">${task.assignee}</div>` : ''}
                            ${task.status === 'blocked' ? '<span class="text-[10px] text-slate-400">Waiting for approval</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');
}

export function getActivityTabHTML() {
  return `
        <div class="p-3 space-y-3">
            <div class="mb-3">
                <h3 class="text-sm font-bold text-slate-700">Activity Timeline</h3>
                <p class="text-xs text-slate-500 mt-0.5">Recent changes and updates</p>
            </div>
            <div class="space-y-3">
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="bg-white border border-slate-100 rounded p-3">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">U</div>
                                <span class="text-xs font-semibold text-slate-700">User</span>
                            </div>
                            <span class="text-[10px] text-slate-400">2 hours ago</span>
                        </div>
                        <p class="text-xs text-slate-600">Moved phase from <span class="font-semibold">Planning</span> to <span class="font-semibold text-amber-600">Implementation</span></p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot bg-emerald-500"></div>
                    <div class="bg-white border border-slate-100 rounded p-3">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-[10px] font-bold">A</div>
                                <span class="text-xs font-semibold text-slate-700">Alice</span>
                            </div>
                            <span class="text-[10px] text-slate-400">5 hours ago</span>
                        </div>
                        <p class="text-xs text-slate-600">Completed task: <span class="font-semibold">Write unit tests</span></p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot bg-purple-500"></div>
                    <div class="bg-white border border-slate-100 rounded p-3">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">U</div>
                                <span class="text-xs font-semibold text-slate-700">User</span>
                            </div>
                            <span class="text-[10px] text-slate-400">1 day ago</span>
                        </div>
                        <p class="text-xs text-slate-600">Added attachment: <span class="font-semibold">requirements.pdf</span></p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot bg-amber-500"></div>
                    <div class="bg-white border border-slate-100 rounded p-3">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-[10px] font-bold">B</div>
                                <span class="text-xs font-semibold text-slate-700">Bob</span>
                            </div>
                            <span class="text-[10px] text-slate-400">2 days ago</span>
                        </div>
                        <p class="text-xs text-slate-600">Updated description and added <span class="font-semibold">API</span> tag</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot bg-slate-400"></div>
                    <div class="bg-white border border-slate-100 rounded p-3">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">U</div>
                                <span class="text-xs font-semibold text-slate-700">User</span>
                            </div>
                            <span class="text-[10px] text-slate-400">3 days ago</span>
                        </div>
                        <p class="text-xs text-slate-600">Created feature</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function getSettingsTabHTML() {
  return `
        <div class="p-3 space-y-3">
            <div class="mb-3">
                <h3 class="text-sm font-bold text-slate-700">Feature Settings</h3>
                <p class="text-xs text-slate-500 mt-0.5">Advanced configuration options</p>
            </div>
            <div class="bg-white border border-slate-100 rounded p-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <div class="text-xs font-semibold text-slate-700">Notifications</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">Get updates about this feature</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            <div class="bg-white border border-slate-100 rounded p-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <div class="text-xs font-semibold text-slate-700">Auto-assign Tasks</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">Automatically assign new tasks to team members</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            <div>
                <label class="dense-label">Visibility</label>
                <div class="relative">
                    <select class="dense-input w-full rounded px-3 py-2 appearance-none cursor-pointer text-slate-700 text-sm">
                        <option value="public">Public - Anyone can view</option>
                        <option value="team" selected>Team - Team members only</option>
                        <option value="private">Private - Only you</option>
                    </select>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <i class="fas fa-chevron-down text-xs"></i>
                    </div>
                </div>
            </div>
            <div class="border-t border-red-100 pt-4 mt-6">
                <div class="text-xs font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle"></i>Danger Zone
                </div>
                <div class="space-y-2">
                    <button onclick="app.archiveFeature()" class="w-full flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-2 rounded text-xs font-semibold transition-colors border border-amber-200 hover:border-amber-300">
                        <i class="fas fa-archive"></i>Archive Feature
                    </button>
                    <button onclick="app.deleteCurrentNode()" class="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded text-xs font-semibold transition-colors border border-red-200 hover:border-red-300">
                        <i class="fas fa-trash-alt"></i>Delete Feature
                    </button>
                </div>
            </div>
        </div>
    `;
}
