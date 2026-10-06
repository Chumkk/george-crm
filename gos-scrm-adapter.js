/* CRM integration at the original GOS SCRM's data and side-panel boundaries. */
(function () {
  'use strict';
  const channel = 'george-crm-gos-v1', accountId = 'crm-local-account';
  let React, hooks, data = { hub: { customers: [], leads: [], tags: [] }, context: {}, legacy: [] };
  let state, serial = null, activeId = '', restored = false, draftRestore = null, observedDraft = null, failure = '';
  const draftsKey = 'crm-linked-drafts-v1';
  let drafts = {}, blocked = false, draftSaveFailed = false;
  const post = (type, payload) => window.parent.postMessage({ channel, type, payload }, window.location.origin);
  const report = error => { failure = error; post('SCRM_ERROR', { error }); };
  try {
    const raw = localStorage.getItem(draftsKey);
    drafts = raw ? JSON.parse(raw) : {};
    if (!drafts || Array.isArray(drafts) || typeof drafts !== 'object' || Object.values(drafts).some(v => typeof v !== 'string')) throw Error();
  } catch { blocked = true; report('会话输入恢复失败，已保护原记录，请刷新后重试。'); }
  function saveDrafts() {
    if (blocked) return;
    try { localStorage.setItem(draftsKey, JSON.stringify(drafts)); draftSaveFailed = false; }
    catch { draftSaveFailed = true; report('输入内容尚未保存，请保留内容并检查浏览器存储后重试。'); }
  }
  function customerOf(conversation) {
    const lead = data.hub.leads.find(l => String(l.id) === String(conversation?.crmLeadId));
    const id = conversation?.crmCustomerId || lead?.customerId;
    return data.hub.customers.find(c => String(c.id) === String(id));
  }
  function recordOf(conversation) {
    const lead = data.hub.leads.find(l => String(l.id) === String(conversation?.crmLeadId));
    if (conversation?.crmCustomerId || lead?.customerId) return customerOf(conversation);
    return lead;
  }
  function isLinked(conversation) { return !!(conversation?.crmCustomerId || conversation?.crmLeadId); }
  function descriptor(record, kind) {
    return { customerId: kind === 'customer' ? record.id : record.customerId || '',
      leadId: kind === 'lead' ? record.id : '', name: record.name || record.phone || '线索',
      phone: record.phone || '', country: record.country || '', key: `${kind}:${record.id}` };
  }
  function integrate(previous, payload, open) {
    const next = { ...previous, accounts: [...previous.accounts], conversations: previous.conversations.map(c => ({ ...c })), messages: { ...previous.messages } };
    const labels = [{ key: 'all', label: '所有' }, { key: 'unread', label: '未读' }, { key: 'special', label: '特别关注' }, { key: 'group', label: '群组' }];
    if (!next.accounts.some(a => a.id === accountId)) next.accounts.push({ id: accountId, name: 'CRM 会话', shortName: 'CRM', phone: '', region: '关联客户与线索', status: 'online', avatarColor: '#1a4d8f', labels });
    else next.accounts = next.accounts.map(a => a.id === accountId && !a.labels?.length ? { ...a, labels } : a);
    for (const conversation of next.conversations) {
      if (!isLinked(conversation)) continue;
      const record = recordOf(conversation), customer = customerOf(conversation);
      if (customer) conversation.crmCustomerId = customer.id;
      if (record) Object.assign(conversation, { title: record.name || record.phone, phone: record.phone || '', locality: record.country || '', crmCanManage: !!record.canManage });
      else conversation.crmCanManage = false;
    }
    function ensure(row) {
      let conversation = next.conversations.find(c => (row.leadId && String(c.crmLeadId) === String(row.leadId)) || (row.customerId && String(c.crmCustomerId) === String(row.customerId)));
      if (!conversation) {
        const id = `crm-${row.key}`;
        conversation = { id, accountId, type: 'single', title: row.name, remark: '', subtitle: row.phone, phone: row.phone,
          locality: row.country, avatar: row.name.slice(0, 1), avatarColor: '#1a4d8f', timezoneOffset: 0, online: false,
          labels: ['all'], unread: 0, pinned: false, muted: false, archived: false, aiTouched: false, aiManaged: false,
          lastAt: '刚刚', sortIndex: Date.now(), lastMessage: '', crmCustomerId: row.customerId, crmLeadId: row.leadId };
        next.conversations.push(conversation); next.messages[id] = [];
      }
      if (row.customerId) conversation.crmCustomerId = row.customerId;
      if (row.leadId) conversation.crmLeadId = row.leadId;
      const messages = (next.messages[conversation.id] || []).map(m => typeof m.time === 'number' && m.id.startsWith('crm-legacy-') ? { ...m, time: date(m.time) } : m);
      for (const message of row.thread?.messages || []) {
        const id = `crm-legacy-${row.key}-${message.id}`;
        if (!messages.some(m => m.id === id)) {
          messages.push({ ...message, id, type: 'text', direction: 'out', sender: message.author,
            text: message.text, time: date(message.at), status: 'sent' });
          for (const file of message.attachments || []) messages.push({ id: `${id}-${file.id || file.name}`, type: 'file', direction: 'out', sender: message.author,
            name: file.name, fileName: file.name, size: file.size, url: file.dataUrl || file.url, time: date(message.at), status: 'sent' });
        }
      }
      next.messages[conversation.id] = messages;
      if (messages.length) { const last = messages[messages.length - 1]; conversation.lastMessage = last.text || last.name || '附件'; conversation.lastAt = last.time; }
      if (row.thread && !conversation.crmLegacyImported) {
        if (drafts[conversation.id] === undefined) drafts[conversation.id] = row.thread.draft || '';
        // Keep original attachments in the recovery record; never overwrite the old store.
        conversation.crmLegacyDraftAttachments = row.thread.draftAttachments || [];
        conversation.crmLegacyImported = true; saveDrafts();
      }
      return conversation;
    }
    for (const row of payload.legacy || []) ensure(row);
    if (open) {
      const context = payload.context || {};
      const lead = data.hub.leads.find(l => String(l.id) === String(context.leadId));
      const customer = data.hub.customers.find(c => String(c.id) === String(context.customerId));
      const record = lead || customer;
      if (record) {
        const conversation = ensure(descriptor(record, lead ? 'lead' : 'customer'));
        Object.assign(next, { activeConversationId: conversation.id, currentAccountId: conversation.accountId, filterKey: 'all' });
        conversation.archived = false; conversation.crmProjectId = context.projectId || '';
      }
    }
    return next;
  }
  function applyContext(payload) {
    data = payload;
    const open = payload.context?.serial !== undefined && payload.context.serial !== serial;
    if (!hooks) return;
    serial = payload.context?.serial;
    hooks.setState(previous => integrate(previous, payload, open));
    if (open && (payload.context.customerId || payload.context.leadId)) { hooks.setSearch(''); hooks.setTool('crm-customer'); }
  }
  function request(action, conversation, extra = {}) {
    const customer = customerOf(conversation);
    post('CRM_REQUEST', { requestId: `gos-${Date.now()}-${Math.random().toString(36).slice(2)}`, action,
      customerId: customer?.id, leadId: conversation?.crmLeadId, ...extra });
  }
  function rerender() { if (hooks) hooks.setState(value => ({ ...value })); }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.channel !== channel) return;
    if (event.data.type === 'CRM_CONTEXT' && Array.isArray(event.data.payload?.hub?.customers) && Array.isArray(event.data.payload?.hub?.leads)) applyContext(event.data.payload);
    if (event.data.type === 'CRM_RESULT' && event.data.payload?.ok === false) { failure = event.data.payload.error; rerender(); }
  });
  const h = (...args) => React.createElement(...args);
  const date = value => {
    if (!value) return '未安排';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')} ${String(parsed.getHours()).padStart(2,'0')}:${String(parsed.getMinutes()).padStart(2,'0')}` : String(value);
  };
  function button(label, onClick, primary) {
    return h('button', { type: 'button', className: `gos-crm-action ${primary ? 'is-primary' : ''}`, onClick }, label);
  }
  function section(title, ...children) { return h('section', { className: 'scrm-customer-overview-card' }, h('h3', null, title), ...children); }
  function fields(items) {
    return h('dl', null, ...items.filter(([, value]) => value).map(([label, value]) => h('div', { key: label }, h('dt', null, label), h('dd', null, String(value)))));
  }
  function followupPanel(customer, conversation) {
    return section('跟进记录', fields([['下次跟进', date(customer.nextAt)], ['下一步', customer.nextAction]]),
      customer.canManage && button('记录跟进', () => request('followup', conversation, { projectId: conversation.crmProjectId || '' }), true),
      customer.followups.length ? customer.followups.map(item => h('article', { key: item.id, style: { borderTop: '1px solid #e2e8f0', padding: '12px 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
        h('small', { style: { color: '#64748b' } }, `${date(item.at)} · ${item.by || item.author || item.owner || ''}`),
        h('p', null, item.content), item.projectId && h('small', null, customer.projects.find(p => p.id === item.projectId)?.name || '关联项目'))) : h('p', { className: 'gb-text-muted' }, '暂无跟进记录'));
  }
  function renderPanel(conversation, tool) {
    if (!React) return null;
    const customer = customerOf(conversation), record = recordOf(conversation);
    if (!record) return tool === 'follow-up' ? h('div', { className: 'scrm-customer-overview gos-crm-panel' }, section('跟进记录', h('p', null, '从 CRM 客户或线索打开会话后，可查看关联跟进。'))) : null;
    const errors = failure && h('p', { role: 'alert', style: { color: '#b45309' } }, failure);
    if (tool === 'follow-up' && customer) return h('div', { className: 'scrm-customer-overview gos-crm-panel' }, errors, followupPanel(customer, conversation));
    if (!customer) return h('div', { className: 'scrm-customer-overview gos-crm-panel' }, errors, section('线索资料', h('div', { className: 'scrm-customer-summary-card' },
      h('strong', null, record.name), fields([['电话', record.phone], ['国家或地区', record.country], ['负责人', record.owner], ['处理状态', record.status]])), button('查看线索', () => request('lead', conversation))));
    return h('div', { className: 'scrm-customer-overview gos-crm-panel' }, errors,
      section('基本信息', h('div', { className: 'scrm-customer-summary-card' }, h('div', { className: 'scrm-customer-summary-head' }, h('div', null, h('strong', null, customer.name), h('em', null, customer.id), h('em', null, customer.phone))),
        fields([['负责人', customer.owner], ['客户来源/拓展渠道', customer.source], ['国家或地区', customer.country], ['客户属性', customer.identity], ['微信', customer.wechat], ['公司', customer.companyName]])),
        button('打开客户档案', () => request('customer', conversation))),
      section('客户标签', h('div', { className: 'scrm-customer-tags' }, ...customer.tags.map(id => h('span', { className: 'ant-tag', key: id }, data.hub.tags.find(t => t.id === id)?.name || id))),
        customer.canManage && button('维护标签', () => request('tags', conversation), true)),
      section('项目与商机', customer.projects.length ? customer.projects.map(project => h('article', { key: project.id, style: { borderTop: '1px solid #e2e8f0', padding: '12px 0' } },
        h('strong', null, project.name), h('p', null, project.status), h('p', { className: 'gb-text-secondary' }, project.summary),
        button('项目档案', () => request('project', conversation, { projectId: project.id })), button('报价总览', () => request('quotation', conversation, { projectId: project.id })),
        ...project.opportunities.map(opp => h('div', { key: opp.id }, button(`${opp.category} · ${opp.sm} · ${opp.stage}`, () => request('opportunity', conversation, { oppId: opp.id })))))) : h('p', { className: 'gb-text-muted' }, '暂无关联项目')),
      followupPanel(customer, conversation),
      conversation.crmLegacyDraftAttachments?.length ? section('原待发送附件', ...conversation.crmLegacyDraftAttachments.map((file, i) => h('p', { key: i }, h('a', { download: file.name, href: file.dataUrl || file.url }, file.name), h('small', null, ' · 请选择附件后发送')))) : null);
  }
  window.CRM_GOS_ADAPTER = {
    registerReact(value) { React = value; },
    connect(value) { hooks = value; post('SCRM_READY', {}); return () => { hooks = null; restored = false; }; },
    changed(value) {
      state = value;
      if (activeId !== value.activeConversationId || !restored) {
        activeId = value.activeConversationId; restored = true;
        const target = drafts[activeId] || '';
        draftRestore = observedDraft?.conversationId === activeId && observedDraft.text === target ? null : target;
        hooks?.setDraft(target);
      }
    },
    draftChanged({ conversationId, text }) {
      observedDraft = { conversationId, text };
      if (!restored || conversationId !== activeId) return;
      if (draftRestore !== null) {
        if (text !== draftRestore) return;
        draftRestore = null;
      }
      drafts[conversationId] = text; saveDrafts();
    },
    canSend(conversation) {
      if (draftSaveFailed) saveDrafts();
      const allowed = !blocked && !draftSaveFailed && (!isLinked(conversation) || !!recordOf(conversation)?.canManage);
      if (!allowed) report('当前会话没有发送权限，或浏览器存储不可用。输入已保留。');
      return allowed;
    },
    renderPanel,
  };
})();
