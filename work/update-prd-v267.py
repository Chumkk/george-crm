from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[1]
work = root / 'work'
stamp = sys.argv[1]
doc = json.loads((work / 'space-prd-v265-content.json').read_text(encoding='utf8'))
doc.update(version='V2.11', date=stamp[:10], updatedAt=stamp)
module = next(m for m in doc['modules'] if m['title'] == '企业微信通知')
events, cards, delivery = module['items']
rows = events['table']['rows']
index = next(i for i, row in enumerate(rows) if row[0] == '空间变化')
rows[index:index + 1] = [
    ['安排或更换报价助理', '新安排的报价助理', '打开对应产品报价待办'],
    ['更换或取消报价助理', '被取消协助的原助理', '查看取消协助结果'],
    ['报价待办恢复待处理', '当前报价负责人、仍获授权的报价助理。触发操作的本人除外', '打开原报价待办，查看重新办理原因'],
]
events['bullets'].insert(2, '方案经理保存报价助理安排后，通知新助理。更换时同时通知原助理取消协助，取消时只通知原助理。重复保存相同安排不发通知。')
events['bullets'].insert(3, '已提交的报价再次暂存，或项目空间、采购品类变更使已完成的报价待办恢复待处理时，通知当前报价负责人及仍获授权的报价助理，排除本次操作人。首次暂存、待办仍待处理时的重复暂存、历史状态补录均不发送此提醒。')
cards['bullets'].insert(3, '协助安排及重新激活通知使用“查看报价待办”，打开对应待办并按当前权限核验。取消协助仅告知分工结果，无报价办理入口。重新激活提醒说明本次原因和需重新提交的动作。')
delivery['bullets'].insert(2, '助理分工按原待办、分工变更记录及接收人去重。重新激活按原待办、本次从已处理恢复待处理的记录及接收人去重。')
doc['revisions']['rows'].insert(0, {
    'time': stamp,
    'module': '「事件与接收人」\n「通知卡片与跳转」',
    'changes': [
        '新增报价助理分工通知。安排时提醒新助理，更换时同时告知原助理取消协助。',
        '报价待办从已处理恢复待处理时，提醒当前负责人和仍获授权的助理核对后重提，排除本次操作人。',
    ],
})
(work / 'space-prd-v267-content.json').write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf8')
renderer = (work / 'render-prd-v265.py').read_text(encoding='utf8')
renderer = renderer.replace('space-prd-v265-content.json', 'space-prd-v267-content.json').replace('V2.10', 'V2.11')
renderer = renderer.replace('2026-11-06 14:44', stamp)
(work / 'render-prd-v267.py').write_text(renderer, encoding='utf8')
metadata = root / 'george-crm-react/src/features/prd/document-updates.json'
updates = json.loads(metadata.read_text(encoding='utf8'))
updates['space-quote'] = stamp
metadata.write_text(json.dumps(updates, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
