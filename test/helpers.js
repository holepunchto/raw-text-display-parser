const Parser = require('..')
const { DISPLAY_TYPES } = require('../utils')

const {
  HTTP_LINK,
  PEAR_LINK,
  MENTION,
  EMOJI,
  ORDERED_LIST_ITEM,
  UNORDERED_LIST_ITEM
} = DISPLAY_TYPES

const makeParser = (options = {}) => {
  const p = new Parser({
    onlink: (link) => p.setLink(link, link),
    onpearlink: (link) => p.setPearLink(link),
    onmention: (mention) => {
      if (mention.startsWith('@a') && mention.length <= 6)
        return p.setMention(mention, '@alice', 'member-id-a')
      if (mention.startsWith('@b'))
        return p.setMention(mention, '@bob', 'member-id-b')
      if (mention.startsWith('@d'))
        return p.setMention(mention, '@david', 'member-id-d')
    },
    onemoji: (emoji) => {
      const emojis = {
        ':smile:': '😄',
        ':pear:': '🍐'
      }
      const customEmojis = {
        ':keet_party:': ':keet_party:'
      }
      if (emoji.startsWith(':smi')) return p.setEmoji(emoji, ':smile:', '😄')
      if (emoji.startsWith(':kee')) return p.setEmoji(emoji, ':keet_party:')
      if (emojis[emoji]) return p.setEmoji(emoji, emoji, emojis[emoji])
      if (customEmojis[emoji]) return p.setEmoji(emoji, customEmojis[emoji])
    },
    ondefaultemoji(emoji) {
      const emojis = {
        '😀': 'grinning',
        '🚀': 'rocket',
        '😃': 'smiley',
        '😂': 'joy'
      }
      if (emojis[emoji]) return p.setEmoji(emoji, emojis[emoji], emoji, true)
    },
    onlist: (start, end, type, index) => p.setList(start, end, type, index),
    ...options
  })
  return p
}

const display = (type, start, length, extra = {}) => ({
  type,
  start,
  end: start + length,
  length,
  ...extra
})

const linkDisplay = (start, content) =>
  display(HTTP_LINK, start, content.length, { content })

const pearLinkDisplay = (start, content) =>
  display(PEAR_LINK, start, content.length, { content })

const mentionDisplay = (start, mention, memberId) =>
  display(MENTION, start, mention.length, { memberId })

const emojiDisplay = (start, content, length = 2) =>
  display(EMOJI, start, length, { content })

const customEmojiDisplay = (start, content) =>
  display(EMOJI, start, content.length + 2, { content })

const orderedListDisplay = (start, index) => {
  const content = `${index}. `
  return display(ORDERED_LIST_ITEM, start, content.length, { content, index })
}

const unorderedListDisplay = (start) =>
  display(UNORDERED_LIST_ITEM, start, 2, { content: '● ' })

const makeOrderedListParser = ({ text = '', display = [] } = {}) =>
  makeParser({
    text,
    display: display.map((start, index) => orderedListDisplay(start, index + 1))
  })

const makeUnorderedListParser = ({ text = '', display = [] } = {}) =>
  makeParser({ text, display: display.map(unorderedListDisplay) })

module.exports = {
  makeParser,
  makeOrderedListParser,
  makeUnorderedListParser,
  linkDisplay,
  pearLinkDisplay,
  mentionDisplay,
  emojiDisplay,
  customEmojiDisplay,
  orderedListDisplay,
  unorderedListDisplay
}
