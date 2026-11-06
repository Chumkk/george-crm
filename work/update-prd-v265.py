from pathlib import Path
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
work = root / 'work'
stamp = sys.argv[1]
assert re.fullmatch(r'2026-11-06 \d{2}:\d{2}', stamp)

content = (work / 'space-prd-v264-content.json').read_text(encoding='utf8')
for old, new in {
    '通知卡片与精确入口': '通知卡片与跳转',
    '精确关联报价待办': '对应的报价待办',
    '精确报价待办': '对应的报价待办',
    '报价提交、发布两端报价、完成对应的报价待办和记录ERP请求由同次提交完成。':
        '报价提交成功后，系统发布两端报价、完成对应的报价待办，并记录ERP传输请求。',
    '对应报价版本；PM进入对应的报价待办，查看本次报价及处理记录':
        'PM可打开这张报价单对应的待办，查看报价版本及处理记录',
    'PM的合并报价提交通知定位对应的报价待办；其他报价通知定位项目及品类，订单结果定位对应订单。':
        'PM点击提交结果通知中的“查看报价待办”，直接打开这张报价单对应的待办。其他报价通知打开对应的项目及品类，订单结果打开对应订单。',
}.items():
    assert old in content, old
    content = content.replace(old, new)

doc = json.loads(content)
doc.update(version='V2.10', date=stamp[:10], updatedAt=stamp)
row = doc['revisions']['rows'][0]
assert row['time'].startswith('2026-11-05')
row['changes'] = [
    '每次成功提交报价，PM只收到一条通知。通知显示提交人、报价版本，并说明报价已提交、对应待办已完成、ERP传输请求已记录。'
    '点击“查看报价待办”，直接打开这张报价单对应的待办。客户确认和ERP后续结果仍单独通知。'
]
(work / 'space-prd-v265-content.json').write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf8')

renderer = (work / 'render-prd-v264.py').read_text(encoding='utf8')
renderer = renderer.replace('space-prd-v264-content.json', 'space-prd-v265-content.json')
renderer = renderer.replace('V2.09', doc['version']).replace('2026-11-05 10:19', stamp)
(work / 'render-prd-v265.py').write_text(renderer, encoding='utf8')

metadata = root / 'george-crm-react/src/features/prd/document-updates.json'
updates = json.loads(metadata.read_text(encoding='utf8'))
updates['space-quote'] = stamp
metadata.write_text(json.dumps(updates, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
