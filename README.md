# ヤモリ不動産 サンプルサイト

GitHub Pages + Googleスプレッドシート + Google Apps Script で動かす、不動産会社向けの軽量サンプルです。

## 構成
- `index.html` トップページ
- `style.css` デザイン
- `script.js` 物件一覧の取得・表示
- `gas/Code.gs` GoogleスプレッドシートをJSON API化するGAS

## まず見る
1. GitHub の Settings → Pages
2. Source を `Deploy from a branch`
3. Branch を `main` / `(root)` にして Save
4. 数分後に公開URLが表示されます

## スプレッドシート連携
シート名を `properties` にして、1行目を以下の列名にします。

`id,published,status,title,price,address,station,walk,layout,land_area,building_area,year,image_url,description`

`gas/Code.gs` を Apps Script に貼り付け、Webアプリとして「全員」に公開します。
公開URLを `script.js` の `GAS_ENDPOINT` に設定すると、スプレッドシートの内容が物件一覧に反映されます。

※ 現在は `GAS_ENDPOINT` が空でも、サンプル3物件が表示されるようにしています。
