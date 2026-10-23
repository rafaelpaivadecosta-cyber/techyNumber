const $ = (id) => document.getElementById(id);
const input = $("numeros");
const output = $("saida");
let currentNumbers = [];
let currentOrder = "";
let toastTimer;

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function readNumbers() {
  const raw = input.value.trim();
  if (!raw) {
    notify("Digite alguns números primeiro.");
    input.focus();
    return null;
  }
  const parts = raw.split(/[\\s,;]+/);
  const values = parts.map(Number);
  if (parts.some((part, i) => part === "" || !Number.isFinite(values[i]))) {
    notify("Confira os números digitados.");
    return null;
  }
  if (values.length > 500) {
    notify("Por segurança, use no máximo 500 números por vez.");
    return null;
  }
  return values;
}

function formatNumber(n) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(n);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function renderStats(values) {
  const sum = values.reduce((acc, n) => acc + n, 0);
  $("statCount").textContent = values.length;
  $("statSum").textContent = formatNumber(sum);
  $("statMean").textContent = formatNumber(sum / values.length);
  $("statMedian").textContent = formatNumber(median(values));
  $("statMin").textContent = formatNumber(Math.min(...values));
  $("statMax").textContent = formatNumber(Math.max(...values));
}

function renderData(values) {
  const view = $("dataView");
  const mode = $("displayMode").value;
  view.replaceChildren();
  if (mode === "cards") {
    const grid = document.createElement("div");
    grid.className = "number-cards";
    values.forEach(n => {
      const card = document.createElement("div");
      card.className = "number-card";
      card.textContent = formatNumber(n);
      grid.appendChild(card);
    });
    view.appendChild(grid);
  } else if (mode === "table") {
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = "<thead><tr><th>Posição</th><th>Valor</th></tr></thead>";
    const tbody = document.createElement("tbody");
    values.forEach((n, i) => {
      const tr = document.createElement("tr");
      const position = document.createElement("td");
      const value = document.createElement("td");
      position.textContent = i + 1;
      value.textContent = formatNumber(n);
      tr.append(position, value);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    view.appendChild(table);
  } else {
    const list = document.createElement("div");
    list.className = "number-list";
    values.forEach(n => {
      const chip = document.createElement("span");
      chip.className = "number-chip";
      chip.textContent = formatNumber(n);
      list.appendChild(chip);
    });
    view.appendChild(list);
  }
}

function drawChart(values) {
  const canvas = $("chart");
  const empty = $("chartEmpty");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  if (!values.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const pad = { left: 42, right: 12, top: 16, bottom: 30 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const y = n => pad.top + (max - n) / range * plotH;

  ctx.font = "11px system-ui";
  ctx.strokeStyle = "#1b4778";
  ctx.fillStyle = "#8eafd9";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yy = pad.top + (plotH * i / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(w - pad.right, yy); ctx.stroke();
    const val = max - range * i / 4;
    ctx.fillText(formatNumber(val), 2, yy + 4);
  }
  const zeroY = y(0);
  const step = plotW / values.length;
  if ($("chartType").value === "line") {
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad.left + step * (i + 0.5);
      if (i === 0) ctx.moveTo(x, y(v)); else ctx.lineTo(x, y(v));
    });
    ctx.strokeStyle = "#00d9ff"; ctx.lineWidth = 2.5; ctx.stroke();
    values.forEach((v, i) => {
      const x = pad.left + step * (i + 0.5);
      ctx.beginPath(); ctx.arc(x, y(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = "#00d9ff"; ctx.fill();
    });
  } else {
    const barW = Math.max(2, Math.min(32, step * 0.66));
    values.forEach((v, i) => {
      const x = pad.left + step * i + (step - barW) / 2;
      const top = Math.min(y(v), zeroY);
      const height = Math.max(2, Math.abs(zeroY - y(v)));
      const gradient = ctx.createLinearGradient(0, top, 0, top + height);
      gradient.addColorStop(0, "#00d9ff");
      gradient.addColorStop(1, "#087cf0");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, top, barW, height);
    });
  }
  ctx.fillStyle = "#8eafd9";
  const labels = Math.min(values.length, 8);
  for (let i = 0; i < labels; i++) {
    const index = labels === 1 ? 0 : Math.round(i * (values.length - 1) / (labels - 1));
    const x = pad.left + step * (index + 0.5);
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), x, h - 8);
  }
}

function renderAll(values) {
  currentNumbers = values;
  renderStats(values);
  renderData(values);
  drawChart(values);
  $("salvar").disabled = false;
  $("sortLabel").textContent = currentOrder;
  output.textContent = values.map(formatNumber).join(", ");
}

function sortNumbers(order) {
  const values = readNumbers();
  if (!values) return;
  values.sort((a, b) => order === "Crescente" ? a - b : b - a);
  currentOrder = order;
  renderAll(values);
}

$("crescente").addEventListener("click", () => sortNumbers("Crescente"));
$("decrescente").addEventListener("click", () => sortNumbers("Decrescente"));
$("chartType").addEventListener("change", () => drawChart(currentNumbers));
$("displayMode").addEventListener("change", () => {
  if (currentNumbers.length) renderData(currentNumbers);
});
window.addEventListener("resize", () => drawChart(currentNumbers));

$("limpar").addEventListener("click", () => {
  input.value = "";
  currentNumbers = [];
  currentOrder = "";
  output.textContent = "Seus números aparecerão aqui.";
  $("sortLabel").textContent = "Aguardando números";
  $("salvar").disabled = true;
  ["statCount", "statSum", "statMean", "statMedian", "statMin", "statMax"].forEach(id => $(id).textContent = "—");
  $("dataView").innerHTML = '<p class="hint">Os dados aparecerão aqui após a ordenação.</p>';
  drawChart([]);
});

$("copiar").addEventListener("click", async () => {
  if (!currentNumbers.length) return notify("Organize os números antes de copiar.");
  try {
    await navigator.clipboard.writeText(currentNumbers.join(", "));
    notify("Resultado copiado!");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = currentNumbers.join(", ");
    document.body.appendChild(temp); temp.select();
    const ok = document.execCommand("copy"); temp.remove();
    notify(ok ? "Resultado copiado!" : "Não foi possível copiar neste navegador.");
  }
});

function getHistory() {
  try { return JSON.parse(localStorage.getItem("techyNumberHistory") || "[]"); }
  catch { return []; }
}
function setHistory(items) {
  try {
    localStorage.setItem("techyNumberHistory", JSON.stringify(items.slice(0, 50)));
    return true;
  } catch {
    notify("O navegador não conseguiu salvar o histórico.");
    return false;
  }
}
function renderHistory() {
  const history = getHistory();
  $("historyCount").textContent = history.length;
  const list = $("historyList");
  list.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Nenhuma pesquisa salva ainda.";
    list.appendChild(empty);
    return;
  }
  history.forEach(item => {
    const card = document.createElement("article");
    card.className = "history-item";
    const top = document.createElement("div"); top.className = "history-top";
    const title = document.createElement("strong"); title.textContent = item.order + " • " + item.values.length + " números";
    const date = document.createElement("span"); date.className = "history-date";
    date.textContent = new Date(item.date).toLocaleString("pt-BR");
    top.append(title, date);
    const values = document.createElement("p"); values.className = "history-values";
    values.textContent = item.values.map(formatNumber).join(", ");
    const actions = document.createElement("div"); actions.className = "history-actions";
    const restore = document.createElement("button"); restore.className = "btn blue"; restore.textContent = "Carregar";
    restore.addEventListener("click", () => {
      input.value = item.original || item.values.join(", ");
      currentOrder = item.order;
      renderAll([...item.values]);
      document.querySelector('[data-tab="organizador"]').click();
      notify("Pesquisa carregada.");
    });
    const copy = document.createElement("button"); copy.className = "btn outline"; copy.textContent = "Copiar";
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(item.values.join(", ")); notify("Histórico copiado!"); }
      catch { notify("Não foi possível copiar."); }
    });
    const remove = document.createElement("button"); remove.className = "btn danger"; remove.textContent = "Excluir";
    remove.addEventListener("click", () => {
      setHistory(getHistory().filter(entry => entry.id !== item.id));
      renderHistory(); notify("Registro excluído.");
    });
    actions.append(restore, copy, remove);
    card.append(top, values, actions);
    list.appendChild(card);
  });
}

