const test = require('brittle')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')
const Parser = require('..')

const { HTTP_LINK, MENTION, EMOJI } = DISPLAY_TYPES

const keetLink = 'https://keet.io'

const p = new Parser({
  onmention: (mention) => {
    if (mention.startsWith('@a')) p.setMention(mention, '@alice', 'member-id-a')
    if (mention.startsWith('@b')) p.setMention(mention, '@bob', 'member-id-b')
    if (mention.startsWith('@d')) p.setMention(mention, '@david', 'member-id-d')
  },
  onemoji: (emoji) => {
    if (emoji.startsWith(':smi')) p.setEmoji(emoji, ':smile:', '😄')
    if (emoji.startsWith(':keet')) p.setEmoji(':keet', ':keet_party:')
  },
  ondefaultemoji: (emoji) => {
    if (emoji === '😀') p.setEmoji(emoji, 'grinning', emoji, true)
    if (emoji === '🚀') p.setEmoji(emoji, 'rocket', emoji, true)
    if (emoji === '😃') p.setEmoji(emoji, 'smiley', emoji, true)
  },
  onlink: (link) => p.setLink(link, link)
})

const assert = (_t, _text, _display, _position) => {
  _t.is(p.text, _text)
  _t.is(p.position, _position || _text.length)
  _t.alike(p.display, _display)
}

const display = (start, content, type, extra) => {
  const length =
    type === EMOJI
      ? content.startsWith('keet')
        ? content.length + 2
        : 2
      : content.length

  const object = {
    start,
    end: start + length,
    type,
    length
  }

  return type === MENTION
    ? { ...object, memberId: extra }
    : { ...object, content: content }
}

test('mixed type: insert at end', (t) => {
  let _text = ''
  let _display = []
  let _start = 0
  p.reset()

  p.resync((_text += keetLink))
  _display.push(display(_start, keetLink, HTTP_LINK))
  assert(t, _text, _display)

  _start = _text.length + 1
  p.resync((_text += ' 🚀'))
  _text += ' ' // parser auto add extra space for emoji
  _display.push(display(_start, 'rocket', EMOJI))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += '@b'))
  _text += 'ob ' // parser auto add extra space for mention
  _display.push(display(_start, '@bob', MENTION, 'member-id-b'))
  assert(t, _text, _display)
})

test('mixed type: insert in the middle link keep it', (t) => {
  p.reset()

  p.resync('https://keet.io')
  assert(t, 'https://keet.io', [display(0, 'https://keet.io', HTTP_LINK)])

  p.resync('https://kkkeet.io')
  assert(
    t,
    'https://kkkeet.io',
    [display(0, 'https://kkkeet.io', HTTP_LINK)],
    10
  )
})

test('mixed type: insert in the middle link remove it', (t) => {
  p.reset()

  p.resync('https://keet.io')
  assert(t, 'https://keet.io', [display(0, 'https://keet.io', HTTP_LINK)])

  p.resync('httttps://keet.io')
  assert(t, 'httttps://keet.io', [], 3)
})

test('mixed type: insert in the middle emoji remove it', (t) => {
  p.reset()

  p.resync('😀')
  assert(t, '😀 ', [display(0, 'grinning', EMOJI)])

  p.resync(':smi 😀 ')
  assert(
    t,
    '😄 😀 ',
    [display(0, 'smile', EMOJI), display(3, 'grinning', EMOJI)],
    2
  )

  p.resync(':keet 😄 😀 ')
  assert(
    t,
    ':keet_party: 😄 😀 ',
    [
      display(0, 'keet_party', EMOJI),
      display(13, 'smile', EMOJI),
      display(16, 'grinning', EMOJI)
    ],
    12
  )

  p.resync(':keetx_party: 😄 😀 ')
  assert(
    t,
    ':keetx_party: 😄 😀 ',
    [display(14, 'smile', EMOJI), display(17, 'grinning', EMOJI)],
    6
  )

  p.resync(':keetx_party: x 😀 ')
  assert(t, ':keetx_party: x 😀 ', [display(16, 'grinning', EMOJI)], 15)

  p.resync(':keetx_party: x x ')
  assert(t, ':keetx_party: x x ', [], 17)
})

test('mixed type: type, then edit in the middle, at the start, at the end', (t) => {
  let _text = ''
  let _display = []
  let _start = 0
  p.reset()

  p.resync((_text += '😀')) // text = "😀 "
  _text += ' ' // parser auto add extra space for emoji
  _display.push(display(_start, 'grinning', EMOJI))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += keetLink)) // text = "😀 https://keet.io"
  _display.push(display(_start, keetLink, HTTP_LINK))
  assert(t, _text, _display)

  _start = _text.length + 1
  p.resync((_text += ' @a')) // text = "😀 https://keet.io @alice "
  _text += 'lice ' // parser auto add extra space mention
  _display.push(display(_start, '@alice', MENTION, 'member-id-a'))
  assert(t, _text, _display)

  // edit in the middle: add a subdomain inside the link,
  const docsLink = 'https://docs.keet.io'
  _text = _text.replace(keetLink, docsLink)
  p.resync(_text) // text = "😀 https://docs.keet.io @alice "
  _display = [
    _display[0],
    display(3, docsLink, HTTP_LINK),
    display(24, '@alice', MENTION, 'member-id-a')
  ]
  assert(t, _text, _display, 16)

  _text = 'hi ' + _text
  p.resync(_text) // text = "hi 😀 https://docs.keet.io @alice "
  _display = [
    display(3, 'grinning', EMOJI),
    display(6, docsLink, HTTP_LINK),
    display(27, '@alice', MENTION, 'member-id-a')
  ]
  assert(t, _text, _display, 3)

  _start = _text.length
  p.resync((_text += '@b')) // text = "hi 😀 https://docs.keet.io @alice @bob "
  _text += 'ob ' // parser auto add extra space mention
  _display.push(display(_start, '@bob', MENTION, 'member-id-b'))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += '🚀')) // text = "hi 😀 https://docs.keet.io @alice @bob 🚀 "
  _text += ' ' // parser auto add extra space emoji
  _display.push(display(_start, 'rocket', EMOJI))
  assert(t, _text, _display)

  p.resync('hi 😀 @d https://docs.keet.io @alice @bob 🚀 ')
  _text = 'hi 😀 @david https://docs.keet.io @alice @bob 🚀 '
  _display = [
    _display[0],
    display(6, '@david', MENTION, 'member-id-d'),
    display(13, docsLink, HTTP_LINK),
    display(34, '@alice', MENTION, 'member-id-a'),
    display(41, '@bob', MENTION, 'member-id-b'),
    display(46, 'rocket', EMOJI)
  ]
  assert(t, _text, _display, 12)
})
