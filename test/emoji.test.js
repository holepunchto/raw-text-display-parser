const test = require('brittle')

const { makeParser, emojiDisplay, customEmojiDisplay } = require('./helpers')

test('setEmoji normally', (t) => {
  const p = makeParser()

  p.appendText(':smi')

  t.is(p.text, '😄')
  t.alike(p.display, [emojiDisplay(0, 'smile')])

  p.setPosition(0)
  p.appendText(' ')
  p.setPosition(0)

  p.appendText(':kee')

  t.is(p.text, ':keet_party: 😄')

  t.alike(p.display, [
    customEmojiDisplay(0, 'keet_party'),
    emojiDisplay(13, 'smile')
  ])
})

test('setEmoji replaces shortcode with emoji', (t) => {
  const p = makeParser()

  p.appendText(':smile:')

  t.is(p.text, '😄')
  t.alike(p.display, [emojiDisplay(0, 'smile')])
})

test('setEmoji should prioritise emoji over input !== code', (t) => {
  const p = makeParser()

  p.appendText(':smil')

  t.is(p.text, '😄')
  t.alike(p.display, [emojiDisplay(0, 'smile')])
})

test('setEmoji returns false if shortcode not found', (t) => {
  const p = makeParser()

  p.appendText(':smile:')
  const success = p.setEmoji(':wave:', ':wave:')

  t.not(success)
})

test('apply emoji space check', function (t) {
  let emojiCalled = 0
  let lastWord = ''
  let clearCalled = 0
  const p = makeParser({
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
  t.alike(p.display, [customEmojiDisplay(0, 'keet_party')])

  p.appendText('awesome')
  t.is(p.text, ':keet_party: awesome')
  t.is(p.display.length, 1)
})

test('ondefaultemoji can set display mark for default emoji (with trailing space)', (t) => {
  const p = makeParser()

  p.appendText('😀')

  t.is(p.text, '😀 ')

  t.alike(p.display, [emojiDisplay(0, 'grinning', '😀'.length)])
})

test('ondefaultemoji does not recurse when resync leaves cursor before an uncovered emoji word', (t) => {
  const p = makeParser()

  p.resync('x😀')
  p.resync('a 😀')

  t.is(p.text, 'a 😀')
  t.alike(p.display, [emojiDisplay(2, 'grinning', '😀'.length)])
})

test('setEmoji normally then type in middle to remove it', (t) => {
  const p = makeParser()

  p.appendText(':fac')
  const success1 = p.setEmoji(':fac', ':face:')

  t.ok(success1)
  t.is(p.text, ':face: ')
  t.alike(p.display, [customEmojiDisplay(0, 'face')])

  p.setPosition(1)
  p.appendText('x')

  t.is(p.text, ':xface: ')
  t.is(p.display.length, 0)
})

test('setEmoji normally then type outside not remove it', (t) => {
  const p = makeParser()

  p.appendText('x :smi')

  t.is(p.text, 'x 😄')
  t.alike(p.display, [emojiDisplay(2, 'smile')])

  p.setPosition(2)
  p.backspace()
  p.backspace()

  t.is(p.text, '😄')
  t.alike(p.display, [emojiDisplay(0, 'smile')])
})
test('setUnicodeEmoji inserts a display mark for an existing unicode emoji range', (t) => {
  const p = makeParser()

  p.appendText('hi 😀!')

  const ok = p.setUnicodeEmoji(3, 3 + '😀'.length, 'grinning')

  t.ok(ok)
  t.alike(p.display, [emojiDisplay(3, 'grinning', '😀'.length)])

  t.is(p.text, 'hi 😀!')
})

test('setUnicodeEmoji returns false for invalid ranges', (t) => {
  const p = makeParser()
  p.appendText('hi 😀!')

  t.not(p.setUnicodeEmoji(-1, 1, 'grinning'))
  t.not(p.setUnicodeEmoji(2, 2, 'grinning'))
  t.not(p.setUnicodeEmoji(2, 999, 'grinning'))
})

test('setUnicodeEmoji clears previous overlapping emoji marks', (t) => {
  const p = makeParser()

  p.appendText('😀😃')

  t.alike(p.display, [
    emojiDisplay(0, 'grinning', '😀'.length),
    emojiDisplay('😀'.length, 'smiley', '😃'.length)
  ])
})

test('setUnicodeEmoji inserts marks in sorted order by start', (t) => {
  const p = makeParser()

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
    emojiDisplay(firstStart, 'grinning', '😀'.length),
    emojiDisplay(secondStart, 'smiley', '😃'.length)
  ])
})

test('typing inside a setUnicodeEmoji range removes the mark', (t) => {
  const p = makeParser()

  p.appendText('hi 😀!')

  const start = 3
  const end = 3 + '😀'.length
  p.setUnicodeEmoji(start, end, 'grinning')

  t.is(p.display.length, 1)

  p.setPosition(start + 1)
  p.appendText('x')

  t.is(p.display.length, 0)
})

