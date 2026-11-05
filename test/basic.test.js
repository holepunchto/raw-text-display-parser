const test = require('brittle')

const {
  makeParser,
  linkDisplay,
  pearLinkDisplay,
  mentionDisplay,
  emojiDisplay
} = require('./helpers')

test('httpLink', (t) => {
  const text = 'https://keet.io'

  const p = makeParser()
  p.appendText(text)

  t.alike(p.display, [linkDisplay(0, 'https://keet.io')])
})

test('pearLink', (t) => {
  const text = 'pear://keet/abcd'

  const p = makeParser()
  p.appendText(text)

  t.alike(p.display, [pearLinkDisplay(0, 'pear://keet/abcd')])
})

test('mention', (t) => {
  const p = makeParser()
  p.appendText('@bob')

  t.alike(p.display, [mentionDisplay(0, '@bob', 'member-id-b')])
})

test('emoji', (t) => {
  const p = makeParser()
  p.appendText(':pear:')

  t.alike(p.display, [emojiDisplay(0, 'pear')])
})

test('emoji not found', (t) => {
  const text = ':pearx:'

  const p = makeParser()
  p.appendText(text)

  t.alike(p.display, [])
})

test('ondefaultemoji is called for default emoji tokens', (t) => {
  let called = 0
  let last = null

  const p = makeParser({
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
  const p = makeParser()
  p.appendText(text)

  t.is(p.text, text)
  t.alike(p.display, [linkDisplay(0, 'http://keet.io')])

  const data = p.flush('')

  t.is(data.text, '')
  t.is(data.display.length, 0)
})
