const test = require('brittle')
const { makeParser } = require('./helpers')
const { DISPLAY_TYPES } = require('../utils')

const { HTTP_LINK, PEAR_LINK, MENTION, EMOJI } = DISPLAY_TYPES

test('httpLink', (t) => {
  const text = 'https://keet.io'

  const p = makeParser()
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

  const p = makeParser()
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
  const p = makeParser()
  p.appendText('@bob')

  t.alike(p.display, [
    {
      type: MENTION,
      start: 0,
      end: 4,
      memberId: 'member-id',
      length: 4
    }
  ])
})

test('emoji', (t) => {
  const p = makeParser()
  p.appendText(':pear:')

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
  const text = ':pearx:'

  const p = makeParser()
  p.appendText(text)

  t.alike(p.display, [
    {
      type: EMOJI,
      start: 0,
      end: 7,
      content: 'pearx',
      length: 7
    }
  ])
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