test('ondefaultemoji reuses an existing space after the emoji', (t) => {
  const p = makeParser()

  p.resync('a  b')
  p.resync('a 😀 b')

  t.is(p.text, 'a 😀 b')
  t.is(p.position, 2 + '😀'.length)
  t.alike(p.display, [emojiDisplay(2, 'grinning', '😀'.length)])
})

test('emoji at the start, before another emoji-ed', function (t) {
  const p = makeParser({
    onemoji: (emoji) => p.setEmoji(emoji, ':keet_party:')
  })

  p.resync(':ke')
  t.is(p.text, ':keet_party: ')
  t.is(p.position, 13)
  t.alike(p.display, [customEmojiDisplay(0, 'keet_party')])

  p.resync(':kee :keet_party: ')
  t.is(p.text, ':keet_party: :keet_party: ')
  t.is(p.position, 12)
  t.alike(p.display, [
    customEmojiDisplay(0, 'keet_party'),
    customEmojiDisplay(13, 'keet_party')
  ])
})

test('ondefaultemoji is called per emoji when emojis are typed without spaces', (t) => {
  const codes = { '😂': 'joy', '🚀': 'rocket' }
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (codes[word]) p.setEmoji(word, codes[word], word, true)
    }
  })

  p.resync('😂😂🚀')

  t.is(p.text, '😂😂🚀 ')
  t.alike(
    p.display.map((d) => [d.start, d.end, d.content]),
    [
      [0, 2, 'joy'],
      [2, 4, 'joy'],
      [4, 6, 'rocket']
    ]
  )
})

test('ondefaultemoji marks an emoji typed before the trailing space of the previous one lands', (t) => {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '😂') p.setEmoji(word, 'joy', word, true)
    }
  })

  p.resync('😂')
  p.resync('😂😂')
  p.resync('😂😂😂')

  t.alike(
    p.display.map((d) => [d.start, d.end]),
    [
      [0, 2],
      [2, 4],
      [4, 6]
    ]
  )
})

test('ondefaultemoji keeps skin tone and joined emojis whole when typed together', (t) => {
  const family = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}'
  const codes = { '👍🏽': 'thumbsup_medium', [family]: 'family' }
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (codes[word]) p.setEmoji(word, codes[word], word, true)
    }
  })

  p.resync(`👍🏽${family}`)

  t.alike(
    p.display.map((d) => [d.start, d.end, d.content]),
    [
      [0, 4, 'thumbsup_medium'],
      [4, 12, 'family']
    ]
  )
})

test('ondefaultemoji does not add a space when an emoji is inserted between two others', (t) => {
  const codes = { '😂': 'joy', '🚀': 'rocket' }
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (codes[word]) p.setEmoji(word, codes[word], word, true)
    }
  })

  p.resync('🚀🚀')
  p.setPosition(2)
  p.resync('🚀😂🚀 ')

  t.is(p.text, '🚀😂🚀 ')
})

test('ondefaultemoji is not called again for marked emojis on later edits', (t) => {
  let calls = 0
  const p = makeParser({
    ondefaultemoji: (word) => {
      calls++
      if (word === '😂') p.setEmoji(word, 'joy', word, true)
    }
  })

  p.resync('😂😂 aa')
  const callsBefore = calls
  p.resync('😂😂 aaa')

  t.is(calls, callsBefore)
})

test('ondefaultemoji is called per emoji when emojis are attached to text', (t) => {
  const codes = { '😂': 'joy', '🚀': 'rocket' }
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (codes[word]) p.setEmoji(word, codes[word], word, true)
    }
  })

  p.resync('😂hi😂🚀')

  t.is(p.text, '😂hi😂🚀')
  t.alike(
    p.display.map((d) => [d.start, d.end, d.content]),
    [
      [0, 2, 'joy'],
      [4, 6, 'joy'],
      [6, 8, 'rocket']
    ]
  )
})

test('ondefaultemoji leaves text-default symbols attached to text alone', (t) => {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '™') p.setEmoji(word, 'tm', word, true)
    }
  })

  p.resync('Keet™')

  t.is(p.text, 'Keet™')
  t.alike(p.display, [])
})

test('ondefaultemoji leaves an emoji in text style attached to text alone', (t) => {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '😂') p.setEmoji(word, 'joy', word, true)
    }
  })

  p.resync('I😂\u{FE0E}')

  t.is(p.text, 'I😂\u{FE0E}')
  t.alike(p.display, [])
})

test('ondefaultemoji does not split a word when an emoji is typed inside it', (t) => {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '😂') p.setEmoji(word, 'joy', word, true)
    }
  })

  p.resync('ab')
  p.setPosition(1)
  p.resync('a😂b')

  t.is(p.text, 'a😂b')
  t.alike(
    p.display.map((d) => [d.start, d.end]),
    [[1, 3]]
  )
})

test('default emoji in the middle of a word is placed on the emoji', (t) => {
  const p = makeParser({
    ondefaultemoji: (w) => p.setEmoji(w, 'grinning', '😀', true)
  })
  p.resync('hi😀')
  const d = p.display[0]
  t.is(p.text.slice(d.start, d.end), '😀', 'display covers "hi" instead')
})