$("salvar").addEventListener("click", () => {
  if (!currentNumbers.length) return;
  const history = getHistory();
  history.unshift({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    date: new Date().toISOString(),
    order: currentOrder,
    original: input.value,
    values: currentNumbers
  });
  if (setHistory(history)) {
    renderHistory();
    notify("Pesquisa salva no histórico.");
  }
});

$("limparHistorico").addEventListener("click", () => {
  const history = getHistory();
  if (!history.length) return notify("O histórico já está vazio.");
  if (confirm("Tem certeza que deseja apagar todo o histórico salvo neste navegador?")) {
    localStorage.removeItem("techyNumberHistory");
    renderHistory();
    notify("Histórico apagado.");
  }
});

$("exportar").addEventListener("click", () => {
  const history = getHistory();
  if (!history.length) return notify("Não há histórico para exportar.");
  const rows = [["Data", "Ordem", "Quantidade", "Números"]];
  history.forEach(item => rows.push([
    new Date(item.date).toLocaleString("pt-BR"), item.order, item.values.length, item.values.join(" ")
  ]));
  const csv = rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "techyNumber-historico.csv"; a.click();
  URL.revokeObjectURL(url);
  notify("Arquivo CSV exportado.");
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === tab.dataset.tab));
    if (tab.dataset.tab === "historico") renderHistory();
    else requestAnimationFrame(() => drawChart(currentNumbers));
  });
});

renderHistory();
drawChart([]);
