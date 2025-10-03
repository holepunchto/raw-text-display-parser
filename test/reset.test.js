const test = require('brittle')

const Parser = require('..')

test('reset clears text and display', (t) => {
  const p = new Parser()

  p.appendText('@john')
  p.setMention('@john', 'John', '1')

  t.ok(p.text.length > 0)
  t.is(p.display.length, 1)

  p.reset()

  t.is(p.text, '')
  t.is(p.display.length, 0)
  t.is(p.position, 0)
  t.is(p.range, null)
})

test('reset allows setting new text and display', (t) => {
  const p = new Parser({
    text: '@john',
    display: [{ type: 1, start: 0, end: 5, memberId: 'x' }]
  })

  p.reset({
    text: '@user',
    display: [{ type: 1, start: 0, end: 5, memberId: 'y' }]
  })

  t.is(p.text, '@user')
  t.is(p.display.length, 1)
  t.alike(p.display, [{ type: 1, start: 0, end: 5, memberId: 'y' }])
  t.is(p.position, 5)
  t.is(p.range, null)
})
