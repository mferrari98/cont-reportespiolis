(function () {
  const charts = []
  const REBALSE_OPACITY = 0.35
  const FONT_SIZES = {
    title: 18,
    legend: 15,
    label: 16,
    axis: 14,
    barLabel: 14
  }

  function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  function toNumber(value, fallback = 0) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : fallback
  }

  function formatNumber(value) {
    return Number(value).toLocaleString('es-AR', {
      maximumFractionDigits: 1
    })
  }

  function lightenColor(hex, factor) {
    const normalized = hex.replace('#', '')
    if (normalized.length !== 6) {
      return hex
    }

    const num = parseInt(normalized, 16)
    const r = (num >> 16) & 0xff
    const g = (num >> 8) & 0xff
    const b = num & 0xff

    const mix = (channel) => Math.round(channel + (255 - channel) * factor)

    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
  }

  function registerChart(chart) {
    charts.push(chart)
    return chart
  }

  async function loadReportData() {
    try {
      const response = await fetch('./report-data.json', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Respuesta invalida')
      }
      return await response.json()
    } catch (err) {
      console.error('No se pudo cargar report-data.json', err)
      return null
    }
  }

  function getTipoRef(sitio) {
    return ['Toma(Rio)', 'Toma(Des.)', 'P.Pot'].includes(sitio) ? 'Rebalse' : 'Max Op'
  }

  function renderBars(data) {
    const container = document.getElementById('grafBarras')
    if (!container || !window.echarts) {
      return
    }

    const sitios = Array.isArray(data.sitios) ? data.sitios : []
    const niveles = Array.isArray(data.niveles) ? data.niveles : []
    const maxOperativos = Array.isArray(data.maxOperativos) ? data.maxOperativos : []
    const cubicajes = Array.isArray(data.cubicajes) ? data.cubicajes : []

    const colorNivel = getCssVar('--color-nivel', '#3498db')
    const colorRebalse = getCssVar('--color-rebalse', '#d3a53c')

    const nivelSeries = sitios.map((sitio, index) => {
      const nivel = toNumber(niveles[index])
      const maxOp = toNumber(maxOperativos[index])
      const cubicaje = toNumber(cubicajes[index])
      const volumenM3 = cubicaje > 0 ? nivel * cubicaje : 0
      const volumenLitros = volumenM3 * 1000
      const porcentaje = maxOp > 0 ? Math.min((nivel / maxOp) * 100, 100) : 0
      const exceeded = maxOp > 0 && nivel > maxOp

      return {
        value: porcentaje,
        sitio,
        nivel,
        max: maxOp,
        volumenM3,
        volumenLitros,
        itemStyle: {
          color: exceeded ? '#ff6b6b' : colorNivel
        }
      }
    })

    const restanteSeries = sitios.map((_, index) => {
      const nivel = toNumber(niveles[index])
      const maxOp = toNumber(maxOperativos[index])
      const porcentaje = maxOp > 0 ? Math.min((nivel / maxOp) * 100, 100) : 0
      const restante = maxOp > 0 ? Math.max(100 - porcentaje, 0) : 0

      return {
        value: restante
      }
    })

    const chart = registerChart(window.echarts.init(container))

    chart.setOption({
      title: {
        text: 'Niveles actuales (% del maximo operativo)',
        left: 'center',
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.title
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params && params[0] ? params[0].data : null
          if (!item) {
            return ''
          }
          const tipoRef = getTipoRef(item.sitio)
          const estado = item.max > 0 && item.nivel > item.max ? 'EXCEDE' : 'Normal'
          const litros = item.volumenLitros > 0 ? `<br>Volumen: ${formatNumber(item.volumenLitros)} L` : ''
          return `${item.sitio}<br>Nivel: ${item.nivel.toFixed(2)}m<br>${tipoRef}: ${item.max.toFixed(2)}m<br>Porcentaje: ${item.value.toFixed(1)}%${litros}<br>Estado: ${estado}`
        }
      },
      legend: {
        bottom: 0,
        data: ['Nivel Actual', 'Espacio Disponible'],
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.legend
        }
      },
      grid: {
        left: 50,
        right: 20,
        bottom: 50,
        top: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sitios,
        axisLabel: {
          rotate: 35,
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.axis
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          fontSize: FONT_SIZES.axis
        }
      },
      series: [
        {
          name: 'Nivel Actual',
          type: 'bar',
          stack: 'total',
          data: nivelSeries,
          label: {
            show: true,
            position: 'inside',
            formatter: (params) => {
              const nivel = params.data?.nivel
              return Number.isFinite(nivel) ? nivel.toFixed(2) : ''
            },
            fontFamily: 'consolas',
            fontSize: FONT_SIZES.barLabel
          }
        },
        {
          name: 'Espacio Disponible',
          type: 'bar',
          stack: 'total',
          data: restanteSeries,
          itemStyle: {
            color: colorRebalse,
            opacity: REBALSE_OPACITY
          }
        }
      ]
    })
  }

  function renderPie(data) {
    const container = document.getElementById('grafPieMdy')
    if (!container || !window.echarts) {
      return
    }

    const totals = data?.pieMdy?.totals || {}
    const aguaTotal = toNumber(totals.Agua)
    const vacioTotal = toNumber(totals.Vacio)

    if (!aguaTotal && !vacioTotal) {
      return
    }

    const colorNivel = getCssVar('--color-nivel', '#3498db')
    const colorRebalse = getCssVar('--color-rebalse', '#d3a53c')

    const pieData = [
      { name: 'Agua', value: aguaTotal, itemStyle: { color: colorNivel } },
      { name: 'Vacio', value: vacioTotal, itemStyle: { color: colorRebalse, opacity: REBALSE_OPACITY } }
    ].filter((item) => item.value > 0)


    const chart = registerChart(window.echarts.init(container))

    chart.setOption({
      title: {
        text: 'Puerto Madryn',
        left: 'center',
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.title
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const value = toNumber(params.value)
          const litros = value > 0 ? `${formatNumber(value * 1000)} L` : '0 L'
          return `${params.name}: ${formatNumber(value)} m3 (${params.percent}%)<br>${litros}`
        }
      },
      legend: {
        show: true,
        bottom: 0,
        data: ['Agua', 'Vacio'],
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.legend
        },
        itemGap: 12
      },
      series: [
        {
          name: 'Totales',
          type: 'pie',
          radius: '80%',
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          data: pieData,
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n{d}%',
            fontFamily: 'consolas',
            fontSize: FONT_SIZES.label,
            lineHeight: 22,
            opacity: 1
          },
          labelLayout: {
            hideOverlap: true
          },
          labelLine: {
            show: false
          }
        }
      ]
    })
  }

  function renderLines(data) {
    const container = document.getElementById('grafLineas')
    if (!container || !window.echarts) {
      return
    }

    const seriesData = Array.isArray(data.lineSeries) ? data.lineSeries : []
    if (!seriesData.length) {
      return
    }

    const chart = registerChart(window.echarts.init(container))

    chart.setOption({
      title: {
        text: 'Niveles Historicos',
        left: 'center',
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.title
        }
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        top: 30,
        type: 'scroll',
        textStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.legend
        }
      },
      grid: {
        left: 50,
        right: 30,
        bottom: 60,
        top: 80,
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.axis
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.axis
        }
      },
      dataZoom: [
        { type: 'inside', throttle: 50 },
        { type: 'slider', bottom: 10 }
      ],
      series: seriesData.map((serie) => ({
        name: serie.name,
        type: 'line',
        data: serie.data,
        showSymbol: false,
        lineStyle: {
          width: 1.5
        }
      }))
    })
  }

  function setupCopy() {
    const copyButton = document.getElementById('copiar')
    if (!copyButton) {
      return
    }

    copyButton.addEventListener('click', () => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      let textToCopy = ''

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 4) {
          const left = cells[1]?.innerText ?? ''
          const right = cells[3]?.innerText ?? ''
          if (left || right) {
            textToCopy += `${left},${right}\n`
          }
        }
      })

      textToCopy = textToCopy.trim()
      if (!textToCopy) {
        return
      }

      const notifySuccess = () => alert('Texto copiado al portapapeles')

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(notifySuccess)
          .catch(() => fallbackCopy(textToCopy, notifySuccess))
        return
      }

      fallbackCopy(textToCopy, notifySuccess)
    })
  }

  function fallbackCopy(text, onSuccess) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'

    document.body.appendChild(textarea)
    textarea.select()

    try {
      document.execCommand('copy')
      onSuccess()
    } catch (err) {
      console.error('Error al copiar el texto: ', err)
    } finally {
      document.body.removeChild(textarea)
    }
  }

  async function initReport() {
    window.reportReady = false

    setupCopy()
    const data = await loadReportData()
    if (data) {
      renderBars(data)
      renderPie(data)
      renderLines(data)
    }

    window.reportReady = true
  }

  document.addEventListener('DOMContentLoaded', initReport)
  window.addEventListener('resize', () => {
    charts.forEach((chart) => chart.resize())
  })
})()
