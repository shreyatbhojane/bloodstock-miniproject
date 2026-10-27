/* BloodStock: plain JavaScript, one shared data store, five small view renderers. */
(() => {
  'use strict';

  const STORAGE_KEY = 'bloodstock.demo.v1';
  const GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const COMPONENTS = ['PRBC', 'Platelets', 'Plasma'];
  const STATUSES = ['Available', 'Reserved', 'Issued', 'Quarantined'];
  const VIEWS = { overview: 'Overview', inventory: 'Blood Inventory', expiry: 'Expiry Tracker', reports: 'Reports', settings: 'Settings' };
  const DAY = 86400000;
  const PAGE_SIZE = 8;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const number = value => new Intl.NumberFormat('en-IN').format(value);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let storageIssue = '';
  let storageHealthy = true;
  let editingId = null;
  let pendingConfirmation = null;
  let returnFocus = null;
  let activeView = 'overview';
  let expiryFilter = 'all';
  let dashboardComponent = 'all';
  let page = 1;
  const inventoryFilters = { search: '', group: 'all', component: 'all', status: 'all', sort: 'expiry' };
  const reportFilters = { from: '', to: '', group: 'all', status: 'all' };

  // All icons use the same 24px grid and 1.75px stroke. No icon font or emoji.
  const paths = {
    layout: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    droplet: '<path d="M12 3c-2.3 3.8-7 7.8-7 12a7 7 0 0 0 14 0c0-4.2-4.7-8.2-7-12Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart: '<path d="M4 3v17h17M9 15V9m5 6V5m5 10v-4"/>',
    settings: '<path d="m9 3-.6 2.2-2 .9L4.3 5.5 2 9.5 3.6 11v2L2 14.5l2.3 4 2.1-.6 2 .9L9 21h6l.6-2.2 2-.9 2.1.6 2.3-4-1.6-1.5v-2L22 9.5l-2.3-4-2.1.6-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6m-6 4h6m-5 10v-6h4v6M3 21h18"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3 11h5l2-3 3 7 2-4h6"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<path d="m10.3 4.3-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.7l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    print: '<path d="M6 8V3h12v5M6 17H3v-7h18v7h-3M6 14h12v7H6Z"/><path d="M17 11h.01"/>',
    arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 1l1 5M4 12l1 5a8 8 0 0 0 13 1"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    box: '<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    filter: '<path d="M3 5h18l-7 8v7l-4-2v-5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
    activity: '<path d="M2 12h5l3-9 4 18 3-9h5"/>'
  };
  function icon(name, extraClass = '') {
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
  }
  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach(element => { element.innerHTML = icon(element.dataset.icon); });
  }

  // Use calendar dates, not elapsed 24-hour periods: timezone and DST safe.
  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function dayNumber(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
    const [year, month, day] = date.split('-').map(Number);
    if (year < 1900 || year > 9999) return NaN;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return NaN;
    return parsed.getTime() / DAY;
  }
  function relativeDate(offset) { return new Date((dayNumber(today()) + offset) * DAY).toISOString().slice(0, 10); }
  function daysLeft(record) { return dayNumber(record.expiry) - dayNumber(today()); }
  function formatDate(date, short = false) {
    const parts = date.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(short ? {} : { year: 'numeric' }) });
  }
  function isUsable(record) { return record.status === 'Available' && daysLeft(record) >= 0; }
  function isOnHand(record) { return record.status !== 'Issued'; }
  function isSoon(record, windowDays = state.settings.expiryWindow) { const days = daysLeft(record); return isOnHand(record) && days >= 0 && days <= windowDays; }
  function sum(records) { return records.reduce((total, record) => total + record.quantity, 0); }
  function groupTotals(records, usableOnly = false) {
    return GROUPS.map(group => sum(records.filter(record => record.group === group && (!usableOnly || isUsable(record)))));
  }
  function metrics(records = state.inventory) {
    const totals = groupTotals(records, true);
    return { total: sum(records), available: sum(records.filter(isUsable)), low: totals.filter(count => count < state.settings.lowThreshold).length, soon: sum(records.filter(record => isSoon(record))), groups: totals };
  }

  function seedData() {
    // A batch shares collection/expiry dates. Sample dates stay useful on first run.
    const rows = [
      ['O+', 'PRBC', 28, -12, 23, 'Refrigerator A-01', 'Available'],
      ['O-', 'PRBC', 4, -33, 2, 'Refrigerator A-02', 'Available'],
      ['A+', 'PRBC', 22, -15, 20, 'Refrigerator A-03', 'Available'],
      ['A+', 'Platelets', 7, -2, 3, 'Agitator P-01', 'Available'],
      ['A-', 'PRBC', 9, -9, 26, 'Refrigerator A-04', 'Available'],
      ['B+', 'PRBC', 18, -17, 18, 'Refrigerator B-01', 'Available'],
      ['B+', 'Plasma', 6, -30, 150, 'Freezer F-01', 'Available'],
      ['O+', 'Platelets', 8, -4, 1, 'Agitator P-02', 'Available'],
      ['B-', 'PRBC', 3, -23, 12, 'Refrigerator B-02', 'Available'],
      ['AB+', 'Plasma', 12, -20, 160, 'Freezer F-02', 'Available'],
      ['O+', 'PRBC', 6, -15, 20, 'Refrigerator A-01', 'Reserved'],
      ['AB-', 'PRBC', 2, -29, 6, 'Refrigerator B-03', 'Available'],
      ['A+', 'PRBC', 4, -14, 21, 'Refrigerator A-03', 'Reserved'],
      ['O+', 'PRBC', 8, -20, 15, 'Dispatch D-01', 'Issued'],
      ['B+', 'PRBC', 3, -12, 23, 'Quarantine Q-01', 'Quarantined'],
      ['A+', 'PRBC', 5, -38, -3, 'Refrigerator A-03', 'Available'],
      ['B-', 'Platelets', 2, -7, -2, 'Quarantine Q-02', 'Quarantined'],
      ['AB+', 'Platelets', 3, -3, 2, 'Agitator P-01', 'Reserved']
    ];
    const now = Date.now();
    return {
      version: 1,
      settings: { centreName: 'City Care Blood Centre', lowThreshold: 5, expiryWindow: 7 },
      inventory: rows.map((row, index) => ({ id: `BS-${1001 + index}`, group: row[0], component: row[1], quantity: row[2], collected: relativeDate(row[3]), expiry: relativeDate(row[4]), location: row[5], status: row[6], createdAt: new Date(now - (rows.length - index) * 3600000).toISOString() })),
      activity: [
        { type: 'seed', title: 'Demo inventory is ready', detail: '18 fictional batches added to your workspace.', at: new Date(now).toISOString() },
        { type: 'seed', title: 'Available stock loaded', detail: '119 usable units across all eight blood groups.', at: new Date(now).toISOString() },
        { type: 'seed', title: 'Reserved batches loaded', detail: '13 reserved units included in the demo.', at: new Date(now).toISOString() },
        { type: 'seed', title: 'Expiry examples included', detail: 'Upcoming and expired batches ready to review.', at: new Date(now).toISOString() }
      ]
    };
  }
  function validRecord(record) {
    return record && typeof record.id === 'string' && /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(record.id) && GROUPS.includes(record.group) && COMPONENTS.includes(record.component) && STATUSES.includes(record.status) && Number.isInteger(record.quantity) && record.quantity > 0 && record.quantity <= 10000 && typeof record.collected === 'string' && typeof record.expiry === 'string' && Number.isFinite(dayNumber(record.collected)) && Number.isFinite(dayNumber(record.expiry)) && dayNumber(record.expiry) >= dayNumber(record.collected) && typeof record.location === 'string' && record.location.trim().length > 0 && record.location.length <= 60 && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt));
  }
  function validState(data) {
    return data && data.version === 1 && Array.isArray(data.inventory) && data.inventory.every(validRecord) && new Set(data.inventory.map(record => record.id)).size === data.inventory.length && data.settings && typeof data.settings.centreName === 'string' && data.settings.centreName.trim().length >= 2 && data.settings.centreName.length <= 60 && Number.isInteger(data.settings.lowThreshold) && data.settings.lowThreshold >= 1 && data.settings.lowThreshold <= 10000 && Number.isInteger(data.settings.expiryWindow) && data.settings.expiryWindow >= 1 && data.settings.expiryWindow <= 365 && Array.isArray(data.activity) && data.activity.every(item => item && ['seed', 'add', 'edit', 'delete', 'settings'].includes(item.type) && typeof item.title === 'string' && typeof item.detail === 'string' && typeof item.at === 'string' && Number.isFinite(Date.parse(item.at)));
  }
  function loadData() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch { storageHealthy = false; storageIssue = 'Browser storage is unavailable. Changes will last only in this tab.'; return seedData(); }
    if (raw !== null) {
      try { const data = JSON.parse(raw); if (!validState(data)) throw new Error('Invalid saved data'); return data; }
      catch {
        // Preserve the unreadable value before replacing it with a usable demo.
        try { localStorage.setItem(`${STORAGE_KEY}.recovery`, raw); }
        catch { storageHealthy = false; }
        storageIssue = storageHealthy ? 'Saved data could not be read. A fresh demo was loaded; the original is kept in a recovery key.' : 'Saved data could not be read. A fresh demo is running in this tab only.';
      }
    }
    const data = seedData();
    if (storageHealthy) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
      catch { storageHealthy = false; storageIssue = 'Browser storage is full or unavailable. Changes will last only in this tab.'; }
    }
    return data;
  }
  let state = loadData();
  function saveData(successMessage) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageHealthy = true; toast(successMessage); }
    catch { storageHealthy = false; toast('Changed in this tab, but could not save to browser storage. Keep this tab open.', 'warning', 8500); }
    render();
  }
  function addActivity(type, title, detail) { state.activity.unshift({ type, title, detail, at: new Date().toISOString() }); state.activity = state.activity.slice(0, 40); }

  // Shared presentation helpers. User-entered strings always pass through escapeHTML.
  function primaryAdd() { return `<button class="btn btn-primary" data-action="add">${icon('plus')}Add Blood Unit</button>`; }
  function pageHeading(title, description, actions = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`; }
  function kpi(label, value, symbol, tint, description) {
    return `<article class="kpi-card"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="soft-icon ${tint}">${icon(symbol)}</span></div><div class="kpi-value" data-count="${value}">${number(value)}</div><div class="kpi-bottom">${description}</div></article>`;
  }
  function panelHeading(title, subtitle = '', action = '') { return `<div class="panel-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`; }
  function options(items, selected, allLabel) { return `<option value="all">${allLabel}</option>${items.map(item => `<option value="${escapeHTML(item)}"${item === selected ? ' selected' : ''}>${escapeHTML(item)}</option>`).join('')}`; }
  function statusBadge(record) {
    if (daysLeft(record) < 0 && isOnHand(record)) return `<span class="status-badge status-expired">Expired</span><span class="expired-workflow">${escapeHTML(record.status)}</span>`;
    return `<span class="status-badge status-${record.status.toLowerCase()}">${escapeHTML(record.status)}</span>`;
  }
  function expiryBadge(record) {
    const days = daysLeft(record);
    if (days < 0) return '<span class="status-badge status-expired">Expired</span>';
    if (days <= 3) return '<span class="status-badge status-soon">Expiring soon</span>';
    if (days <= 7) return '<span class="status-badge status-upcoming">Upcoming</span>';
    return '<span class="status-badge status-neutral">Later expiry</span>';
  }
  function remainingLabel(record) { const days = daysLeft(record); return days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`; }
  function emptyState(title, description, action = '', symbol = 'search') { return `<div class="empty-state"><div class="empty-icon">${icon(symbol)}</div><h3>${title}</h3><p>${description}</p>${action}</div>`; }
  function clearFiltersButton() { return '<button class="btn btn-secondary" data-action="clear-filters">Clear filters</button>'; }
  function barChart(values, label) {
    const step = Math.max(5, Math.ceil(Math.max(...values, 1) / 4 / 5) * 5);
    const max = step * 4;
    const baseline = 182, height = 153, left = 44, width = 538, slot = width / 8;
    const grid = Array.from({ length: 5 }, (_, index) => { const y = baseline - index * height / 4; return `<line x1="${left}" y1="${y}" x2="590" y2="${y}" stroke="#edf0f4" stroke-dasharray="3 4"/><text x="29" y="${y + 3}" text-anchor="end" fill="#98a0ad" font-size="10">${number(index * step)}</text>`; }).join('');
    const bars = values.map((value, index) => {
      const barHeight = value / max * height;
      const x = left + slot * index + slot / 2;
      return `<g><title>${GROUPS[index]}: ${value} units</title><rect class="bar-column" x="${x - 18}" y="${baseline - barHeight}" width="36" height="${barHeight}" rx="4" fill="${index === values.indexOf(Math.max(...values)) ? '#d62828' : '#e98c90'}" style="animation-delay:${index * 25}ms"/><text x="${x}" y="${baseline - barHeight - 8}" text-anchor="middle" fill="#9d6c71" font-size="10" font-weight="500">${value}</text><text x="${x}" y="208" text-anchor="middle" fill="#748093" font-size="11">${GROUPS[index].replace('-', '−')}</text></g>`;
    }).join('');
    return `<div class="bar-chart"><svg viewBox="0 0 610 225" role="img" aria-label="${escapeHTML(label)}"><title>${escapeHTML(label)}</title><desc>${GROUPS.map((group, index) => `${group}: ${values[index]} units`).join('; ')}</desc>${grid}${bars}</svg></div>`;
  }
  function stockChart() {
    const usable = state.inventory.filter(isUsable);
    const counts = groupTotals(usable);
    const parts = [0, 0, 0];
    usable.forEach(record => {
      // Mutually exclusive: expiry first, then low-stock group, then the remainder.
      const part = isSoon(record) ? 2 : counts[GROUPS.indexOf(record.group)] < state.settings.lowThreshold ? 1 : 0;
      parts[part] += record.quantity;
    });
    const total = sum(usable), circumference = 2 * Math.PI * 64;
    const colors = ['#d62828', '#f4b45f', '#edb7bb'];
    let offset = 0;
    const arcs = parts.map((part, index) => {
      const length = total ? part / total * circumference : 0;
      const result = `<circle cx="90" cy="90" r="64" fill="none" stroke="${colors[index]}" stroke-width="21" stroke-dasharray="${Math.max(0, length - (length > 3 ? 3 : 0))} ${circumference}" stroke-dashoffset="${-offset}"/>`;
      offset += length; return result;
    }).join('');
    return `<div class="donut-wrap"><svg class="donut-chart" viewBox="0 0 180 180" role="img" aria-label="Usable stock: ${parts[0]} available, ${parts[1]} low stock, ${parts[2]} expiring soon"><circle cx="90" cy="90" r="64" fill="none" stroke="#f2f3f5" stroke-width="21"/>${arcs}</svg><div class="donut-centre"><strong>${number(total)}</strong><span>Usable units</span></div></div><div class="stock-legend">${['Available', 'Low stock', 'Expiring soon'].map((label, index) => `<div><span class="chart-legend"><span class="legend-dot" style="background:${colors[index]}"></span>${label}</span><strong>${number(parts[index])}</strong></div>`).join('')}</div><p class="stock-note">Usable stock only. Expiring soon takes priority over low stock.</p>`;
  }
  function expiryTable(records, compact = false) {
    if (!records.length) return emptyState('Nothing needs attention here', 'There are no on-hand batches in this expiry window.', '', 'check-circle');
    return `<div class="scroll-hint">Scroll horizontally to view all columns.</div><div class="table-wrap" tabindex="0" role="region" aria-label="Expiry records"><table class="data-table"><thead><tr><th scope="col">Unit ID</th><th scope="col">Group</th><th scope="col">Component</th><th scope="col">Expiry date</th><th scope="col">Days left</th><th scope="col">${compact ? 'Alert' : 'Status'}</th>${compact ? '' : '<th scope="col">Action</th>'}</tr></thead><tbody>${records.map(record => `<tr><td>${escapeHTML(record.id)}</td><td><span class="group-pill">${record.group.replace('-', '−')}</span></td><td>${record.component}</td><td>${formatDate(record.expiry, compact)}</td><td class="days-cell ${daysLeft(record) < 0 ? 'expired' : ''}">${remainingLabel(record)}</td><td>${compact ? expiryBadge(record) : `${statusBadge(record)} <span class="visually-hidden">${remainingLabel(record)}</span>`}</td>${compact ? '' : `<td><button class="btn btn-text" data-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Review ${escapeHTML(record.id)}">Review ${icon('arrow')}</button></td>`}</tr>`).join('')}</tbody></table></div>`;
  }
  function activityTime(date) {
    const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 60000));
    return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function renderOverview() {
    const data = metrics();
    const chartRecords = state.inventory.filter(record => dashboardComponent === 'all' || record.component === dashboardComponent);
    const expiring = state.inventory.filter(record => isSoon(record)).sort((a, b) => a.expiry.localeCompare(b.expiry));
    return `${pageHeading('Blood Bank Overview', 'Monitor inventory, review expiry dates, and keep stock information up to date.', primaryAdd())}
      <section class="kpi-grid" aria-label="Inventory summary">
        ${kpi('Total Units', data.total, 'layers', 'red', `${state.inventory.length} inventory records <span aria-hidden="true">·</span> All statuses`)}
        ${kpi('Available Units', data.available, 'check-circle', 'green', `${icon('check')} Ready in available inventory`)}
        ${kpi('Low Stock Groups', data.low, 'alert', 'amber', `<span class="warning-text">${data.low ? 'Replenishment may be needed' : 'All groups above threshold'}</span>`)}
        ${kpi('Units Expiring Soon', data.soon, 'clock', 'purple', `On-hand units in the next ${state.settings.expiryWindow} days`)}
      </section>
      <div class="dashboard-charts"><section class="panel">${panelHeading('Inventory by Blood Group', 'A snapshot of your available inventory', `<label class="visually-hidden" for="chart-component">Chart component</label><select id="chart-component" class="form-select">${options(COMPONENTS, dashboardComponent, 'All components')}</select>`)}<span class="chart-label">Available units</span>${barChart(groupTotals(chartRecords, true), 'Available inventory by blood group')}<div class="chart-footnote">${icon('info')} Excludes expired, reserved, issued, and quarantined units</div></section><section class="panel">${panelHeading('Stock Status', 'How your usable inventory is distributed', icon('info'))}${stockChart()}</section></div>
      <section class="availability-section"><div class="section-heading"><div><h2>Blood Group Availability</h2><p>Available units at a glance</p></div><a href="#inventory" class="btn btn-text">View inventory ${icon('arrow')}</a></div><div class="availability-grid">${GROUPS.map((group, index) => `<button class="blood-card ${data.groups[index] < state.settings.lowThreshold ? 'low' : ''}" data-action="group" data-group="${group}" aria-label="View ${group} inventory, ${data.groups[index]} available units"><span class="blood-card-heading"><strong>${group.replace('-', '−')}</strong>${icon('droplet')}</span><span class="blood-card-count">${number(data.groups[index])}<small>units</small></span><span class="blood-card-status">${data.groups[index] === 0 ? 'Out of stock' : data.groups[index] < state.settings.lowThreshold ? 'Low stock' : 'Available'}</span></button>`).join('')}</div></section>
      <div class="dashboard-bottom"><section class="panel">${panelHeading('Expiring Soon', `On-hand batches expiring within ${state.settings.expiryWindow} days`, '<a href="#expiry" class="btn btn-text">View all ' + icon('arrow') + '</a>')}${expiryTable(expiring.slice(0, 5), true)}<div class="table-footer"><span>${expiring.length ? `Showing ${Math.min(expiring.length, 5)} of ${expiring.length} batches` : 'All clear in this window'}</span><span>Review before the expiry date</span></div></section><section class="panel">${panelHeading('Recent Activity', 'The latest changes in your workspace', `<span class="soft-icon navy" style="width:25px;height:25px">${icon('activity')}</span>`)}<ol class="activity-list">${state.activity.slice(0, 4).map(item => `<li class="activity-item"><span class="activity-symbol ${item.type}">${icon(item.type === 'edit' ? 'edit' : item.type === 'delete' ? 'trash' : item.type === 'settings' ? 'settings' : 'plus')}</span><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.detail)}</p><time datetime="${escapeHTML(item.at)}">${activityTime(item.at)}</time></div></li>`).join('') || '<li class="activity-item"><p>Your inventory changes will appear here.</p></li>'}</ol></section></div>`;
  }

  function filteredInventory() {
    const query = inventoryFilters.search.trim().toLowerCase().replaceAll('−', '-');
    const records = state.inventory.filter(record => (!query || [record.id, record.group, record.component, record.location].some(value => value.toLowerCase().includes(query))) && (inventoryFilters.group === 'all' || record.group === inventoryFilters.group) && (inventoryFilters.component === 'all' || record.component === inventoryFilters.component) && (inventoryFilters.status === 'all' || (inventoryFilters.status === 'Usable' ? isUsable(record) : inventoryFilters.status === 'Expired' ? daysLeft(record) < 0 && isOnHand(record) : record.status === inventoryFilters.status)));
    return records.sort((a, b) => (inventoryFilters.sort === 'newest' ? Date.parse(b.createdAt) - Date.parse(a.createdAt) : inventoryFilters.sort === 'quantity' ? b.quantity - a.quantity : a.expiry.localeCompare(b.expiry)) || a.id.localeCompare(b.id));
  }
  function inventoryResults() {
    const records = filteredInventory(), pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const visible = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return `<div class="inventory-summary"><h2>Inventory records <span class="subtle-count">${records.length} batches · ${number(sum(records))} units</span></h2><span class="storage-status">${icon(storageHealthy ? 'check-circle' : 'alert')}${storageHealthy ? 'Saved in this browser' : 'Unsaved · this tab only'}</span></div>${records.length ? `<div class="scroll-hint">Scroll horizontally to view dates, storage, and actions.</div><div class="table-wrap" role="region" aria-label="Blood inventory records" tabindex="0"><table class="data-table inventory-table"><thead><tr>${['Unit ID', 'Blood group', 'Component', 'Quantity', 'Collection date', 'Expiry date', 'Storage location', 'Status', 'Actions'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${visible.map(record => `<tr><td>${escapeHTML(record.id)}</td><td><span class="group-pill">${record.group.replace('-', '−')}</span></td><td>${record.component}</td><td class="quantity-cell">${number(record.quantity)} <span class="subtle-count">units</span></td><td>${formatDate(record.collected)}</td><td>${formatDate(record.expiry)}</td><td>${escapeHTML(record.location)}</td><td>${statusBadge(record)}</td><td><div class="action-buttons"><button class="icon-button" data-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Edit ${escapeHTML(record.id)}" title="Edit record">${icon('edit')}</button><button class="icon-button delete-button" data-action="delete" data-id="${escapeHTML(record.id)}" aria-label="Delete ${escapeHTML(record.id)}" title="Delete record">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>` : emptyState(state.inventory.length ? 'No matching inventory' : 'Your inventory is empty', state.inventory.length ? 'Try another search or clear your filters to see more records.' : 'Add your first unit or batch to start tracking available stock.', state.inventory.length ? clearFiltersButton() : primaryAdd())}<div class="table-footer"><span>${records.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, records.length)} of ${records.length} records` : '0 records'}</span><div class="pagination-controls"><button class="icon-button" data-action="previous-page" aria-label="Previous page" ${page <= 1 ? 'disabled' : ''}>${icon('chevron-left')}</button><span>${page} / ${pages}</span><button class="icon-button" data-action="next-page" aria-label="Next page" ${page >= pages ? 'disabled' : ''}>${icon('chevron-right')}</button></div></div>`;
  }
  function renderInventory() {
    return `${pageHeading('Blood Inventory', 'A clear view of every unit. Keep your stock accurate and organised.', `<button class="btn btn-secondary" data-action="export-inventory">${icon('download')}Download CSV</button>${primaryAdd()}`)}<div class="info-banner">${icon('info')}<span>Each record is a unit or a batch sharing the same collection and expiry dates. Quantities count physical units.</span></div><section class="panel"><div class="filter-bar"><label class="search-field" for="inventory-search"><span class="visually-hidden">Search inventory</span>${icon('search')}<input class="form-control" id="inventory-search" type="search" placeholder="Search ID, group, component, location…" value="${escapeHTML(inventoryFilters.search)}"></label><label class="visually-hidden" for="filter-group">Blood group filter</label><select class="form-select filter-select" id="filter-group">${options(GROUPS, inventoryFilters.group, 'All blood groups')}</select><label class="visually-hidden" for="filter-component">Component filter</label><select class="form-select filter-select" id="filter-component">${options(COMPONENTS, inventoryFilters.component, 'All components')}</select><label class="visually-hidden" for="filter-status">Status filter</label><select class="form-select filter-select" id="filter-status">${options([...STATUSES, 'Usable', 'Expired'], inventoryFilters.status, 'All statuses')}</select><label class="visually-hidden" for="filter-sort">Sort inventory</label><select class="form-select filter-select sort-select" id="filter-sort"><option value="expiry" ${inventoryFilters.sort === 'expiry' ? 'selected' : ''}>Expiry: earliest first</option><option value="newest" ${inventoryFilters.sort === 'newest' ? 'selected' : ''}>Newest addition</option><option value="quantity" ${inventoryFilters.sort === 'quantity' ? 'selected' : ''}>Quantity: highest first</option></select><button class="icon-button" data-action="clear-filters" aria-label="Clear all inventory filters" title="Clear filters">${icon('refresh')}</button></div><div id="inventory-results" aria-live="polite">${inventoryResults()}</div></section>`;
  }
  function expiryRecords(filter) {
    return state.inventory.filter(record => isOnHand(record) && (filter === 'all' || (filter === 'expired' ? daysLeft(record) < 0 : daysLeft(record) >= 0 && daysLeft(record) <= Number(filter)))).sort((a, b) => a.expiry.localeCompare(b.expiry));
  }
  function renderExpiry() {
    const expired = expiryRecords('expired'), three = expiryRecords('3'), seven = expiryRecords('7'), records = expiryRecords(expiryFilter);
    return `${pageHeading('Expiry Tracker', 'Stay ahead of expiry dates and give every unit the attention it needs.', primaryAdd())}<section class="kpi-grid three-cols" aria-label="Expiry summary">${kpi('Expired', sum(expired), 'alert', 'red', `${expired.length} batches · Excluded from usable stock`)}${kpi('Expiring within 3 days', sum(three), 'clock', 'amber', `${three.length} batches · Includes units expiring today`)}${kpi('Expiring within 7 days', sum(seven), 'calendar', 'purple', `${seven.length} batches · Includes the 3-day window`)}</section><div class="info-banner">${icon('info')}<span>Reminders cover on-hand stock, including reserved and quarantined batches. Issued units are excluded. These alerts do not determine clinical suitability.</span></div><section class="panel"><div class="tabs" role="group" aria-label="Filter expiry records">${[['all', 'All on-hand', expiryRecords('all').length], ['expired', 'Expired', expired.length], ['3', 'Within 3 days', three.length], ['7', 'Within 7 days', seven.length]].map(([value, label, count]) => `<button class="tab ${expiryFilter === value ? 'active' : ''}" data-action="expiry-filter" data-value="${value}" aria-pressed="${expiryFilter === value}">${label}<span class="tab-count">${count}</span></button>`).join('')}</div>${expiryTable(records)}<div class="table-footer"><span>${records.length} batches · ${number(sum(records))} units</span><span>Calculated using today’s local date</span></div></section>`;
  }
  function reportDateError() { return reportFilters.from && reportFilters.to && reportFilters.from > reportFilters.to ? 'The end date must be on or after the start date.' : ''; }
  function filteredReport() {
    if (reportDateError()) return [];
    return state.inventory.filter(record => (!reportFilters.from || record.collected >= reportFilters.from) && (!reportFilters.to || record.collected <= reportFilters.to) && (reportFilters.group === 'all' || record.group === reportFilters.group) && (reportFilters.status === 'all' || record.status === reportFilters.status));
  }
  function reportContent() {
    const records = filteredReport(), data = metrics(records), total = data.total;
    return `<p class="report-print-title">${escapeHTML(state.settings.centreName)} · Generated ${formatDate(today())} · Collection dates: ${reportFilters.from ? formatDate(reportFilters.from) : 'All dates'} to ${reportFilters.to ? formatDate(reportFilters.to) : 'present'} · Blood group: ${escapeHTML(reportFilters.group)} · Status: ${escapeHTML(reportFilters.status)} · Fictional demo data</p>${!records.length ? `<section class="panel">${emptyState('No records in this report', reportDateError() || 'Adjust the collection date range or filters to include more inventory.', '<button class="btn btn-secondary" data-action="clear-report">Clear report filters</button>', 'chart')}</section>` : `<section class="kpi-grid" aria-label="Report totals">${kpi('Total Units', total, 'layers', 'red', `${records.length} matching inventory records`)}${kpi('Usable Available', data.available, 'check-circle', 'green', 'Available and not past the expiry date')}${kpi('Reserved Units', sum(records.filter(record => record.status === 'Reserved')), 'box', 'navy', 'Reserved workflow status')}${kpi('Issued Units', sum(records.filter(record => record.status === 'Issued')), 'arrow', 'purple', 'Issued workflow status')}</section><div class="report-grid"><section class="panel">${panelHeading('Total Inventory by Blood Group', 'Physical units across all matching statuses')}<span class="chart-label">Total units</span>${barChart(groupTotals(records), 'Total inventory by blood group')}<div class="chart-footnote">${icon('info')} Includes reserved, issued, quarantined, and expired records</div></section><section class="panel">${panelHeading('Inventory by Component', 'Composition of the matching inventory')}<div class="report-stat-list">${COMPONENTS.map((component, index) => { const count = sum(records.filter(record => record.component === component)); return `<div class="component-row"><div class="component-title"><span>${component === 'PRBC' ? 'Packed red blood cells (PRBC)' : component}</span><strong>${number(count)} units</strong></div><div class="progress-track"><div class="progress-fill" style="width:${total ? count / total * 100 : 0}%;background:${['#d62828', '#e58a91', '#f0bdc1'][index]}"></div></div></div>`; }).join('')}<p class="field-help">All values are calculated from the current report filters.</p></div></section></div><div class="report-grid"><section class="panel">${panelHeading('Inventory by Status', 'Workflow status, including expired records')}<div class="report-stat-list">${STATUSES.map(status => `<div class="report-stat-row"><span class="status-badge status-${status.toLowerCase()}">${status}</span><strong>${number(sum(records.filter(record => record.status === status)))} <span class="subtle-count">units</span></strong></div>`).join('')}</div><div class="chart-footnote">${icon('info')} Available status can include expired units; usable available excludes them.</div></section><section class="panel">${panelHeading('Expiry Summary', 'On-hand stock only · mutually exclusive windows')}<div class="report-stat-list">${[['Expired', record => daysLeft(record) < 0, 'expired'], ['Today through 3 days', record => daysLeft(record) >= 0 && daysLeft(record) <= 3, 'soon'], ['4 through 7 days', record => daysLeft(record) >= 4 && daysLeft(record) <= 7, 'upcoming'], ['More than 7 days', record => daysLeft(record) > 7, 'neutral']].map(([label, test, style]) => `<div class="report-stat-row"><span class="status-badge status-${style}">${label}</span><strong>${number(sum(records.filter(record => isOnHand(record) && test(record))))} <span class="subtle-count">units</span></strong></div>`).join('')}</div></section></div><section class="panel">${panelHeading('Report Records', `${records.length} batches in the current selection`)}<div class="scroll-hint">Scroll horizontally to see every report column.</div><div class="table-wrap" tabindex="0" role="region" aria-label="Report inventory"><table class="data-table" style="margin-top:18px"><thead><tr>${['Unit ID', 'Group', 'Component', 'Quantity', 'Collected', 'Expires', 'Status'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${records.map(record => `<tr><td>${escapeHTML(record.id)}</td><td><span class="group-pill">${record.group.replace('-', '−')}</span></td><td>${record.component}</td><td>${number(record.quantity)}</td><td>${formatDate(record.collected)}</td><td>${formatDate(record.expiry)}</td><td>${statusBadge(record)}</td></tr>`).join('')}</tbody></table></div></section>`}`;
  }
  function renderReports() {
    return `${pageHeading('Inventory Reports', 'Turn your current inventory into a clear, shareable snapshot.', `<button class="btn btn-secondary" data-action="print">${icon('print')}Print Report</button><button class="btn btn-primary" data-action="export-report">${icon('download')}Download CSV</button>`)}<section class="panel report-filters" aria-label="Report filters"><div class="field"><label for="report-from">Collected from</label><input class="form-control" type="date" id="report-from" value="${reportFilters.from}"></div><div class="field"><label for="report-to">Collected through</label><input class="form-control" type="date" id="report-to" value="${reportFilters.to}"></div><div class="field"><label for="report-group">Blood group</label><select class="form-select" id="report-group">${options(GROUPS, reportFilters.group, 'All blood groups')}</select></div><div class="field"><label for="report-status">Status</label><select class="form-select" id="report-status">${options(STATUSES, reportFilters.status, 'All statuses')}</select></div><button class="icon-button" data-action="clear-report" aria-label="Clear report filters" title="Clear report filters">${icon('refresh')}</button></section><p class="date-error" id="report-date-error" role="status">${reportDateError()}</p><div id="report-content">${reportContent()}</div>`;
  }
  function renderSettings() {
    return `${pageHeading('Settings', 'A few simple preferences for your blood centre workspace.')}<div class="settings-grid"><section class="panel">${panelHeading('Workspace Preferences', 'Make the dashboard work for your centre')}<form id="settings-form" class="settings-form" novalidate><div class="field"><label for="centre-name">Blood centre name</label><input class="form-control" id="centre-name" name="centreName" value="${escapeHTML(state.settings.centreName)}" maxlength="60" required aria-describedby="settings-error-centreName"><span class="field-error" id="settings-error-centreName"></span><p class="field-help">The display name used throughout your demo workspace.</p></div><div class="setting-numbers"><div class="field"><label for="low-threshold">Low-stock threshold (units)</label><input class="form-control" type="number" id="low-threshold" name="lowThreshold" min="1" max="10000" step="1" value="${state.settings.lowThreshold}" required aria-describedby="settings-error-lowThreshold"><span class="field-error" id="settings-error-lowThreshold"></span><p class="field-help">A group is low when its usable available stock is below this number.</p></div><div class="field"><label for="expiry-window">Expiry alert window (days)</label><input class="form-control" type="number" id="expiry-window" name="expiryWindow" min="1" max="365" step="1" value="${state.settings.expiryWindow}" required aria-describedby="settings-error-expiryWindow"><span class="field-error" id="settings-error-expiryWindow"></span><p class="field-help">Used by overview alerts and notifications. Includes today.</p></div></div><div class="field"><label>Appearance</label><div class="theme-option">${icon('sun')}<span>Light theme</span>${icon('check-circle')}</div><p class="field-help">A clear, light workspace designed for everyday readability.</p></div><div class="save-row"><span>${storageHealthy ? 'Preferences are saved in this browser.' : 'Browser storage is unavailable.'}</span><button class="btn btn-primary" type="submit">${icon('save')}Save Changes</button></div></form></section><div class="settings-aside"><section class="panel">${panelHeading('About BloodStock')}<div class="about-content"><div class="brand"><span class="brand-mark">${icon('droplet')}</span><span>BloodStock</span></div><p>Better Stock Visibility. Better Preparedness.</p><p>A student demonstration of blood bank inventory management. Explore stock, track dates, and practise managing fictional inventory.</p><p>This is a college project, not a real clinical inventory system. It does not make clinical suitability decisions.</p><span class="about-tag">${icon('layers')}HTML · CSS · JavaScript · Bootstrap 5</span></div></section><section class="panel reset-card"><h2>${icon('refresh')}Reset Demo Data</h2><p>Start fresh with the original sample inventory, default settings, and dates relative to today. This removes your current demo changes.</p><button class="btn btn-danger-outline" data-action="reset">${icon('refresh')}Reset Demo Data</button></section></div></div>`;
  }

  function render(animate = false) {
    const renderers = { overview: renderOverview, inventory: renderInventory, expiry: renderExpiry, reports: renderReports, settings: renderSettings };
    $('#main-content').innerHTML = renderers[activeView]();
    if (animate) { $('#main-content').classList.remove('view-enter'); void $('#main-content').offsetWidth; $('#main-content').classList.add('view-enter'); animateCounts(); }
    $('#breadcrumb-current').textContent = VIEWS[activeView];
    document.title = `${VIEWS[activeView]} · BloodStock`;
    $$('.navigation a').forEach(link => { const active = link.dataset.view === activeView; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    const alerts = state.inventory.filter(record => isOnHand(record) && daysLeft(record) <= state.settings.expiryWindow);
    $('#expiry-nav-count').textContent = alerts.length;
    $('#expiry-nav-count').hidden = !alerts.length;
    $('#notification-dot').hidden = !alerts.length && metrics().low === 0;
    $('#current-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    $('.workspace-card strong').textContent = state.settings.centreName.replace(/\s*Blood Centre$/i, '') || state.settings.centreName;
    $('.profile-copy strong').textContent = `${state.settings.centreName.replace(/\s*Blood Centre$/i, '')} Admin`;
    if (!$('#notification-panel').hidden) renderNotifications();
  }
  function animateCounts() {
    if (reducedMotion.matches) return;
    $$('[data-count]').forEach(element => {
      const target = Number(element.dataset.count), start = performance.now();
      function frame(time) { if (!element.isConnected) return; const progress = Math.min((time - start) / 550, 1); element.textContent = number(Math.round(target * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    });
  }
  function route() {
    const view = location.hash.slice(1);
    activeView = Object.hasOwn(VIEWS, view) ? view : 'overview';
    closeDrawer(false); closeNotifications(); render(true);
  }
  function navigate(view) { if (location.hash === `#${view}`) { activeView = view; render(true); closeDrawer(false); } else location.hash = view; }
  function toast(message, type = 'success', duration = 4500) {
    const element = document.createElement('div');
    element.className = `app-toast ${type}`;
    element.innerHTML = `${icon(type === 'success' ? 'check-circle' : 'alert')}<span>${escapeHTML(message)}</span><button class="icon-button" aria-label="Dismiss notification">${icon('x')}</button>`;
    function dismiss() { element.classList.add('toast-out'); setTimeout(() => element.remove(), reducedMotion.matches ? 0 : 220); }
    $('button', element).addEventListener('click', dismiss);
    $('#toast-region').append(element);
    setTimeout(dismiss, duration);
  }
  function renderNotifications() {
    const expired = sum(state.inventory.filter(record => isOnHand(record) && daysLeft(record) < 0));
    const data = metrics();
    $('#notification-panel').innerHTML = `<h2>Inventory notifications</h2><button data-action="notify-expiry">${icon('clock')}<span><strong>${data.soon} units expiring soon</strong><small>Within ${state.settings.expiryWindow} days · ${expired} units already expired</small></span></button><button data-action="notify-stock">${icon('droplet')}<span><strong>${data.low} blood groups below threshold</strong><small>Review usable stock by blood group</small></span></button><p class="field-help" style="margin-top:14px">Calculated from your current demo inventory.</p>`;
  }
  function closeNotifications() { $('#notification-panel').hidden = true; $('#notification-button').setAttribute('aria-expanded', 'false'); }
  function openDrawer() { $('#sidebar').inert = false; $('#sidebar').classList.add('is-open'); $('#sidebar').setAttribute('role', 'dialog'); $('#sidebar').setAttribute('aria-modal', 'true'); $('#drawer-backdrop').hidden = false; $('#menu-button').setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('.app-shell').inert = true; $('.drawer-close').focus(); }
  function closeDrawer(restoreFocus = true) { const wasOpen = $('#sidebar').classList.contains('is-open'); $('#sidebar').classList.remove('is-open'); $('#sidebar').removeAttribute('role'); $('#sidebar').removeAttribute('aria-modal'); $('#sidebar').inert = window.innerWidth <= 760; $('#drawer-backdrop').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; $('.app-shell').inert = false; if (wasOpen && restoreFocus) $('#menu-button').focus(); }
  function openUnit(id = null) {
    const record = id ? state.inventory.find(item => item.id === id) : null;
    if (id && !record) return toast('That record no longer exists. Refresh your view.', 'error');
    editingId = id; returnFocus = document.activeElement;
    const form = $('#unit-form'); form.reset();
    $$('.field-error', form).forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]', form).forEach(element => element.removeAttribute('aria-invalid'));
    const highest = Math.max(1000, ...state.inventory.map(item => Number(item.id.match(/^BS-(\d+)$/)?.[1]) || 0));
    const defaults = record || { id: `BS-${highest + 1}`, group: '', component: '', quantity: 1, collected: today(), expiry: relativeDate(35), location: '', status: 'Available' };
    Object.entries(defaults).forEach(([name, value]) => { if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value; });
    $('#unit-collected').max = today();
    $('#unit-dialog-title').textContent = id ? 'Edit blood unit' : 'Add blood unit';
    $('#save-unit-button').innerHTML = `${icon(id ? 'save' : 'plus')}${id ? 'Save changes' : 'Add blood unit'}`;
    $('#unit-dialog').showModal();
    $('#unit-id').focus();
  }
  function closeUnit() { $('#unit-dialog').close(); if (returnFocus?.isConnected) returnFocus.focus(); }
  function showErrors(form, errors, prefix) {
    $$('.field-error', form).forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]', form).forEach(element => element.removeAttribute('aria-invalid'));
    Object.entries(errors).forEach(([name, message]) => { $(`#${prefix}${name}`).textContent = message; form.elements.namedItem(name).setAttribute('aria-invalid', 'true'); });
    const first = Object.keys(errors)[0];
    if (first) { form.elements.namedItem(first).focus(); return false; }
    return true;
  }
  function submitUnit(event) {
    event.preventDefault();
    const form = event.target, input = Object.fromEntries(new FormData(form));
    input.id = input.id.trim().toUpperCase(); input.location = input.location.trim(); input.quantity = Number(input.quantity);
    const errors = {};
    if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(input.id)) errors.id = 'Use 3–20 letters, numbers, or hyphens (e.g. BS-1001).';
    else if (state.inventory.some(record => record.id.toUpperCase() === input.id && record.id !== editingId)) errors.id = 'This unit ID already exists. Choose a unique ID.';
    if (!GROUPS.includes(input.group)) errors.group = 'Choose a blood group.';
    if (!COMPONENTS.includes(input.component)) errors.component = 'Choose a component.';
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10000) errors.quantity = 'Enter a whole number from 1 to 10,000.';
    if (!Number.isFinite(dayNumber(input.collected))) errors.collected = 'Enter a valid collection date.';
    else if (input.collected > today()) errors.collected = 'Collection date cannot be in the future.';
    if (!Number.isFinite(dayNumber(input.expiry))) errors.expiry = 'Enter a valid expiry date.';
    else if (dayNumber(input.expiry) < dayNumber(input.collected)) errors.expiry = 'Expiry must be on or after collection.';
    if (!input.location || input.location.length > 60) errors.location = 'Enter a storage location (up to 60 characters).';
    if (!STATUSES.includes(input.status)) errors.status = 'Choose a valid status.';
    if (!showErrors(form, errors, 'error-')) return;
    const existing = state.inventory.find(record => record.id === editingId);
    if (editingId && !existing) { toast('This record was removed in another tab. Reopen the form.', 'error'); return; }
    const record = { ...input, createdAt: existing?.createdAt || new Date().toISOString() };
    if (existing) { state.inventory = state.inventory.map(item => item.id === editingId ? record : item); addActivity('edit', 'Inventory record updated', `${record.id} · ${record.group} ${record.component} · ${record.quantity} units`); }
    else { state.inventory.push(record); addActivity('add', 'New blood unit added', `${record.id} · ${record.group} ${record.component} · ${record.quantity} units`); }
    closeUnit(); saveData(`${record.id} ${existing ? 'updated' : 'added'} successfully.`);
  }
  function confirmAction(title, description, buttonText, action) {
    returnFocus = document.activeElement;
    $('#confirm-title').textContent = title; $('#confirm-description').textContent = description; $('#confirm-button').textContent = buttonText;
    pendingConfirmation = action; $('#confirm-dialog').showModal();
    $('[data-action="cancel-confirm"]').focus();
  }
  function cancelConfirm() { pendingConfirmation = null; $('#confirm-dialog').close(); if (returnFocus?.isConnected) returnFocus.focus(); }
  function deleteRecord(id) {
    const record = state.inventory.find(item => item.id === id);
    if (!record) return;
    confirmAction('Delete inventory record?', `Remove ${id} and its ${record.quantity} units from the demo inventory? This cannot be undone.`, 'Delete record', () => { state.inventory = state.inventory.filter(item => item.id !== id); addActivity('delete', 'Inventory record removed', `${id} · ${record.group} ${record.component} · ${record.quantity} units`); saveData(`${id} deleted from inventory.`); });
  }
  function resetDemo() {
    confirmAction('Reset your demo workspace?', 'This replaces all inventory, activity, and preferences with the original fictional samples. Sample dates will be relative to today.', 'Reset demo data', () => { state = seedData(); Object.assign(inventoryFilters, { search: '', group: 'all', component: 'all', status: 'all', sort: 'expiry' }); Object.assign(reportFilters, { from: '', to: '', group: 'all', status: 'all' }); expiryFilter = 'all'; dashboardComponent = 'all'; page = 1; saveData('Demo data reset. Your fresh workspace is ready.'); });
  }
  function submitSettings(event) {
    event.preventDefault();
    const form = event.target, values = Object.fromEntries(new FormData(form));
    values.centreName = values.centreName.trim(); values.lowThreshold = Number(values.lowThreshold); values.expiryWindow = Number(values.expiryWindow);
    const errors = {};
    if (values.centreName.length < 2 || values.centreName.length > 60) errors.centreName = 'Enter a centre name between 2 and 60 characters.';
    if (!Number.isInteger(values.lowThreshold) || values.lowThreshold < 1 || values.lowThreshold > 10000) errors.lowThreshold = 'Enter a whole number from 1 to 10,000.';
    if (!Number.isInteger(values.expiryWindow) || values.expiryWindow < 1 || values.expiryWindow > 365) errors.expiryWindow = 'Enter a whole number from 1 to 365.';
    if (!showErrors(form, errors, 'settings-error-')) return;
    state.settings = values; addActivity('settings', 'Workspace preferences updated', `Low stock below ${values.lowThreshold} units · ${values.expiryWindow}-day expiry alerts`); saveData('Workspace preferences saved.');
  }
  function exportCSV(records) {
    if (!records.length) return toast('No matching inventory to export. Adjust your filters first.', 'warning');
    // Quote every field and neutralise spreadsheet formulas in user-entered cells.
    const cell = value => { let text = String(value ?? ''); if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const rows = [['Unit ID', 'Blood Group', 'Component', 'Quantity', 'Collection Date', 'Expiry Date', 'Storage Location', 'Status', 'Days Remaining', 'Usable Available'], ...records.map(record => [record.id, record.group, record.component, record.quantity, record.collected, record.expiry, record.location, record.status, daysLeft(record), isUsable(record) ? 'Yes' : 'No'])];
    const blob = new Blob(['\uFEFF', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `BloodStock-${activeView}-${today()}.csv`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast(`CSV downloaded with ${records.length} records.`);
  }

  // Event delegation keeps buttons functional after a view is re-rendered.
  document.addEventListener('click', event => {
    if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main-content').focus(); return; }
    const button = event.target.closest('[data-action]');
    if (button && !button.disabled) {
      const action = button.dataset.action;
      if (action === 'add') openUnit();
      else if (action === 'edit') openUnit(button.dataset.id);
      else if (action === 'delete') deleteRecord(button.dataset.id);
      else if (action === 'close-unit') closeUnit();
      else if (action === 'cancel-confirm') cancelConfirm();
      else if (action === 'reset') resetDemo();
      else if (action === 'profile') navigate('settings');
      else if (action === 'open-drawer') openDrawer();
      else if (action === 'close-drawer') closeDrawer();
      else if (action === 'notifications') { const open = $('#notification-panel').hidden; $('#notification-panel').hidden = !open; $('#notification-button').setAttribute('aria-expanded', String(open)); if (open) renderNotifications(); }
      else if (action === 'notify-expiry') { expiryFilter = 'all'; closeNotifications(); navigate('expiry'); }
      else if (action === 'notify-stock') { closeNotifications(); navigate('overview'); }
      else if (action === 'group') { Object.assign(inventoryFilters, { search: '', group: button.dataset.group, component: 'all', status: 'Usable', sort: 'expiry' }); page = 1; navigate('inventory'); }
      else if (action === 'clear-filters') { Object.assign(inventoryFilters, { search: '', group: 'all', component: 'all', status: 'all', sort: 'expiry' }); page = 1; render(); }
      else if (action === 'previous-page' || action === 'next-page') { page += action === 'next-page' ? 1 : -1; $('#inventory-results').innerHTML = inventoryResults(); }
      else if (action === 'expiry-filter') { expiryFilter = button.dataset.value; render(); $(`[data-action="expiry-filter"][data-value="${expiryFilter}"]`).focus(); }
      else if (action === 'clear-report') { Object.assign(reportFilters, { from: '', to: '', group: 'all', status: 'all' }); render(); }
      else if (action === 'export-inventory') exportCSV(filteredInventory());
      else if (action === 'export-report') { if (reportDateError()) toast(reportDateError(), 'error'); else exportCSV(filteredReport()); }
      else if (action === 'print') { if (reportDateError()) toast(reportDateError(), 'error'); else window.print(); }
    }
    if (!event.target.closest('.notification-wrap')) closeNotifications();
    const nav = event.target.closest('.navigation a');
    if (nav) { closeDrawer(false); setTimeout(() => $('#main-content').focus({ preventScroll: true }), 0); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'inventory-search') { inventoryFilters.search = event.target.value; page = 1; $('#inventory-results').innerHTML = inventoryResults(); }
  });
  document.addEventListener('change', event => {
    const id = event.target.id;
    if (id.startsWith('filter-')) { inventoryFilters[id.replace('filter-', '')] = event.target.value; page = 1; $('#inventory-results').innerHTML = inventoryResults(); }
    else if (id === 'chart-component') { dashboardComponent = event.target.value; render(); }
    else if (['report-from', 'report-to', 'report-group', 'report-status'].includes(id)) { reportFilters[id.replace('report-', '')] = event.target.value; $('#report-date-error').textContent = reportDateError(); $('#report-to').setAttribute('aria-invalid', String(!!reportDateError())); $('#report-content').innerHTML = reportContent(); }
  });
  document.addEventListener('submit', event => { if (event.target.id === 'unit-form') submitUnit(event); if (event.target.id === 'settings-form') submitSettings(event); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if ($('#sidebar').classList.contains('is-open')) closeDrawer(); if (!$('#notification-panel').hidden) { closeNotifications(); $('#notification-button').focus(); } }
    if (event.key === 'Tab' && $('#sidebar').classList.contains('is-open')) {
      const elements = $$('a,button', $('#sidebar')).filter(element => element.offsetParent !== null), first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $('#drawer-backdrop').addEventListener('click', () => closeDrawer());
  $('#confirm-button').addEventListener('click', () => { const action = pendingConfirmation; pendingConfirmation = null; $('#confirm-dialog').close(); action?.(); if (returnFocus?.isConnected) returnFocus.focus(); else $('#main-content').focus({ preventScroll: true }); });
  $('#unit-dialog').addEventListener('cancel', event => { event.preventDefault(); closeUnit(); });
  $('#confirm-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelConfirm(); });
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => { if (window.innerWidth > 760 || !$('#sidebar').classList.contains('is-open')) closeDrawer(false); });
  // Accept changes from another tab, but never replace an open form's values.
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try { const data = JSON.parse(event.newValue); if (!validState(data)) throw new Error('Invalid'); state = data; render(); toast('Inventory refreshed from another browser tab.'); }
    catch { toast('Another tab saved unreadable data. Your current view was kept.', 'warning'); }
  });
  let renderedDay = today();
  function refreshDates() { if (renderedDay !== today()) { renderedDay = today(); render(); } }
  window.addEventListener('focus', refreshDates);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDates(); });
  setInterval(refreshDates, 60000);
  hydrateIcons(); route();
  if (storageIssue) toast(storageIssue, 'warning', 10000);
})();
