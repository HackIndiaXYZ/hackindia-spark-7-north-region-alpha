/**
 * DIPDoc SHAP Chart
 * Horizontal bar chart showing feature contributions for detected deviations.
 * Uses Chart.js with the Muted Jewel Tone palette.
 */
const SHAPChart = (() => {
  let chart = null;
  let chartCtx = null;

  // ── Feature Definitions ────────────────────────────────
  const featureLabels = [
    'Cough detected',
    'Breath gas level',
    'Voice strain',
    'Hydration drop',
    'Impedance shift',
    'Mic amplitude'
  ];

  // ── SHAP Value Generators per Status ───────────────────
  const shapProfiles = {
    Normal: () => [2, 3, 1, 2, 1, 1],
    Warning: () => [
      randomBetween(8, 18),
      randomBetween(12, 22),
      randomBetween(5, 15),
      randomBetween(8, 16),
      randomBetween(3, 10),
      randomBetween(2, 8)
    ],
    Critical: () => [
      randomBetween(25, 40),
      randomBetween(18, 30),
      randomBetween(12, 25),
      randomBetween(10, 20),
      randomBetween(5, 15),
      randomBetween(3, 10)
    ]
  };

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function init() {
    chartCtx = document.getElementById('shap-chart');
    if (!chartCtx) return;

    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.font.size = 14;
    Chart.defaults.color = '#A8B2C1';

    chart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: featureLabels,
        datasets: [{
          label: 'Contribution %',
          data: shapProfiles.Normal(),
          backgroundColor: [
            'rgba(231, 76, 60, 0.75)',
            'rgba(243, 156, 18, 0.75)',
            'rgba(155, 89, 182, 0.75)',
            'rgba(52, 152, 219, 0.75)',
            'rgba(46, 204, 113, 0.75)',
            'rgba(149, 165, 166, 0.75)'
          ],
          borderColor: [
            'rgba(231, 76, 60, 1)',
            'rgba(243, 156, 18, 1)',
            'rgba(155, 89, 182, 1)',
            'rgba(52, 152, 219, 1)',
            'rgba(46, 204, 113, 1)',
            'rgba(149, 165, 166, 1)'
          ],
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131A2E',
            titleColor: '#F0F0F5',
            bodyColor: '#A8B2C1',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { weight: '600', size: 14 },
            callbacks: {
              label: (ctx) => `+${ctx.raw}% contribution`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 50,
            grid: {
              color: 'rgba(255,255,255,0.05)',
              drawBorder: false
            },
            ticks: {
              callback: (val) => val + '%',
              font: { size: 13 }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { size: 14, weight: '500' },
              color: '#F0F0F5'
            }
          }
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  function update(status, data) {
    if (!chart) return;

    const profile = shapProfiles[status] || shapProfiles.Normal;
    let values = profile();

    // If we have real event data, adjust SHAP values
    if (data && data.events) {
      if (data.events.coughDetected) values[0] = Math.max(values[0], 30);
      if (data.events.voiceStrain)   values[2] = Math.max(values[2], 20);
      if (data.events.lowHydration)  values[3] = Math.max(values[3], 18);
    }

    // Sort by contribution (descending)
    const indexed = values.map((v, i) => ({ label: featureLabels[i], value: v, colorIdx: i }));
    indexed.sort((a, b) => b.value - a.value);

    const colors = [
      'rgba(231, 76, 60, 0.75)',
      'rgba(243, 156, 18, 0.75)',
      'rgba(155, 89, 182, 0.75)',
      'rgba(52, 152, 219, 0.75)',
      'rgba(46, 204, 113, 0.75)',
      'rgba(149, 165, 166, 0.75)'
    ];
    const borderColors = [
      'rgba(231, 76, 60, 1)',
      'rgba(243, 156, 18, 1)',
      'rgba(155, 89, 182, 1)',
      'rgba(52, 152, 219, 1)',
      'rgba(46, 204, 113, 1)',
      'rgba(149, 165, 166, 1)'
    ];

    chart.data.labels = indexed.map(i => i.label);
    chart.data.datasets[0].data = indexed.map(i => i.value);
    chart.data.datasets[0].backgroundColor = indexed.map(i => colors[i.colorIdx]);
    chart.data.datasets[0].borderColor = indexed.map(i => borderColors[i.colorIdx]);

    chart.update('active');
  }

  function getValues() {
    return chart ? chart.data.datasets[0].data : [];
  }

  return { init, update, getValues };
})();
