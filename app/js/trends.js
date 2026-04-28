/**
 * DIPDoc Trends
 * 24-hour trend line charts using Chart.js.
 */
const Trends = (() => {
  let hrChart, spo2Chart, bpChart;
  const MAX_POINTS = 60; // ~50 seconds of buffered data at 800ms
  const hrData = [];
  const spo2Data = [];
  const bpSysData = [];
  const bpDiaData = [];
  const labels = [];

  // Weekly summary refs
  let wsAvgHR, wsAvgSPO2, wsAlerts, wsScore;
  let alertCount = 0;
  let hrSum = 0, spo2Sum = 0, totalPoints = 0;

  function init() {
    wsAvgHR = document.getElementById('ws-avg-hr');
    wsAvgSPO2 = document.getElementById('ws-avg-spo2');
    wsAlerts = document.getElementById('ws-alerts');
    wsScore = document.getElementById('ws-score');

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#F3F4F6',
          bodyColor: '#9CA3AF',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10
        }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#6B7280', font: { size: 11 }, maxTicksLimit: 5 }
        }
      },
      elements: {
        point: { radius: 0, hoverRadius: 4 },
        line: { tension: 0.4, borderWidth: 2 }
      }
    };

    // Heart Rate Chart
    const hrCtx = document.getElementById('trend-hr-chart');
    if (hrCtx) {
      hrChart = new Chart(hrCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#FB7185',
            backgroundColor: 'rgba(251, 113, 133, 0.1)',
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 40, max: 160 } }
        }
      });
    }

    // SpO2 Chart
    const spo2Ctx = document.getElementById('trend-spo2-chart');
    if (spo2Ctx) {
      spo2Chart = new Chart(spo2Ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#38BDF8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 80, max: 100 } }
        }
      });
    }

    // BP Chart
    const bpCtx = document.getElementById('trend-bp-chart');
    if (bpCtx) {
      bpChart = new Chart(bpCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Systolic',
              data: [],
              borderColor: '#A78BFA',
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              fill: true
            },
            {
              label: 'Diastolic',
              data: [],
              borderColor: 'rgba(167, 139, 250, 0.5)',
              backgroundColor: 'rgba(167, 139, 250, 0.05)',
              fill: true
            }
          ]
        },
        options: {
          ...commonOptions,
          scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 50, max: 200 } },
          plugins: {
            ...commonOptions.plugins,
            legend: { display: true, labels: { color: '#9CA3AF', font: { size: 11 }, boxWidth: 12 } }
          }
        }
      });
    }
  }

  function update(data) {
    if (!data || !data.sensors) return;
    const s = data.sensors;

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    labels.push(now);
    hrData.push(s.heartRate);
    spo2Data.push(s.spo2);
    bpSysData.push(s.bpSystolic);
    bpDiaData.push(s.bpDiastolic);

    // Rolling window
    if (labels.length > MAX_POINTS) {
      labels.shift();
      hrData.shift();
      spo2Data.shift();
      bpSysData.shift();
      bpDiaData.shift();
    }

    // Update charts
    if (hrChart) {
      hrChart.data.labels = [...labels];
      hrChart.data.datasets[0].data = [...hrData];
      hrChart.update('none');
    }
    if (spo2Chart) {
      spo2Chart.data.labels = [...labels];
      spo2Chart.data.datasets[0].data = [...spo2Data];
      spo2Chart.update('none');
    }
    if (bpChart) {
      bpChart.data.labels = [...labels];
      bpChart.data.datasets[0].data = [...bpSysData];
      bpChart.data.datasets[1].data = [...bpDiaData];
      bpChart.update('none');
    }

    // Weekly summary stats (running average)
    totalPoints++;
    hrSum += s.heartRate;
    spo2Sum += s.spo2;
    if (data.localStatus === 'Critical' || data.localStatus === 'Warning') alertCount++;

    if (wsAvgHR) wsAvgHR.textContent = Math.round(hrSum / totalPoints);
    if (wsAvgSPO2) wsAvgSPO2.textContent = Math.round(spo2Sum / totalPoints);
    if (wsAlerts) wsAlerts.textContent = alertCount;
    if (wsScore) wsScore.textContent = Math.round(100 - data.deviationScore);
  }

  return { init, update };
})();
