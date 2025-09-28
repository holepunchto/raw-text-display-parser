module.exports = class RawTextDisplayParser {
  constructor(options = {}) {
    const {
      text = '',
      display = [],
      onmention = noop,
      onlink = noop,
      onpearlink = noop,
      onemoji = noop,
      onclear = noop
    } = options

    this.display = display
    this.text = text
    this.position = text.length
    this.range = null
    this.onmention = onmention
    this.onlink = onlink
    this.onpearlink = onpearlink
    this.onemoji = onemoji
    this.onclear = onclear
    this.start = 0
    this.end = 0
    this.word = ''
  }

  reset() {
    this.display = []
    this.text = ''
    this.position = 0
    this.range = null
  }

  _clearPrevious(upd) {
    for (let i = 0; i < this.display.length; i++) {
      const d = this.display[i]
      if (overlaps(d, upd)) {
        this.display.splice(i, 1)
        i--
      }
    }
  }

  _insertDisplay(upd) {
    let i = 0
    while (i < this.display.length && upd.start >= this.display[i].start) {
      i++
    }
    this.display.splice(i, 0, upd)
  }

  setPosition(position) {
    this.position = position
    this.range = null
  }

  selectRange(start, end) {
    this.position = start
    this.range = { start, end }
  }

  backspace() {
    if (this.position === 0 && !this.range) return

    const last = [
      ...this.text.slice(Math.max(0, this.position - 8), this.position)
    ].pop()

    if (!this.range) {
      this.selectRange(this.position - last.length, this.position)
    }

    this.appendText('')
  }

  appendText(text) {
    if (this.range) {
      this._delete(this.range.start, this.range.end)
      this.range = null
    }

    if (this.position === this.text.length) {
      this.text += text
    } else {
      this._insert(this.position, this.position, text)
    }

    this.position += text.length

    this._updateWord()

    if (this.word[0] === '@') {
      this.onmention(this.word)
    } else if (isLink(this.word)) {
      this.onlink(this.word)
    } else if (isPearLink(this.word)) {
      this.onpearlink(this.word)
    } else if (isEmoji(this.word)) {
      this.onemoji(this.word)
    } else {
      this.onclear(this.word)
    }
  }

  flush(text = this.text) {
    // some bug, strip formatting
    if (this.text !== text) {
      return {
        text,
        display: []
      }
    }
    return {
      text,
      display
    }
  }

  _updateWord() {
    let start = 0
    let end = this.text.length

    for (let i = this.position - 1; i >= 0; i--) {
      const ch = this.text[i]
      if (ch === ' ' || ch === '\n' || ch === '\t') {
        start = i + 1
        break
      }
    }

    for (let i = this.position; i < this.text.length; i++) {
      const ch = this.text[i]
      if (ch === ' ' || ch === '\n' || ch === '\t') {
        end = i
        break
      }
    }

    this.word = this.text.slice(start, end)
    this.start = start
    this.end = end
  }

  _insert(start, end, text) {
    const upd = {
      type: 'clear',
      start,
      end
    }

    this._clearPrevious(upd)
    this.text = this.text.slice(0, start) + text + this.text.slice(start)

    const delta = text.length

    for (const d of this.display) {
      if (start < d.start) {
        d.start += delta
        d.end += delta
      }
    }
  }

  _delete(start, end) {
    const upd = {
      type: 'clear',
      start,
      end
    }

    this._clearPrevious(upd)
    this.text = this.text.slice(0, start) + this.text.slice(end)

    const delta = end - start

    for (const d of this.display) {
      if (start < d.start) {
        d.start -= delta
        d.end -= delta
      }
    }
  }

  resync(text) {
    const shared = Math.min(this.text.length, text.length)
    const display = []

    let end = 0
    for (; end < shared; end++) {
      if (this.text[end] === text[end]) continue
      break
    }

    let startNew = text.length - 1
    let startOld = this.text.length - 1

    while (startNew >= 0 && startOld >= 0) {
      if (this.text[startOld] !== text[startNew]) {
        startNew++
        startOld++
        break
      }
      startNew--
      startOld--
    }

    for (const d of this.display) {
      if (d.end < end || startOld <= d.start) display.push(d)
    }

    this.text = text
    this.display = display
    this.position = this.text.length
    this.range = null
  }

  setEmoji(input, code, emoji) {
    if (this.word !== input) return false

    if (emoji) {
      const position = this.position
      this.selectRange(this.start, this.end)
      this.appendText(emoji)
    }

    if (input !== code) {
      const position = this.position
      this.selectRange(this.start, this.end)
      this.appendText(code)
    }

    const upd = {
      type: 'emoji',
      start: this.start,
      end: this.end,
      content: code
    }

    this._clearPrevious(upd)
    this._insertDisplay(upd)

    return true
  }

  setMention(input, name, id) {
    if (this.word !== input) return false

    const start = this.start

    if (input !== name) {
      const position = this.position
      this.selectRange(this.start, this.end)
      this.appendText(name)
    }

    const upd = {
      type: 'mention',
      start,
      end: this.end,
      content: name,
      id
    }

    this._clearPrevious(upd)
    this._insertDisplay(upd)

    return true
  }

  setLink(link) {
    if (this.word !== link) return false

    const upd = {
      type: 'http-link',
      start: this.start,
      end: this.end,
      content: link,
      link
    }

    this._clearPrevious(upd)
    this._insertDisplay(upd)

    return true
  }

  setPearLink(link) {
    if (this.word !== link) return false

    const upd = {
      type: 'pear-link',
      start: this.start,
      end: this.end,
      content: link,
      link
    }

    this._clearPrevious(upd)
    this._insertDisplay(upd)

    return true
  }
}

function overlaps(a, b) {
  if (a.start <= b.start && b.start < a.end) return true
  if (b.start <= a.start && a.start < b.end) return true
  return false
}

function isLink(word) {
  return word.startsWith('http://') || word.startsWith('https://')
}

function isPearLink(word) {
  return word.startsWith('pear://')
}

function isEmoji(word) {
  return word[0] === ':'
}

function noop() {}
