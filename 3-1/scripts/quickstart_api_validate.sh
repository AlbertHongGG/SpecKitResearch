#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001}"
BUYER_JAR="${BUYER_JAR:-/tmp/qs_buyer.cookies}"
ADMIN_JAR="${ADMIN_JAR:-/tmp/qs_admin.cookies}"
BUYER2_JAR="${BUYER2_JAR:-/tmp/qs_buyer2.cookies}"
SELLER1_JAR="${SELLER1_JAR:-/tmp/qs_seller1.cookies}"

rm -f "$BUYER_JAR" "$ADMIN_JAR" "$BUYER2_JAR" "$SELLER1_JAR"

WEBHOOK_SECRET=$(grep -E '^PAYMENT_WEBHOOK_SECRET=' backend/.env | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')

echo "[1] Catalog list"
products_json=$(curl -fsS "$API_BASE/api/catalog/products")
product_ids=$(printf "%s" "$products_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.items.slice(0,2).map(x=>x.id).join(" "));')
P1=$(printf "%s" "$product_ids" | awk '{print $1}')
P2=$(printf "%s" "$product_ids" | awk '{print $2}')
test -n "$P1" && test -n "$P2"

categories_json=$(curl -fsS "$API_BASE/api/catalog/categories")
CAT_ID=$(printf "%s" "$categories_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.items[0]?.id ?? "");')
test -n "$CAT_ID"

echo "[2] Buyer login (seed)"
curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" \
  -H 'content-type: application/json' \
  -X POST "$API_BASE/api/auth/login" \
  -d '{"email":"buyer@example.com","password":"password123"}' > /dev/null

echo "[3] Add 2 products to cart"
curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/cart/items" -d "{\"productId\":\"$P1\",\"quantity\":1}" > /dev/null
curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/cart/items" -d "{\"productId\":\"$P2\",\"quantity\":1}" > /dev/null

echo "[4] Checkout + webhook success + payment result"
TX1="tx_$(date +%s)_us1"
checkout_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/checkout" -d "{\"paymentMethod\":\"mock\",\"transactionId\":\"$TX1\"}")
ORDER1=$(printf "%s" "$checkout_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.orderId ?? "");')
test -n "$ORDER1"

curl -fsS -H 'content-type: application/json' -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -X POST "$API_BASE/api/payments/webhook" \
  -d "{\"provider\":\"mock\",\"eventId\":\"evt_$(date +%s)_us1\",\"orderId\":\"$ORDER1\",\"transactionId\":\"$TX1\",\"status\":\"succeeded\",\"paymentMethod\":\"mock\"}" > /dev/null

result_json=$(curl -fsS "$API_BASE/api/payments/result?orderId=$ORDER1")
PAYMENT_STATUS=$(printf "%s" "$result_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.paymentStatus ?? "");')
test "$PAYMENT_STATUS" = "succeeded"

echo "[5] US2 seller apply + admin approve + me roles"
apply_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/seller/apply" -d '{"shopName":"Buyer Shop"}')
APP_ID=$(printf "%s" "$apply_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.application?.id ?? "");')
test -n "$APP_ID"

curl -fsS -c "$ADMIN_JAR" -b "$ADMIN_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/auth/login" \
  -d '{"email":"admin@example.com","password":"password123"}' > /dev/null

curl -fsS -c "$ADMIN_JAR" -b "$ADMIN_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/admin/seller-applications/$APP_ID/decision" \
  -d '{"decision":"approved"}' > /dev/null

me_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" "$API_BASE/api/auth/me")
HAS_SELLER=$(printf "%s" "$me_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); const roles = d.user?.roles ?? d.roles ?? []; console.log(roles.includes("seller") ? "yes" : "no");')
test "$HAS_SELLER" = "yes"

echo "[6] Seller creates + activates product"
create_prod_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/seller/products" \
  -d "{\"title\":\"QS Product\",\"description\":\"desc\",\"price\":1234,\"stock\":5,\"categoryId\":\"$CAT_ID\"}")
NEW_PROD_ID=$(printf "%s" "$create_prod_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.product?.id ?? "");')
test -n "$NEW_PROD_ID"

curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X PATCH "$API_BASE/api/seller/products/$NEW_PROD_ID" \
  -d '{"status":"active"}' > /dev/null

curl -fsS "$API_BASE/api/catalog/products?q=QS%20Product" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); if (!d.items.some(p=>p.title==="QS Product")) process.exit(1);'

echo "[7] US3 pre-payment cancel"
curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/cart/items" -d "{\"productId\":\"$NEW_PROD_ID\",\"quantity\":1}" > /dev/null

TX2="tx_$(date +%s)_cancel"
checkout2_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/checkout" -d "{\"paymentMethod\":\"mock\",\"transactionId\":\"$TX2\"}")
ORDER2=$(printf "%s" "$checkout2_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.orderId ?? "");')
test -n "$ORDER2"

cancel_json=$(curl -fsS -c "$BUYER_JAR" -b "$BUYER_JAR" -X POST "$API_BASE/api/orders/$ORDER2/cancel")
CANCEL_STATUS=$(printf "%s" "$cancel_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.order?.status ?? d.status ?? "");')
test -n "$CANCEL_STATUS"

echo "[8] US3 refund flow (request -> seller reject -> admin force)"

# Login seller1 and pick a product
curl -fsS -c "$SELLER1_JAR" -b "$SELLER1_JAR" \
  -H 'content-type: application/json' \
  -X POST "$API_BASE/api/auth/login" \
  -d '{"email":"seller1@example.com","password":"password123"}' > /dev/null

seller_products_json=$(curl -fsS -c "$SELLER1_JAR" -b "$SELLER1_JAR" "$API_BASE/api/seller/products")
SELLER_PROD_ID=$(printf "%s" "$seller_products_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.items?.[0]?.id ?? "");')
test -n "$SELLER_PROD_ID"

# Create a fresh buyer account so buyer/seller roles are distinct
BUYER2_EMAIL="buyer2_$(date +%s)@example.com"
curl -fsS -H 'content-type: application/json' -X POST "$API_BASE/api/auth/signup" \
  -d "{\"email\":\"$BUYER2_EMAIL\",\"password\":\"password123\"}" > /dev/null

curl -fsS -c "$BUYER2_JAR" -b "$BUYER2_JAR" \
  -H 'content-type: application/json' \
  -X POST "$API_BASE/api/auth/login" \
  -d "{\"email\":\"$BUYER2_EMAIL\",\"password\":\"password123\"}" > /dev/null

curl -fsS -c "$BUYER2_JAR" -b "$BUYER2_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/cart/items" -d "{\"productId\":\"$SELLER_PROD_ID\",\"quantity\":1}" > /dev/null

TX3="tx_$(date +%s)_refund"
checkout3_json=$(curl -fsS -c "$BUYER2_JAR" -b "$BUYER2_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/checkout" -d "{\"paymentMethod\":\"mock\",\"transactionId\":\"$TX3\"}")
ORDER3=$(printf "%s" "$checkout3_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.orderId ?? "");')
test -n "$ORDER3"

curl -fsS -H 'content-type: application/json' -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -X POST "$API_BASE/api/payments/webhook" \
  -d "{\"provider\":\"mock\",\"eventId\":\"evt_$(date +%s)_refund\",\"orderId\":\"$ORDER3\",\"transactionId\":\"$TX3\",\"status\":\"succeeded\",\"paymentMethod\":\"mock\"}" > /dev/null

order3_json=$(curl -fsS -c "$BUYER2_JAR" -b "$BUYER2_JAR" "$API_BASE/api/orders/$ORDER3")
SUB3_ID=$(printf "%s" "$order3_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.order?.subOrders?.[0]?.id ?? "");')
test -n "$SUB3_ID"

refund_create_json=$(curl -fsS -c "$BUYER2_JAR" -b "$BUYER2_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/refunds" -d "{\"suborderId\":\"$SUB3_ID\",\"reason\":\"want refund\",\"requestedAmount\":1234}")
REFUND_ID=$(printf "%s" "$refund_create_json" | node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(0,"utf8")); console.log(d.refund?.id ?? "");')
test -n "$REFUND_ID"

curl -fsS -c "$SELLER1_JAR" -b "$SELLER1_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/seller/refunds/$REFUND_ID/reject" -d '{"note":"no"}' > /dev/null

curl -fsS -c "$ADMIN_JAR" -b "$ADMIN_JAR" -H 'content-type: application/json' \
  -X POST "$API_BASE/api/admin/refunds/$REFUND_ID/force" -d '{"reason":"policy"}' > /dev/null

echo "OK quickstart API validation complete"
