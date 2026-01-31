const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

test('setEmoji normally', (t) => {
  const p = new Parser()

  p.appendText(':smi')
  const success1 = p.setEmoji(':smi', ':smile:')

  t.ok(success1)
  t.is(p.text, ':smile: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 7,
      content: 'smile',
      length: 7
    }
  ])

  p.setPosition(0)
  p.appendText(' ')
  p.setPosition(0)

  p.appendText(':kee')
  const success2 = p.setEmoji(':kee', ':keet_party:')

  t.ok(success2)
  t.is(p.text, ':keet_party:  :smile: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 12,
      content: 'keet_party',
      length: 12
    },
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 14,
      end: 21,
      content: 'smile',
      length: 7
    }
  ])
})

test('setEmoji replaces shortcode with emoji', (t) => {
  const p = new Parser()

  p.appendText(':smile:')
  const success = p.setEmoji(':smile:', ':smile:', '😄')

  t.ok(success)
  t.is(p.text, '😄')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'smile',
      length: 2
    }
  ])
})

test('setEmoji should prioritise emoji over input !== code', (t) => {
  const p = new Parser()

  p.appendText(':smil')
  const success = p.setEmoji(':smil', ':smile:', '😄')

  t.ok(success)
  t.is(p.text, '😄')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'smile',
      length: 2
    }
  ])
})

test('setEmoji returns false if shortcode not found', (t) => {
  const p = new Parser()

  p.appendText(':smile:')
  const success = p.setEmoji(':wave:', ':wave:')

  t.not(success)
})

test('apply emoji space check', function (t) {
  let emojiCalled = 0
  let lastWord = ''
  let clearCalled = 0
  const p = new Parser({
    onemoji: (emoji) => {
      emojiCalled++
      lastWord = emoji
    },
    onclear: () => clearCalled++
  })

  p.appendText(':keet')
  t.is(emojiCalled, 1)
  t.is(lastWord, ':keet')

  p.setEmoji(':keet', ':keet_party:')
  t.is(emojiCalled, 1)
  t.is(lastWord, ':keet')
  t.is(clearCalled, 1)

  t.is(p.text, ':keet_party: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 12,
      content: 'keet_party',
      length: 12
    }
  ])

  p.appendText('awesome')
  t.is(p.text, ':keet_party: awesome')
  t.is(p.display.length, 1)
})

test('setEmoji normally then type in middle to remove it', (t) => {
  const p = new Parser()

  p.appendText(':smi')
  const success1 = p.setEmoji(':smi', ':smile:')

  t.ok(success1)
  t.is(p.text, ':smile: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 7,
      content: 'smile',
      length: 7
    }
  ])

  p.setPosition(1)
  p.appendText('x')

  t.is(p.text, ':xsmile: ')
  t.is(p.display.length, 0)
})

test('setEmoji normally then type outside not remove it', (t) => {
  const p = new Parser()

  p.appendText('x :smi')
  const success1 = p.setEmoji(':smi', ':smile:')

  t.ok(success1)
  t.is(p.text, 'x :smile: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 2,
      end: 9,
      content: 'smile',
      length: 7
    }
  ])

  p.setPosition(2)
  p.backspace()
  p.backspace()

  t.is(p.text, ':smile: ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 7,
      content: 'smile',
      length: 7
    }
  ])
})
test('setUnicodeEmoji inserts a display mark for an existing unicode emoji range', (t) => {
  const p = new Parser()

  p.appendText('hi 😀!')

  const ok = p.setUnicodeEmoji(3, 3 + '😀'.length, 'grinning')

  t.ok(ok)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 3,
      end: 3 + '😀'.length,
      content: 'grinning',
      length: '😀'.length
    }
  ])

  t.is(p.text, 'hi 😀!')
})

test('setUnicodeEmoji returns false for invalid ranges', (t) => {
  const p = new Parser()
  p.appendText('hi 😀!')

  t.not(p.setUnicodeEmoji(-1, 1, 'grinning'))
  t.not(p.setUnicodeEmoji(2, 2, 'grinning'))
  t.not(p.setUnicodeEmoji(2, 999, 'grinning'))
})

test('setUnicodeEmoji clears previous overlapping emoji marks', (t) => {
  const p = new Parser()

  p.appendText('😀😃')

  const ok1 = p.setUnicodeEmoji(0, '😀'.length, 'grinning')
  t.ok(ok1)

  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: '😀'.length,
      content: 'grinning',
      length: '😀'.length
    }
  ])

  const ok2 = p.setUnicodeEmoji(0, '😀'.length + '😃'.length, 'two_emojis')
  t.ok(ok2)

  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: '😀'.length + '😃'.length,
      content: 'two_emojis',
      length: '😀'.length + '😃'.length
    }
  ])
})

test('setUnicodeEmoji inserts marks in sorted order by start', (t) => {
  const p = new Parser()

  p.appendText('A 😀 B 😃 C')

  // "A " => 2
  // 😀 starts at 2
  // "A 😀 B " => 2 + 2 + 3 = 7 => 😃 starts at 7
  const firstStart = 2
  const secondStart = 7

  const ok2 = p.setUnicodeEmoji(
    secondStart,
    secondStart + '😃'.length,
    'smiley'
  )
  t.ok(ok2)

  const ok1 = p.setUnicodeEmoji(
    firstStart,
    firstStart + '😀'.length,
    'grinning'
  )
  t.ok(ok1)

  // should be ordered by start
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: firstStart,
      end: firstStart + '😀'.length,
      content: 'grinning',
      length: '😀'.length
    },
    {
      type: DISPLAY_TYPES.EMOJI,
      start: secondStart,
      end: secondStart + '😃'.length,
      content: 'smiley',
      length: '😃'.length
    }
  ])
})

test('typing inside a setUnicodeEmoji range removes the mark', (t) => {
  const p = new Parser()

  p.appendText('hi 😀!')

  const start = 3
  const end = 3 + '😀'.length
  p.setUnicodeEmoji(start, end, 'grinning')

  t.is(p.display.length, 1)

  p.setPosition(start + 1)
  p.appendText('x')

  t.is(p.display.length, 0)
})
