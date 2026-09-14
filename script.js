const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbx_jhrORToigZakIlBxbKX7EuBJOtBL2MDBXNmh5DapORvBSt7kZQK0QtxjswqjBdH9/exec";
const CONTACT_EMAIL = "info@yamori-estate.jp";
const PROPERTY_CACHE_KEY = "yamori-properties-v1";

const sampleProperties = [
{id:"1",published:true,status:"販売中",title:"交野市郡津 中古戸建",price:"1,680万円",address:"大阪府交野市郡津",station:"京阪交野線 郡津駅",walk:"徒歩8分",layout:"4LDK",land_area:"95.2㎡",building_area:"88.4㎡",year:"2002年築",image_url:"",description:"落ち着いた住宅街にある、家族で暮らしやすい中古戸建です。"},
{id:"2",published:true,status:"販売中",title:"枚方市藤阪 中古戸建",price:"2,480万円",address:"大阪府枚方市藤阪",station:"JR学研都市線 藤阪駅",walk:"徒歩12分",layout:"4LDK",land_area:"120.1㎡",building_area:"102.6㎡",year:"2015年築",image_url:"",description:"ゆとりある敷地と明るい室内が魅力の中古戸建です。"},
{id:"3",published:true,status:"成約済",title:"寝屋川市打上 中古戸建",price:"—",address:"大阪府寝屋川市打上",station:"JR学研都市線 寝屋川公園駅",walk:"徒歩10分",layout:"3LDK",land_area:"100.5㎡",building_area:"89.1㎡",year:"2010年築",image_url:"",description:"成約事例として掲載しているサンプル物件です。"}
];

function esc(v=""){
  return String(v).replace(
    /[&<>'"]/g,
    c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])
  );
}

function truthy(v){
  return v===true
    || String(v).toLowerCase()==="true"
    || String(v)==="1"
    || String(v).toUpperCase()==="TRUE";
}

function normalizePropertyId(value){
  const raw=String(value??"").trim();
  if(!raw)return "";
  return /^\d+$/.test(raw) ? String(Number(raw)) : raw;
}

