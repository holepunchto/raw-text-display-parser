const test = require('brittle')

const { makeParser, mentionDisplay } = require('./helpers')

test('apply two mentions', function (t) {
  const p = makeParser()

  p.appendText('00 @user')

  const user1Name = '@user1 name'
  p.setMention('@user', user1Name, '001')
  t.is(p.text, '00 @user1 name ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), user1Name)

  p.appendText('111 @user2')

  const user2Name = '@user2 name'
  p.setMention('@user2', user2Name, '002')
  t.is(p.text, '00 @user1 name 111 @user2 name ')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), user2Name)

  t.alike(p.display, [
    mentionDisplay(3, user1Name, '001'),
    mentionDisplay(19, user2Name, '002')
  ])
})

test('apply two mentions, then remove 1st one, then reapply it', function (t) {
  const p = makeParser()

  p.appendText('00 @user')
  // Apply 1st mention
  p.setMention('@user', '@user1 name end', '001')
  t.is(p.text, '00 @user1 name end ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user1 name end')

  p.appendText('111 @user2')
  // Apply 2nd mention
  p.setMention('@user2', '@user2 nameee end', '002')
  t.is(p.text, '00 @user1 name end 111 @user2 nameee end ')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@user2 nameee end')

  t.alike(p.display, [
    mentionDisplay(3, '@user1 name end', '001'),
    mentionDisplay(23, '@user2 nameee end', '002')
  ])

  // move back and delete 2 characters to remove 1st mention
  p.setPosition(7)
  p.backspace()
  p.backspace()

  t.is(p.text, '00 @ur1 name end 111 @user2 nameee end ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user2 nameee end')
  t.alike(p.display, [mentionDisplay(21, '@user2 nameee end', '002')])

  // Reapply 1st mention
  p.setPosition(7)
  p.backspace()
  p.backspace()
  p.setMention('@u', '@user1 name end', '001')

  t.is(p.text, '00 @user1 name end name end 111 @user2 nameee end ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user1 name end')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@user2 nameee end')

  t.alike(p.display, [
    mentionDisplay(3, '@user1 name end', '001'),
    mentionDisplay(32, '@user2 nameee end', '002')
  ])
})

test('apply mention without space', function (t) {
  let mentionCalled = 0
  let lastWord = ''
  let clearCalled = 0
  const p = makeParser({
    onmention: (mention) => {
      mentionCalled++
      lastWord = mention
    },
    onclear: () => clearCalled++
  })

  p.appendText('@u')
  t.is(mentionCalled, 1)
  t.is(lastWord, '@u')

  p.setMention('@u', '@user', '1')
  t.is(mentionCalled, 1)
  t.is(lastWord, '@u')
  t.is(clearCalled, 1)

  t.is(p.text, '@user ')
  t.alike(p.display, [mentionDisplay(0, '@user', '1')])
})

test('appendText clears with onclear when word is not a mention', (t) => {
  let mentionCalled = 0
  let clearCalled = 0

  const p = makeParser({
    onmention: () => mentionCalled++,
    onclear: () => clearCalled++
  })

  p.appendText('hello')

  t.is(mentionCalled, 0)
  t.is(clearCalled, 1)
})

test('setMention replaces word and inserts display entry', (t) => {
  const p = makeParser()

  p.appendText('@us')
  const success = p.setMention('@us', '@user', '1')
  t.ok(success)

  const { text, display } = p.flush()
  t.is(text, '@user ')
  t.is(display.length, 1)
  t.alike(display, [mentionDisplay(0, '@user', '1')])
})

test('setMention returns false if current word does not match', (t) => {
  const p = makeParser()

  p.appendText('hello')

  const success = p.setMention('@nope', 'nope')
  t.not(success)
  t.is(p.display.length, 0)
})

test('setMention 1st time then go to start setMention 2nd time', (t) => {
  let mentionCalled = 0
  let lastWord = ''
  const p = makeParser({
    onmention: (mention) => {
      mentionCalled++
      lastWord = mention
    }
  })

  p.appendText('@ni')
  t.is(mentionCalled, 1)
  t.is(lastWord, '@ni')

  const success1 = p.setMention('@ni', '@nice', '1')
  t.ok(success1)
  t.is(p.text, '@nice ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@nice')
  t.alike(p.display, [mentionDisplay(0, '@nice', '1')])

  p.setPosition(0)
  p.appendText(' ')
  t.is(mentionCalled, 2)
  t.is(lastWord, '@nice')

  p.setPosition(0)
  p.appendText('@')
  t.is(mentionCalled, 3)
  t.is(lastWord, '@')

  const success2 = p.setMention('@', '@nice', '2')
  t.ok(success2)
  t.is(p.text, '@nice @nice ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@nice')
  t.alike(p.display, [
    mentionDisplay(0, '@nice', '2'),
    mentionDisplay(6, '@nice', '1')
  ])
})

test('mention the name that contain space and default-emoji', (t) => {
  let mentionCalled = 0
  let lastWord = ''
  const p = makeParser({
    onmention: (mention) => {
      mentionCalled++
      lastWord = mention
    }
  })

  p.resync('@d')
  t.is(mentionCalled, 1)
  t.is(lastWord, '@d')

  const success1 = p.setMention('@d', '@dinh 🟢', '1')
  t.ok(success1)
  t.is(p.text, '@dinh 🟢 ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@dinh 🟢')
  t.alike(p.display, [mentionDisplay(0, '@dinh 🟢', '1')])

  p.resync('@dinh 🟢 @')
  t.is(mentionCalled, 2)
  t.is(lastWord, '@')

  t.is(p.text, '@dinh 🟢 @')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@dinh 🟢')
  t.alike(p.display, [mentionDisplay(0, '@dinh 🟢', '1')])

  const success2 = p.setMention('@', '@dinh text only', '2')
  t.ok(success2)
  t.is(p.text, '@dinh 🟢 @dinh text only ')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@dinh text only')
  t.alike(p.display, [
    mentionDisplay(0, '@dinh 🟢', '1'),
    mentionDisplay(9, '@dinh text only', '2')
  ])

  p.resync('@dinh 🟢 @dinh text only @dinh')
  t.is(mentionCalled, 3)
  t.is(lastWord, '@dinh')
})

test('mention at the start, before another mentioned', function (t) {
  const p = makeParser({
    onmention: (mention) => p.setMention(mention, '@alice', 'member-id-a')
  })

  p.resync('@a')
  t.is(p.text, '@alice ')
  t.is(p.position, 7)
  t.alike(p.display, [mentionDisplay(0, '@alice', 'member-id-a')])

  p.setPosition(0)
  p.resync('@a @alice ')
  t.is(p.text, '@alice @alice ')
  t.is(p.position, 6)
  t.alike(p.display, [
    mentionDisplay(0, '@alice', 'member-id-a'),
    mentionDisplay(7, '@alice', 'member-id-a')
  ])
})

test('mention at the start, before another mentioned and text', function (t) {
  const p = makeParser({
    text: '7777@alice ',
    display: [mentionDisplay(4, '@alice', 'member-id-a')],
    onmention: (mention) => p.setMention(mention, '@alice', 'member-id-a')
  })

  p.resync('@a 7777@alice ')
  t.is(p.text, '@alice 7777@alice ')
  t.is(p.position, 6)
  t.alike(p.display, [
    mentionDisplay(0, '@alice', 'member-id-a'),
    mentionDisplay(11, '@alice', 'member-id-a')
  ])
})
