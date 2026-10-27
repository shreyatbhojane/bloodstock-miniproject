/* BloodStock marketing previews. This file never reads or writes LocalStorage. */
(() => {
  'use strict';
  // Preserve links to the app from before the homepage was introduced.
  const appViews = ['overview', 'inventory', 'expiry', 'reports', 'settings'];
  if (appViews.includes(location.hash.slice(1))) {
    location.replace(`dashboard.html${location.hash}`);
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = {
    'arrow-right': '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    layout: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    droplet: '<path d="M12 3c-2.3 3.8-7 7.8-7 12a7 7 0 0 0 14 0c0-4.2-4.7-8.2-7-12Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
    records: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6m-6 5h6m-6 5h4"/>',
    chart: '<path d="M4 3v17h17M9 15V9m5 6V5m5 10v-4"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6m-6 4h6m-5 10v-6h4v6M3 21h18"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    graduation: '<path d="m2 9 10-5 10 5-10 5Zm4 2v7c4 3 8 3 12 0v-7M22 9v8"/>',
    alert: '<path d="m10.3 4.3-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.7l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    settings: '<path d="m9 3-.6 2.2-2 .9L4.3 5.5 2 9.5 3.6 11v2L2 14.5l2.3 4 2.1-.6 2 .9L9 21h6l.6-2.2 2-.9 2.1.6 2.3-4-1.6-1.5v-2L22 9.5l-2.3-4-2.1.6-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.layout}</svg>`; }
  function hydrateIcons(root = document) { $$('[data-lucide]', root).forEach(element => { element.innerHTML = icon(element.dataset.lucide); }); }

  const GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  // Fixed fictional sample snapshot, separate from the user's stored inventory.
  // Dates are generated relative to the viewer's local calendar date.
  const sample = [
    ['O+', 'PRBC', 28, -12, 23, 'Available'], ['O-', 'PRBC', 4, -33, 2, 'Available'],
    ['A+', 'PRBC', 22, -15, 20, 'Available'], ['A+', 'Platelets', 7, -2, 3, 'Available'],
    ['A-', 'PRBC', 9, -9, 26, 'Available'], ['B+', 'PRBC', 18, -17, 18, 'Available'],
    ['B+', 'Plasma', 6, -30, 150, 'Available'], ['O+', 'Platelets', 8, -4, 1, 'Available'],
    ['B-', 'PRBC', 3, -23, 12, 'Available'], ['AB+', 'Plasma', 12, -20, 160, 'Available'],
    ['O+', 'PRBC', 6, -15, 20, 'Reserved'], ['AB-', 'PRBC', 2, -29, 6, 'Available'],
    ['A+', 'PRBC', 4, -14, 21, 'Reserved'], ['O+', 'PRBC', 8, -20, 15, 'Issued'],
    ['B+', 'PRBC', 3, -12, 23, 'Quarantined'], ['A+', 'PRBC', 5, -38, -3, 'Available'],
    ['B-', 'Platelets', 2, -7, -2, 'Quarantined'], ['AB+', 'Platelets', 3, -3, 2, 'Reserved']
  ].map((row, index) => ({ id: `BS-${1001 + index}`, group: row[0], component: row[1], quantity: row[2], collected: row[3], days: row[4], status: row[5] }));
  const sum = records => records.reduce((total, record) => total + record.quantity, 0);
  const usable = sample.filter(record => record.status === 'Available' && record.days >= 0);
  const onHand = sample.filter(record => record.status !== 'Issued');
  const availableCounts = GROUPS.map(group => sum(usable.filter(record => record.group === group)));
  const totals = { total: sum(sample), available: sum(usable), low: availableCounts.filter(count => count < 5).length, soon: sum(onHand.filter(record => record.days >= 0 && record.days <= 7)), expired: sum(onHand.filter(record => record.days < 0)), three: sum(onHand.filter(record => record.days >= 0 && record.days <= 3)) };
  function dateLabel(offset, long = false) { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(long ? { year: 'numeric' } : {}) }); }
  function groupLabel(group) { return group.replace('-', '−'); }
  function sampleLabel() { return '<span class="sample-label"><span class="sample-dot"></span>Illustrative sample data</span>'; }
  function miniKpis(countUp = false) {
    return `<div class="mini-kpis">${[['Total Units', totals.total, 'layers'], ['Available Units', totals.available, 'check'], ['Low Stock Groups', totals.low, 'alert'], ['Expiring Soon', totals.soon, 'clock']].map(([label, value, symbol]) => `<div class="mini-kpi"><span>${label}</span><strong${countUp ? ` data-landing-count="${value}"` : ''}>${value}</strong><span class="mini-kpi-icon">${icon(symbol)}</span></div>`).join('')}</div>`;
  }
  function bars(counts = availableCounts) {
    const max = Math.max(...counts, 1);
    return `<div class="preview-bars" role="img" aria-label="${GROUPS.map((group, index) => `${group}: ${counts[index]} units`).join('; ')}">${GROUPS.map((group, index) => `<span class="preview-bar-item"><b>${counts[index]}</b><span class="bar-shape" style="--bar-height:${counts[index] / max * 100}%;animation-delay:${index * 25}ms"></span><small>${groupLabel(group)}</small></span>`).join('')}</div>`;
  }
  function groups() {
    return `<div class="preview-groups">${GROUPS.map((group, index) => `<div class="preview-group ${availableCounts[index] < 5 ? 'low' : ''}"><strong>${groupLabel(group)}</strong><b>${availableCounts[index]}</b><small>${availableCounts[index] < 5 ? 'Low stock' : 'Available'}</small></div>`).join('')}</div>`;
  }
  function donut() {
    const parts = [0, 0, 0];
    usable.forEach(record => { parts[record.days <= 7 ? 2 : availableCounts[GROUPS.indexOf(record.group)] < 5 ? 1 : 0] += record.quantity; });
    const circumference = 2 * Math.PI * 35;
    let offset = 0;
    const circles = parts.map((count, index) => { const arc = count / totals.available * circumference; const circle = `<circle cx="50" cy="50" r="35" fill="none" stroke="${['#d62828', '#e9b66f', '#eab8bf'][index]}" stroke-width="12" stroke-dasharray="${Math.max(0, arc - 1.5)} ${circumference}" stroke-dashoffset="${-offset}"/>`; offset += arc; return circle; }).join('');
    return `<div class="mock-stock-donut"><svg viewBox="0 0 100 100" role="img" aria-label="Usable units: ${parts[0]} available, ${parts[1]} low stock, ${parts[2]} expiring soon">${circles}</svg><span><strong>${totals.available}</strong>Usable units</span></div><div class="mini-legend"><span><i></i>Available</span><span><i></i>Low stock</span><span><i></i>Expiring soon</span></div>`;
  }
  function status(record) {
    const expired = record.days < 0 && record.status !== 'Issued';
    return `<span class="mini-status ${expired ? 'expired' : record.status === 'Reserved' ? 'reserved' : record.status === 'Available' ? '' : 'warning'}">${expired ? 'Expired' : record.status}</span>`;
  }
  function table(records, mode = 'inventory', short = false) {
    return `<div class="mini-table-wrap" tabindex="0" role="region" aria-label="Illustrative ${mode} records"><table class="landing-mini-table"><thead><tr><th scope="col">Unit ID</th><th scope="col">Group</th>${short ? '' : '<th scope="col">Component</th>'}${mode === 'expiry' ? '<th scope="col">Expires</th><th scope="col">Days left</th>' : short ? '' : '<th scope="col">Units</th><th scope="col">Collected</th><th scope="col">Expires</th>'}<th scope="col">Status</th></tr></thead><tbody>${records.map(record => `<tr><td>${record.id}</td><td><span class="group-pill">${groupLabel(record.group)}</span></td>${short ? '' : `<td>${record.component}</td>`}${mode === 'expiry' ? `<td>${dateLabel(record.days)}</td><td>${record.days < 0 ? `<span class="mini-status expired">${Math.abs(record.days)}d overdue</span>` : `<span class="mini-status warning">${record.days} days</span>`}</td>` : short ? '' : `<td>${record.quantity}</td><td>${dateLabel(record.collected)}</td><td>${dateLabel(record.days)}</td>`}<td>${status(record)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function expirySummary() { return `<div class="illustration-summary"><div><span>Expired units</span><strong>${totals.expired}</strong></div><div><span>Within 3 days</span><strong>${totals.three}</strong></div><div><span>Within 7 days</span><strong>${totals.soon}</strong></div></div>`; }
  function components() {
    return `<div class="component-summary">${['PRBC', 'Platelets', 'Plasma'].map((component, index) => { const total = sum(sample.filter(record => record.component === component)); return `<div><div class="component-label"><span>${component === 'PRBC' ? 'Packed red blood cells' : component}</span><b>${total} units</b></div><div class="progress-track"><div class="progress-fill" style="width:${total / totals.total * 100}%;background:${['#d62828', '#e5a0a5', '#edc4c8'][index]}"></div></div></div>`; }).join('')}</div>`;
  }
  function heroPreview() {
    return `<div class="mock-browser-bar" aria-hidden="true"><span class="browser-dot"></span><span class="browser-dot"></span><span class="browser-dot"></span><span class="mock-browser-title">BloodStock / Overview</span></div><div class="mock-app"><div class="mock-sidebar" aria-hidden="true"><span>${icon('droplet')}</span><span class="selected">${icon('layout')}</span>${icon('droplet')}${icon('clock')}${icon('chart')}${icon('settings')}</div><div class="mock-main"><div class="mock-title-row"><div><h2>Blood Bank Overview</h2><p>Better visibility. Better preparedness.</p></div>${sampleLabel()}</div>${miniKpis(true)}<div class="mock-chart-row"><div class="mock-panel"><h4>Inventory by Blood Group</h4><p>Usable available units</p>${bars()}</div><div class="mock-panel"><h4>Stock Status</h4><p>Exclusive usable-stock categories</p>${donut()}</div></div><h4 class="mock-group-heading">Blood Group Availability</h4>${groups()}<div class="mock-bottom-row"><div class="mock-panel"><h4>Expiring Soon</h4>${sample.filter(record => record.days >= 0 && record.days <= 3).slice(0, 2).map(record => `<div class="mock-expiry-row"><span>${record.id}</span><b>${groupLabel(record.group)}</b><span class="mini-status warning">${record.days} days left</span></div>`).join('')}</div><div class="mock-panel"><h4>Sample Activity</h4><div class="mini-activity">${icon('plus')}Demo inventory loaded</div><div class="mini-activity">${icon('check')}18 sample batches ready</div></div></div><div class="mock-caption"><span>City Care Blood Centre</span><span>Fictional inventory · Educational demo</span></div></div></div>`;
  }
  const illustrationContent = {
    groups: `<div class="window-head"><h4>Blood Group Availability</h4>${sampleLabel()}</div>${groups()}<div class="window-footnote"><span><b>${totals.available}</b> usable available units</span><span><b>13</b> reserved units</span><span><b>${totals.low}</b> low-stock groups</span></div>`,
    expiry: `<div class="window-head"><h4>Expiry Tracker</h4>${sampleLabel()}</div>${expirySummary()}${table([sample[15], sample[1], sample[3]], 'expiry')}<div class="window-footnote"><span>3-day window is included in the 7-day window.</span></div>`,
    records: `<div class="window-head"><h4>Inventory Records</h4>${sampleLabel()}</div><div class="illustration-toolbar" aria-hidden="true"><span class="illustration-search">${icon('search')}Search inventory records</span><span>All groups ${icon('chevron-down')}</span></div>${table([sample[0], sample[2], sample[10], sample[8]], 'inventory', true)}<div class="window-footnote"><span>Illustration of the dashboard’s record view</span><span>4 sample batches shown</span></div>`,
    reports: `<div class="window-head"><h4>Inventory by Component</h4>${sampleLabel()}</div>${components()}<div class="preview-report-stats"><div><strong>${totals.total}</strong><span>Total recorded units</span></div><div><strong>${sample.length}</strong><span>Inventory batches</span></div></div><div class="window-footnote"><span>Includes all workflow statuses</span><span>CSV and print in the dashboard</span></div>`
  };
  function timeline() { return `<div class="mini-showcase-card"><ul class="mini-timeline">${[sample[15], sample[1], sample[3]].map(record => `<li><span class="timeline-dot"></span><span><b>${record.id} · ${groupLabel(record.group)}</b><small>${dateLabel(record.days)}</small></span><span class="mini-status ${record.days < 0 ? 'expired' : 'warning'}">${record.days < 0 ? 'Expired' : `${record.days} days left`}</span></li>`).join('')}</ul></div>`; }
  function miniContent(type) {
    if (type === 'dashboard') return `<div class="mini-showcase-card"><div class="mini-kpis"><div class="mini-kpi"><span>Total units</span><strong>${totals.total}</strong></div><div class="mini-kpi"><span>Usable available</span><strong>${totals.available}</strong></div></div>${bars()}</div>`;
    if (type === 'groups') return groups();
    if (type === 'records') return `<div class="mini-showcase-card">${table([sample[0], sample[2], sample[10]], 'inventory', true)}</div>`;
    if (type === 'expiry') return timeline();
    if (type === 'reports') return `<div class="mini-showcase-card"><div class="mini-report-head"><span>Available inventory report</span>${icon('download')}</div>${bars()}<p style="font-size:7px;margin-top:10px;color:#7d8797">Export and print from the dashboard</p></div>`;
    if (type === 'storage') return `<div class="storage-illustration"><div class="storage-browser"><div class="storage-browser-bar"><i></i><i></i><i></i></div>${icon('database')}</div><span class="storage-label">${icon('check')}Saved in this browser</span></div>`;
    return bars();
  }

  let selectedTab = 'overview';
  const previewFilter = { query: '', status: 'all' };
  function previewRecords() { const query = previewFilter.query.toLowerCase().trim().replaceAll('−', '-'); return sample.filter(record => (!query || [record.id, record.group, record.component].some(value => value.toLowerCase().includes(query))) && (previewFilter.status === 'all' || record.status === previewFilter.status)); }
  function previewInventoryResults() { const records = previewRecords(); return records.length ? `${table(records.slice(0, 6))}<p class="preview-record-count">Showing ${Math.min(records.length, 6)} of ${records.length} matching illustrative batches. Open the dashboard to manage all records.</p>` : '<div class="preview-fallback"><h4>No matching sample records</h4><p>Try another search or choose all statuses.</p></div>'; }
  function previewTitle(title, description, route) { return `<div class="preview-title"><div><h3>${title}</h3><p>${description}</p></div><a href="dashboard.html#${route}">Open this view ${icon('arrow-up-right')}</a></div>`; }
  function renderPreview(view) {
    selectedTab = view;
    const panel = $('#preview-panel');
    if (view === 'overview') panel.innerHTML = `${previewTitle('Blood Bank Overview', 'City Care Blood Centre · A fictional inventory snapshot', view)}${miniKpis()}<div class="mock-chart-row"><div class="mock-panel"><h4>Inventory by Blood Group</h4><p>Usable available units, excluding expired and other statuses</p>${bars()}</div><div class="mock-panel"><h4>Expiry at a Glance</h4><p>On-hand sample inventory</p><div class="preview-expiry-summary"><div><span>Expired units</span><strong>${totals.expired}</strong></div><div><span>Expiring within 3 days</span><strong>${totals.three}</strong></div><div><span>Expiring within 7 days</span><strong>${totals.soon}</strong></div></div><p style="margin-top:12px">The 3-day window is included in 7 days.</p></div></div>`;
    if (view === 'inventory') {
      panel.innerHTML = `${previewTitle('Blood Inventory', 'Search and filter this illustrative dataset. Saved records are unchanged.', view)}<div class="preview-search-controls"><label><span>Search sample inventory</span><input id="preview-search" class="form-control" type="search" placeholder="Search ID, blood group, component…"></label><label class="preview-status-field"><span>Sample record status</span><select class="form-select" id="preview-status"><option value="all">All statuses</option>${['Available', 'Reserved', 'Issued', 'Quarantined'].map(status => `<option>${status}</option>`).join('')}</select></label></div><div id="preview-inventory-results" aria-live="polite"></div>`;
      $('#preview-search').value = previewFilter.query;
      $('#preview-status').value = previewFilter.status;
      $('#preview-inventory-results').innerHTML = previewInventoryResults();
    }
    if (view === 'expiry') panel.innerHTML = `${previewTitle('Expiry Tracker', 'Upcoming and overdue dates in the illustrative sample', view)}${expirySummary()}${table([sample[15], sample[16], sample[7], sample[1], sample[3]], 'expiry')}<p class="preview-report-note">The 3-day window is included in 7 days. Issued records are excluded. Alerts are inventory reminders only.</p>`;
    if (view === 'reports') panel.innerHTML = `${previewTitle('Inventory Reports', 'A consolidated summary of all 150 illustrative units', view)}<div class="mock-chart-row"><div class="mock-panel"><h4>Total Inventory by Blood Group</h4><p>All statuses, including issued and expired records</p>${bars(GROUPS.map(group => sum(sample.filter(record => record.group === group))))}</div><div class="mock-panel"><h4>Inventory by Component</h4>${components()}</div></div><div class="preview-report-stats">${['Available', 'Reserved', 'Issued', 'Quarantined'].map(status => `<div><strong>${sum(sample.filter(record => record.status === status))}</strong><span>${status}</span></div>`).join('')}</div><p class="preview-report-note">Workflow status counts include expired records. Usable available stock is ${totals.available} units. Download CSVs and print reports in the real dashboard.</p>`;
    $$('[data-preview-tab]').forEach(button => { const selected = button.dataset.previewTab === view; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
    panel.setAttribute('aria-labelledby', `preview-tab-${view}`);
    $('#preview-app-link').href = `dashboard.html#${view}`;
    if (!reducedMotion.matches) { panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = ''; }
  }

  function closeMenu(restoreFocus = false) {
    $('#site-nav').classList.remove('is-open');
    $('#mobile-nav-toggle').setAttribute('aria-expanded', 'false');
    $('#mobile-nav-toggle').setAttribute('aria-label', 'Open menu');
    $('#mobile-nav-toggle').innerHTML = icon('menu');
    if (restoreFocus) $('#mobile-nav-toggle').focus();
  }
  function toggleFAQ(button) {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    document.getElementById(button.getAttribute('aria-controls')).hidden = expanded;
  }
  function animateCounter(element) {
    if (reducedMotion.matches) return;
    const target = Number(element.dataset.landingCount), start = performance.now();
    function frame(time) { const progress = Math.min((time - start) / 750, 1); element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))); if (progress < 1) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }

  $('#hero-preview').innerHTML = heroPreview();
  $$('[data-illustration]').forEach(element => { element.innerHTML = illustrationContent[element.dataset.illustration]; });
  $$('[data-mini]').forEach(element => { element.innerHTML = miniContent(element.dataset.mini) + (element.dataset.mini === 'banner-chart' ? '' : '<span class="sample-corner">Illustrative sample</span>'); });
  hydrateIcons(); renderPreview('overview');
  $('#copyright-year').textContent = new Date().getFullYear();
  // Answers are all present and expanded in the HTML, so no-JS readers lose nothing.
  $$('.faq-question').forEach((button, index) => { if (index > 0) toggleFAQ(button); });
  $$('.faq-question').forEach(button => button.addEventListener('click', () => toggleFAQ(button)));
  $('#mobile-nav-toggle').addEventListener('click', () => {
    const open = !$('#site-nav').classList.contains('is-open');
    $('#site-nav').classList.toggle('is-open', open);
    $('#mobile-nav-toggle').setAttribute('aria-expanded', String(open));
    $('#mobile-nav-toggle').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#mobile-nav-toggle').innerHTML = icon(open ? 'x' : 'menu');
  });
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) {
      closeMenu();
      const section = document.getElementById(anchor.getAttribute('href').slice(1));
      if (section) { event.preventDefault(); section.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' }); if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); history.replaceState(null, '', anchor.getAttribute('href')); }
    }
    // The toggle replaces its SVG; composedPath retains the original click ancestry.
    if (!event.composedPath().includes($('#site-header'))) closeMenu();
    const tab = event.target.closest('[data-preview-tab]');
    if (tab) renderPreview(tab.dataset.previewTab);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#site-nav').classList.contains('is-open')) closeMenu(true);
    if (event.target.matches('[data-preview-tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const tabs = $$('[data-preview-tab]'), index = tabs.indexOf(event.target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      renderPreview(tabs[next].dataset.previewTab); tabs[next].focus();
    }
  });
  document.addEventListener('input', event => { if (event.target.id === 'preview-search') { previewFilter.query = event.target.value; $('#preview-inventory-results').innerHTML = previewInventoryResults(); } });
  document.addEventListener('change', event => { if (event.target.id === 'preview-status') { previewFilter.status = event.target.value; $('#preview-inventory-results').innerHTML = previewInventoryResults(); } });
  window.addEventListener('resize', () => { if (innerWidth > 700) closeMenu(); });
  let scrollQueued = false;
  function updateHeader() { $('#site-header').classList.toggle('scrolled', scrollY > 15); scrollQueued = false; }
  window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateHeader); } }, { passive: true });
  updateHeader();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.classList.add('is-revealed'); if (entry.target.hasAttribute('data-landing-count')) animateCounter(entry.target); observer.unobserve(entry.target); }); }, { threshold: 0.12 });
    $$('.reveal, [data-landing-count]').forEach(element => observer.observe(element));
  }
})();
