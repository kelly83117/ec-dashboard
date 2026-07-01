# -*- coding: utf-8 -*-
import json, datetime, urllib.request, urllib.parse, os, sys

today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
date_str = today.strftime("%Y-%m-%d")
month = today.month

api_key = os.environ.get("GITHUB_TOKEN", "")
if not api_key:
    print("Error: GITHUB_TOKEN not set", file=sys.stderr)
    sys.exit(1)

def call_ai(prompt):
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 1024
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://models.inference.ai.azure.com/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        return result["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"API error: {e.code} {body[:200]}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"API error: {e}", file=sys.stderr)
        sys.exit(1)

def parse_json(text):
    start = text.find("[")
    end = text.rfind("]") + 1
    if start < 0 or end <= 0:
        return []
    return json.loads(text[start:end])

# ── 1. 產品推薦 ──────────────────────────────
products_prompt = (
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
    '[{"keyword":"搜尋關鍵字","name":"完整商品名稱（20字內，不含品牌）","price":預估售價數字,"sold":預估月銷量數字,"reason":"推薦原因（15字內）"}]'
)

print("Generating product recommendations...")
products_raw = parse_json(call_ai(products_prompt))
items = []
for it in products_raw[:5]:
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
print(f"  → {len(items)} products saved")

# ── 2. 熱搜關鍵字 ──────────────────────────────
trends_prompt = (
    f"今天是 {date_str}，台灣電商市場。\n\n"
    f"請根據 {month} 月的季節、台灣節慶與近期生活趨勢，推薦 10 個目前台灣消費者在蝦皮最常搜尋的關鍵字。\n\n"
    f"規則：\n"
    f"- 關鍵字要是消費者搜尋的詞，不是商品描述\n"
    f"- 涵蓋不同品類（居家、廚房、清潔、收納、寢具等）\n"
    f"- 不能有品牌名稱\n"
    f"- traffic 用 '50K+' / '30K+' / '20K+' / '10K+' / '5K+' 格式\n\n"
    '請只回傳 JSON 陣列：[{"title":"關鍵字","traffic":"50K+"}]'
)

print("Generating trending keywords...")
trends_raw = parse_json(call_ai(trends_prompt))
trends = [{"title": t.get("title", ""), "traffic": t.get("traffic", "10K+")} for t in trends_raw[:10] if t.get("title")]

with open("data/trends.json", "w", encoding="utf-8") as f:
    json.dump({"updated": date_str, "items": trends}, f, ensure_ascii=False, indent=2)
print(f"  → {len(trends)} keywords saved")
for t in trends:
    print(f"    - {t['title']} ({t['traffic']})")

# ── 3. 1688 供應商推薦 ──────────────────────────────
suppliers_prompt = (
    f"今天是 {date_str}，台灣電商採購市場。\n\n"
    f"請根據 {month} 月的季節與台灣即將到來的節慶，推薦 5 個適合去 1688 採購的居家生活用品類別。\n\n"
    f"規則：\n"
    f"- 只能是居家生活用品（收納、廚房、浴室、寢具、清潔等）\n"
    f"- 不能有品牌名稱\n"
    f"- 不能是電器、3C、美妝、噴霧類\n"
    f"- keyword 是在 1688 搜尋的中文關鍵字（簡體）\n"
    f"- price_range 是預估拿貨單價範圍（人民幣）\n"
    f"- moq 是建議最低起訂量\n"
    f"- reason 是為什麼現在適合採購（15字內）\n\n"
    '請只回傳 JSON 陣列：\n'
    '[{"keyword":"收纳盒","name":"多格收納盒（台灣熱銷款）","price_range":"3-8元","moq":"100個","reason":"暑假整理收納旺季"}]'
)

print("Generating 1688 supplier recommendations...")
sup_raw = parse_json(call_ai(suppliers_prompt))
suppliers = []
for s in sup_raw[:5]:
    kw = s.get("keyword", "")
    suppliers.append({
        "keyword": kw,
        "name": s.get("name", kw),
        "price_range": s.get("price_range", ""),
        "moq": s.get("moq", ""),
        "reason": s.get("reason", ""),
        "url": f"https://s.1688.com/selloffer/offer_search.htm?charset=utf8&keywords={urllib.parse.quote(kw, safe='')}"
    })

with open("data/suppliers.json", "w", encoding="utf-8") as f:
    json.dump({"updated": date_str, "items": suppliers}, f, ensure_ascii=False, indent=2)
print(f"  → {len(suppliers)} supplier recommendations saved")
for s in suppliers:
    print(f"    - {s['keyword']}: {s['name']} ({s['price_range']})")
