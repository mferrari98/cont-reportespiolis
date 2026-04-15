const CHART_THEME = Object.freeze({
  rebalseOpacity: 0.35,
  fontSizes: Object.freeze({
    title: 19,
    legend: 16,
    label: 17,
    axis: 15,
    barLabel: 15
  }),
  colors: Object.freeze({
    nivel: "#3498db",
    rebalse: "#d3a53c",
    texto: "#333",
    vacio: "#f2e4c5"
  })
});

function buildChartThemePayload() {
  return {
    rebalseOpacity: CHART_THEME.rebalseOpacity,
    fontSizes: { ...CHART_THEME.fontSizes },
    colors: { ...CHART_THEME.colors }
  };
}

module.exports = {
  CHART_THEME,
  buildChartThemePayload
};
