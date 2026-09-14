const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbx_jhrORToigZakIlBxbKX7EuBJOtBL2MDBXNmh5DapORvBSt7kZQK0QtxjswqjBdH9/exec";
const CONTACT_EMAIL = "info@yamori-estate.jp";

const sampleProperties = [
{id:"001",published:true,status:"販売中",title:"交野市郡津 中古戸建",price:"1,680万円",address:"大阪府交野市郡津",station:"京阪交野線 郡津駅",walk:"徒歩8分",layout:"4LDK",land_area:"95.2㎡",building_area:"88.4㎡",year:"2002年築",image_url:"",description:"落ち着いた住宅街にある、家族で暮らしやすい中古戸建です。"},
{id:"002",published:true,status:"販売中",title:"枚方市藤阪 中古戸建",price:"2,480万円",address:"大阪府枚方市藤阪",station:"JR学研都市線 藤阪駅",walk:"徒歩12分",layout:"4LDK",land_area:"120.1㎡",building_area:"102.6㎡",year:"2015年築",image_url:"",description:"ゆとりある敷地と明るい室内が魅力の中古戸建です。"},
{id:"003",published:true,status:"成約済",title:"寝屋川市打上 中古戸建",price:"—",address:"大阪府寝屋川市打上",station:"JR学研都市線 寝屋川公園駅",walk:"徒歩10分",layout:"3LDK",land_area:"100.5㎡",building_area:"89.1㎡",year:"2010年築",image_url:"",description:"成約事例として掲載しているサンプル物件です。"}
];

function esc(v=""){
  return String(v).replace(
    /[&<>'"]/g,
    c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "'":"&#39;",
      '"':"&quot;"
    }[c])
  );
}

function truthy(v){
  return v===true
    || String(v).toLowerCase()==="true"
    || String(v)==="1"
    || String(v).toUpperCase()==="TRUE";
}

function normalizeImageUrl(url = ""){
  const value = String(url).trim();

  if(!value){
    return "";
  }

  const driveFileMatch = value.match(/\/file\/d\/([^/]+)/);

  if(driveFileMatch){
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1200`;
  }

  const driveIdMatch = value.match(/[?&]id=([^&]+)/);

  if(value.includes("drive.google.com") && driveIdMatch){
    return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1200`;
  }

  return value;
}

async function fetchProperties(){
  try{
    const r=await fetch(`${GAS_ENDPOINT}?t=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    const items=Array.isArray(d)?d:d.properties;
    if(!Array.isArray(items))throw new Error("Unexpected response format");
    return items;
  }catch(e){
    console.error(e);
    return sampleProperties;
  }
}

function propertyCard(i){
  const imageUrl = normalizeImageUrl(i.image_url);

  const image = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(i.title)}" loading="lazy">`
    : `<div class="placeholder-house">🏠</div>`;

  const detailUrl=`property.html?id=${encodeURIComponent(i.id||"")}`;
  return `<article class="property-card">
    <a class="property-link" href="${detailUrl}" aria-label="${esc(i.title||"物件詳細")}の詳細を見る">
      <div class="property-image">${image}</div>
      <div class="property-body">
        <div class="property-top"><span class="badge">${esc(i.status||"物件情報")}</span><span class="price">${esc(i.price||"価格未定")}</span></div>
        <h3>${esc(i.title||"物件名未設定")}</h3>
        <p class="meta">📍 ${esc(i.address||"")}<br>🚉 ${esc([i.station,i.walk].filter(Boolean).join(" "))}<br>▣ ${esc(i.layout||"")}<br>⌂ 土地 ${esc(i.land_area||"-")}　建物 ${esc(i.building_area||"-")}<br>▤ ${esc(i.year||"")}</p>
        <p class="description">${esc(i.description||"")}</p>
        <span class="detail-link">詳しく見る →</span>
      </div>
    </a>
  </article>`;
}

function renderPropertyGrid(items){
  const grid=document.getElementById("propertyGrid");
  const status=document.getElementById("propertyStatus");
  if(!grid)return;
  const published=items.filter(i=>truthy(i.published));
  const limit=Number(grid.dataset.limit||0);
  const list=limit>0?published.slice(0,limit):published;
  if(!list.length){
    if(status)status.textContent="現在公開中の物件はありません。";
    grid.innerHTML="";
    return;
  }
  if(status)status.textContent="";
  grid.innerHTML=list.map(propertyCard).join("");
}

function renderPropertyDetail(items){
  const detail=document.getElementById("propertyDetail");
  if(!detail)return;
  const id=new URLSearchParams(location.search).get("id");
  const item=items.find(i=>String(i.id)===String(id)&&truthy(i.published));
  if(!item){
    detail.innerHTML=`<div class="not-found"><h1>物件が見つかりません</h1><p>公開終了、またはURLが変更された可能性があります。</p><a class="btn green" href="properties.html">物件一覧へ戻る</a></div>`;
    return;
  }
  const imageUrl = normalizeImageUrl(item.image_url);

  const image = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(item.title)}">`
    : `<div class="property-detail-placeholder">🏠</div>`;

  document.title=`${item.title}｜ヤモリ不動産`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.setAttribute("content",`${item.title}。${item.address||""} ${item.station||""} ${item.walk||""}。${item.description||""}`);
  detail.innerHTML=`
    <div class="property-detail-head">
      <div class="property-detail-image">${image}</div>
      <div class="property-detail-summary">
        <span class="badge">${esc(item.status||"物件情報")}</span>
        <h1>${esc(item.title||"")}</h1>
        <p class="detail-price">${esc(item.price||"価格未定")}</p>
        <p>${esc(item.description||"")}</p>
        <a class="btn green" href="index.html#contact">この物件について相談する</a>
      </div>
    </div>
    <dl class="property-specs">
      <div><dt>所在地</dt><dd>${esc(item.address||"-")}</dd></div>
      <div><dt>交通</dt><dd>${esc([item.station,item.walk].filter(Boolean).join(" ")||"-")}</dd></div>
      <div><dt>間取り</dt><dd>${esc(item.layout||"-")}</dd></div>
      <div><dt>土地面積</dt><dd>${esc(item.land_area||"-")}</dd></div>
      <div><dt>建物面積</dt><dd>${esc(item.building_area||"-")}</dd></div>
      <div><dt>築年</dt><dd>${esc(item.year||"-")}</dd></div>
    </dl>`;
}

function setupContactForm(){
  const form=document.getElementById("contactForm");
  if(!form)return;
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const name=String(fd.get("name")||"").trim();
    const email=String(fd.get("email")||"").trim();
    const phone=String(fd.get("phone")||"").trim();
    const type=String(fd.get("type")||"").trim();
    const message=String(fd.get("message")||"").trim();
    const subject=`【ヤモリ不動産Web】${type||"お問い合わせ"} - ${name}`;
    const body=[`お名前：${name}`,`メール：${email}`,`電話番号：${phone||"未入力"}`,`ご相談内容：${type||"未選択"}`,"",message].join("\n");
    location.href=`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

async function init(){
  const year=document.getElementById("year");
  if(year)year.textContent=new Date().getFullYear();
  setupContactForm();
  if(document.getElementById("propertyGrid")||document.getElementById("propertyDetail")){
    const items=await fetchProperties();
    renderPropertyGrid(items);
    renderPropertyDetail(items);
  }
}

init();
