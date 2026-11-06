async function loadComponent(id, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    document.getElementById(id).innerHTML = html;
  } catch (error) {
    console.error(`Gagal memuat ${url}:`, error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Hanya memuat 3 komponen relevan untuk Irigasi Pintar
  await Promise.all([
    loadComponent('tab-overview-container', 'components/overview.html'),
    loadComponent('tab-control-container', 'components/control.html'),
    loadComponent('tab-more-container', 'components/more.html')
  ]);

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Tampilkan tab pertama (overview) sebagai default
  if (typeof setTab === 'function') {
    setTab('overview');
  }

  // Render grafik SETELAH HTML overview berhasil dimuat
  if (typeof renderOverviewChart === 'function') {
    setTimeout(() => {
      renderOverviewChart();
    }, 100);
  }
});