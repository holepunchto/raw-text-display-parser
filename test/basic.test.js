const test = require('brittle')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')
const Parser = require('..')

const { HTTP_LINK, PEAR_LINK, MENTION, EMOJI } = DISPLAY_TYPES

test('httpLink', (t) => {
  const text = 'https://keet.io'

  const p = new Parser({ onlink: (link) => p.setLink(link, link) })
  p.appendText(text)

  t.alike(p.display, [
    {
      type: HTTP_LINK,
      start: 0,
      end: 15,
      content: 'https://keet.io',
      length: 15
    }
  ])
})

test('pearLink', (t) => {
  const text = 'pear://keet/abcd'

  const p = new Parser({ onpearlink: (link) => p.setPearLink(link) })
  p.appendText(text)

  t.alike(p.display, [
    {
      type: PEAR_LINK,
      start: 0,
      end: 16,
      content: 'pear://keet/abcd',
      length: 16
    }
  ])
})

test('mention', (t) => {
  const text = '@username'
  const memberId = 123

  const p = new Parser({
    onmention: (mention) => p.setMention(mention, mention, memberId)
  })
  p.appendText(text)

  t.alike(p.display, [
    {
      type: MENTION,
      start: 0,
      end: 9,
      memberId,
      length: 9
    }
  ])
})

test('emoji', (t) => {
  const text = ':pear:'
  const emojis = { ':pear:': '🍐' }

  const p = new Parser({
    onemoji: (emoji) => p.setEmoji(emoji, emoji, emojis[emoji])
  })
  p.appendText(text)

  t.alike(p.display, [
    {
      type: EMOJI,
      start: 0,
      end: 2,
      content: 'pear',
      length: 2
    }
  ])
})

test('emoji not found', (t) => {
  const text = ':pear:'
  const emojis = {}

  const p = new Parser({
    onemoji: (emoji) => p.setEmoji(emoji, emoji, emojis[emoji])
  })
  p.appendText(text)

  t.alike(p.display, [
    {
      type: EMOJI,
      start: 0,
      end: 6,
      content: 'pear',
      length: 6
    }
  ])
})

test('ondefaultemoji is called for default emoji tokens', (t) => {
  let called = 0
  let last = null

  const p = new Parser({
    ondefaultemoji: (word) => {
      called++
      last = word
    }
  })
  p.appendText('😀')

  t.is(called, 1)
  t.is(last, '😀')
})

test('flush', (t) => {
  const text = 'http://keet.io'
  const p = new Parser({ onlink: (link) => p.setLink(link, link) })
  p.appendText(text)

  t.is(p.text, text)
  t.alike(p.display, [
    {
      type: HTTP_LINK,
      start: 0,
      end: 14,
      content: 'http://keet.io',
      length: 14
    }
  ])

  const data = p.flush('')

  t.is(data.text, '')
  t.is(data.display.length, 0)
})
