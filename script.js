let healthData = JSON.parse(localStorage.getItem("healthData")) || [];

let myChart;
let activeMetric = "weight";

/* DATE */

const now = new Date();

document.getElementById("headerDate").textContent =
  now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

document.getElementById("dateInput").valueAsDate = now;

/* TOAST */

function showToast(message) {
  const toast = document.getElementById("toast");

  document.getElementById("toastMsg").textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* UPDATE STATS */

function updateStats() {

  if (healthData.length === 0) {
    document.getElementById("statWeight").textContent = "—";
    document.getElementById("statSteps").textContent = "—";
    document.getElementById("statWater").textContent = "—";
    return;
  }

  const latest = [...healthData].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];

  document.getElementById("statWeight").textContent =
    latest.weight;

  document.getElementById("statSteps").textContent =
    latest.steps.toLocaleString();

  document.getElementById("statWater").textContent =
    latest.water.toLocaleString();

  document.getElementById("historyCount").textContent =
    `${healthData.length} entries`;
}

/* CHART */

function initChart() {

  const ctx = document
    .getElementById("healthChart")
    .getContext("2d");

  myChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: [],
      datasets: [{
        label: "Health",
        data: [],
        borderWidth: 2,
        tension: 0.4
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  updateChart();
}

function updateChart() {

  const sorted = [...healthData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  myChart.data.labels = sorted.map(item => item.date);

  myChart.data.datasets[0].data =
    sorted.map(item => item[activeMetric]);

  myChart.update();
}

function switchChart(metric, btn) {

  activeMetric = metric;

  document.querySelectorAll(".tab")
    .forEach(tab => tab.classList.remove("active"));

  btn.classList.add("active");

  updateChart();
}

/* HISTORY */

function updateHistory() {

  const wrap = document.getElementById("historyWrap");

  if (healthData.length === 0) {

    wrap.innerHTML = `
      <div class="empty-state">
        No entries yet.
      </div>
    `;

    return;
  }

  const sorted = [...healthData].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  wrap.innerHTML = `
    <table>

      <thead>
        <tr>
          <th>Date</th>
          <th>Weight</th>
          <th>Steps</th>
          <th>Water</th>
          <th>Delete</th>
        </tr>
      </thead>

      <tbody>

        ${sorted.map(entry => `
          <tr>

            <td>${entry.date}</td>

            <td>${entry.weight}</td>

            <td>${entry.steps}</td>

            <td>${entry.water}</td>

            <td>
              <button
                class="del-btn"
                onclick="deleteEntry('${entry.date}')"
              >
                ✕
              </button>
            </td>

          </tr>
        `).join("")}

      </tbody>

    </table>
  `;
}

/* DELETE */

function deleteEntry(date) {

  healthData = healthData.filter(
    item => item.date !== date
  );

  localStorage.setItem(
    "healthData",
    JSON.stringify(healthData)
  );

  updateAll();

  showToast("Entry deleted");
}

/* CLEAR */

function clearData() {

  if (!confirm("Delete all data?")) return;

  healthData = [];

  localStorage.removeItem("healthData");

  updateAll();

  showToast("All data cleared");
}

/* UPDATE ALL */

function updateAll() {

  updateStats();
  updateChart();
  updateHistory();
}

/* FORM SUBMIT */

document
  .getElementById("healthForm")
  .addEventListener("submit", function (e) {

    e.preventDefault();

    const entry = {

      date:
        document.getElementById("dateInput").value,

      weight:
        parseFloat(
          document.getElementById("weightInput").value
        ),

      steps:
        parseInt(
          document.getElementById("stepsInput").value
        ),

      water:
        parseInt(
          document.getElementById("waterInput").value
        )
    };

    const existingIndex = healthData.findIndex(
      item => item.date === entry.date
    );

    if (existingIndex > -1) {
      healthData[existingIndex] = entry;
    } else {
      healthData.push(entry);
    }

    localStorage.setItem(
      "healthData",
      JSON.stringify(healthData)
    );

    updateAll();

    this.reset();

    document.getElementById("dateInput").valueAsDate =
      new Date();

    showToast("Entry saved!");
  });

/* START */

initChart();
updateAll();