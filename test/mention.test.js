const test = require('brittle')

const Parser = require('..')

test('apply two mentions', function (t) {
  const p = new Parser()

  p.appendText('00 @user')

  const user1Name = '@user1 name'
  p.setMention('@user', user1Name, '001')
  t.is(p.text, '00 @user1 name')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), user1Name)

  p.appendText(' 111 @user2')

  const user2Name = '@user2 name'
  p.setMention('@user2', user2Name, '002')
  t.is(p.text, '00 @user1 name 111 @user2 name')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), user2Name)

  t.alike(p.display, [
    {
      type: Parser.MENTION_ID,
      start: 3,
      end: 14,
      length: 11,
      memberId: '001'
    },
    {
      type: Parser.MENTION_ID,
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
  t.is(p.text, '00 @user1 name end')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user1 name end')

  p.appendText(' 111 @user2')
  // Apply 2nd mention
  p.setMention('@user2', '@user2 nameee end', '002')
  t.is(p.text, '00 @user1 name end 111 @user2 nameee end')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@user2 nameee end')

  t.alike(p.display, [
    {
      type: Parser.MENTION_ID,
      start: 3,
      end: 18,
      length: 15,
      memberId: '001'
    },
    {
      type: Parser.MENTION_ID,
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

  t.is(p.text, '00 @ur1 name end 111 @user2 nameee end')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user2 nameee end')
  t.alike(p.display, [
    {
      type: Parser.MENTION_ID,
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

  t.is(p.text, '00 @user1 name end name end 111 @user2 nameee end')
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@user1 name end')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@user2 nameee end')

  t.alike(p.display, [
    {
      type: Parser.MENTION_ID,
      start: 3,
      end: 18,
      length: 15,
      memberId: '001'
    },
    {
      type: Parser.MENTION_ID,
      start: 32,
      end: 49,
      length: 17,
      memberId: '002'
    }
  ])
})
