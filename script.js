const GAS_ENDPOINT = ""; // GASのWebアプリURLをここに貼り付けます

const sampleProperties = [
  {
    id: "001", published: true, status: "販売中", title: "交野市郡津 中古戸建",
    price: "1,680万円", address: "大阪府交野市郡津", station: "京阪交野線 郡津駅",
    walk: "徒歩8分", layout: "4LDK", land_area: "95.2㎡", building_area: "88.4㎡",
    year: "2002年築", image_url: "", description: "落ち着いた住宅街にある、家族で暮らしやすい中古戸建です。"
  },
  {
    id: "002", published: true, status: "販売中", title: "交野市私部 リフォーム済戸建",
    price: "2,180万円", address: "大阪府交野市私部", station: "京阪交野線 交野市駅",
    walk: "徒歩11分", layout: "3LDK", land_area: "82.1㎡", building_area: "79.8㎡",
    year: "1998年築", image_url: "", description: "室内を整えた、すぐに新生活を始めやすい住まいです。"
  },
  {
    id: "003", published: true, status: "商談中", title: "枚方市香里園 山手の中古戸建",
    price: "1,980万円", address: "大阪府枚方市香里園", station: "京阪本線 香里園駅",
    walk: "バス利用", layout: "4LDK", land_area: "112.0㎡", building_area: "92.6㎡",
    year: "2005年築", image_url: "", description: "陽当たりと落ち着いた住環境が魅力の戸建です。"
  }
];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function truthy(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
}

function renderProperties(items, sourceLabel) {
  const grid = document.getElementById("propertyGrid");
  const status = document.getElementById("propertyStatus");
  const published = items.filter(item => truthy(item.published));

  if (!published.length) {
    status.textContent = "現在公開中の物件はありません。";
    grid.innerHTML = "";
    return;
  }

  status.textContent = `${sourceLabel}から ${published.length} 件を表示しています。`;
  grid.innerHTML = published.map(item => {
    const image = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy">`
      : `<div style="height:100%;display:grid;place-items:center;color:#315b43;font-weight:700">YAMORI PROPERTY</div>`;

    const areaParts = [item.layout, item.land_area ? `土地 ${item.land_area}` : "", item.building_area ? `建物 ${item.building_area}` : ""].filter(Boolean);
    const accessParts = [item.station, item.walk].filter(Boolean);

    return `
      <article class="property-card">
        <div class="property-image">${image}</div>
        <div class="property-body">
          <div class="property-top">
            <span class="badge">${escapeHtml(item.status || "物件情報")}</span>
            <span class="price">${escapeHtml(item.price || "価格未定")}</span>
          </div>
          <h3>${escapeHtml(item.title || "物件名未設定")}</h3>
          <p class="meta">${escapeHtml(item.address || "")}<br>${escapeHtml(accessParts.join(" / "))}</p>
          <p class="meta">${escapeHtml(areaParts.join(" / "))}${item.year ? `<br>${escapeHtml(item.year)}` : ""}</p>
          <p class="description">${escapeHtml(item.description || "")}</p>
        </div>
      </article>`;
  }).join("");
}

async function loadProperties() {
  if (!GAS_ENDPOINT) {
    renderProperties(sampleProperties, "サンプルデータ");
    return;
  }

  try {
    const response = await fetch(`${GAS_ENDPOINT}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data) ? data : data.properties;
    if (!Array.isArray(items)) throw new Error("Unexpected response format");
    renderProperties(items, "Googleスプレッドシート");
  } catch (error) {
    console.error(error);
    document.getElementById("propertyStatus").textContent = "スプレッドシートとの接続に失敗したため、サンプル物件を表示しています。";
    renderProperties(sampleProperties, "サンプルデータ");
  }
}

document.getElementById("year").textContent = new Date().getFullYear();
loadProperties();
