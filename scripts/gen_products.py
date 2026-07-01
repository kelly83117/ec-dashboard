# -*- coding: utf-8 -*-
import json, datetime, urllib.request, urllib.parse, os, sys

today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
date_str = today.strftime("%Y-%m-%d")
month = today.month

prompt = (
    f"今天是 {date_str}，台灣電商市場。\n\n"
    f"請推薦 5 個目前最適合在蝦皮上架銷售的居家生活用品，每個商品給一個精準的蝦皮搜尋關鍵字。\n\n"
    f"選品規則（嚴格遵守）：\n"
    f"- 只能是居家生活用品（收納、廚房、浴室、寢具、清潔、文具等）\n"
    f"- 不能有品牌名稱\n"
    f"- 不能是美妝、化妝品、保養品\n"
    f"- 不能是電器、3C 產品\n"
    f"- 不能是噴霧類產品\n"
    f"- 根據 {month} 月的季節和台灣即將到來的節慶選擇當季熱門商品\n\n"
    "請只回傳 JSON 陣列，不要加任何說明文字：\n"
    '[\n'
    '  {\n'
    '    "keyword": "搜尋關鍵字",\n'
    '    "name": "完整商品名稱描述（20字內，不含品牌）",\n'
    '    "price": 預估售價數字,\n'
    '    "sold": 預估月銷量數字,\n'
    '    "reason": "推薦原因（15字內）"\n'
    '  }\n'
    ']'
)

api_key = os.environ.get("GITHUB_TOKEN", "")
if not api_key:
    print("Error: GITHUB_TOKEN not set", file=sys.stderr)
    sys.exit(1)

payload = json.dumps({
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.7,
    "max_tokens": 1024
}).encode("utf-8")

req = urllib.request.Request(
    "https://models.inference.ai.azure.com/chat/completions",
    data=payload,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"API error: HTTP Error {e.code}: {e.reason}", file=sys.stderr)
    print(f"Response body: {body}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"API error: {e}", file=sys.stderr)
    sys.exit(1)

text = result["choices"][0]["message"]["content"].strip()
start = text.find("[")
end = text.rfind("]") + 1
if start < 0 or end <= 0:
    print("No JSON found in response", file=sys.stderr)
    sys.exit(1)

items_raw = json.loads(text[start:end])
items = []
for it in items_raw[:5]:
    kw = it.get("keyword", "")
    items.append({
        "keyword": kw,
        "name": it.get("name", kw),
        "price": int(it.get("price", 0)),
        "sold": int(it.get("sold", 0)),
        "url": f"https://shopee.tw/search?keyword={urllib.parse.quote(kw)}",
        "reason": it.get("reason", ""),
        "source": "AI推薦"
    })

os.makedirs("data", exist_ok=True)
with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump({"updated": date_str, "items": items}, f, ensure_ascii=False, indent=2)

print(f"Generated {len(items)} recommendations")
for it in items:
    print(f"  - {it['keyword']}: {it['name']} NT${it['price']}")
