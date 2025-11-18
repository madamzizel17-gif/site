// app.js - frontend
const API_BASE = "/api/outages";

const map = L.map('map', {zoomControl:true}).setView([48.4647, 35.0462], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = null;
let currentLocation = null;

function setMarker(lat, lon){
  if (marker) marker.remove();
  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 14);
  currentLocation = { lat, lon };
}

async function fetchOutages(lat, lon){
  const outDiv = document.getElementById("outagesList");
  outDiv.innerHTML = '<div class="outage">⏳ Загрузка данных...</div>';
  
  try {
    const resp = await fetch(`${API_BASE}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: 'Ошибка сервера' }));
      throw new Error(errorData.error || `HTTP error! status: ${resp.status}`);
    }
    
    const data = await resp.json();
    renderOutages(data, outDiv);
    
  } catch (err) {
    console.error('Fetch error:', err);
    outDiv.innerHTML = `<div class="outage error">❌ Ошибка: ${err.message}</div>`;
  }
}

function renderOutages(data, container){
  const list = Array.isArray(data) ? data : [];
  
  if (!list.length){
    container.innerHTML = `
      <div class="outage">
        <strong>✅ Отключений нет</strong>
        <div class="meta">В выбранном районе отключений электроэнергии не запланировано</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  list.forEach(item => {
    const el = document.createElement("div");
    el.className = "outage";
    
    const fromTime = item.from ? formatTime(item.from) : 'Не указано';
    const toTime = item.to ? formatTime(item.to) : 'Не указано';
    
    el.innerHTML = `
      <strong>📍 ${item.street || item.area || 'Район'}</strong>
      <div class="meta">
        <div>🕐 Отключение: <strong>${fromTime}</strong></div>
        <div>🕐 Включение: <strong>${toTime}</strong></div>
      </div>
      <div style="margin-top:8px;color:#475569;font-size:0.9em;">
        ${item.reason || 'Плановые работы'}
      </div>
    `;
    container.appendChild(el);
  });
}

function formatTime(timeStr) {
  return timeStr.replace('2024-01-', '');
}

// Map click event
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  setMarker(lat, lng);
  fetchOutages(lat, lng);
});

// Geolocation
document.getElementById("geoBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Геолокация не поддерживается в этом браузере.");
    return;
  }
  
  const geoBtn = document.getElementById("geoBtn");
  const originalText = geoBtn.textContent;
  geoBtn.textContent = "📍 Определяем...";
  geoBtn.disabled = true;
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setMarker(lat, lon);
      fetchOutages(lat, lon);
      
      geoBtn.textContent = originalText;
      geoBtn.disabled = false;
    }, 
    err => {
      alert("Не удалось получить геолокацию: " + err.message);
      geoBtn.textContent = originalText;
      geoBtn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
});

// Search address
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("addrInput").value.trim();
  if (!query) {
    alert("Пожалуйста, введите адрес для поиска");
    return;
  }

  const searchBtn = document.getElementById("searchBtn");
  const originalText = searchBtn.textContent;
  searchBtn.textContent = "🔍 Поиск...";
  searchBtn.disabled = true;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Днепр, Украина')}&limit=1`);
    const items = await res.json();
    
    if (!items || items.length === 0) {
      alert("Адрес не найден. Попробуйте уточнить запрос.");
      return;
    }
    
    const first = items[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    setMarker(lat, lon);
    fetchOutages(lat, lon);
    
  } catch (e) {
    alert("Ошибка поиска: " + e.message);
  } finally {
    searchBtn.textContent = originalText;
    searchBtn.disabled = false;
  }
});

// Enter key support for search
document.getElementById("addrInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

// Initial load - show Dnipro center outages
window.addEventListener('load', () => {
  setTimeout(() => {
    fetchOutages(48.4647, 35.0462);
  }, 500);
});