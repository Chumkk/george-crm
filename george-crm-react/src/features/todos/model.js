export const TASK_GROUPS = [
  ["项目经理（PM）", ["项目待办", "设计确认待办"]],
  ["设计师", ["设计待办"]],
  ["商机负责人（SM / 设计师）", ["确认商机", "报价待办"]],
  ["费用经办人员", ["费用订单待办"]],
  ["审批负责人", ["跨区域商机审批待办", "转介绍商机审批待办", "邀请函审核"]],
  ["客户负责人", ["公海跟进"]],
];
export const RETIRED_TASK_TYPES = new Set([
  "客户待办", "创建项目待办", "草稿报价待办", "订单待办", "设计单", "设计订单待办",
]);
export function isCurrentTask(task) {
  return !!task && !RETIRED_TASK_TYPES.has(task.type) && !task.retiredWorkflow135 && !task.legacyDesignArchive187 &&
    (!['设计待办','设计确认待办'].includes(task.type) || !!task.project && task.project !== '-');
}
export function isCurrentNotification(message) {
  // Confirmation cards from earlier saved sessions still open the current quotation task.
  return message?.event === "quote-confirmed" || /客户.*已确认.*报价/.test(message?.title || "") || isCurrentTask(message);
}
export function taskLabel(type) {
  return (
    {
      确认商机: "确认商机待办",
      设计单: "设计单待办",
      邀请函审核: "邀请函审核待办",
      公海跟进: "公海跟进待办",
    }[type] || type
  );
}
export function taskSubtitle(task) {
  const text = (value) => typeof value === "string" && !["-", "—"].includes(value.trim()) ? value.trim() : "";
  const project = text(task.meta?.projName), projectCode = text(task.meta?.projCode) || text(task.project);
  const projectReference = ["项目待办", "确认商机", "确认商机待办", "费用订单待办"].includes(task.type);
  let subject = text(task.subject);
  if (projectReference) subject = project || subject;
  if (task.type === "转介绍商机审批待办") subject = text(task.opportunityName) || subject;
  if (["邀请函审核", "邀请函审核待办", "公海跟进", "公海跟进待办"].includes(task.type)) subject = text(task.customer) || subject;
  const code = ["设计待办", "设计确认待办"].includes(task.type) ? text(task.order)
    : task.type === "报价待办" ? text(task.orderNumber) : projectReference ? projectCode : "";
  return { subject, code: subject.includes(code) ? "" : code,
    showProjectMeta: !projectReference && !!projectCode, projectCode,
    showCustomer: !!text(task.customer) && text(task.customer) !== subject };
}
export function metricFilter(key) {
  return {
    pending: { status: "待处理", quick: "" },
    today: { status: "待处理", quick: "today" },
    done: { status: "已处理", quick: "" },
    rejected: { status: "已驳回", quick: "" },
  }[key];
}
export function splitActions(actions) {
  const flow = actions.filter((a) => a.act === "viewDealFlow"),
    rest = actions.filter((a) => a.act !== "viewDealFlow");
  const explicit = rest.findIndex((a) => a.primary === true);
  const index = explicit >= 0 ? explicit : rest.findIndex(
    (a) => a.act !== "tfRemind" && !/^(查看|详情|报价总览|项目报价总览|驳回|结束)/.test(a.t || ""),
  );
  const main = index < 0 ? rest.find((a) => a.act !== "tfRemind") : rest[index];
  return { main, others: rest.filter((a) => a !== main), flow };
}

export function taskRejectionReason(task) {
  if (task?.status !== "已驳回") return "";
  const reasonText = (value) => {
    const text = typeof value === "string" ? value.trim() : "";
    return ["-", "—"].includes(text) ? "" : text;
  };
  const reason = reasonText(task.rejectReason);
  if (reason) return reason;
  if (["跨区域商机审批待办", "转介绍商机审批待办"].includes(task.type))
    return reasonText(task.approvalNote);
  if (
    task.type === "订单待办" &&
    task.v3 &&
    task.note === "报价已重新提交，等待客户重新确认"
  )
    return task.note;
  return "";
}
