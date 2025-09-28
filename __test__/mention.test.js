const test = require('brittle')

const Parser = require('..')

const p = new Parser({})

test('basic', function (t) {
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
      type: 'mention',
      start: 3,
      end: 18,
      content: '@user1 name end',
      id: '001'
    },
    {
      type: 'mention',
      start: 23,
      end: 40,
      content: '@user2 nameee end',
      id: '002'
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
      type: 'mention',
      start: 21,
      end: 38,
      content: '@user2 nameee end',
      id: '002'
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
      type: 'mention',
      start: 3,
      end: 18,
      content: '@user1 name end',
      id: '001'
    },
    {
      type: 'mention',
      start: 32,
      end: 49,
      content: '@user2 nameee end',
      id: '002'
    }
  ])
})
