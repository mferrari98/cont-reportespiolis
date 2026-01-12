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
  const LINE_RANGE_DEFAULT = '1d'
  const LINE_RANGE_MS = {
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000
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

  function getLineRangeKey() {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('lineRange')
    return LINE_RANGE_MS[key] ? key : LINE_RANGE_DEFAULT
  }

  function updateUrlParams(params) {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || typeof value === 'undefined' || value === '') {
        url.searchParams.delete(key)
        return
      }
      url.searchParams.set(key, value)
    })

    window.history.replaceState({}, '', url)
  }

  function getSeriesBounds(seriesData) {
    let min = null
    let max = null
    let step = null

    seriesData.forEach((serie) => {
      const data = Array.isArray(serie.data) ? serie.data : []
      if (!data.length) {
        return
      }
      const firstX = toNumber(data[0][0], null)
      const lastX = toNumber(data[data.length - 1][0], null)
      if (firstX === null || lastX === null) {
        return
      }
      min = min === null ? firstX : Math.min(min, firstX)
      max = max === null ? lastX : Math.max(max, lastX)
      if (step === null && data.length > 1) {
        const span = lastX - firstX
        const approx = span / (data.length - 1)
        if (approx > 0) {
          step = approx
        }
      }
    })

    if (min === null || max === null) {
      return null
    }

    return {
      min,
      max,
      step: step || (60 * 60 * 1000)
    }
  }

  function getMaxSeriesLength(seriesData) {
    return seriesData.reduce((max, serie) => {
      const length = Array.isArray(serie.data) ? serie.data.length : 0
      return Math.max(max, length)
    }, 0)
  }

  function estimateLimitForRange(rangeMs, stepMs, currentLimit) {
    if (!Number.isFinite(stepMs) || stepMs <= 0) {
      return currentLimit
    }
    const needed = Math.ceil(rangeMs / stepMs) + 1
    return Math.min(1000, Math.max(currentLimit, needed))
  }

  function buildLineZoom(bounds, rangeMs) {
    const endValue = bounds.max
    const startValue = Math.max(bounds.min, endValue - rangeMs)

    return [
      { type: 'inside', throttle: 50, startValue, endValue },
      { type: 'slider', bottom: 10, startValue, endValue }
    ]
  }

  function setActiveRange(buttons, rangeKey) {
    buttons.forEach((button) => {
      const key = button.getAttribute('data-range')
      if (key === rangeKey) {
        button.classList.add('activo')
      } else {
        button.classList.remove('activo')
      }
    })
  }

  function getHistoricoPage(pagination) {
    const params = new URLSearchParams(window.location.search)
    const pageValue = parseInt(params.get('historicoPage'), 10)
    if (Number.isFinite(pageValue) && pageValue > 0) {
      return pageValue
    }
    const fallback = toNumber(pagination?.page, 1)
    return fallback > 0 ? fallback : 1
  }

  function buildLineSeriesConfig(seriesData) {
    return seriesData.map((serie) => ({
      name: serie.name,
      type: 'line',
      data: serie.data,
      showSymbol: false,
      lineStyle: {
        width: 1.5
      }
    }))
  }

  async function fetchLineData(limitValue, pageValue) {
    const params = new URLSearchParams({
      historicoLimit: limitValue,
      historicoPage: pageValue
    })
    const response = await fetch(`./line-data?${params.toString()}`, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Respuesta invalida')
    }
    return response.json()
  }

  function setButtonsDisabled(buttons, disabled) {
    buttons.forEach((button) => {
      button.disabled = disabled
    })
  }

  function setupLineRangeControls(lineState) {
    const controls = document.getElementById('lineasControles')
    if (!controls) {
      return
    }

    const buttons = Array.from(controls.querySelectorAll('button[data-range]'))
    if (!buttons.length) {
      return
    }

    const rangeKey = getLineRangeKey()
    lineState.rangeKey = rangeKey
    setActiveRange(buttons, rangeKey)

    const applyRange = async (selectedKey) => {
      const desiredMs = LINE_RANGE_MS[selectedKey] || LINE_RANGE_MS[LINE_RANGE_DEFAULT]
      const bounds = lineState.bounds
      if (!bounds) {
        return
      }

      const availableMs = bounds.max - bounds.min
      const fallbackLimit = getMaxSeriesLength(lineState.seriesData)
      const currentLimit = Math.max(toNumber(lineState.pagination?.limit, 0), fallbackLimit)

      if (availableMs < desiredMs && !lineState.loading) {
        const nextLimit = estimateLimitForRange(desiredMs, bounds.step, currentLimit)
        if (nextLimit > currentLimit) {
          lineState.loading = true
          setButtonsDisabled(buttons, true)

          try {
            const pageValue = getHistoricoPage(lineState.pagination)
            const data = await fetchLineData(nextLimit, pageValue)
            if (Array.isArray(data?.lineSeries) && data.lineSeries.length) {
              lineState.seriesData = data.lineSeries
              lineState.pagination = data.pagination || lineState.pagination
              lineState.bounds = getSeriesBounds(lineState.seriesData)
              if (lineState.bounds) {
                lineState.chart.setOption({
                  series: buildLineSeriesConfig(lineState.seriesData)
                })
              }
            }
          } catch (err) {
            console.error('No se pudo cargar el historico', err)
          } finally {
            lineState.loading = false
            setButtonsDisabled(buttons, false)
          }
        }
      }

      if (!lineState.bounds) {
        return
      }

      lineState.chart.setOption({ dataZoom: buildLineZoom(lineState.bounds, desiredMs) })
      setActiveRange(buttons, selectedKey)
      updateUrlParams({ lineRange: selectedKey })
    }

    buttons.forEach((button) => {
      button.addEventListener('click', async () => {
        const selectedKey = button.getAttribute('data-range')
        if (!LINE_RANGE_MS[selectedKey]) {
          return
        }
        await applyRange(selectedKey)
      })
    })

    applyRange(rangeKey)
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
      const porcentaje = maxOp > 0 ? Math.min((nivel / maxOp) * 100, 100) : 0
      const exceeded = maxOp > 0 && nivel > maxOp

      return {
        value: porcentaje,
        sitio,
        nivel,
        max: maxOp,
        volumenM3,
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
          const volumen = item.volumenM3 > 0 ? `<br>Volumen: ${formatNumber(item.volumenM3)} m3` : ''
          return `${item.sitio}<br>Nivel: ${item.nivel.toFixed(2)}m<br>${tipoRef}: ${item.max.toFixed(2)}m<br>Porcentaje: ${item.value.toFixed(1)}%${volumen}<br>Estado: ${estado}`
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
    const sitiosConsiderados = Array.isArray(data?.pieMdy?.sitiosConsiderados)
      ? data.pieMdy.sitiosConsiderados
      : []

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
          return `${params.name}: ${formatNumber(value)} m3 (${params.percent}%)`
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

    const pieLeyenda = document.getElementById('pieMdySitios')
    if (pieLeyenda) {
      pieLeyenda.textContent = sitiosConsiderados.length
        ? `Sitios: ${sitiosConsiderados.join(', ')}`
        : ''
    }
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

    const bounds = getSeriesBounds(seriesData)
    if (!bounds) {
      return
    }

    const rangeKey = getLineRangeKey()
    const rangeMs = LINE_RANGE_MS[rangeKey] || LINE_RANGE_MS[LINE_RANGE_DEFAULT]

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
        name: 'Metros',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.axis
        },
        axisLabel: {
          fontFamily: 'consolas',
          fontSize: FONT_SIZES.axis
        }
      },
      dataZoom: buildLineZoom(bounds, rangeMs),
      series: buildLineSeriesConfig(seriesData)
    })

    const lineState = {
      chart,
      seriesData,
      bounds,
      pagination: data?.pagination || null,
      loading: false,
      rangeKey: rangeKey
    }

    setupLineRangeControls(lineState)
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
