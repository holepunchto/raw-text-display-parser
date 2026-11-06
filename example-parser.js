function loadModule(src, require) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe')
    frame.hidden = true
    document.body.appendChild(frame)

    const win = frame.contentWindow
    win.module = { exports: {} }
    win.require = require

    const script = win.document.createElement('script')
    script.src = src
    script.onload = () => resolve(win.module.exports)
    script.onerror = () => reject(new Error('Failed to load ' + src))
    win.document.body.appendChild(script)
  })
}

async function loadParser() {
  const utils = await loadModule('utils.js')
  const Parser = await loadModule('index.js', (name) => {
    if (name === './utils') return utils
    throw new Error('Unknown module ' + name)
  })

  const typeNames = Object.fromEntries(
    Object.entries(utils.DISPLAY_TYPES).map(([name, id]) => [id, name])
  )

  return { Parser, utils, typeNames }
}

function createParser(Parser, { typeNames, onCallback = () => () => {} }) {
  const p = new Parser({
    onlink(link) {
      const done = onCallback('onlink', [link])
      done(p.setLink(link, link))
    },
    onpearlink(link) {
      const done = onCallback('onpearlink', [link])
      done(p.setPearLink(link))
    },
    onmention(mention) {
      const done = onCallback('onmention', [mention])
      done(p.setMention(mention, mention, Math.random()))
    },
    onemoji(emoji) {
      const done = onCallback('onemoji', [emoji])
      const emojis = {
        ':smile:': '😄',
        ':pear:': '🍐'
      }
      const customEmojis = {
        ':keet_party:': ':keet_party:'
      }
      if (emojis[emoji]) {
        return done(p.setEmoji(emoji, emoji, emojis[emoji]))
      }
      if (customEmojis[emoji]) {
        return done(p.setEmoji(emoji, customEmojis[emoji]))
      }
    },
    ondefaultemoji(emoji) {
      const emojis = {
        '😀': 'grinning',
        '🚀': 'rocket',
        '😃': 'smiley'
      }
      const done = onCallback('ondefaultemoji', [emoji])
      if (emojis[emoji]) {
        return done(p.setEmoji(emoji, emojis[emoji], emoji, true))
      }
    },
    onlist(start, end, type, index) {
      const done = onCallback('onlist', [start, end, typeNames[type], index])
      done(p.setList(start, end, type, index))
    }
  })

  return p
}

// keeps the parser in sync with a textarea; onChange fires after each update
function bindTextarea(inp, p, onChange = () => {}) {
  // every edit goes through resync for mobile with react-native
  inp.oninput = function () {
    if (inp.value === p.text) return

    p.resync(inp.value)

    inp.value = p.text
    const position = p.position
    setTimeout(() => {
      inp.selectionStart = position
      inp.selectionEnd = position
      p.setPosition(position)

      onChange()
    }, 50)
  }

  inp.onselectionchange = function () {
    const start = inp.selectionStart
    const end = inp.selectionEnd

    p.setPosition(start)
    if (start !== end) p.selectRange(start, end)

    onChange()
  }
}
