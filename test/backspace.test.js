const test = require('brittle')

const Parser = require('..')

test('backspace removes the last character when no range is selected', (t) => {
  const p = new Parser()

  p.appendText('abc')
  t.is(p.text, 'abc')

  p.backspace()

  t.is(p.text, 'ab')
  t.is(p.position, 2)
})

test('backspace deletes a selected range', (t) => {
  const p = new Parser()

  p.appendText('abcdef')
  p.selectRange(2, 5) // select "cde"

  p.backspace()

  t.is(p.text, 'abf')
  t.is(p.position, 2)
  t.is(p.range, null)
})

test('backspace does nothing when at start and no range', (t) => {
  const p = new Parser()

  p.appendText('x')
  p.setPosition(0)
  p.backspace()

  t.is(p.text, 'x')
  t.is(p.position, 0)
})

test('backspace removes emoji display entry when emoji is deleted #1', (t) => {
  const p = new Parser()

  p.appendText(':smile:')
  p.setEmoji(':smile:', ':smile:')

  t.is(p.display.length, 1)

  p.backspace()

  t.is(p.text, ':smile')
  t.is(p.display.length, 0)
})

test('backspace before emoji shifts its display entry', (t) => {
  const p = new Parser()

  p.appendText('hi ')
  const startPos = p.position

  p.appendText(':keet:')
  p.setEmoji(':keet:', ':keet:')

  t.is(p.text, 'hi :keet:')
  t.is(p.display.length, 1)
  t.is(p.display[0].start, startPos)

  // Backspace one character from "hi "
  p.setPosition(3)
  p.backspace()
  p.backspace()
  p.backspace()

  t.is(p.text, ':keet:')
  t.is(p.display.length, 1)
  t.is(p.display[0].start, 0)
})
