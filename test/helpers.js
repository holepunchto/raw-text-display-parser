const Parser = require('..')

//   defaultemoji: (parser) => ({
//     ondefaultemoji: (word) => parser().setEmoji(word, 'grinning', word, true)
//   }),

const makeParser = (options = {}) => {
  const p = new Parser({
    onlink: (link) => p.setLink(link, link),
    onpearlink: (link) => p.setPearLink(link),
    onmention: (mention) => p.setMention(mention, '@bob', 'member-id'),
    onemoji: (emoji) => {
      const emojis = {
        ':smile:': '😄',
        ':pear:': '🍐'
      }
      const customEmojis = {
        ':keet_party:': ':keet_party:'
      }
      if (emojis[emoji]) return p.setEmoji(emoji, emoji, emojis[emoji])
      if (customEmojis[emoji]) return p.setEmoji(emoji, customEmojis[emoji])
      p.setEmoji(emoji, emoji)
    },
    onlist: (start, end, type, index) => p.setList(start, end, type, index),
    ...options
  })
  return p
}

module.exports = { makeParser }
