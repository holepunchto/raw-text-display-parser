const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

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

test('setEmoji returns false if shortcode not found', (t) => {
  const p = new Parser()

  p.appendText(':smile:')
  const success = p.setEmoji(':wave:', ':wave:')

  t.not(success)
})

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
  t.is(emojiCalled, 2)
  t.is(lastWord, ':keet_party:')
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
