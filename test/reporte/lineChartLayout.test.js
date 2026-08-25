const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLineChartLayout } = require("../../src/reporte/graficos");

test("line chart layout keeps title, legend, and plot area separated for many series", () => {
  const layout = buildLineChartLayout(12);

  assert.equal(layout.titleTop, 10);
  assert.ok(
    layout.legendTop >= layout.titleTop + layout.titleHeight + 12,
    "legend must start below the title with visible spacing"
  );
  assert.ok(
    layout.gridTop >= layout.legendTop + layout.legendHeight + 18,
    "plot grid must start below the legend with visible spacing"
  );
});
