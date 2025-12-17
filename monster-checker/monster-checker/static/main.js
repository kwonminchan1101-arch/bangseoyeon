let chart;

function monsterLevel(score){
  if (score >= 80) return "위험";
  if (score >= 50) return "주의";
  if (score >= 20) return "양호";
  return "안정";
}

function monsterMessage(score) {
  if (score >= 80) return "위험 신호가 많다. (과정 기록·검증·휴식 구조 점검 필요)";
  if (score >= 50) return "주의가 필요하다. (검증/기록의 균형을 확인)";
  if (score >= 20) return "큰 위험 신호는 적다. 다만 과정 기록을 더 명확히 하면 좋다.";
  return "상대적으로 안정적이다.";
}

const sampleText =
`12/3 실험 1회 진행. 결과가 기대와 달라 일부 데이터는 제외했다.
추가 실험은 아직 못 했다. 마감이 다가와 압박이 크다.
유의미했다고 판단했다. 재현 실험은 다음에 진행 예정이다.`;

document.getElementById("fillSample").addEventListener("click", () => {
  document.getElementById("input").value = sampleText;
});

document.getElementById("run").addEventListener("click", async () => {
  const text = document.getElementById("input").value;

  const res = await fetch("/analyze", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  // Monster Index
  const score = data.monster_index;
  document.getElementById("monsterIndex").textContent = score;
  document.getElementById("monsterLevel").textContent = monsterLevel(score);
  document.getElementById("monsterHint").textContent = monsterMessage(score);

  // Gauge
  document.getElementById("gaugeBar").style.width = `${score}%`;

  // Mini stats
  document.getElementById("statSentences").textContent = data.stats.sentences;
  document.getElementById("statWords").textContent = data.stats.words;
  document.getElementById("statVerify").textContent = data.stats.verification_count;

  // Flags
  const flags = document.getElementById("flags");
  flags.innerHTML = "";

  const ethicsHits = data.ethics_hits;
  for (const [label, info] of Object.entries(ethicsHits)) {
    const div = document.createElement("div");
    div.className = "flag";
    div.innerHTML = `<b>${label}</b>
      <div>${info.count}회 <span class="small">${info.keywords.length ? " (" + info.keywords.join(", ") + ")" : ""}</span></div>`;
    flags.appendChild(div);
  }

  const burn = document.createElement("div");
  burn.className = "flag";
  burn.innerHTML = `<b>연구자 소진 신호</b>
    <div>${data.burnout.count}회 <span class="small">${data.burnout.keywords.length ? " (" + data.burnout.keywords.join(", ") + ")" : ""}</span></div>`;
  flags.appendChild(burn);

  // Top words
  const ol = document.getElementById("topWords");
  ol.innerHTML = "";
  data.top_words.forEach(([w, c]) => {
    const li = document.createElement("li");
    li.textContent = `${w} (${c})`;
    ol.appendChild(li);
  });

  // Chart
  const ctx = document.getElementById("chart");
  const ethicsTotal = Object.values(ethicsHits).reduce((a, x) => a + x.count, 0);
  const values = [
    ethicsTotal,
    data.burnout.count,
    Math.max(0, 5 - data.stats.verification_count)
  ];
  const labels = ["윤리 위험 키워드", "소진 키워드", "검증 부족(예시)"];

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "신호 강도", data: values }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
});

