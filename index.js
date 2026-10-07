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
      onclear = noop,
      ondefaultemoji = noop,
      onlist = noop
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
    this.ondefaultemoji = ondefaultemoji
    this.onlist = onlist
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

    this._dispatchWord(this.word, this.start, this.end)
  }

  _fireAllWords() {
    let start = 0
    while (start < this.text.length) {
      while (start < this.text.length && isEndWord(this.text[start])) start++
      if (start >= this.text.length) break

      let end = start
      while (end < this.text.length && !isEndWord(this.text[end])) end++

      const alreadyCovered = this.display.some(
        (d) => d.start <= start && d.end >= end
      )
      if (!alreadyCovered) {
        this._dispatchWord(this.text.slice(start, end), start, end)
        start = this.end
      } else {
        start = end
      }
    }

    this._updateWord()
  }

  _dispatchWord(word, start, end) {
    this.word = word
    this.start = start
    this.end = end

    if (isMention(word)) {
      this.onmention(word)
    } else if (isLink(word)) {
      this.onlink(word)
    } else if (this.isPearLink(word)) {
      this.onpearlink(word)
    } else if (isEmoji(word)) {
      this.onemoji(word)
    } else if (isDefaultEmoji(word)) {
      this.ondefaultemoji(word)
    } else {
      this.onclear(word)
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

  _fireList(inserted) {
    const lineStart = getLineStart(this.text, this.position)

    if (isUnorderedList(this.text.slice(lineStart, this.position))) {
      return this.onlist(lineStart, this.position, DISPLAY_TYPES.UNORDERED_LIST)
    }

    if (inserted !== '\n') return

    // enter pressed on a list item continues the list on the new line
    const prevStart = getLineStart(this.text, lineStart - 1)
    const item = this.display.find(
      (d) => d.start === prevStart && d.type === DISPLAY_TYPES.UNORDERED_LIST
    )
    if (!item) return

    // enter on an empty item ends the list: drop its marker and the newline
    if (item.end === lineStart - 1) {
      this.selectRange(item.start, this.position)
      this.appendText('')
      return
    }

    this.onlist(this.position, this.position, item.type)
  }

  resync(text) {
    const shared = Math.min(this.text.length, text.length, this.position)
    const display = []

    let end = 0
    for (; end < shared; end++) {
      if (this.text[end] === text[end]) continue
      break
    }

    // a deleted emoji can share leading code units with the next one (surrogate half,
    // base emoji before a skin tone); a prefix ending inside it drops the next display
    const split = this.display.find((d) => d.start < end && end < d.end)
    if (split) end = split.start

    let startNew = text.length
    let startOld = this.text.length

    while (
      startNew > end &&
      startOld > end &&
      this.text[startOld - 1] === text[startNew - 1]
    ) {
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

    this.position = this.text.length ? startNew : text.length
    this.text = text
    this.display = display
    this.range = null

    this._fireList(text.slice(end, startNew))
    this._fireAllWords()
  }

  setEmoji(input, code, emoji, isDefaultEmoji) {
    if (this.word !== input) return false

    const start = this.start
    // Check if we already have an emoji registered at this exact spot
    const existing = this.display.find(
      (d) => d.start === start && d.type === DISPLAY_TYPES.EMOJI
    )
    // We skip appending the space to break the loop.
    if (isDefaultEmoji && existing) {
      return true
    }

    if (isDefaultEmoji) {
      // appending while the cursor is before the word re-dispatches it forever
      if (this.position === this.end && !isEndWord(this.text[this.end])) {
        this.appendText(' ')
      }
    } else if (emoji) {
      this.selectRange(this.start, this.end)
      this.appendText(emoji)
    } else if (input !== code) {
      this.selectRange(this.start, this.end)
      const ensureTrailingSpace = !isEndWord(this.text[this.end])
      this.appendText(`${code}${ensureTrailingSpace ? ' ' : ''}`)
    }

    const length = emoji ? emoji.length : code.length
    const upd = {
      type: DISPLAY_TYPES.EMOJI,
      start,
      end: start + length,
      content: code[0] === ':' ? code.slice(1, -1) : code,
      length
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  setUnicodeEmoji(start, end, shortcode) {
    if (start < 0 || end <= start || end > this.text.length) return false

    const upd = {
      type: DISPLAY_TYPES.EMOJI,
      start,
      end,
      content: shortcode,
      length: end - start
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
      const ensureTrailingSpace = !isEndWord(this.text[this.end])
      this.appendText(`${name}${ensureTrailingSpace ? ' ' : ''}`)
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

  setList(start, end, type) {
    if (start < 0 || end < start || end > this.text.length) return false

    const content =
      type === DISPLAY_TYPES.UNORDERED_LIST ? UnorderedListMark : ''
    this.selectRange(start, end)
    this.appendText(content)

    const upd = {
      type,
      start,
      end: start + content.length,
      content,
      length: content.length
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

function isDefaultEmoji(word) {
  return /\p{Extended_Pictographic}/u.test(word)
}

function isUnorderedList(mark) {
  return mark === '- ' || mark === '* '
}

function noop() {}

function isEndWord(c) {
  return c === ' ' || c === '\n' || c === '\t'
}

function getLineStart(text, position) {
  while (position > 0 && text[position - 1] !== '\n') position--
  return position
}

const UnorderedListMark = '• '
