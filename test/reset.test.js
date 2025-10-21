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

test('reset also update start, end, word #1', (t) => {
  const p = new Parser()

  p.reset({ text: 'abc' })

  t.is(p.text, 'abc')
  t.is(p.display.length, 0)
  t.is(p.position, 3)
  t.is(p.range, null)
  t.is(p.start, 0)
  t.is(p.end, 3)
  t.is(p.word, 'abc')
})

test('reset also update start, end, word #2', (t) => {
  const p = new Parser({
    text: '@john',
    display: [{ type: 1, start: 0, end: 5, memberId: 'x' }]
  })

  p.appendText(' ')
  p.backspace()
  p.reset()

  t.is(p.text, '')
  t.is(p.display.length, 0)
  t.alike(p.display, [])
  t.is(p.position, 0)
  t.is(p.range, null)
  t.is(p.start, 0)
  t.is(p.end, 0)
  t.is(p.word, '')
})

test('reset also update start, end, word #3', (t) => {
  let params = null
  const p = new Parser({
    onpearlink(l) {
      params = l
      p.setPearLink(l)
    }
  })

  const link = 'pear://keet/abc'
  p.reset({ text: link })

  t.is(params, link)
  t.is(p.text, link)
  t.alike(p.display, [
    { type: 3, start: 0, end: 15, content: 'pear://keet/abc', length: 15 }
  ])
  t.is(p.position, 15)
  t.is(p.range, null)
  t.is(p.start, 0)
  t.is(p.end, 15)
  t.is(p.word, link)
})
