const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

module.exports = class RawTextDisplayParser {
  constructor(options = {}) {
    const {
      text = '',
      display = [],
      protocol = 'pear',
      onmention = noop,
      onlink = noop,
      onpearlink = noop,
      onemoji = noop,
      onclear = noop
    } = options

    this.display = display
    this.text = text
    this.protocol = protocol
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

  reset(options = {}) {
    const { display = [], text = '' } = options

    this.display = display
    this.text = text
    this.position = text.length
    this.range = null

    this.appendText('')
  }

  _clearPrevious(start, end) {
    // if empty, nothing to clear
    if (start === end) return

    for (let i = 0; i < this.display.length; i++) {
      const d = this.display[i]
      if (overlaps(d, start, end)) {
        this.display.splice(i, 1)
        i--
      }
    }
  }

  _insertDisplay(upd) {
    let i = this.display.length - 1
    for (; i >= 0 && upd.start <= this.display[i].start; i--) {}
    this.display.splice(i + 1, 0, upd)
  }

  setPosition(position) {
    this.position = position
    this.range = null

    this._updateWord()
  }

  selectRange(start, end) {
    this.position = start
    this.range = { start, end }

    this._updateWord()
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
    } else if (text.length) {
      this._insert(this.position, text)
    }

    this.position += text.length

    this._updateWord()

    if (isMention(this.word)) {
      this.onmention(this.word)
    } else if (isLink(this.word)) {
      this.onlink(this.word)
    } else if (this.isPearLink(this.word)) {
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
      display: this.display
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

  _insert(position, text) {
    this.text = this.text.slice(0, position) + text + this.text.slice(position)

    for (let i = 0; i < this.display.length; i++) {
      const d = this.display[i]
      if (d.start < position && position < d.end) {
        this.display.splice(i, 1)
        i--
      }
    }

    const delta = text.length

    for (const d of this.display) {
      if (position <= d.start) {
        d.start += delta
        d.end += delta
      }
    }
  }

  _delete(start, end) {
    this._clearPrevious(start, end)
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
      if (d.end <= end) display.push(d)
      if (startOld <= d.start)
        display.push({
          ...d,
          start: d.start + (startNew - startOld),
          end: d.end + (startNew - startOld)
        })
    }

    this.position = this.text.length && startNew >= 0 ? startNew : text.length
    this.text = text
    this.display = display
    this.range = null

    this.appendText('')
  }

  setEmoji(input, code, emoji) {
    if (this.word !== input) return false

    const start = this.start

    if (emoji) {
      this.selectRange(this.start, this.end)
      this.appendText(emoji)
    } else if (input !== code) {
      this.selectRange(this.start, this.end)
      this.appendText(`${code} `) // add trailing space
    }

    const length = emoji ? emoji.length : code.length
    const upd = {
      type: DISPLAY_TYPES.EMOJI,
      start,
      end: start + length,
      content: code.slice(1, -1),
      length
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  setMention(input, name, memberId) {
    if (this.word !== input) return false

    const start = this.start

    if (input !== name) {
      this.selectRange(this.start, this.end)
      this.appendText(`${name} `) // add trailing space
    }

    const upd = {
      type: DISPLAY_TYPES.MENTION,
      start,
      end: start + name.length,
      length: name.length,
      memberId
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  setLink(input, link) {
    if (this.word !== input) return false

    const upd = {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: this.start,
      end: this.end,
      content: link,
      length: input.length
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  setPearLink(link) {
    if (this.word !== link) return false

    const upd = {
      type: DISPLAY_TYPES.PEAR_LINK,
      start: this.start,
      end: this.end,
      content: link,
      length: link.length
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  isPearLink(word) {
    return word.toLowerCase().startsWith(`${this.protocol}://`)
  }
}

function overlaps(a, start, end) {
  if (a.start <= start && start < a.end) return true
  if (start <= a.start && a.start < end) return true
  return false
}

function isMention(word) {
  return word[0] === '@'
}

function isLink(word) {
  word = word.toLowerCase()
  return (
    word.startsWith('http://') ||
    word.startsWith('https://') ||
    word.startsWith('www.')
  )
}

function isEmoji(word) {
  return word[0] === ':'
}

function noop() {}
