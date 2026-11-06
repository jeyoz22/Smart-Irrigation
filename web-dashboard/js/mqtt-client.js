// ==========================================
// KONFIGURASI MQTT BROKER (HIVEMQ CLOUD)
// ==========================================
const broker = "4642497a451f4388a32e286617d1630e.s1.eu.hivemq.cloud";
const port = 8884;
const clientId = "WebIrigasi-" + Math.floor(Math.random() * 100000);

const topicSensor = "irigasi/telemetri";
const topicKontrol = "irigasi/kontrol";

const mqttUser = "admin_plts"; // Kredensial dipertahankan
const mqttPass = "Plts12345!"; 

const client = new Paho.MQTT.Client(broker, port, "/mqtt", clientId);

let chartDataMoisture = [];
let chartCategories = [];
const maxDataPoints = 15;

// State untuk evaluasi Dynamic Alerts
let globalMoisture = 0;

function updateTextElements(ids, text) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  });
}

// LOGIKA DYNAMIC ALERTS (FOKUS KELEMBABAN TANAH DENGAN TEMA ALAM)
function evaluateAlerts() {
  const container = document.getElementById('alerts-container');
  const badgeHeader = document.getElementById('alert-badge-count');
  const badgeMore = document.getElementById('more-badge-count');
  if(!container) return;

  let alertsHTML = '';
  let count = 0;

  // 1. Kritis Kering (Kelembaban sangat rendah) - Merah Meredam
  if (globalMoisture <= 15) {
    count++;
    alertsHTML += `
      <div class="rounded-2xl p-4 flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] shadow-sm">
        <div class="w-8 h-8 rounded-full bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>
        <div class="flex-1 min-w-0 pt-1">
          <p class="text-sm font-bold text-[#292524]">Kritis: Kondisi Lahan Kering</p>
          <p class="text-xs text-[#78716C] mt-1">Kelembaban &le; 15% · Pompa dipaksa aktif</p>
        </div>
      </div>`;
  }
  
  // 2. Tanah Jenuh/Banjir (Kelembaban terlalu tinggi) - Amber/Kuning
  if (globalMoisture >= 90) {
    count++;
    alertsHTML += `
      <div class="rounded-2xl p-4 flex items-start gap-3 bg-[#FFFBEB] border border-[#FDE68A] shadow-sm">
        <div class="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0"><i data-lucide="droplets" class="w-4 h-4"></i></div>
        <div class="flex-1 min-w-0 pt-1">
          <p class="text-sm font-bold text-[#292524]">Peringatan: Tanah Terlalu Jenuh</p>
          <p class="text-xs text-[#78716C] mt-1">Kelembaban &ge; 90% · Resiko genangan air berlebih</p>
        </div>
      </div>`;
  }

  if (count === 0) {
    container.innerHTML = `
      <div class="border-2 border-dashed border-[#E7E5E4] p-6 rounded-2xl flex flex-col items-center justify-center text-center mt-2">
        <div class="w-12 h-12 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center mb-3">
          <i data-lucide="shield-check" class="w-6 h-6"></i>
        </div>
        <p class="text-sm font-bold text-[#292524]">Sistem Normal</p>
        <p class="text-[11px] text-[#78716C] mt-1">Kelembaban lahan berada di rentang optimal.</p>
      </div>`;
    if(badgeHeader) badgeHeader.classList.add('hidden');
    if(badgeMore) badgeMore.classList.add('hidden');
  } else {
    container.innerHTML = alertsHTML;
    if(badgeHeader) { badgeHeader.textContent = count; badgeHeader.classList.remove('hidden'); }
    if(badgeMore) { badgeMore.textContent = count; badgeMore.classList.remove('hidden'); }
  }
}

client.onConnectionLost = function (responseObject) {
  if (responseObject.errorCode !== 0) setTimeout(hubungkanMQTT, 5000);
};

client.onMessageArrived = function (message) {
  try {
    const data = JSON.parse(message.payloadString);
    const banner = document.getElementById('banner-standby');
    if (banner) banner.style.display = 'none';

    // Parsing telemetri irigasi
    if (message.destinationName === topicSensor) {
      
      // Kelembaban Persentase & Raw ADC
      if (data.soil_moisture_pct !== undefined) {
        globalMoisture = data.soil_moisture_pct;
        updateTextElements(['val-moisture'], data.soil_moisture_pct.toFixed(0));
        
        // Update ApexCharts Real-Time
        if (typeof overviewChart !== 'undefined' && overviewChart !== null) {
          const now = new Date();
          const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
          
          chartDataMoisture.push(data.soil_moisture_pct);
          chartCategories.push(timeStr);
          if (chartDataMoisture.length > maxDataPoints) {
            chartDataMoisture.shift(); chartCategories.shift();
          }
          overviewChart.updateSeries([{ data: chartDataMoisture }]);
          overviewChart.updateOptions({ xaxis: { categories: chartCategories } });
        }
      }

      if (data.adc_raw !== undefined) {
        updateTextElements(['val-moisture-raw'], data.adc_raw);
      }

      // Status Relai Pompa Air (Menggunakan warna tema baru)
      if (data.pump_status !== undefined) {
        const statusStr = data.pump_status === 1 ? 'ON' : 'OFF';
        
        // Update label
        updateTextElements(['status-pompa-text', 'status-pompa-kontrol'], statusStr);
        
        // Update warna indikator UI
        const elText = document.getElementById('status-pompa-text');
        const elKontrol = document.getElementById('status-pompa-kontrol');
        const elIndikator = document.getElementById('status-relai-indikator');
        
        if (statusStr === 'ON') {
          if(elText) elText.className = 'text-2xl font-bold text-[#059669] font-mono'; // Emerald 600
          if(elKontrol) elKontrol.className = 'text-xl font-extrabold text-[#059669]'; // Emerald 600
          if(elIndikator) {
            elIndikator.innerText = 'Kontak Tertutup (NC)';
            elIndikator.className = 'inline-block px-3 py-1.5 rounded-lg bg-[#D1FAE5] text-[#059669] text-xs font-bold border border-[#059669]'; // Emerald 100/600
          }
        } else {
          if(elText) elText.className = 'text-2xl font-bold text-[#A8A29E] font-mono'; // Stone 400
          if(elKontrol) elKontrol.className = 'text-xl font-extrabold text-[#A8A29E]'; // Stone 400
          if(elIndikator) {
            elIndikator.innerText = 'Kontak Terbuka (NO)';
            elIndikator.className = 'inline-block px-3 py-1.5 rounded-lg bg-[#F5F5F4] text-[#78716C] text-xs font-bold border border-[#E7E5E4]'; // Stone 100/500/200
          }
        }
      }
      
      evaluateAlerts();
    }
  } catch (err) {}
};

function hubungkanMQTT() {
  client.connect({
    timeout: 10, keepAliveInterval: 60, cleanSession: true, useSSL: true,
    userName: mqttUser, password: mqttPass, 
    onSuccess: function () {
      client.subscribe(topicSensor);
    },
    onFailure: function (error) { setTimeout(hubungkanMQTT, 5000); }
  });
}

function kirimPerintahMQTT(target, mode, status, threshold) {
  if (!client.isConnected()) return;
  const payload = JSON.stringify({ 
    target: target, 
    mode: mode, 
    status: status === 'ON' ? 1 : 0, 
    threshold: threshold,
    timestamp: Date.now() 
  });
  const message = new Paho.MQTT.Message(payload);
  message.destinationName = topicKontrol;
  message.qos = 0;
  client.send(message);
}

hubungkanMQTT();