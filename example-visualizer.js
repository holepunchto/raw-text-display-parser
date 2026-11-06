function createParserVisualizer(container, { parser: p, typeNames }) {
  const MAX_LOG = 50

  const style = document.createElement('style')
  style.textContent = `
    #${container.id} h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin: 20px 0 6px;
    }
    #${container.id} .hint {
      color: #666;
      font-size: 12px;
    }
    #${container.id} .rendered {
      font: 14px/1.6 ui-monospace, monospace;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      min-height: 40px;
    }
    #${container.id} .nl {
      color: #bbb;
    }
    #${container.id} .caret {
      display: inline-block;
      width: 2px;
      height: 1.2em;
      vertical-align: text-bottom;
      background: #e00;
      margin: 0 -1px;
    }
    #${container.id} .word {
      outline: 2px dashed #00000040;
      outline-offset: 1px;
    }
    #${container.id} .sel {
      background: #ffe9a8;
    }
    #${container.id} .span {
      border-radius: 3px;
      padding: 1px 2px;
    }
    #${container.id} .t-MENTION {
      background: #d9e8ff;
    }
    #${container.id} .t-HTTP_LINK,
    #${container.id} .t-PEAR_LINK {
      background: #cfe3ff;
      text-decoration: underline;
    }
    #${container.id} .t-EMOJI {
      background: #ffe0cc;
    }
    #${container.id} .t-UNORDERED_LIST_ITEM,
    #${container.id} .t-ORDERED_LIST_ITEM {
      background: #e0e0e0;
    }
    #${container.id} .t-OTHER {
      background: #fff3b0;
    }
    #${container.id} .legend span {
      margin-right: 12px;
    }
    #${container.id} .state {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 6px;
    }
    #${container.id} .state div {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 8px;
    }
    #${container.id} .state b {
      display: block;
      font-size: 11px;
      color: #666;
      font-weight: normal;
    }
    #${container.id} .state code {
      font-size: 13px;
    }
    #${container.id} table {
      border-collapse: collapse;
      width: 100%;
      font-size: 13px;
    }
    #${container.id} th,
    #${container.id} td {
      text-align: left;
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    #${container.id} th {
      font-weight: 600;
      color: #666;
    }
    #${container.id} td code {
      white-space: pre;
    }
    #${container.id} .log {
      font: 12px/1.5 ui-monospace, monospace;
      max-height: 180px;
      overflow: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 0;
    }
    #${container.id} .raw {
      font: 12px/1.4 ui-monospace, monospace;
      white-space: pre-wrap;
    }
  `
  document.head.appendChild(style)

  container.innerHTML = `
    <h2>Rendered text</h2>
    <div class="rendered"></div>
    <p class="hint legend">
      <span class="span t-MENTION">mention</span>
      <span class="span t-HTTP_LINK">http link</span>
      <span class="span t-PEAR_LINK">pear link</span>
      <span class="span t-EMOJI">emoji</span>
      <span class="span t-UNORDERED_LIST_ITEM">list item</span>
      <span class="word">current word</span>
      <span class="sel">selection</span>
      <span><span class="caret"></span> position</span>
    </p>

    <h2>State</h2>
    <div class="state"></div>

    <h2>Display entries</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>type</th>
          <th>start</th>
          <th>end</th>
          <th>length</th>
          <th>text slice</th>
          <th>extra</th>
        </tr>
      </thead>
      <tbody class="entries"></tbody>
    </table>

    <h2>Callbacks</h2>
    <pre class="log"></pre>

    <details>
      <summary>Raw parser data</summary>
      <pre class="raw"></pre>
    </details>
  `

  const rendered = container.querySelector('.rendered')
  const state = container.querySelector('.state')
  const entries = container.querySelector('.entries')
  const logEl = container.querySelector('.log')
  const raw = container.querySelector('.raw')

  const log = []
  function logCallback(name, args) {
    const entry = {
      text: `${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`
    }
    log.unshift(entry)
    if (log.length > MAX_LOG) log.pop()
    return (result) => {
      entry.text += ' -> ' + result
    }
  }

  function render() {
    renderText()
    renderState()
    renderEntries()
    logEl.textContent = log.map((e) => e.text).join('\n')
    raw.textContent = JSON.stringify(
      { text: p.text, position: p.position, display: p.display },
      null,
      2
    )
  }

  function renderText() {
    rendered.replaceChildren()
    const text = p.text
    const sel = p.range
    const marks = [...p.display].sort((a, b) => a.start - b.start)

    function piece(from, to, parent) {
      const cuts = new Set([from, to, p.position, p.start, p.end])
      if (sel) cuts.add(sel.start).add(sel.end)
      const points = [...cuts]
        .filter((i) => i >= from && i <= to)
        .sort((a, b) => a - b)
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]
        const b = points[i + 1]
        if (a === p.position) parent.appendChild(caret())
        if (a === b) continue
        const span = document.createElement('span')
        if (a >= p.start && b <= p.end && p.word) span.classList.add('word')
        if (sel && a >= sel.start && b <= sel.end) span.classList.add('sel')
        const chunk = text.slice(a, b).split('\n')
        chunk.forEach((part, j) => {
          span.appendChild(document.createTextNode(part))
          if (j < chunk.length - 1) {
            const nl = document.createElement('span')
            nl.className = 'nl'
            nl.textContent = '↵\n'
            span.appendChild(nl)
          }
        })
        parent.appendChild(span)
      }
      if (to === p.position && to === text.length && parent === rendered) {
        parent.appendChild(caret())
      }
    }

    function caret() {
      const c = document.createElement('span')
      c.className = 'caret'
      return c
    }

    let cursor = 0
    for (const d of marks) {
      if (d.start > cursor) piece(cursor, d.start, rendered)
      const span = document.createElement('span')
      span.className = 'span t-' + (typeNames[d.type] || 'OTHER')
      span.title = describe(d)
      piece(Math.max(d.start, cursor), d.end, span)
      rendered.appendChild(span)
      cursor = Math.max(cursor, d.end)
    }
    if (cursor < text.length || cursor === p.position) {
      piece(cursor, text.length, rendered)
    }
  }

  function describe(d) {
    return Object.entries(d)
      .map(([k, v]) => `${k}=${k === 'type' ? typeNames[v] : v}`)
      .join(' ')
  }

  function renderState() {
    const fields = {
      position: p.position,
      word: JSON.stringify(p.word),
      'word start': p.start,
      'word end': p.end,
      range: p.range ? `${p.range.start}-${p.range.end}` : 'none',
      'text length': p.text.length,
      'display count': p.display.length
    }
    state.replaceChildren()
    for (const [k, v] of Object.entries(fields)) {
      const cell = document.createElement('div')
      const label = document.createElement('b')
      label.textContent = k
      const value = document.createElement('code')
      value.textContent = v
      cell.append(label, value)
      state.appendChild(cell)
    }
  }

  function renderEntries() {
    entries.replaceChildren()
    p.display.forEach((d, i) => {
      const tr = document.createElement('tr')
      const extra = Object.entries(d)
        .filter(([k]) => !['type', 'start', 'end', 'length'].includes(k))
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
      const cells = [
        i,
        typeNames[d.type] || d.type,
        d.start,
        d.end,
        d.length,
        JSON.stringify(p.text.slice(d.start, d.end)),
        extra
      ]
      for (const c of cells) {
        const td = document.createElement('td')
        const code = document.createElement('code')
        code.textContent = c
        td.appendChild(code)
        tr.appendChild(td)
      }
      entries.appendChild(tr)
    })
  }

  return { render, logCallback }
}
