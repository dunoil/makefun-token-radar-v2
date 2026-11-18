// Token Radar v2 — the page. Static, no network: it renders window.RADAR, the dataset main.ts
// wrote from the same board board.json holds, and recomputes every implied value in-page from the
// model's own constants, so the page and the board can never disagree.
(function () {
  'use strict';
  var R = window.RADAR;
  var rows = R.rows;
  var state = { q: '', seg: 'all', cat: '', chain: '', minTvl: 0, watch: false, sort: 'rank', dir: 1, view: 'board', detail: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n == null) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n > 0 ? 'pos' : n < 0 ? 'neg' : '') + '">' + s + '</span>';
  }
  function ageText(d) {
    if (d == null) return '—';
    if (d >= 365) return (d / 365).toFixed(1) + ' yrs';
    return d + ' d';
  }
  function segLabel(s) { return s === 'launch' ? 'Launch' : s === 'product' ? 'Product' : 'Exchange'; }
  function segNote(r) {
    if (r.segment === 'product') return 'Product of a token that already trades — scored at 30% and shown for comparison, not as a launch of its own.';
    if (r.segment === 'exchange') return 'Exchange that records no token — scored at 30%; any token would be the exchange\u2019s own decision.';
    return 'Launch candidate — a standalone protocol that records no token.';
  }

  /** Recompute one row's implied value from the snapshot figures, as lib/model.ts does. */
  function recompute(r) {
    var v = r.tvl_usd * r.category_multiple * r.growth_multiplier * r.maturity_multiplier * r.chain_multiplier * r.segment_multiplier;
    return Math.min(100000000000000, Math.max(1, Math.round(v)));
  }

  function bySlug(slug) { for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) return rows[i]; return null; }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.seg !== 'all' && r.segment !== state.seg) return false;
      if (state.cat && (r.category || 'Uncategorised') !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (state.watch && !r.watchlist) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function sortRows(list) {
    var key = state.sort, dir = state.dir;
    return list.slice().sort(function (a, b) {
      var x = a[key], y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'string') return dir * (x < y ? -1 : x > y ? 1 : 0);
      return dir * (x - y);
    });
  }

  function rowHtml(r) {
    var chains = r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '');
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td class="num">' + r.rank + '</td>' +
      '<td><span class="name">' + esc(r.name) + '</span>' +
        '<span class="sub">' + esc(r.slug) + ' · ' + esc(chains || '—') + '</span>' +
        (r.watchlist ? '<span class="badge watch">Watchlist</span>' : '') +
        '<span class="badge ' + r.segment + '">' + segLabel(r.segment) + '</span></td>' +
      '<td>' + esc(r.category || 'Uncategorised') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td>' + r.farm_steps.length + ' steps</td></tr>';
  }

  function renderBoard() {
    var list = sortRows(filtered());
    $('rows').innerHTML = list.map(rowHtml).join('') ||
      '<tr><td colspan="8">No protocols match these filters — loosen one and try again.</td></tr>';
    $('count').textContent = list.length + ' of ' + rows.length + ' pre-token protocols shown' +
      (state.seg === 'all' ? '' : ' · segment: ' + segLabel(state.seg)) +
      (state.watch ? ' · watchlist only' : '');
    $('boardNote').textContent = 'Ranked by implied value, highest first. Products and exchanges sit in the same ' +
      'ranking at 30% of their standalone comparable value, badged so a reader never mistakes one for a launch.';
    document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
      var key = th.getAttribute('data-sort');
      th.classList.toggle('sorted-asc', state.sort === key && state.dir === 1);
      th.classList.toggle('sorted-desc', state.sort === key && state.dir === -1);
      th.setAttribute('aria-sort', state.sort === key ? (state.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }

  /** Split one farm step into its action and its cost/time tail. */
  function splitStep(s) {
    var i = s.indexOf(' Cost: ');
    if (i < 0) return { action: s, tail: '' };
    var tail = s.slice(i + 7);
    var j = tail.indexOf('. Time: ');
    if (j < 0) return { action: s.slice(0, i), tail: tail };
    return { action: s.slice(0, i), tail: 'Cost: ' + tail.slice(0, j) + ' · Time: ' + tail.slice(j + 8).replace(/\.$/, '') };
  }

  function renderDetail(r) {
    var re = recompute(r);
    var match = re === r.implied_value_usd;
    var steps = r.farm_steps.map(function (s, i) {
      var p = splitStep(s);
      return '<li>' + esc(p.action) + (p.tail ? '<span class="cost"><b>' + esc(p.tail) + '</b></span>' : '') + '</li>';
    }).join('');
    $('detail').innerHTML =
      '<div class="detail"><h2>' + esc(r.name) + '</h2>' +
      '<p><span class="badge ' + r.segment + '">' + segLabel(r.segment) + '</span>' +
      (r.watchlist ? '<span class="badge watch">Watchlist</span>' : '') + '</p>' +
      '<p class="callout">' + esc(segNote(r)) + '</p>' +
      '<dl class="kv">' +
      '<div><dt>Rank</dt><dd>#' + r.rank + ' of ' + rows.length + '</dd></div>' +
      '<div><dt>Implied value</dt><dd>' + money(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + (r.change_7d == null ? 'not reported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</dd></div>' +
      '<div><dt>Tracked since</dt><dd>' + (r.listed_at || 'not recorded') + ' (' + ageText(r.age_days) + ')</dd></div>' +
      '<div><dt>Chains</dt><dd>' + r.chains.length + ' · ' + esc(r.chains.slice(0, 3).join(', ') || '—') + '</dd></div>' +
      '</dl>' +
      '<h3>How the value is built</h3>' +
      '<table><thead><tr><th>Factor</th><th class="num">Value</th></tr></thead><tbody>' +
      '<tr><td>TVL</td><td class="num">' + money(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Category multiple (' + esc(r.category || 'Uncategorised') + ', ' + r.comparables + ' traded comparables)</td><td class="num">× ' + r.category_multiple.toFixed(3) + '</td></tr>' +
      '<tr><td>Growth multiplier</td><td class="num">× ' + r.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Maturity multiplier</td><td class="num">× ' + r.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Chain spread (' + r.chains.length + ' chains)</td><td class="num">× ' + r.chain_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Segment multiplier</td><td class="num">× ' + r.segment_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td><strong>Recomputed in this page</strong></td><td class="num"><strong>' + money(re) + (match ? ' ✓' : ' — differs from board') + '</strong></td></tr>' +
      '</tbody></table>' +
      '<h3>Farm plan — ' + r.farm_steps.length + ' steps</h3>' +
      '<ol class="farm">' + steps + '</ol>' +
      '<p class="note">Costs are the plan\u2019s own figures for this protocol\u2019s chain and size. Never pay anyone to ' +
      'claim on your behalf, and claim only from the link the protocol itself publishes.</p></div>';
    $('drawer').hidden = false;
  }

  function closeDetail() { $('drawer').hidden = true; state.detail = null; syncUrl(); }

  function renderLive() {
    $('liveRows').innerHTML = R.live.map(function (p) {
      return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="sub">' + esc(p.slug) +
        (p.symbol ? ' · ' + esc(p.symbol) : '') + '</span></td><td>' + esc(p.category || 'Uncategorised') +
        '</td><td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) +
        '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
  }

  function renderModel() {
    $('globalMult').textContent = R.global_multiple.toFixed(3) + '×';
    $('medianAge').textContent = R.median_age_days;
    $('multRows').innerHTML = R.multiples.map(function (m) {
      return '<tr><td>' + esc(m.category) + '</td><td class="num">' + m.multiple.toFixed(3) + '×</td><td class="num">' + m.comparables + '</td></tr>';
    }).join('');
  }

  function showView(v) {
    state.view = v;
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-view') === v); });
    ['board', 'live', 'model'].forEach(function (name) { $('view-' + name).hidden = name !== v; });
    if (v === 'live') renderLive();
    if (v === 'model') renderModel();
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.view !== 'board') p.set('view', state.view);
    if (state.seg !== 'all') p.set('seg', state.seg);
    if (state.cat) p.set('cat', state.cat);
    if (state.chain) p.set('chain', state.chain);
    if (state.minTvl) p.set('minTvl', String(state.minTvl));
    if (state.watch) p.set('watch', '1');
    if (state.q) p.set('q', state.q);
    if (state.detail) p.set('detail', state.detail);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p.toString() : ''));
  }

  function fillSelects() {
    var cats = {}, chains = {};
    rows.forEach(function (r) { cats[r.category || 'Uncategorised'] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
    $('cat').innerHTML = '<option value="">All categories</option>' + Object.keys(cats).sort().map(function (c) {
      return '<option>' + esc(c) + '</option>';
    }).join('');
    $('chain').innerHTML = '<option value="">All chains</option>' + Object.keys(chains).sort().map(function (c) {
      return '<option>' + esc(c) + '</option>';
    }).join('');
  }

  function init() {
    $('asOf').textContent = R.as_of;
    $('stats').innerHTML =
      '<div><dt>Pre-token ranked</dt><dd>' + R.board_size + '</dd></div>' +
      '<div><dt>Launch candidates</dt><dd>' + R.segment_sizes.launch + '</dd></div>' +
      '<div><dt>Watchlist covered</dt><dd>' + R.watchlist_size + ' / ' + R.watchlist_size + '</dd></div>' +
      '<div><dt>Top implied value</dt><dd>' + money(rows[0].implied_value_usd) + '</dd></div>' +
      '<div><dt>Already trading</dt><dd>' + R.live_size + '</dd></div>';
    fillSelects();

    var params = new URLSearchParams(location.search);
    state.seg = params.get('seg') || 'all';
    state.cat = params.get('cat') || '';
    state.chain = params.get('chain') || '';
    state.minTvl = Number(params.get('minTvl') || 0);
    state.watch = params.get('watch') === '1';
    state.q = params.get('q') || '';
    if (['board', 'live', 'model'].indexOf(params.get('view') || '') >= 0) state.view = params.get('view');
    $('q').value = state.q;
    $('seg').value = state.seg;
    $('cat').value = state.cat;
    $('chain').value = state.chain;
    $('minTvl').value = String(state.minTvl);
    $('watchOnly').checked = state.watch;

    $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); syncUrl(); });
    $('seg').addEventListener('change', function (e) { state.seg = e.target.value; renderBoard(); syncUrl(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); syncUrl(); });
    $('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); syncUrl(); });
    $('minTvl').addEventListener('change', function (e) { state.minTvl = Number(e.target.value); renderBoard(); syncUrl(); });
    $('watchOnly').addEventListener('change', function (e) { state.watch = e.target.checked; renderBoard(); syncUrl(); });
    $('reset').addEventListener('click', function () {
      state.q = ''; state.seg = 'all'; state.cat = ''; state.chain = ''; state.minTvl = 0; state.watch = false;
      $('q').value = ''; $('seg').value = 'all'; $('cat').value = ''; $('chain').value = ''; $('minTvl').value = '0'; $('watchOnly').checked = false;
      renderBoard(); syncUrl();
    });
    document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (state.sort === key) { state.dir = -state.dir; } else { state.sort = key; state.dir = key === 'rank' ? 1 : -1; }
        renderBoard();
      });
    });
    $('rows').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (!tr) return;
      var r = bySlug(tr.getAttribute('data-slug'));
      if (r) { state.detail = r.slug; renderDetail(r); syncUrl(); }
    });
    $('drawerClose').addEventListener('click', closeDetail);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { showView(t.getAttribute('data-view')); syncUrl(); });
    });

    showView(state.view);
    renderBoard();
    var detailSlug = params.get('detail');
    if (detailSlug) { var r = bySlug(detailSlug); if (r) { state.detail = r.slug; renderDetail(r); } }
    window.__shotReady = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
