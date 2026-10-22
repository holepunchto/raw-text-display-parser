const {
  DISPLAY_TYPES,
  BlankSpace,
  NewLine,
  UnorderedListInputMark,
  UnorderedListOutMark,
  overlaps,
  isMention,
  isLink,
  isEmoji,
  EmojiSequence,
  EmojiStyleSequence,
  isDefaultEmoji,
  isUnorderedList,
  noop,
  isEndWord,
  getLineStart,
  getLineEnd,
  isOrderedListEntry,
  isOrderedList
} = require('./utils')

const {
  EMOJI,
  MENTION,
  HTTP_LINK,
  PEAR_LINK,
  UNORDERED_LIST_ITEM,
  ORDERED_LIST_ITEM
} = DISPLAY_TYPES

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
    this._isInTextWord = false
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

  _fireAllWords(_from, _to) {
    // widen to whole words so an edit never dispatches a word fragment
    let start = _from
    let to = Math.min(_to, this.text.length)
    while (start > 0 && !isEndWord(this.text[start - 1])) start--
    while (to < this.text.length && !isEndWord(this.text[to])) to++

    while (start < to) {
      while (start < to && isEndWord(this.text[start])) start++
      if (start >= to) break

      let end = start
      while (end < to && !isEndWord(this.text[end])) end++

      const alreadyCovered = this.display.some(
        (d) => d.start <= start && d.end >= end
      )
      if (!alreadyCovered) {
        const oldLength = this.text.length
        this._dispatchWord(this.text.slice(start, end), start, end)
        // a callback can replace the word, shifting the rest of the range
        to += this.text.length - oldLength
        start = this.end
      } else {
        start = end
      }
    }

    this._updateWord()
  }

  _fireAllLists(from, to) {
    let index = getLineEnd(this.text, from + 1)

    let position = this.position
    while (true) {
      const start = getLineStart(this.text, index)
      if (
        start >= from &&
        start + 2 < Math.min(to, this.text.length) &&
        isUnorderedList(this.text.slice(start, start + 2))
      ) {
        const end = start + 2
        const alreadyCovered = this.display.some(
          (d) =>
            d.start <= start && d.end >= end && d.type === UNORDERED_LIST_ITEM
        )
        if (!alreadyCovered) {
          const length = this.text.length
          this.onlist(start, end, UNORDERED_LIST_ITEM)
          if (end < position) position += this.text.length - length

          // the host may have grown or shrunk this.text, find the line's end again from its start
          index = getLineEnd(this.text, start)
        }
      }

      if (
        start >= from &&
        start + 3 < Math.min(to, this.text.length) &&
        isOrderedList(this.text.slice(start, start + 3))
      ) {
        const end = start + 3
        const alreadyCovered = this.display.some(
          (d) =>
            d.start <= start && d.end >= end && d.type === ORDERED_LIST_ITEM
        )
        if (!alreadyCovered) {
          const length = this.text.length
          this.onlist(start, end, ORDERED_LIST_ITEM, Number(this.text[start]))
          if (end < position) position += this.text.length - length

          index = getLineEnd(this.text, start)
        }
      }

      if (index >= Math.min(to, this.text.length)) break

      index = getLineEnd(this.text, index + 1)
    }

    this.position = position
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
      this._dispatchDefaultEmojis(word, start, end)
    } else {
      this.onclear(word)
    }
  }

  _dispatchDefaultEmojis(word, start, end) {
    let matches = [...word.matchAll(EmojiSequence)]
    const isEmojiOnly = matches.map((m) => m[0]).join('') === word
    if (!isEmojiOnly) matches = [...word.matchAll(EmojiStyleSequence)]
    if (isEmojiOnly ? matches.length < 2 : matches.length === 0) {
      this.ondefaultemoji(word)
      return
    }

    const text = this.text
    this._isInTextWord = !isEmojiOnly
    try {
      for (const match of matches) {
        const emojiStart = start + match.index
        const emojiEnd = emojiStart + match[0].length
        const isMarked = this.display.some(
          (d) =>
            d.type === EMOJI && d.start === emojiStart && d.end === emojiEnd
        )
        if (isMarked) continue
        this.word = match[0]
        this.start = emojiStart
        this.end = emojiEnd
        this.ondefaultemoji(match[0])
        if (this.text !== text) return
      }
    } finally {
      this._isInTextWord = false
    }
    this.word = word
    this.start = start
    this.end = end
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
      if (isEndWord(ch)) {
        start = i + 1
        break
      }
    }

    for (let i = this.position; i < this.text.length; i++) {
      const ch = this.text[i]
      if (isEndWord(ch)) {
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

  _removeText(start, end, replacer = '') {
    const position = this.position

    this.selectRange(start, end)
    this.appendText(replacer)

    if (position <= start) this.position = position
    else if (position > end) {
      this.position = position - (end - start) + replacer.length
    }

    this._updateWord()
  }

  _fireList(inserted) {
    // a marker that is no longer at the start of a line is not an item anymore
    for (let i = this.display.length - 1; i >= 0; i--) {
      const d = this.display[i]
      if (
        d.type === UNORDERED_LIST_ITEM &&
        d.start > 0 &&
        this.text[d.start - 1] !== NewLine
      ) {
        this._removeText(d.start, d.start + 1, UnorderedListInputMark)
      } else if (
        d.type === ORDERED_LIST_ITEM &&
        d.start > 0 &&
        this.text[d.start - 1] !== NewLine
      ) {
        // the typed mark is already the original text, only drop the display
        this.display.splice(i, 1)
      }
    }

    const lineStart = getLineStart(this.text, this.position)
    const line = this.text.slice(lineStart, this.position)

    if (isUnorderedList(line)) {
      return this.onlist(lineStart, this.position, UNORDERED_LIST_ITEM)
    }

    if (isOrderedListEntry(line)) {
      return this.onlist(lineStart, this.position, ORDERED_LIST_ITEM, 1)
    }

    if (inserted !== NewLine) return

    // enter on a list item continues the list on the new line
    const prevStart = getLineStart(this.text, lineStart - 1)
    const item = this.display.find(
      (d) =>
        d.start === prevStart &&
        [UNORDERED_LIST_ITEM, ORDERED_LIST_ITEM].includes(d.type)
    )

    if (!item) return

    // enter on an empty item ends the list: drop its marker and the newline
    const atLineEnd =
      this.position === this.text.length || this.text[this.position] === NewLine
    if (item.end === lineStart - 1 && atLineEnd) {
      return this._removeText(item.start, this.position)
    }

    this.onlist(
      this.position,
      this.position,
      item.type,
      item.type === ORDERED_LIST_ITEM ? item.index + 1 : undefined
    )
  }

  resync(text) {
    const range =
      this.range && this.range.end > this.range.start ? this.range : null
    const removed = range ? 0 : Math.max(0, this.text.length - text.length)
    const shared = this.position - removed
    const display = []

    let end = 0
    for (; end < shared; end++) {
      if (this.text[end] === text[end]) continue
      break
    }

    // a deleted emoji can share leading code units with the next one (surrogate half,
    // base emoji before a skin tone); a prefix ending inside it drops the next display
    const split = this.display.find(
      (d) => d.type === EMOJI && d.start < end && end < d.end
    )
    if (split) end = split.start

    const startNewLimit = range
      ? range.end - (this.text.length - text.length)
      : end
    const startOldLimit = range ? range.end : end
    let startNew = text.length
    let startOld = this.text.length

    while (
      startNew > startNewLimit &&
      startOld > startOldLimit &&
      this.text[startOld - 1] === text[startNew - 1]
    ) {
      startNew--
      startOld--
    }

    let _text = text
    const delta = startNew - startOld
    let from = end
    let to = startNew

    for (const d of this.display) {
      if (d.end <= end) display.push(d)
      else if (startOld <= d.start) {
        display.push({ ...d, start: d.start + delta, end: d.end + delta })
      } else if (
        d.type === UNORDERED_LIST_ITEM &&
        d.start < end &&
        this.text[d.start] === UnorderedListOutMark
      ) {
        // the edit broke the marker but left its bullet: back to `-`
        _text =
          text.slice(0, d.start) +
          UnorderedListInputMark +
          text.slice(d.start + 1)
      } else if (d.start < from) {
        // the edit overlaps this display, re-dispatch everything it covered
        from = Math.min(from, d.start)
        to = Math.max(to, d.end + delta)
      }
    }

    this.position = this.text.length ? startNew : _text.length
    this.text = _text
    this.display = display
    this.range = null

    this._fireList(_text.slice(end, startNew))
    startNew > end && this._fireAllLists(end, startNew)
    this._fireAllWords(from, to)
    this._reindexUnorderedLists()
  }

  _reindexUnorderedLists() {
    let prev = null
    for (const d of this.display) {
      if (d.type !== ORDERED_LIST_ITEM) continue

      // an item on the line right after the previous item continues its list
      const continues =
        prev !== null && getLineStart(this.text, d.start - 1) === prev.start
      const index = continues ? prev.index + 1 : 1
      if (d.index !== index) {
        d.content = `${index}.${BlankSpace}`
        d.index = index
        this.text = `${this.text.slice(0, d.start)}${index}${this.text.slice(d.start + 1)}`
      }
      prev = d
    }
  }

  // _setListIndex(item, index) {
  //   const content = `${index}.${BlankSpace}`
  //   const delta = content.length - item.length
  //   const end = item.end

  //   this.text = this.text.slice(0, item.start) + content + this.text.slice(end)

  //   for (const d of this.display) {
  //     if (d !== item && end <= d.start) {
  //       d.start += delta
  //       d.end += delta
  //     }
  //   }

  //   if (this.position >= end) this.position += delta
  //   else if (this.position > item.start)
  //     this.position = item.start + content.length

  //   item.end = item.start + content.length
  //   item.content = content
  //   item.length = content.length
  //   item.index = index
  // }

  setEmoji(input, code, emoji, isDefaultEmoji) {
    if (this.word !== input) return false

    const start = this.start
    // Check if we already have an emoji registered at this exact spot
    const existing = this.display.find(
      (d) => d.start === start && d.type === EMOJI
    )
    // We skip appending the space to break the loop.
    if (isDefaultEmoji && existing) {
      return true
    }

    if (isDefaultEmoji) {
      // appending while the cursor is before the word re-dispatches it forever
      if (
        !this._isInTextWord &&
        this.position === this.end &&
        this.end === this.text.length
      ) {
        this.appendText(BlankSpace)
      }
    } else if (emoji) {
      this.selectRange(this.start, this.end)
      this.appendText(emoji)
    } else if (input !== code) {
      this.selectRange(this.start, this.end)
      const ensureTrailingSpace = !isEndWord(this.text[this.end])
      this.appendText(`${code}${ensureTrailingSpace ? BlankSpace : ''}`)
    }

    const length = emoji ? emoji.length : code.length
    const upd = {
      type: EMOJI,
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
      type: EMOJI,
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
      this.appendText(`${name}${ensureTrailingSpace ? BlankSpace : ''}`)
    }

    const upd = {
      type: MENTION,
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
      type: HTTP_LINK,
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
      type: PEAR_LINK,
      start: this.start,
      end: this.end,
      content: link,
      length: link.length
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)

    return true
  }

  setList(start, end, type, index) {
    if (start < 0 || end < start || end > this.text.length) return false

    const content =
      type === UNORDERED_LIST_ITEM
        ? `${UnorderedListOutMark}${BlankSpace}`
        : `${index}.${BlankSpace}`
    this.selectRange(start, end)
    this.appendText(content)

    const upd = {
      type,
      start,
      end: start + content.length,
      content,
      length: content.length,
      index
    }

    this._clearPrevious(upd.start, upd.end)
    this._insertDisplay(upd)
    return true
  }

  isPearLink(word) {
    return word.toLowerCase().startsWith(`${this.protocol}://`)
  }
}
