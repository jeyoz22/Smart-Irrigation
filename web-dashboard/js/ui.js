let currentTab = 'overview';
let currentMoreSubTab = 'alerts';

// Logika Kendali Irigasi
let modePompa = 'AUTO';
let globalThreshold = 30; // Nilai default ambang batas bawah (%)

let overviewChart = null; 
let historyChart = null; 

function setTab(tabName) {
  currentTab = tabName;
  const tabs = ['overview', 'control', 'more'];

  tabs.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const navD = document.getElementById(`nav-desktop-${t}`);
    const navM = document.getElementById(`nav-mobile-${t}`);

    if (t === tabName) {
      if (sec) sec.classList.remove('hidden');
      if (navD) navD.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-[#16A34A] shadow-sm";
      if (navM) navM.className = "flex flex-col items-center gap-1 p-1 text-[#16A34A]";
    } else {
      if (sec) sec.classList.add('hidden');
      if (navD) navD.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-[#64748B] hover:text-[#1E293B]";
      if (navM) navM.className = "flex flex-col items-center gap-1 p-1 text-[#64748B]";
    }
  });

  if (tabName === 'overview') {
    setTimeout(renderOverviewChart, 100); 
  }
}

// ... (fungsi navigasi tetap sama)

function renderOverviewChart() {
  const chartContainer = document.querySelector("#overviewMoistureApexChart");
  if (!chartContainer || overviewChart !== null) return;

  const options = {
    series: [{ name: 'Kelembaban (%)', data: [0, 0, 0, 0, 0, 0, 0] }],
    chart: {
      type: 'area', height: 260, toolbar: { show: false }, 
      fontFamily: 'Outfit, sans-serif', // Font diubah ke Outfit
      animations: { enabled: true, easing: 'easeinout', dynamicAnimation: { speed: 800 } }
    },
    colors: ['#0D9488'], // Warna Teal Organik
    dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } },
    xaxis: { categories: ['--', '--', '--', '--', '--', '--', '--'], labels: { style: { colors: '#78716C', fontSize: '11px', fontWeight: 600, fontFamily: 'Fira Code' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#78716C', fontSize: '11px', fontWeight: 600, fontFamily: 'Fira Code' } } },
    grid: { borderColor: '#F5F5F4', strokeDashArray: 4 }
  };
  overviewChart = new ApexCharts(chartContainer, options);
  overviewChart.render();
}

function setMoreSubTab(subTab) {
  currentMoreSubTab = subTab;
  const subTabs = ['alerts', 'history', 'system'];

  subTabs.forEach(s => {
    const sec = document.getElementById(`more-subtab-${s}`);
    const btn = document.getElementById(`subnav-${s}`);
    if (s === subTab) {
      if (sec) sec.classList.remove('hidden');
      if (btn) btn.className = "flex-1 py-2 text-xs font-bold transition-all rounded-lg text-[#16A34A] bg-[#F1F5F9]";
      if (subTab === 'history') setTimeout(renderHistoryChart, 100);
    } else {
      if (sec) sec.classList.add('hidden');
      if (btn) btn.className = "flex-1 py-2 text-xs font-bold transition-all rounded-lg text-[#64748B] hover:text-[#1E293B]";
    }
  });
}

function renderHistoryChart() {
  const chartContainer = document.querySelector("#historyMoistureApexChart");
  if (!chartContainer || historyChart !== null) return;
  const options = {
    series: [{ name: 'Kelembaban (%)', data: [0, 0, 0, 0, 0, 0, 0, 0] }],
    chart: { type: 'area', height: 280, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } } },
    colors: ['#0284C7'], dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: { categories: ['--', '--', '--', '--', '--', '--', '--', '--'], labels: { style: { colors: '#94A3B8', fontSize: '10px', fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#94A3B8', fontSize: '10px', fontWeight: 600 } } },
    grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
  };
  historyChart = new ApexCharts(chartContainer, options);
  historyChart.render();
}

function toggleModePompa() {
  modePompa = modePompa === 'AUTO' ? 'MANUAL' : 'AUTO';
  document.getElementById('text-mode-pompa').innerText = modePompa;
  document.getElementById('val-mode-overview').innerText = modePompa;
  let currStatus = document.getElementById('status-pompa-kontrol').innerText;
  if (typeof kirimPerintahMQTT === 'function') kirimPerintahMQTT("pompa", modePompa, currStatus, globalThreshold);
}

function togglePowerPompa() {
  if (modePompa === 'AUTO') { alert("Ubah ke mode MANUAL terlebih dahulu!"); return; }
  let currStatus = document.getElementById('status-pompa-kontrol').innerText;
  let newStatus = currStatus === 'ON' ? 'OFF' : 'ON';
  if (typeof kirimPerintahMQTT === 'function') kirimPerintahMQTT("pompa", "MANUAL", newStatus, globalThreshold);
}

function simpanThreshold() {
  const inputVal = document.getElementById('input-threshold').value;
  if(inputVal && inputVal >= 0 && inputVal <= 100) {
    globalThreshold = parseInt(inputVal);
    document.getElementById('val-threshold-overview').innerText = globalThreshold + "%";
    alert("Threshold berhasil diperbarui ke: " + globalThreshold + "%");
    // Transmisikan ke ESP32 agar siklus kontrol lokal diperbarui
    let currStatus = document.getElementById('status-pompa-kontrol').innerText;
    if (typeof kirimPerintahMQTT === 'function') kirimPerintahMQTT("pompa", modePompa, currStatus, globalThreshold);
  } else {
    alert("Masukkan persentase kelembaban yang valid (0-100)!");
  }
}