const BlankSpace = ' '
const NewLine = '\n'
const UnorderedListInputMark = '-'
const UnorderedListOutMark = '●'
const OrderedListInputMark = '1'
const OrderedListInputDotMark = '.'

const DISPLAY_TYPES = {
  MENTION: 1,
  HTTP_LINK: 2,
  PEAR_LINK: 3,
  BOLD: 4,
  ITALIC: 5,
  CODE: 6,
  EMOJI: 7,
  CODE_BLOCK: 8,
  STRIKE_THROUGH: 9,
  TRANSLATION: 10,
  ORDERED_LIST_ITEM: 11,
  UNORDERED_LIST_ITEM: 12
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

const EmojiSequence =
  /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F}|[\u{E0020}-\u{E007F}])*(?:\u{200D}\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F})*)*/gu

// next to text, text-style symbols (™) need VS16 or a sequence
const EmojiStyleSequence =
  /(?:(?=\p{Extended_Pictographic})\p{Emoji_Presentation}(?!\u{FE0E})|\p{Extended_Pictographic}(?=\u{FE0F}|\p{Emoji_Modifier}|\u{200D}))(?:\p{Emoji_Modifier}|\u{FE0F}|[\u{E0020}-\u{E007F}])*(?:\u{200D}\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F})*)*/gu

function isDefaultEmoji(word) {
  return /\p{Extended_Pictographic}/u.test(word)
}

function isUnorderedList(mark) {
  return mark === `${UnorderedListInputMark}${BlankSpace}`
}

function isOrderedListEntry(mark) {
  return (
    mark === `${OrderedListInputMark}${OrderedListInputDotMark}${BlankSpace}`
  )
}

function isOrderedList(mark) {
  const dot = mark.indexOf(OrderedListInputDotMark)
  const index = Number(mark.slice(0, dot))
  return (
    !isNaN(index) &&
    index > 0 &&
    index < 1000 &&
    mark === `${index}${OrderedListInputDotMark}${BlankSpace}`
  )
}

function noop() {}

function isEndWord(c) {
  return c === BlankSpace || c === NewLine || c === '\t'
}

function getLineStart(text, position) {
  while (position > 0 && text[position - 1] !== NewLine) position--
  return position
}

function getLineEnd(text, start) {
  const index = text.indexOf(NewLine, start)
  if (index === -1) return text.length
  return index
}

module.exports = {
  BlankSpace,
  NewLine,
  UnorderedListInputMark,
  UnorderedListOutMark,
  OrderedListInputMark,
  OrderedListInputDotMark,
  DISPLAY_TYPES,
  overlaps,
  isMention,
  isLink,
  isEmoji,
  EmojiSequence,
  EmojiStyleSequence,
  isDefaultEmoji,
  isUnorderedList,
  isOrderedListEntry,
  isOrderedList,
  noop,
  isEndWord,
  getLineStart,
  getLineEnd
}