function normalizeImageUrl(url = ""){
  const value = String(url).trim();
  if(!value)return "";

  const driveFileMatch = value.match(/\/file\/d\/([^/]+)/);
  if(driveFileMatch){
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  const driveIdMatch = value.match(/[?&]id=([^&]+)/);
  if(value.includes("drive.google.com") && driveIdMatch){
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  return value;
}

function getPropertyImages(item){
  const images = Array.isArray(item.images)
    ? item.images
        .map((entry, index) => ({
          url: normalizeImageUrl(entry.image_url || entry.url || ""),
          type: String(entry.image_type || "photo").trim(),
          caption: String(entry.caption || "").trim(),
          sort: Number(entry.sort_order || index + 1)
        }))
        .filter(entry => entry.url)
        .sort((a, b) => a.sort - b.sort)
        .slice(0, 25)
    : [];

  if(images.length)return images;

  const fallback = normalizeImageUrl(item.image_url);
  return fallback ? [{url:fallback,type:"photo",caption:"",sort:1}] : [];
}

function readPropertyCache(){
  try{
    const raw=localStorage.getItem(PROPERTY_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed?.properties) ? parsed.properties : null;
  }catch(e){
    return null;
  }
}

function writePropertyCache(items){
  try{
    localStorage.setItem(PROPERTY_CACHE_KEY,JSON.stringify({savedAt:Date.now(),properties:items}));
  }catch(e){}
}

async function fetchPropertiesOnce(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(`${GAS_ENDPOINT}?t=${Date.now()}`,{
      cache:"no-store",
      signal:controller.signal
    });
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    const items=Array.isArray(d)?d:d.properties;
    if(!Array.isArray(items))throw new Error("Unexpected response format");
    return items;
  }finally{
    clearTimeout(timer);
  }
}

async function fetchProperties(){
  const cached=readPropertyCache();
  try{
    const items=await fetchPropertiesOnce();
    writePropertyCache(items);
    return items;
  }catch(firstError){
    console.warn("Property fetch failed once; retrying.",firstError);
    try{
      await new Promise(resolve=>setTimeout(resolve,500));
      const items=await fetchPropertiesOnce();
      writePropertyCache(items);
      return items;
    }catch(secondError){
      console.error("Property fetch failed twice.",secondError);
      if(cached?.length)return cached;
      return sampleProperties;
    }
  }
}

function propertyCard(i){
  const images = getPropertyImages(i);
  const imageUrl = images[0]?.url || "";
  const image = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(i.title)}" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="placeholder-house">🏠</div>`;

  const detailUrl=`property.html?id=${encodeURIComponent(normalizePropertyId(i.id))}`;
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

function galleryMarkup(item){
  const images = getPropertyImages(item);
  if(!images.length)return `<div class="property-detail-placeholder">🏠</div>`;

  const main = images[0];
  const thumbs = images.map((entry, index) => `
    <button class="gallery-thumb${index===0?" active":""}" type="button" data-gallery-index="${index}" aria-label="画像${index+1}を表示">
      <img src="${esc(entry.url)}" alt="${esc(entry.caption || `${item.title} 画像${index+1}`)}" loading="lazy" referrerpolicy="no-referrer">
      ${entry.type === "floorplan" ? `<span class="gallery-type">間取り</span>` : ""}
    </button>`).join("");

  return `
    <div class="property-gallery" data-gallery>
      <button class="gallery-main" type="button" data-gallery-open="0" aria-label="画像を拡大表示">
        <img src="${esc(main.url)}" alt="${esc(main.caption || item.title)}" data-gallery-main referrerpolicy="no-referrer">
      </button>
      ${images.length > 1 ? `<div class="gallery-thumbs">${thumbs}</div>` : ""}
    </div>`;
}

function renderPropertyDetail(items){
  const detail=document.getElementById("propertyDetail");
  if(!detail)return;
  const id=normalizePropertyId(new URLSearchParams(location.search).get("id"));
  const item=items.find(i=>normalizePropertyId(i.id)===id&&truthy(i.published));
  if(!item){
    detail.innerHTML=`<div class="not-found"><h1>物件が見つかりません</h1><p>公開終了、またはURLが変更された可能性があります。</p><a class="btn green" href="properties.html">物件一覧へ戻る</a></div>`;
    return;
  }

  document.title=`${item.title}｜ヤモリ不動産`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.setAttribute("content",`${item.title}。${item.address||""} ${item.station||""} ${item.walk||""}。${item.description||""}`);
  detail.innerHTML=`
    <div class="property-detail-head">
      <div class="property-detail-image">${galleryMarkup(item)}</div>
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
    </dl>
    <div class="gallery-lightbox" data-lightbox hidden>
      <button class="lightbox-close" type="button" aria-label="閉じる">×</button>
      <button class="lightbox-prev" type="button" aria-label="前の画像">‹</button>
      <figure><img src="" alt="" data-lightbox-image><figcaption data-lightbox-caption></figcaption></figure>
      <button class="lightbox-next" type="button" aria-label="次の画像">›</button>
    </div>`;

  setupGallery(item);
}

function setupGallery(item){
  const gallery=document.querySelector("[data-gallery]");
  if(!gallery)return;
  const images=getPropertyImages(item);
  if(!images.length)return;

  const main=gallery.querySelector("[data-gallery-main]");
  const mainButton=gallery.querySelector("[data-gallery-open]");
  const thumbs=[...gallery.querySelectorAll("[data-gallery-index]")];
  const lightbox=document.querySelector("[data-lightbox]");
  const lightboxImage=lightbox?.querySelector("[data-lightbox-image]");
  const lightboxCaption=lightbox?.querySelector("[data-lightbox-caption]");
  let currentIndex=0;

  const setCurrent=index=>{
    currentIndex=(index+images.length)%images.length;
    const entry=images[currentIndex];
    if(main){main.src=entry.url;main.alt=entry.caption || `${item.title} 画像${currentIndex+1}`;}
    if(mainButton)mainButton.dataset.galleryOpen=String(currentIndex);
    thumbs.forEach((thumb,i)=>thumb.classList.toggle("active",i===currentIndex));
  };

  const openLightbox=index=>{
    if(!lightbox||!lightboxImage)return;
    currentIndex=(index+images.length)%images.length;
    const entry=images[currentIndex];
    lightboxImage.src=entry.url;
    lightboxImage.alt=entry.caption || `${item.title} 画像${currentIndex+1}`;
    if(lightboxCaption)lightboxCaption.textContent=entry.caption || `${currentIndex+1} / ${images.length}`;
    lightbox.hidden=false;
    document.body.classList.add("lightbox-open");
  };

  const closeLightbox=()=>{
    if(!lightbox)return;
    lightbox.hidden=true;
    document.body.classList.remove("lightbox-open");
  };

  thumbs.forEach(thumb=>thumb.addEventListener("click",()=>setCurrent(Number(thumb.dataset.galleryIndex||0))));
  mainButton?.addEventListener("click",()=>openLightbox(Number(mainButton.dataset.galleryOpen||0)));
  lightbox?.querySelector(".lightbox-close")?.addEventListener("click",closeLightbox);
  lightbox?.querySelector(".lightbox-prev")?.addEventListener("click",()=>openLightbox(currentIndex-1));
  lightbox?.querySelector(".lightbox-next")?.addEventListener("click",()=>openLightbox(currentIndex+1));
  lightbox?.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox();});

  document.addEventListener("keydown",e=>{
    if(!lightbox||lightbox.hidden)return;
    if(e.key==="Escape")closeLightbox();
    if(e.key==="ArrowLeft")openLightbox(currentIndex-1);
    if(e.key==="ArrowRight")openLightbox(currentIndex+1);
  });
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
