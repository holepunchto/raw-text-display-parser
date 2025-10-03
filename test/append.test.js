const test = require('brittle')

const Parser = require('..')

test('appendText adds characters to the end when cursor is at end', (t) => {
  const p = new Parser()

  p.appendText('hello')
  t.is(p.text, 'hello')
  t.is(p.position, 5)
})

test('appendText inserts characters in the middle of text', (t) => {
  const p = new Parser()

  p.appendText('helo')
  p.setPosition(2) // between "he|lo"
  p.appendText('l')

  t.is(p.text, 'hello')
  t.is(p.position, 3)
})

test('appendText replaces selected range with new text', (t) => {
  const p = new Parser()

  p.appendText('abcdef')
  p.selectRange(2, 5) // select "cde"
  p.appendText('XYZ') // replace with "XYZ"

  t.is(p.text, 'abXYZf')
  t.is(p.position, 5)
  t.is(p.range, null)
})

test('appendText at position 0 inserts at the beginning', (t) => {
  const p = new Parser()

  p.appendText('world')
  p.setPosition(0)
  p.appendText('hello ')

  t.is(p.text, 'hello world')
  t.is(p.position, 6)
})

test('appendText then backspace deletes last inserted char', (t) => {
  const p = new Parser()

  p.appendText('hi!')
  t.is(p.text, 'hi!')

  p.backspace()
  t.is(p.text, 'hi')
})

test('backspace after range selection', (t) => {
  const p = new Parser()

  p.appendText('abcdef')
  p.selectRange(2, 5) // select "cde"
  p.backspace()
  t.is(p.text, 'abf')
})
