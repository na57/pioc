#!/bin/bash
# 证明云南大学数据中台未开放课程名称(KCMC)模糊查询权限
# 用法: bash scripts/prove-no-fuzzy-course-api.sh

KEY="202604307390ac66ff5c444011f1ab00bacfd457a27e5061"
SECRET="aade967f3a3550c4cdd94ae29a295805a317fa2d"

echo "===== 步骤1: 获取 access_token ====="
TOKEN=$(curl -s "https://dmp.ynu.edu.cn/open_api/authentication/get_access_token?key=${KEY}&secret=${SECRET}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['access_token'])")
echo "access_token: ${TOKEN:0:8}...(已截断)"

API="https://dmp.ynu.edu.cn/open_api/customization/tdwsgxjxbzkskcjbxxmx/full?access_token=${TOKEN}"

echo ""
echo "===== 对照1: 无任何查询条件（基准全量）====="
curl -s "$API" -H "Content-Type: application/json" \
  -d '{"page":1,"per_page":1}' \
  | python3 -c "import sys,json;r=json.load(sys.stdin);print('code:',r['code'],'| total:',r['result']['total'],'| 第一条课程名:',r['result']['data'][0]['KCMC'])"

echo ""
echo "===== 对照2: 模糊查询 KCMC=%%%中国%%%（按文档格式，等价 LIKE %中国%）====="
curl -s "$API" -H "Content-Type: application/json" \
  -d '{"KCMC":"%%%中国%%%","page":1,"per_page":1}' \
  | python3 -c "import sys,json;r=json.load(sys.stdin);print('code:',r['code'],'| total:',r['result']['total'],'| 第一条课程名:',r['result']['data'][0]['KCMC'])"

echo ""
echo "===== 对照3: 精确查询 KCH=YN253019140007（验证查询机制本身正常）====="
curl -s "$API" -H "Content-Type: application/json" \
  -d '{"KCH":"YN253019140007","page":1,"per_page":1}' \
  | python3 -c "import sys,json;r=json.load(sys.stdin);print('code:',r['code'],'| total:',r['result']['total'],'| 第一条课程名:',r['result']['data'][0]['KCMC'])"

echo ""
echo "===== 对照4: 比较语法模糊查询 KCMC={\"like\":\"%近现代%\"}（验证正确格式）====="
curl -s "$API" -H "Content-Type: application/json" \
  -d '{"KCMC":{"like":"%近现代%"},"page":1,"per_page":1}' \
  | python3 -c "import sys,json;r=json.load(sys.stdin);print('code:',r['code'],'| total:',r['result']['total'],'| 第一条课程名:',r['result']['data'][0]['KCMC'])"

echo ""
echo "===== 结论说明 ====="
echo "若 对照2(文档%%%格式) 的 total 与 对照1 完全一致(84896)，说明文档示例的 %%%包裹%%% 格式被中台忽略（未生效）；"
echo "若 对照3(精确) total=1 且 对照4(like比较语法) total=141，说明：中台实际支持的模糊查询是\"比较语法 like\"，"
echo "并非对接文档中的 %%%包裹%%% 格式 —— 应要求厂商同步更新对接文档。"
