/* Temporarily disabled workflow steps. Records stay in TODOS and persisted storage. */
const CRM_PAUSED_TODO_TYPES = new Set(['收款待办', '备货待办']);
function crmTodoEnabled(value) {
  return !CRM_PAUSED_TODO_TYPES.has(typeof value === 'string' ? value : value?.type);
}
const CRM_ORDER_ONLY_FLOW = !crmTodoEnabled('收款待办') && !crmTodoEnabled('备货待办');
