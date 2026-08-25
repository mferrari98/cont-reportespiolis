const { createCanvas } = require("canvas");
const echarts = require("echarts");

const fs = require("fs");
const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { CHART_THEME } = require("./chartTheme");

const ID_MOD = "GRAFICOS";

// Register node-canvas for ECharts SSR (modern API).
echarts.setPlatformAPI({ createCanvas });

const DEVICE_PIXEL_RATIO = 3;

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatNumber(value) {
  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 1
  });
}

function formatPercent(value, digits = 1) {
  const numberValue = toNumber(value, null);
  if (numberValue === null) return "";
  return numberValue.toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function lightenColor(hex, factor) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (channel) => Math.round(channel + (255 - channel) * factor);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function getTipoRef(sitio) {
  return ["Toma(Rio)", "Toma(Des.)", "P.Pot"].includes(sitio) ? "Rebalse" : "Max Op";
}

function saveChartPNG(canvas, filePath) {
  const buffer = canvas.toBuffer("image/png");
  return fs.promises.writeFile(filePath, buffer);
}

async function removeChartPNG(filePath) {
  try {
    await fs.promises.rm(filePath, { force: true });
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error limpiando ${filePath}: ${err.message}`);
  }
}

function renderBars(data, width = 1600, height = 500, fontScale = 1) {
  const sitios = Array.isArray(data.sitios) ? data.sitios : [];
  const niveles = Array.isArray(data.niveles) ? data.niveles : [];
  const maxOperativos = Array.isArray(data.maxOperativos) ? data.maxOperativos : [];
  const cubicajes = Array.isArray(data.cubicajes) ? data.cubicajes : [];

  const colorNivel = CHART_THEME.colors.nivel;
  const colorRebalse = CHART_THEME.colors.rebalse;
  const colorTexto = CHART_THEME.colors.texto;

  const fsTitle = Math.round(CHART_THEME.fontSizes.title * fontScale);
  const fsLegend = Math.round(CHART_THEME.fontSizes.legend * fontScale);
  const fsAxis = Math.round(CHART_THEME.fontSizes.axis * fontScale);
  const fsBarLabel = Math.round(CHART_THEME.fontSizes.barLabel * fontScale);
  const gridTop = Math.max(95, fsTitle + fsBarLabel + 45);

  const nivelSeries = sitios.map((sitio, index) => {
    const nivel = toNumber(niveles[index]);
    const maxOp = toNumber(maxOperativos[index]);
    const cubicaje = toNumber(cubicajes[index]);
    const volumenM3 = cubicaje > 0 ? nivel * cubicaje : 0;
    const porcentaje = maxOp > 0 ? Math.min((nivel / maxOp) * 100, 100) : 0;
    const exceeded = maxOp > 0 && nivel > maxOp;

    return {
      value: porcentaje,
      sitio,
      nivel,
      max: maxOp,
      volumenM3,
      itemStyle: {
        color: exceeded ? "#ff6b6b" : colorNivel
      }
    };
  });

  const restanteSeries = sitios.map((_, index) => {
    const nivel = toNumber(niveles[index]);
    const maxOp = toNumber(maxOperativos[index]);
    const porcentaje = maxOp > 0 ? Math.min((nivel / maxOp) * 100, 100) : 0;
    const restante = maxOp > 0 ? Math.max(100 - porcentaje, 0) : 0;

    return {
      value: restante,
      max: maxOp
    };
  });

  const canvas = createCanvas(width, height);
  const chart = echarts.init(canvas, null, { devicePixelRatio: DEVICE_PIXEL_RATIO });

  chart.setOption({
    backgroundColor: "#fff",
    title: {
      text: "Niveles actuales (% del maximo operativo)",
      left: "center",
      top: 10,
      textStyle: {
        fontFamily: "consolas",
        fontSize: fsTitle,
        color: colorTexto
      }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const item = params && params[0] ? params[0].data : null;
        if (!item) return "";
        const tipoRef = getTipoRef(item.sitio);
        const estado = item.max > 0 && item.nivel > item.max ? "EXCEDE" : "Normal";
        const volumen = item.volumenM3 > 0 ? `<br>Volumen: ${formatNumber(item.volumenM3)} m3` : "";
        return `${item.sitio}<br>Nivel: ${item.nivel.toFixed(2)}m<br>${tipoRef}: ${item.max.toFixed(2)}m<br>Porcentaje: ${item.value.toFixed(1)}%${volumen}<br>Estado: ${estado}`;
      }
    },
    legend: {
      bottom: 0,
      data: ["Nivel Actual", "Espacio Disponible"],
      textStyle: {
        fontFamily: "consolas",
        fontSize: fsLegend,
        color: colorTexto
      }
    },
    grid: {
      left: 20,
      right: 10,
      bottom: 35,
      top: gridTop,
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: sitios,
      axisLabel: {
        rotate: 35,
        fontFamily: "consolas",
        fontSize: fsAxis,
        color: colorTexto
      }
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        fontSize: fsAxis,
        color: colorTexto
      }
    },
    series: [
      {
        name: "Nivel Actual",
        type: "bar",
        stack: "total",
        data: nivelSeries,
        label: {
          show: true,
          position: "insideTop",
          offset: [0, 4],
          formatter: (params) => {
            const nivel = params.data?.nivel;
            return Number.isFinite(nivel) ? nivel.toFixed(2) : "";
          },
          fontFamily: "consolas",
          fontSize: fsBarLabel,
          color: colorTexto
        }
      },
      {
        name: "Espacio Disponible",
        type: "bar",
        stack: "total",
        data: restanteSeries,
        label: {
          show: true,
          position: "top",
          formatter: (params) => {
            const maxOp = params.data?.max;
            return Number.isFinite(maxOp) ? maxOp.toFixed(2) : "";
          },
          fontFamily: "consolas",
          fontSize: fsBarLabel,
          color: colorTexto,
          opacity: 1
        },
        itemStyle: {
          color: colorRebalse,
          opacity: CHART_THEME.rebalseOpacity
        }
      }
    ]
  });

  return { chart, canvas };
}

function renderPie(data, width = 500, height = 500) {
  const totals = data?.pieMdy?.totals || {};
  const aguaTotal = toNumber(totals.Agua);
  const vacioTotal = toNumber(totals.Vacio);
  const sites = Array.isArray(data?.pieMdy?.sites) ? data.pieMdy.sites : [];

  const totalGeneral = aguaTotal + vacioTotal;
  if (!totalGeneral) return null;

  const colorNivel = CHART_THEME.colors.nivel;
  const colorRebalse = CHART_THEME.colors.rebalse;
  const colorVacio = CHART_THEME.colors.vacio || lightenColor(colorRebalse, 0.7);
  const colorTexto = CHART_THEME.colors.texto;
  const sunburstFontDelta = -1;

  const siteNodes = sites
    .map((site, index) => {
      const value = toNumber(site?.value);
      if (!value) return null;
      const percentAgua = aguaTotal > 0 ? (value / aguaTotal) * 100 : 0;
      const showLabel = percentAgua > 5;
      const factor = sites.length > 1 ? 0.18 + (index / (sites.length - 1)) * 0.5 : 0.35;
      const node = {
        name: site.name,
        value,
        itemStyle: {
          color: lightenColor(colorNivel, factor),
          opacity: 0.8
        }
      };
      if (!showLabel) {
        node.label = { show: false };
        node.emphasis = { label: { show: false } };
      }
      return node;
    })
    .filter(Boolean);

  const sunburstData = [
    {
      name: "AGUA",
      value: aguaTotal,
      itemStyle: { color: colorNivel },
      children: siteNodes
    },
    {
      name: "VACIO",
      value: vacioTotal,
      itemStyle: { color: colorVacio }
    }
  ].filter((item) => item.value > 0);

  const canvas = createCanvas(width, height);
  const chart = echarts.init(canvas, null, { devicePixelRatio: DEVICE_PIXEL_RATIO });

  chart.setOption({
    backgroundColor: "#fff",
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const value = toNumber(params.value);
        const percent = totalGeneral > 0 ? (value / totalGeneral) * 100 : 0;
        const pathInfo = Array.isArray(params.treePathInfo) ? params.treePathInfo : [];
        const pathNames = pathInfo.map((node) => node.name).filter(Boolean);
        const name = pathNames.length > 1 ? pathNames.slice(1).join(" / ") : params.name;
        const isTotales = params.name === "AGUA" || params.name === "VACIO";
        const percentLabel = isTotales ? formatPercent(percent) : percent.toFixed(0);
        return `${name}: ${formatNumber(value)} m3 (${percentLabel}%)`;
      }
    },
    series: [
      {
        name: "Totales",
        type: "sunburst",
        radius: ["0%", "80%"],
        center: ["50%", "50%"],
        sort: null,
        nodeClick: false,
        data: sunburstData,
        emphasis: {
          focus: "ancestor"
        },
        label: {
          fontFamily: "consolas",
          color: colorTexto
        },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 1
        },
        levels: [
          {
            r0: "0%",
            r: "0%",
            itemStyle: { borderWidth: 0 },
            label: { show: false }
          },
          {
            r0: "28%",
            r: "64%",
            label: {
              rotate: 0,
              fontSize: CHART_THEME.fontSizes.label + sunburstFontDelta,
              lineHeight: CHART_THEME.fontSizes.label + sunburstFontDelta + 4,
              color: colorTexto,
              formatter: (params) => {
                const value = toNumber(params.value);
                const percent = totalGeneral > 0 ? (value / totalGeneral) * 100 : 0;
                return `${formatPercent(percent)}%`;
              }
            }
          },
          {
            r0: "64%",
            r: "100%",
            label: {
              rotate: 0,
              fontSize: CHART_THEME.fontSizes.axis + sunburstFontDelta,
              lineHeight: CHART_THEME.fontSizes.axis + sunburstFontDelta + 4,
              color: colorTexto,
              overflow: "truncate",
              formatter: (params) => {
                const value = toNumber(params.value);
                const percentAgua = aguaTotal > 0 ? (value / aguaTotal) * 100 : 0;
                if (percentAgua <= 5) return "";
                return `${params.name}\n${percentAgua.toFixed(0)}%`;
              }
            }
          }
        ]
      },
      {
        name: "Total",
        type: "pie",
        radius: ["0%", "22.5%"],
        center: ["50%", "50%"],
        silent: false,
        data: [
          {
            name: "TOTAL",
            value: totalGeneral
          }
        ],
        label: {
          show: true,
          position: "center",
          fontFamily: "consolas",
          fontSize: CHART_THEME.fontSizes.label + sunburstFontDelta,
          fontWeight: "bold",
          color: colorTexto,
          formatter: "TOTAL"
        },
        itemStyle: {
          color: "#fff",
          borderColor: "#fff",
          borderWidth: 1
        },
        tooltip: {
          formatter: () => `TOTAL: ${formatNumber(totalGeneral)} m3`
        }
      }
    ]
  });

  return { chart, canvas };
}

function buildLineChartLayout() {
  const titleTop = 10;
  const titleHeight = Math.ceil(CHART_THEME.fontSizes.title * 1.55);
  const legendTop = titleTop + titleHeight + 16;
  const legendHeight = Math.ceil(CHART_THEME.fontSizes.legend * 1.75);
  const gridTop = legendTop + legendHeight + 28;

  return {
    titleTop,
    titleHeight,
    legendTop,
    legendHeight,
    gridTop
  };
}

function renderLines(data, width = 1200, height = 480) {
  const seriesData = Array.isArray(data.lineSeries) ? data.lineSeries : [];
  if (!seriesData.length) return null;

  // Compute bounds
  let min = null;
  let max = null;
  seriesData.forEach((serie) => {
    const d = Array.isArray(serie.data) ? serie.data : [];
    if (!d.length) return;
    for (const point of d) {
      const x = toNumber(point[0], null);
      if (x === null) continue;
      min = min === null ? x : Math.min(min, x);
      max = max === null ? x : Math.max(max, x);
    }
  });

  if (min === null || max === null) return null;

  const colorTexto = CHART_THEME.colors.texto;
  const layout = buildLineChartLayout(seriesData.length);

  const canvas = createCanvas(width, height);
  const chart = echarts.init(canvas, null, { devicePixelRatio: DEVICE_PIXEL_RATIO });

  chart.setOption({
    backgroundColor: "#fff",
    title: {
      text: "Niveles Historicos",
      left: "center",
      top: layout.titleTop,
      textStyle: {
        fontFamily: "consolas",
        fontSize: CHART_THEME.fontSizes.title
      }
    },
    tooltip: {
      trigger: "axis"
    },
    legend: {
      top: layout.legendTop,
      type: "scroll",
      textStyle: {
        fontFamily: "consolas",
        fontSize: CHART_THEME.fontSizes.legend
      }
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 60,
      top: layout.gridTop,
      containLabel: true
    },
    xAxis: {
      type: "time",
      axisLabel: {
        fontFamily: "consolas",
        fontSize: CHART_THEME.fontSizes.axis
      }
    },
    yAxis: {
      type: "value",
      name: "Metros",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        fontFamily: "consolas",
        fontSize: CHART_THEME.fontSizes.axis
      },
      axisLabel: {
        fontFamily: "consolas",
        fontSize: CHART_THEME.fontSizes.axis
      }
    },
    dataZoom: [
      {
        type: "inside",
        throttle: 50,
        startValue: min,
        endValue: max
      },
      {
        type: "slider",
        bottom: 10,
        startValue: min,
        endValue: max
      }
    ],
    series: seriesData.map((serie) => ({
      name: serie.name,
      type: "line",
      data: serie.data,
      triggerLineEvent: true,
      showSymbol: false,
      lineStyle: {
        width: 1.5
      }
    }))
  });

  return { chart, canvas };
}

async function generarGraficos(reporteData) {
  const paths = config.paths.reportImages;
  const results = {};

  let bars = null;
  try {
    logamarillo(2, `${ID_MOD} - Generando grafico de barras`);
    bars = renderBars(reporteData, 1600, 500, 1.4);
    await saveChartPNG(bars.canvas, paths.barras);
    results.barras = true;
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error generando grafico de barras: ${err.message}`);
    await removeChartPNG(paths.barras);
    results.barras = false;
  } finally {
    if (bars && bars.chart) {
      bars.chart.dispose();
    }
  }

  let pie = null;
  try {
    logamarillo(2, `${ID_MOD} - Generando grafico pie madryn`);
    pie = renderPie(reporteData);
    if (pie) {
      await saveChartPNG(pie.canvas, paths.pieMdy);
      results.pieMdy = true;
    } else {
      logamarillo(2, `${ID_MOD} - Sin datos para grafico pie`);
      await removeChartPNG(paths.pieMdy);
      results.pieMdy = false;
    }
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error generando grafico pie: ${err.message}`);
    await removeChartPNG(paths.pieMdy);
    results.pieMdy = false;
  } finally {
    if (pie && pie.chart) {
      pie.chart.dispose();
    }
  }

  let lines = null;
  try {
    logamarillo(2, `${ID_MOD} - Generando grafico de lineas`);
    lines = renderLines(reporteData);
    if (lines) {
      await saveChartPNG(lines.canvas, paths.lineas);
      results.lineas = true;
    } else {
      logamarillo(2, `${ID_MOD} - Sin datos para grafico de lineas`);
      await removeChartPNG(paths.lineas);
      results.lineas = false;
    }
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error generando grafico de lineas: ${err.message}`);
    await removeChartPNG(paths.lineas);
    results.lineas = false;
  } finally {
    if (lines && lines.chart) {
      lines.chart.dispose();
    }
  }

  return results;
}

module.exports = { generarGraficos, buildLineChartLayout };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
