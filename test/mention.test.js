const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

test('apply two mentions', function (t) {
  const p = new Parser()

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
    {
      type: DISPLAY_TYPES.MENTION,
      start: 3,
      end: 14,
      length: 11,
      memberId: '001'
    },
    {
      type: DISPLAY_TYPES.MENTION,
      start: 19,
      end: 30,
      length: 11,
      memberId: '002'
    }
  ])
})

test('apply two mentions, then remove 1st one, then reapply it', function (t) {
  const p = new Parser()

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
    {
      type: DISPLAY_TYPES.MENTION,
      start: 3,
      end: 18,
      length: 15,
      memberId: '001'
    },
    {
      type: DISPLAY_TYPES.MENTION,
      start: 23,
      end: 40,
      length: 17,
      memberId: '002'
    }
  ])

  // move back and delete 2 characters to remove 1st mention
  p.setPosition(7)
  p.backspace()
  p.backspace()

  t.is(p.text, '00 @ur1 name end 111 @user2 nameee end ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user2 nameee end')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 21,
      end: 38,
      length: 17,
      memberId: '002'
    }
  ])

  // Reapply 1st mention
  p.setPosition(7)
  p.backspace()
  p.backspace()
  p.setMention('@u', '@user1 name end', '001')

  t.is(p.text, '00 @user1 name end  name end 111 @user2 nameee end ')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user1 name end')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@user2 nameee end')

  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 3,
      end: 18,
      length: 15,
      memberId: '001'
    },
    {
      type: DISPLAY_TYPES.MENTION,
      start: 33,
      end: 50,
      length: 17,
      memberId: '002'
    }
  ])
})

test('apply mention without space', function (t) {
  let mentionCalled = 0
  let lastWord = ''
  let clearCalled = 0
  const p = new Parser({
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
  t.is(mentionCalled, 2)
  t.is(lastWord, '@user')
  t.is(clearCalled, 1)

  t.is(p.text, '@user ')
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 0,
      end: 5,
      length: 5,
      memberId: '1'
    }
  ])
})

test('appendText clears with onclear when word is not a mention', (t) => {
  let mentionCalled = 0
  let clearCalled = 0

  const p = new Parser({
    onmention: () => mentionCalled++,
    onclear: () => clearCalled++
  })

  p.appendText('hello')

  t.is(mentionCalled, 0)
  t.is(clearCalled, 1)
})

test('setMention replaces word and inserts display entry', (t) => {
  const p = new Parser()

  p.appendText('@us')
  const success = p.setMention('@us', '@user', '1')
  t.ok(success)

  const { text, display } = p.flush()
  t.is(text, '@user ')
  t.is(display.length, 1)
  t.alike(display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 0,
      end: 5,
      length: 5,
      memberId: '1'
    }
  ])
})

test('setMention returns false if current word does not match', (t) => {
  const p = new Parser()

  p.appendText('hello')

  const success = p.setMention('@nope', 'nope')
  t.not(success)
  t.is(p.display.length, 0)
})
