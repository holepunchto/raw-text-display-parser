const Parser = require('..')

const makeParser = (options = {}) => {
  const p = new Parser({
    onlink: (link) => p.setLink(link, link),
    onpearlink: (link) => p.setPearLink(link),
    onmention: (mention) => {
      if (mention.startsWith('@a'))
        return p.setMention(mention, '@alice', 'member-id-a')
      if (mention.startsWith('@b'))
        return p.setMention(mention, '@bob', 'member-id-b')
      if (mention.startsWith('@d'))
        return p.setMention(mention, '@david', 'member-id-d')
      p.setMention(mention, '@bob', 'member-id-b')
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
        '😃': 'smiley'
      }
      if (emojis[emoji]) return p.setEmoji(emoji, emojis[emoji], emoji, true)
    },
    onlist: (start, end, type, index) => p.setList(start, end, type, index),
    ...options
  })
  return p
}

module.exports = { makeParser }
