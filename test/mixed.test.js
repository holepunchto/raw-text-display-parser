const test = require('brittle')

const {
  makeParser,
  linkDisplay,
  mentionDisplay,
  emojiDisplay,
  customEmojiDisplay
} = require('./helpers')

const keetLink = 'https://keet.io'

const p = makeParser()

const assert = (_t, _text, _display, _position) => {
  _t.is(p.text, _text)
  _t.is(p.position, _position || _text.length)
  _t.alike(p.display, _display)
}

test('mixed type: insert at end', (t) => {
  let _text = ''
  let _display = []
  let _start = 0
  p.reset()

  p.resync((_text += keetLink))
  _display.push(linkDisplay(_start, keetLink))
  assert(t, _text, _display)

  _start = _text.length + 1
  p.resync((_text += ' 🚀'))
  _text += ' ' // parser auto add extra space for emoji
  _display.push(emojiDisplay(_start, 'rocket'))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += '@b'))
  _text += 'ob ' // parser auto add extra space for mention
  _display.push(mentionDisplay(_start, '@bob', 'member-id-b'))
  assert(t, _text, _display)
})

test('mixed type: insert in the middle link keep it', (t) => {
  p.reset()

  p.resync('https://keet.io')
  assert(t, 'https://keet.io', [linkDisplay(0, 'https://keet.io')])

  p.setPosition(8)
  p.resync('https://kkkeet.io')
  assert(t, 'https://kkkeet.io', [linkDisplay(0, 'https://kkkeet.io')], 10)
})

test('mixed type: insert in the middle link remove it', (t) => {
  p.reset()

  p.resync('https://keet.io')
  assert(t, 'https://keet.io', [linkDisplay(0, 'https://keet.io')])

  p.setPosition(1)
  p.resync('httttps://keet.io')
  assert(t, 'httttps://keet.io', [], 3)
})

test('mixed type: insert in the middle emoji remove it', (t) => {
  p.reset()

  p.resync('😀')
  assert(t, '😀 ', [emojiDisplay(0, 'grinning')])

  p.resync(':smi 😀 ')
  assert(
    t,
    '😄 😀 ',
    [emojiDisplay(0, 'smile'), emojiDisplay(3, 'grinning')],
    2
  )

  p.resync(':keet 😄 😀 ')
  assert(
    t,
    ':keet_party: 😄 😀 ',
    [
      customEmojiDisplay(0, 'keet_party'),
      emojiDisplay(13, 'smile'),
      emojiDisplay(16, 'grinning')
    ],
    12
  )

  p.resync(':kexet_party: 😄 😀 ')
  assert(
    t,
    ':kexet_party: 😄 😀 ',
    [emojiDisplay(14, 'smile'), emojiDisplay(17, 'grinning')],
    4
  )

  p.resync(':kexet_party: x 😀 ')
  assert(t, ':kexet_party: x 😀 ', [emojiDisplay(16, 'grinning')], 15)

  p.resync(':kexet_party: x x ')
  assert(t, ':kexet_party: x x ', [], 17)
})

test('mixed type: type, then edit in the middle, at the start, at the end', (t) => {
  let _text = ''
  let _display = []
  let _start = 0
  p.reset()

  p.resync((_text += '😀')) // text = "😀 "
  _text += ' ' // parser auto add extra space for emoji
  _display.push(emojiDisplay(_start, 'grinning'))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += keetLink)) // text = "😀 https://keet.io"
  _display.push(linkDisplay(_start, keetLink))
  assert(t, _text, _display)

  _start = _text.length + 1
  p.resync((_text += ' @a')) // text = "😀 https://keet.io @alice "
  _text += 'lice ' // parser auto add extra space mention
  _display.push(mentionDisplay(_start, '@alice', 'member-id-a'))
  assert(t, _text, _display)

  // edit in the middle: add a subdomain inside the link,
  const docsLink = 'https://docs.keet.io'
  _text = _text.replace(keetLink, docsLink)
  p.selectRange(3, 18)
  p.resync(_text) // text = "😀 https://docs.keet.io @alice "
  _display = [
    _display[0],
    linkDisplay(3, docsLink),
    mentionDisplay(24, '@alice', 'member-id-a')
  ]
  assert(t, _text, _display, 23)

  _text = 'hi ' + _text
  p.setPosition(0)
  p.resync(_text) // text = "hi 😀 https://docs.keet.io @alice "
  _display = [
    emojiDisplay(3, 'grinning'),
    linkDisplay(6, docsLink),
    mentionDisplay(27, '@alice', 'member-id-a')
  ]
  assert(t, _text, _display, 3)

  _start = _text.length
  p.resync((_text += '@b')) // text = "hi 😀 https://docs.keet.io @alice @bob "
  _text += 'ob ' // parser auto add extra space mention
  _display.push(mentionDisplay(_start, '@bob', 'member-id-b'))
  assert(t, _text, _display)

  _start = _text.length
  p.resync((_text += '🚀')) // text = "hi 😀 https://docs.keet.io @alice @bob 🚀 "
  _text += ' ' // parser auto add extra space emoji
  _display.push(emojiDisplay(_start, 'rocket'))
  assert(t, _text, _display)

  p.resync('hi 😀 @d https://docs.keet.io @alice @bob 🚀 ')
  _text = 'hi 😀 @david https://docs.keet.io @alice @bob 🚀 '
  _display = [
    _display[0],
    mentionDisplay(6, '@david', 'member-id-d'),
    linkDisplay(13, docsLink),
    mentionDisplay(34, '@alice', 'member-id-a'),
    mentionDisplay(41, '@bob', 'member-id-b'),
    emojiDisplay(46, 'rocket')
  ]
  assert(t, _text, _display, 12)
})

test('mixed type: type, then edit in the middle of the link', (t) => {
  let _text = '😀 https://keet.io @alice '
  let _display = [
    emojiDisplay(0, 'grinning'),
    linkDisplay(3, keetLink),
    mentionDisplay(19, '@alice', 'member-id-a')
  ]
  p.reset({ text: _text, display: _display })
  assert(t, _text, _display)

  // edit in the middle: add a subdomain inside the link,
  const docsLink = 'https://docs.keet.io'
  _text = _text.replace(keetLink, docsLink)
  p.setPosition(11)
  p.resync(_text) // text = "😀 https://docs.keet.io @alice "
  _display = [
    _display[0],
    linkDisplay(3, docsLink),
    mentionDisplay(24, '@alice', 'member-id-a')
  ]
  assert(t, _text, _display, 16)
})
