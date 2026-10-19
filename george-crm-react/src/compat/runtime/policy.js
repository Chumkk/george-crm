/* Temporarily disabled workflow steps. Records stay in TODOS and persisted storage. */
const CRM_PAUSED_TODO_TYPES = new Set(['收款待办', '备货待办', '邀请函审核', '邀请函审批', '邀请函审核待办', '邀请函审批待办', '公海跟进', '公海跟进待办', '客户跟进', '客户跟进待办']);
function crmTodoEnabled(value) {
  return !CRM_PAUSED_TODO_TYPES.has(typeof value === 'string' ? value : value?.type);
}
const CRM_ORDER_ONLY_FLOW = !crmTodoEnabled('收款待办') && !crmTodoEnabled('备货待办');

// Presentation categories never replace persisted task types or business identities.
function crmTaskCategory(value) {
  const task = typeof value === 'string' ? null : value;
  const type = task?.type || value;
  if (['确认商机', '确认商机待办', '报价待办'].includes(type)) {
    if (!task) return type === '报价待办' ? '报价' : '商机接单';
    const opportunity = typeof OPPS !== 'undefined' && OPPS.find(o => o[0] === task.opp || o[0] === task.createdOppId);
    const design = !!task.designOpportunity || opportunity?.[20]?.kind === 'design';
    return type === '报价待办' ? (design ? '设计报价' : '产品报价') : (design ? '设计商机接单' : '采购商机接单');
  }
  return ({'项目待办':'分配商机', '设计待办':'设计中', '设计确认待办':'设计定稿', '费用订单待办':'费用订单', '跨区域商机审批待办':'跨区域商机审批', '转介绍商机审批待办':'转介绍商机审批'})[type] || type;
}
function crmTaskMatchesCategory(task, category) {
  return category === '全部' || task.type === category || crmTaskCategory(task) === category;
}
