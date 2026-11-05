// Quiz lessons: the questions, the quiz settings and the signed-in student's past attempts.
// Shapes follow the EzyCourse admin quiz builder (Courses → Quizzes → builder), with its labels:
//   General               Attempts (One attempt · A set number · Unlimited), Attempts allowed,
//                         When can users retake (Whenever they like · Only after failing)
//   Navigation & display  Layout (All on one page · Section by section · One question at a time),
//                         Shuffle questions, Back button, Progress bar, Allow skip (needs one question
//                         at a time), Before the final submit (Show a review page), Shuffle answer options,
//                         Label options A, B, C (settings.optLetters)
//   Structure             Section break (title and description), Note, Sticky passage (rich text,
//                         pinned beside the questions after it until the next passage or section),
//                         Audio and Image items
//   Timing & proctoring   Whole-quiz timer, Time limit (minutes): the quiz submits itself when time runs
//                         out. (The builder's per-question timer only runs one question at a time.)
//   Scoring & grading     Pass mark, Which attempt counts (Best · Last · First · Average)
//   Feedback & results    Show feedback (In the answer review), Reveal correct answers (With feedback ·
//                         After the last attempt · Never), While marking is pending (Show the provisional score)
//   Lesson                Passing required
// Endings: Passed · Needs review · Not yet. Hand-marked answers are marked in Courses → Submissions.
//
// settings.layout: 'one' (one question at a time) | 'sections' (section by section: one page per section
// break with all its questions, Back and Next between pages) | 'all' (all on one page). A section's groups
// are what the builder places in a row: optional Audio or Image items (group.media: one id or a list,
// from quiz.media) or a Sticky passage (group.passage, from quiz.passages: rich text in html, or plain
// paragraphs, or a figure), an optional Note (group.note), then the questions. The audio, image or
// passage sits on the left beside its questions. A question belongs to a passage through q.passage,
// its group's passage or its section's passage.
// Short answers can have a character limit (q.maxLen), as in the builder.
//
// Also: the scoring rules (one per question type, as the builder scores them) and the attempt store.
// Attempts are kept in localStorage, so a refresh never loses answers.

// Every question type the quiz builder offers, with its builder label. (Hotspot, Labelling, Drag and
// drop and Interactive video are switched off in the builder; contact fields are not questions.)
export const QUESTION_TYPES = {
  single: 'Single answer',
  multi: 'Multi-answer',
  yesno: 'True or false',
  consent: 'Consent',
  fill: 'Fill in the blanks',
  match: 'Matching',
  order: 'Ordering',
  short: 'Short answer',
  long: 'Long answer',
  number: 'Numeric',
  date: 'Date',
  file: 'File upload',
  grammar: 'Grammar correction',
  math: 'Mathematical notation',
  draw: 'Draw',
  record: 'Record response',
  rating: 'Rating',
  scale: 'Opinion scale',
  poll: 'Poll',
  ranking: 'Ranking',
}

// Marked by a person (no answer key). They hold the result at Needs review while they could change it.
export const HAND_MARKED = ['long', 'grammar', 'file', 'record', 'draw']
// Collect rather than score, so they carry no points.
export const NOT_SCORED = ['consent', 'rating', 'scale', 'poll', 'ranking']

const gutHealthCheckIn = {
  id: 'quiz-1',
  title: 'Check-in quiz',
  intro: 'A check-in on your first fortnight: eating pace, meal timing and the habits around them. It isn’t a test of you. It shows Chidi where to help.',
  marker: 'Chidi',
  settings: {
    passMark: 70,
    attempts: 3,
    retake: 'always',
    counts: 'best',
    timeLimit: 15,
    layout: 'one',
    shuffle: true,
    shuffleOptions: true,
    back: true,
    progress: true,
    skip: true,
    beforeSubmit: 'review',
    feedback: 'submit',
    reveal: 'always',
    pending: 'prov',
    passingRequired: true,
  },
  questions: [
    {
      id: 'rhythm', type: 'single', points: 1,
      prompt: 'What is the main change in week 2?',
      options: [
        { id: 'a', label: 'Cutting out a food group' },
        { id: 'b', label: 'Finding a meal rhythm that suits your day', correct: true },
        { id: 'c', label: 'Eating six small meals' },
        { id: 'd', label: 'Skipping breakfast' },
      ],
      explain: 'Week 2 is about rhythm: regular meals at times that fit your day. Nothing is cut out.',
    },
    {
      id: 'pace', type: 'multi', points: 2, partial: true,
      prompt: 'Which of these help you eat more slowly?',
      hint: 'Choose all that apply.',
      options: [
        { id: 'a', label: 'Putting your fork down between bites', correct: true },
        { id: 'b', label: 'Chewing each mouthful a little longer', correct: true },
        { id: 'c', label: 'Eating while you answer emails' },
        { id: 'd', label: 'Taking a calm breath before you start', correct: true },
      ],
      explain: 'Small pauses give your body time to notice it’s eating. Screens tend to speed us up.',
    },
    {
      id: 'bloating', type: 'yesno', points: 1,
      prompt: 'Some mild bloating can be normal while you change how you eat.',
      options: [
        { id: 'true', label: 'True', correct: true },
        { id: 'false', label: 'False' },
      ],
      explain: 'Mild, short-lived bloating is common when you add fibre or change your timing. If it’s severe, new or worrying, talk to your GP.',
    },
    {
      id: 'tracker', type: 'short', points: 1,
      prompt: 'What is the printable sheet called where you note meals and how you feel afterwards?',
      placeholder: 'Type your answer',
      accepted: ['symptom tracker', 'the symptom tracker', 'tracker', 'your symptom tracker'],
      key: 'Symptom tracker',
      explain: 'Your symptom tracker is in Week 1. A few lines a day is plenty.',
    },
    {
      id: 'week-plan', type: 'long', points: 2,
      prompt: 'Describe a typical weekday’s meals, and one small change you’d like to try.',
      hint: 'A few sentences is plenty. Chidi reads every answer.',
      explain: 'There’s no right answer here. Chidi will reply with a suggestion for your week.',
    },
    {
      id: 'bedtime', type: 'number', points: 1,
      prompt: 'How many hours before bed do we suggest finishing your last meal?',
      hint: 'Enter a number of hours.',
      accepted: 2.5, tolerance: 0.5, unit: 'hours',
      key: 'Two to three hours',
      explain: 'Two to three hours gives digestion a head start before you lie down.',
    },
    {
      id: 'week-3', type: 'date', points: 1,
      prompt: 'On what date does Week 3 · Fibre, gently open for you?',
      hint: 'Check the course content list.',
      accepted: '2026-10-27',
      key: '27 Oct',
      explain: 'Week 3 · Fibre, gently opens on 27 Oct. The course content list shows when each week opens.',
    },
    {
      id: 'weeks', type: 'fill', points: 3, partial: true,
      prompt: 'Fill in the blanks.',
      passage: 'Week 1 is about eating [pace/speed]. Week 2 is about meal [timing/rhythm]. Week 3 adds [fibre/fiber], gently.',
      explain: 'One change a week: pace, then timing, then fibre.',
    },
    {
      id: 'focus', type: 'match', points: 4, partial: true,
      prompt: 'Match each part of the programme to its focus.',
      pairs: [
        { id: 'w1', label: 'Week 1', match: 'Eating pace' },
        { id: 'w2', label: 'Week 2', match: 'Timing and rhythm' },
        { id: 'w3', label: 'Week 3', match: 'Fibre, gently' },
        { id: 'w4', label: 'Weeks 4–6', match: 'Stress, sleep and keeping going' },
      ],
      extra: ['Counting calories'],
      explain: 'The programme never asks you to count calories.',
    },
    {
      id: 'breath', type: 'order', points: 2, partial: true,
      prompt: 'Put the steps of the calm breath before meals in order.',
      items: [
        { id: 'sit', label: 'Sit down and put your phone away' },
        { id: 'in', label: 'Breathe in slowly through your nose for four' },
        { id: 'out', label: 'Breathe out gently for six' },
        { id: 'repeat', label: 'Repeat three times, then start your meal' },
      ],
      explain: 'Settle first, then a slow breath in and a longer breath out.',
    },
    {
      id: 'note', type: 'grammar', points: 1,
      prompt: 'Correct the spelling and grammar in this note to yourself.',
      passage: 'I has started eating more slow and my lunchs is at the same time each day.',
      model: 'I have started eating more slowly, and my lunches are at the same time each day.',
      explain: 'Chidi marks this one by hand.',
    },
    {
      id: 'fibre-sum', type: 'math', points: 1,
      prompt: 'You eat 15 g of fibre a day and add 5 g each week. Write an expression for grams a day after w weeks.',
      hint: 'Use w for the number of weeks, like 2 + 3w.',
      accepted: ['15+5w', '5w+15', '15+5*w', '5*w+15'],
      key: '15 + 5w',
      explain: 'Adding fibre slowly, about 5 g a week, is gentler on digestion than a big jump.',
    },
    {
      id: 'tracker-photo', type: 'file', points: 1,
      prompt: 'Upload a photo or scan of one day from your symptom tracker.',
      accept: 'image/*,.pdf', acceptLabel: 'JPG, PNG or PDF', maxMb: 10,
      explain: 'Only Chidi sees your upload.',
    },
    {
      id: 'voice', type: 'record', points: 1,
      prompt: 'Record a short message about how your new meal rhythm felt this week.',
      hint: 'Up to 1 minute. You can listen back before you move on.',
      maxSeconds: 60,
      explain: 'Chidi listens to every recording and replies in your messages.',
    },
    {
      id: 'plate', type: 'draw', points: 1,
      prompt: 'Draw your plate for a calm lunch. Mark roughly how much is vegetables, protein and grains.',
      hint: 'Rough is fine. You can describe it in words instead.',
      explain: 'A rough half vegetables, a quarter protein and a quarter grains is a good place to start.',
    },
    {
      id: 'confidence', type: 'rating', count: 5,
      prompt: 'How confident do you feel about keeping a regular meal rhythm?',
    },
    {
      id: 'settled', type: 'scale', min: 1, max: 5, low: 'Not settled', high: 'Very settled',
      prompt: 'How settled has your digestion felt this week?',
    },
    {
      id: 'helped', type: 'poll',
      prompt: 'Which part of the first fortnight has helped you most so far?',
      options: [
        { id: 'pace', label: 'Eating more slowly', share: 38 },
        { id: 'timing', label: 'Regular meal times', share: 27 },
        { id: 'breath', label: 'The calm breath', share: 21 },
        { id: 'tracker', label: 'The symptom tracker', share: 14 },
      ],
    },
    {
      id: 'help-next', type: 'ranking',
      prompt: 'Rank these from what you’d most like help with to least.',
      items: [
        { id: 'stress', label: 'Stress' },
        { id: 'sleep', label: 'Sleep' },
        { id: 'fibre', label: 'Adding fibre' },
        { id: 'out', label: 'Eating out' },
      ],
    },
    {
      id: 'agree', type: 'consent', required: true,
      prompt: 'Before you submit',
      label: 'I understand this quiz checks what I’ve learned. It isn’t medical advice.',
    },
  ],
}

// All on one page: a short check-in with a chart to read (an image passage) and a few questions
// about the student's own week. Sections here are only headings on the page.
const checkInAll = {
  id: 'check-in-all',
  title: 'Quick check-in',
  retryHint: 'Have another look at the chart and your Week 1 and 2 lessons, then try again.',
  intro: 'Eight short questions on one page. The first three are about the chart of Sam’s day, which stays beside the questions while you answer.',
  marker: 'Chidi',
  settings: {
    passMark: 60,
    attempts: 0,
    retake: 'always',
    counts: 'best',
    timeLimit: 10,
    layout: 'all',
    shuffle: false,
    shuffleOptions: false,
    back: true,
    progress: true,
    skip: false,
    beforeSubmit: 'warn',
    feedback: 'submit',
    reveal: 'always',
    pending: 'prov',
    passingRequired: false,
  },
  passages: {
    'sam-day': {
      label: 'Chart',
      title: 'Sam’s Tuesday',
      intro: 'When Sam ate, and when Sam went to bed, on a busy weekday.',
      figure: {
        kind: 'day',
        alt: 'A timeline of Sam’s Tuesday from 6:00 to midnight.',
        events: [
          { at: '07:00', label: 'Breakfast', note: 'At the kitchen table' },
          { at: '10:30', label: 'Snack', note: 'Biscuits at a meeting' },
          { at: '13:00', label: 'Lunch', note: 'At the desk, while answering emails' },
          { at: '21:15', label: 'Dinner', note: 'After a late train home' },
          { at: '23:00', label: 'Bed', bed: true },
        ],
      },
    },
  },
  sections: [
    {
      id: 'day', title: 'Reading Sam’s day', passage: 'sam-day',
      groups: [{ id: 'day-q', questions: ['gap', 'gap-ok', 'desk'] }],
    },
    {
      id: 'you', title: 'Your own rhythm',
      groups: [{ id: 'you-q', questions: ['calm', 'first-step', 'busy-day', 'settled-now', 'agree-all'] }],
    },
  ],
  questions: [
    {
      id: 'gap', type: 'single', points: 1,
      prompt: 'How long is the gap between Sam’s dinner and bedtime?',
      options: [
        { id: 'a', label: '45 minutes' },
        { id: 'b', label: '1 hour 45 minutes', correct: true },
        { id: 'c', label: '2 hours 45 minutes' },
      ],
      explain: 'Dinner at 21:15 and bed at 23:00 leaves 1 hour 45 minutes.',
    },
    {
      id: 'gap-ok', type: 'yesno', points: 1,
      prompt: 'Sam finishes dinner the two to three hours before bed that we suggest.',
      options: [
        { id: 'true', label: 'True' },
        { id: 'false', label: 'False', correct: true },
      ],
      explain: 'Less than two hours is a little tight. An earlier snack on late days can help.',
    },
    {
      id: 'desk', type: 'short', points: 1,
      prompt: 'Which of Sam’s meals is eaten while working?',
      accepted: ['lunch', 'sams lunch', 'sam’s lunch', 'the lunch'],
      key: 'Lunch',
      explain: 'Lunch at the desk, answering emails, tends to speed eating up.',
    },
    {
      id: 'calm', type: 'multi', points: 2, partial: true,
      prompt: 'Which of these could make Sam’s lunch calmer?',
      hint: 'Choose all that apply.',
      options: [
        { id: 'a', label: 'Moving away from the desk for 15 minutes', correct: true },
        { id: 'b', label: 'A calm breath before starting', correct: true },
        { id: 'c', label: 'Eating faster to get back to work' },
        { id: 'd', label: 'Putting the phone face down', correct: true },
      ],
      explain: 'Any small pause away from screens helps your body notice it’s eating.',
    },
    {
      id: 'first-step', type: 'fill', points: 1,
      prompt: 'Fill in the blank.',
      passage: 'The first change in this programme is your eating [pace/speed].',
      explain: 'Week 1 starts with eating pace.',
    },
    {
      id: 'busy-day', type: 'long', points: 2,
      prompt: 'What does your busiest weekday look like for meals? Write one change you could try.',
      hint: 'A few sentences is plenty. Chidi reads every answer.',
      explain: 'Chidi will reply with a suggestion for your week.',
    },
    {
      id: 'settled-now', type: 'scale', min: 1, max: 5, low: 'Not settled', high: 'Very settled',
      prompt: 'How settled has your digestion felt today?',
    },
    {
      id: 'agree-all', type: 'consent', required: true,
      prompt: 'Before you submit',
      label: 'I understand this check-in isn’t medical advice.',
    },
  ],
}

// Section by section, in the order of an IELTS test, built only from what the admin's quiz builder
// offers: five Section breaks (title and description; one sticky passage at most per section, so
// Reading is two sections), each one page with all its questions, Back and
// Next between them, one whole-quiz timer and a review page before the final submit. Listening has
// audio items and an image item in the section; Reading has Sticky passages (rich text) pinned beside
// their questions; Writing has an image item and two long answers; Speaking has record-response
// questions and no passage. Question types are the builder's: Short answer, Single answer (options
// labelled A, B, C for the whole quiz), Matching, Fill in the blanks, Long answer and Record response.
const HEADINGS = [
  'i. A network that can work on its own',
  'ii. Why the gut is called a second brain',
  'iii. Messages that travel both ways',
  'iv. The bacteria that join the conversation',
  'v. Stress and the speed of digestion',
  'vi. A cure for anxiety',
  'vii. Small habits that calm the system',
]
const TFNG = (answer) => [
  { id: 'true', label: 'True' },
  { id: 'false', label: 'False' },
  { id: 'ng', label: 'Not given' },
].map((o) => (o.id === answer ? { ...o, correct: true } : o))
const SPEAKING = 'Chidi listens to every recording and replies in your messages.'

const practiceTest = {
  id: 'ielts-practice',
  title: 'Practice test: Listening, reading, writing and speaking',
  retryHint: 'Read the explanations below, then try again. Each attempt is a fresh start.',
  intro: 'A practice test in the style of IELTS, about the ideas in this programme. Four sections in the IELTS order: listening, reading, writing and speaking. It doesn’t count towards your certificate.',
  marker: 'Chidi',
  settings: {
    passMark: 60,
    attempts: 0,
    retake: 'always',
    counts: 'best',
    timeLimit: 60,
    layout: 'sections',
    optLetters: true,
    shuffle: false,
    shuffleOptions: false,
    back: true,
    progress: true,
    skip: false,
    beforeSubmit: 'review',
    feedback: 'submit',
    reveal: 'always',
    pending: 'prov',
    passingRequired: false,
  },
  // Audio and image items placed in a section (they sit in the page, above the questions after them).
  media: {
    call: {
      kind: 'audio',
      title: 'Recording 1: a phone call to the clinic',
      seconds: 75,
      transcript: [
          { speaker: 'Receptionist', text: 'Good morning, Halvera Clinic, this is Ravi. How can I help?' },
          { speaker: 'Caller', text: 'Hello. I’d like to book a first appointment with one of your practitioners.' },
          { speaker: 'Receptionist', text: 'Of course. Can I take your name?' },
          { speaker: 'Caller', text: 'It’s Rob Bennett. That’s B, E, double N, E, double T.' },
          { speaker: 'Receptionist', text: 'Thank you, Mr Bennett. And what would you like some help with?' },
          { speaker: 'Caller', text: 'Mainly bloating after meals. It’s been going on for a few months now.' },
          { speaker: 'Receptionist', text: 'I’m sorry to hear that. Chidi sees a lot of people with that. Which day suits you best?' },
          { speaker: 'Caller', text: 'Tuesdays are hard for me. Thursday would be ideal.' },
          { speaker: 'Receptionist', text: 'Let me look. On Thursday I have nine thirty in the morning, or two in the afternoon.' },
          { speaker: 'Caller', text: 'Nine thirty would be perfect.' },
          { speaker: 'Receptionist', text: 'Lovely. Before you come, it really helps to keep a food diary for two weeks. You don’t need test results or a list of medicines for the first visit. Chidi will ask about those.' },
          { speaker: 'Caller', text: 'A food diary. Got it.' },
          { speaker: 'Receptionist', text: 'And I’ll email you a short intake form today. Fill it in whenever suits you before Thursday.' },
        ],

    },
    tour: {
      kind: 'audio',
      title: 'Recording 2: a tour of the teaching kitchen',
      seconds: 80,
      transcript: [
          { speaker: 'Guide', text: 'Welcome to the teaching kitchen. Let me show you around before the class starts.' },
          { speaker: 'Guide', text: 'As you come in through the main entrance, the area on your left, marked A, is where you can hang your coat and leave your bags.' },
          { speaker: 'Guide', text: 'Straight ahead of you, in the middle of the room, is the long tasting table, C, where we sit down together and eat what we’ve cooked.' },
          { speaker: 'Guide', text: 'In the top right corner, D, you’ll find the fermentation shelf, with jars of sauerkraut and kefir at different stages.' },
          { speaker: 'Guide', text: 'In the top left corner, B, behind the sinks, is the quiet room. If you need a few minutes away from the noise, go there.' },
          { speaker: 'Guide', text: 'On your right as you come in, E, is the recipe library. Take any card you like home with you.' },
          { speaker: 'Guide', text: 'And through the door on the right-hand wall, F, is the herb garden, where we pick what we need for each session.' },
          { speaker: 'Guide', text: 'Classes last about an hour and a half, and they’re open to every level, from complete beginners to keen cooks. You can book up to a day before.' },
        ],

    },
    plan: {
      kind: 'image',
      src: '/quiz/kitchen-plan.svg',
      caption: 'The teaching kitchen',
      alt: 'Plan of the teaching kitchen. The entrance is in the middle of the bottom wall. A is just inside the entrance on the left. E is just inside the entrance on the right. C is in the middle of the room, straight ahead. B is in the top left corner and D is in the top right corner. F is outside, through a door in the right-hand wall.',
    },
    day: {
      kind: 'image',
      src: '/quiz/sams-tuesday.svg',
      caption: 'Sam’s Tuesday',
      alt: 'A timeline of Sam’s Tuesday from 6:00 to midnight: breakfast at 07:00 at the kitchen table, a snack at 10:30 at a meeting, lunch at 13:00 at the desk, dinner at 21:15 after a late train home, and bed at 23:00.',
    },
  },
  // Sticky passages: rich text, pinned beside the questions after them until the next passage or section.
  passages: {
    brain: {
      title: 'The second brain',
      html: [
        '<p><strong>A</strong> For more than a century, doctors have called the gut “the second brain”. The phrase sounds like a slogan, but it describes something real: the wall of the digestive tract holds a nervous system of its own, woven through the muscle from the throat to the end of the bowel.</p>',
        '<p><strong>B</strong> This enteric nervous system contains around 500 million nerve cells, more than the spinal cord. It can run the work of digestion without instructions from the head. In studies where the main nerve between the brain and the gut was cut, the gut went on mixing, moving and absorbing food much as before.</p>',
        '<p><strong>C</strong> Even so, gut and brain are in constant contact, mostly through the vagus nerve. Surprisingly, around four out of five of its fibres carry signals upwards, from the gut to the brain, rather than down. The gut reports on fullness, stretch and discomfort, and the brain adjusts what it sends back.</p>',
        '<p><strong>D</strong> That conversation explains why stress is felt in the stomach. When the body prepares to deal with a threat, blood is sent to the muscles and digestion is put on hold. For some people food then moves more slowly; for others it hurries through. Either way, a worried mind can quickly become an unsettled gut.</p>',
        '<p><strong>E</strong> More recently, researchers have turned to the trillions of bacteria that live in the bowel. Some of the substances they produce appear to affect how nerves send signals. The research is still at an early stage, and no single type of bacteria has been shown to change mood on its own.</p>',
        '<p><strong>F</strong> None of this calls for complicated solutions. Eating more slowly, keeping meals at regular times and taking a calm breath before eating all help to settle the signals passing between the two brains.</p>',
      ].join(''),
    },
    fibre: {
      title: 'Fibre, slowly',
      html: [
        '<p><strong>A</strong> UK guidance suggests that adults eat 30 grams of fibre a day. Most eat far less: the average is closer to 20 grams. Fibre keeps the bowel moving, feeds helpful bacteria and is linked with better long-term health.</p>',
        '<p><strong>B</strong> Yet many people who try to eat more give up within days. The usual reason is wind and bloating. When fibre reaches the large intestine, bacteria there ferment it, and a sudden increase gives them more to work on than the gut is used to.</p>',
        '<p><strong>C</strong> The answer is to go slowly. Adding about five grams each week, and drinking more water at the same time, gives the gut a chance to adjust. Most people find that early discomfort settles within a fortnight.</p>',
        '<p><strong>D</strong> It also helps to know that there are two broad kinds of fibre. Soluble fibre, found in oats, beans and lentils, absorbs water and forms a gel that slows digestion. Insoluble fibre, in wholegrains and the skins of fruit and vegetables, adds bulk and helps food pass through.</p>',
        '<p><strong>E</strong> Finally, variety matters as much as quantity. Different plants feed different bacteria, so a wide variety of vegetables, fruit, grains, nuts and seeds supports a richer community in the gut than the same few foods every day.</p>',
      ].join(''),
    },
  },
  // Section breaks. A group is what the builder places in a row: an optional media item or sticky
  // passage, an optional Note (the instructions), then its questions.
  sections: [
    {
      id: 'listening', title: 'Listening',
      intro: 'Two recordings: a phone call, then a guided tour. Read the questions first, then play each recording.',
      groups: [
        { id: 'call', media: 'call', note: 'Questions 1–5. Complete the booking form, then choose the correct letter.', questions: ['surname', 'concern', 'day', 'time', 'bring'] },
        { id: 'tour', media: ['tour', 'plan'], note: 'Questions 6–7. Label the plan, then choose the correct letter.', questions: ['places', 'classes'] },
      ],
    },
    // One sticky passage per section, so each reading passage is its own section.
    {
      id: 'reading-1', title: 'Reading: passage 1', passage: 'brain',
      intro: 'Read the passage, then answer questions 8–11.',
      groups: [
        { id: 'brain', note: 'Questions 8–11. The passage has six paragraphs, A–F. There are more headings than paragraphs.', questions: ['headings', 'neurons', 'vagus', 'history'] },
      ],
    },
    {
      id: 'reading-2', title: 'Reading: passage 2', passage: 'fibre',
      intro: 'Read the passage, then answer questions 12–16.',
      groups: [
        { id: 'fibre', note: 'Questions 12–16. Use words from the passage.', questions: ['where', 'gel', 'guidance', 'pace-fibre', 'variety'] },
      ],
    },
    {
      id: 'writing', title: 'Writing',
      intro: 'Two tasks. Spend about 8 minutes on Task 1 and 12 minutes on Task 2.',
      groups: [
        { id: 'task-1', media: 'day', note: 'Task 1. Write at least 80 words.', questions: ['w-chart'] },
        { id: 'task-2', note: 'Task 2. Write at least 120 words.', questions: ['w-essay'] },
      ],
    },
    {
      id: 'speaking', title: 'Speaking',
      intro: 'Record your answers. Speak naturally, as you would to an examiner. You can listen back before you move on.',
      groups: [
        { id: 'speaking', questions: ['s-lunch', 's-cook', 's-meal', 's-desk'] },
      ],
    },
  ],
  questions: [
    // Listening: the booking form (Short answer, with a character limit), then Single answer.
    { id: 'surname', type: 'short', points: 1, maxLen: 30, prompt: 'Surname', accepted: ['bennett'], key: 'Bennett', explain: 'He spells it: B, E, double N, E, double T.' },
    { id: 'concern', type: 'short', points: 1, maxLen: 30, prompt: 'Main concern after meals', accepted: ['bloating'], key: 'Bloating', explain: '“Mainly bloating after meals.”' },
    { id: 'day', type: 'short', points: 1, maxLen: 30, prompt: 'Preferred day', accepted: ['thursday', 'thursdays', 'on thursday'], key: 'Thursday', explain: 'Tuesdays are hard for him; Thursday is ideal.' },
    { id: 'time', type: 'short', points: 1, maxLen: 30, prompt: 'Appointment time', accepted: ['9.30', '9:30', '9.30 am', '9:30 am', '9.30am', '9:30am', 'nine thirty', 'half past nine', '0930', '09:30'], key: '9.30 am', explain: 'Nine thirty in the morning, not two in the afternoon.' },
    {
      id: 'bring', type: 'single', points: 1,
      prompt: 'What should the caller bring to his first appointment?',
      options: [
        { id: 'a', label: 'A list of his medicines' },
        { id: 'b', label: 'A two-week food diary', correct: true },
        { id: 'c', label: 'His recent test results' },
      ],
      explain: 'Test results and medicines can wait. A food diary helps most.',
    },
    // Listening: the plan (an image item above it) as Matching, with two letters left over.
    {
      id: 'places', type: 'match', points: 4, partial: true,
      prompt: 'Where is each place on the plan? Choose a letter for each.',
      pairs: [
        { id: 'herbs', label: 'Herb garden', match: 'F' },
        { id: 'tasting', label: 'Tasting table', match: 'C' },
        { id: 'ferment', label: 'Fermentation shelf', match: 'D' },
        { id: 'quiet', label: 'Quiet room', match: 'B' },
      ],
      extra: ['A', 'E'],
      explain: 'Herb garden F, through the door on the right; tasting table C, in the middle; fermentation shelf D, top right; quiet room B, top left.',
    },
    {
      id: 'classes', type: 'single', points: 1,
      prompt: 'What does the guide say about the cooking classes?',
      options: [
        { id: 'a', label: 'They’re only for beginners.' },
        { id: 'b', label: 'They last about 90 minutes.', correct: true },
        { id: 'c', label: 'They must be booked a month ahead.' },
      ],
      explain: '“About an hour and a half”, for every level, bookable up to a day before.',
    },
    // Reading, passage 1: Matching (headings), then Single answer (True / False / Not given).
    {
      id: 'headings', type: 'match', points: 4, partial: true,
      prompt: 'Choose the correct heading for paragraphs B–E.',
      pairs: [
        { id: 'b', label: 'Paragraph B', match: HEADINGS[0] },
        { id: 'c', label: 'Paragraph C', match: HEADINGS[2] },
        { id: 'd', label: 'Paragraph D', match: HEADINGS[4] },
        { id: 'e', label: 'Paragraph E', match: HEADINGS[3] },
      ],
      extra: [HEADINGS[1], HEADINGS[5], HEADINGS[6]],
      explain: 'B: the gut keeps working when the main nerve is cut. C: signals go both ways. D: stress puts digestion on hold or hurries it. E: gut bacteria and nerve signals.',
    },
    { id: 'neurons', type: 'single', points: 1, prompt: 'The gut contains more nerve cells than the spinal cord.', options: TFNG('true'), explain: 'Paragraph B: around 500 million, more than the spinal cord.' },
    { id: 'vagus', type: 'single', points: 1, prompt: 'Most signals in the vagus nerve travel from the brain to the gut.', options: TFNG('false'), explain: 'Paragraph C: four out of five fibres carry signals upwards.' },
    { id: 'history', type: 'single', points: 1, prompt: 'Gut bacteria were first studied in the 1950s.', options: TFNG('ng'), explain: 'The passage doesn’t say when gut bacteria were first studied.' },
    // Reading, passage 2: Fill in the blanks.
    { id: 'where', type: 'fill', points: 1, prompt: '', passage: 'Bloating can happen when bacteria in the [large intestine/colon/bowel] ferment fibre.', explain: 'Paragraph B.' },
    { id: 'gel', type: 'fill', points: 1, prompt: '', passage: 'Soluble fibre absorbs water and forms a [gel/a gel] that slows digestion.', explain: 'Paragraph D.' },
    { id: 'guidance', type: 'fill', points: 1, prompt: '', passage: 'UK guidance suggests adults eat [30 grams/thirty grams/30g/30 g/30] of fibre a day, but most eat less.', explain: 'Paragraph A.' },
    { id: 'pace-fibre', type: 'fill', points: 1, prompt: '', passage: 'Adding about five grams [each week/a week/per week/every week], with more water, gives the gut a chance to adjust.', explain: 'Paragraph C.' },
    { id: 'variety', type: 'fill', points: 1, prompt: '', passage: 'A wide [variety] of plant foods feeds different bacteria.', explain: 'Paragraph E.' },
    // Writing: Long answer.
    {
      id: 'w-chart', type: 'long', points: 5,
      prompt: 'The chart shows when Sam ate and went to bed on a busy Tuesday. Summarise the information by choosing and reporting the main features, and make comparisons where relevant.',
      explain: 'Chidi marks this for task achievement, organisation, vocabulary and grammar, and replies with notes.',
    },
    {
      id: 'w-essay', type: 'long', points: 5,
      prompt: 'Some people say busy workers should take a longer lunch break away from their desk. Others say a short break is enough if the food is healthy. Discuss both views and give your own opinion.',
      explain: 'Chidi marks this for task response, organisation, vocabulary and grammar, and replies with notes.',
    },
    // Speaking: Record response.
    { id: 's-lunch', type: 'record', points: 2, prompt: 'Part 1. What do you usually eat for lunch on a working day?', explain: SPEAKING },
    { id: 's-cook', type: 'record', points: 2, prompt: 'Part 1. Do you prefer cooking at home or eating out? Why?', explain: SPEAKING },
    { id: 's-meal', type: 'record', points: 4, prompt: 'Part 2. Describe a meal you remember well. Say what you ate, where you were, who you were with, and why you remember it.', hint: 'Take a moment to plan, then speak for up to a minute.', explain: SPEAKING },
    { id: 's-desk', type: 'record', points: 2, prompt: 'Part 3. Why do you think so many people eat lunch at their desk? Is this changing?', explain: SPEAKING },
  ],
}

export const quizzes = {
  'gut-health-reset': { 'quiz-1': gutHealthCheckIn, 'check-in-all': checkInAll, 'ielts-practice': practiceTest },
}

export const LAYOUT_LABEL = { one: 'One question at a time', sections: 'Section by section', all: 'All on one page' }
export const layoutOf = (quiz) => (LAYOUT_LABEL[quiz?.settings?.layout] ? quiz.settings.layout : 'one')

// Sections with their question ids in order, ready for numbering. A quiz without sections is one
// untitled section holding every question.
export function quizSections(quiz) {
  if (!quiz.sections?.length) return [{ id: 'all', title: null, groups: [{ id: 'all', questions: quiz.questions.map((q) => q.id) }], ids: quiz.questions.map((q) => q.id) }]
  return quiz.sections.map((s) => ({ ...s, ids: s.groups.flatMap((g) => g.questions) }))
}

// The passage a question belongs to: its own, its group's, or its section's.
export function passageOf(quiz, q) {
  if (!q || !quiz.passages) return null
  const sec = quiz.sections?.find((x) => x.groups.some((g) => g.questions.includes(q.id)))
  // q.passage is also the sentence of a fill-in or grammar question, so it only names a passage that exists.
  const own = quiz.passages[q.passage] ? q.passage : null
  const id = own || sec?.groups.find((g) => g.questions.includes(q.id))?.passage || sec?.passage
  return id && quiz.passages[id] ? { id, ...quiz.passages[id] } : null
}

// "Section by section · 4 parts · 40 minutes" for the lesson's intro card.
export function layoutSummary(quiz) {
  const s = quiz.settings
  const layout = layoutOf(quiz)
  const n = quiz.questions.length
  const bits = [LAYOUT_LABEL[layout]]
  if (layout === 'sections' && quiz.sections?.length) bits.push(`${quiz.sections.length} sections`)
  else bits.push(`${n} question${n === 1 ? '' : 's'}`)
  bits.push(s.timeLimit ? `${s.timeLimit} minutes` : 'No time limit')
  return bits.join(' · ')
}

// Word limits ("NO MORE THAN TWO WORDS"): how many words an answer or blank has.
export const wordCount = (x) => String(x || '').trim().split(/\s+/).filter(Boolean).length

export const getQuiz = (slug, lessonId) => quizzes[slug]?.[lessonId] || null

// The signed-in student's earlier attempts (from the server). New attempts are added in localStorage.
export const quizHistory = {
  'gut-health-reset': {
    'quiz-1': [
      {
        id: 'seed-1', n: 1, startedAt: '2026-10-13T17:04:00Z', submittedAt: '2026-10-13T17:16:20Z', seconds: 740, flagged: [],
        answers: {
          rhythm: 'b', pace: ['a', 'c'], bloating: 'true', tracker: 'Symptom tracker', bedtime: '2', 'week-3': '2026-10-20',
          weeks: { 0: 'pace', 1: 'timing', 2: '' }, focus: { w1: 'Eating pace', w2: 'Counting calories', w3: 'Fibre, gently', w4: 'Stress, sleep and keeping going' },
          breath: ['sit', 'out', 'in', 'repeat'], 'fibre-sum': '20w',
          'week-plan': 'Breakfast at 7, a sandwich at my desk around 1, dinner late, often after 9. I’d like to eat dinner by 8 on weeknights.',
          confidence: 3, settled: 2, helped: 'pace', agree: true,
        },
      },
      {
        id: 'seed-2', n: 2, startedAt: '2026-10-17T18:02:00Z', submittedAt: '2026-10-17T18:15:40Z', seconds: 820, flagged: [],
        answers: {
          rhythm: 'b', pace: ['a', 'b', 'd'], bloating: 'true', tracker: 'Symptom tracker', bedtime: '2', 'week-3': '2026-10-20',
          weeks: { 0: 'pace', 1: 'timing', 2: 'fibre' }, focus: { w1: 'Eating pace', w2: 'Timing and rhythm', w3: 'Fibre, gently', w4: 'Stress, sleep and keeping going' },
          breath: ['sit', 'in', 'out', 'repeat'], 'fibre-sum': '20w',
          'week-plan': 'Breakfast at 7, a proper lunch away from my desk at 1, and dinner by 8 on weeknights. On late days, a small snack at 6.',
          confidence: 4, settled: 3, helped: 'pace', agree: true,
        },
      },
    ],
    'check-in-all': [
      {
        id: 'seed-ci-1', n: 1, startedAt: '2026-10-10T18:20:00Z', submittedAt: '2026-10-10T18:27:40Z', seconds: 460, flagged: [],
        answers: {
          gap: 'b', 'gap-ok': 'false', desk: 'lunch', calm: ['a', 'b'], 'first-step': { 0: 'pace' },
          'busy-day': 'Tuesdays I eat lunch at my desk and dinner after nine. I’ll try a proper lunch break away from the screen.',
          'settled-now': 3, 'agree-all': true,
        },
      },
      {
        id: 'seed-ci-2', n: 2, startedAt: '2026-10-18T07:40:00Z', submittedAt: '2026-10-18T07:45:10Z', seconds: 310, flagged: [],
        answers: {
          gap: 'b', 'gap-ok': 'false', desk: 'lunch', calm: ['a', 'b', 'd'], 'first-step': { 0: 'pace' },
          'busy-day': 'Lunch at my desk on Tuesdays and Thursdays. I’ll book a 20-minute break in my calendar and eat in the kitchen.',
          'settled-now': 4, 'agree-all': true,
        },
      },
    ],
    'ielts-practice': [
      {
        id: 'seed-ie-1', n: 1, startedAt: '2026-10-15T16:00:00Z', submittedAt: '2026-10-15T16:52:30Z', seconds: 3150, flagged: [],
        answers: {
          surname: 'Bennett', concern: 'bloating', day: 'Thursday', time: '10.30', bring: 'b',
          places: { herbs: 'F', tasting: 'C' }, classes: 'a',
          neurons: 'true', vagus: 'true', history: 'ng',
          where: { 0: 'large intestine' }, gel: { 0: 'gel' }, guidance: { 0: '30 grams' }, 'pace-fibre': { 0: 'every week' }, variety: { 0: 'variety' },
          'w-chart': 'The chart shows Sam eats breakfast at seven, a snack at half past ten, lunch at one at the desk and dinner late at quarter past nine, less than two hours before bed. The longest gap is between lunch and dinner, more than eight hours, which may explain the snacking.',
          'w-essay': 'Many people eat lunch at their desks because they feel busy. I think a short break away from the screen is worth it: we notice when we are full, digestion is calmer and the afternoon is more productive. Employers could help by making a quiet space to eat.',
        },
      },
    ],
  },
}

/* ---------- Answers and scoring ---------- */

const norm = (x) => String(x ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const normMath = (x) => norm(x).replace(/[\s×·]/g, '').replace(/\*/g, '')

export function fillParse(passage) {
  const segs = []
  const re = /\[([^[\]]*)\]/g
  let last = 0
  let n = 0
  let m
  const s = String(passage || '')
  while ((m = re.exec(s))) {
    if (m.index > last) segs.push({ text: s.slice(last, m.index) })
    segs.push({ blank: n++, answers: m[1].split('/').map((x) => x.trim()).filter(Boolean) })
    last = m.index + m[0].length
  }
  if (last < s.length) segs.push({ text: s.slice(last) })
  return segs
}

export function isAnswered(q, v) {
  if (v == null || v === '' || v === false) return false
  if (Array.isArray(v)) return v.length > 0
  if (q.type === 'fill' || q.type === 'match') return Object.values(v).some((x) => String(x || '').trim())
  if (q.type === 'draw') return !!(v.image || String(v.text || '').trim())
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

export const pointsOf = (q) => (NOT_SCORED.includes(q.type) ? 0 : q.points || 1)

// { verdict: correct | partial | incorrect | skipped | manual | none, pts, max }
export function gradeQuestion(q, v) {
  const max = pointsOf(q)
  if (!isAnswered(q, v)) return { verdict: NOT_SCORED.includes(q.type) ? 'none' : 'skipped', pts: 0, max }
  if (NOT_SCORED.includes(q.type)) return { verdict: 'none', pts: 0, max }
  if (HAND_MARKED.includes(q.type)) return { verdict: 'manual', pts: 0, max }
  const share = (hits, n) => {
    if (hits === n) return { verdict: 'correct', pts: max, max }
    if (q.partial && hits > 0) return { verdict: 'partial', pts: Math.round((hits / n) * max * 10) / 10, max }
    return { verdict: 'incorrect', pts: 0, max }
  }
  switch (q.type) {
    case 'single':
    case 'yesno':
      return share(q.options.find((o) => o.id === v)?.correct ? 1 : 0, 1)
    case 'multi': {
      const right = q.options.filter((o) => o.correct).map((o) => o.id)
      const hits = v.filter((x) => right.includes(x)).length
      const wrong = v.length - hits
      if (hits === right.length && !wrong) return { verdict: 'correct', pts: max, max }
      const pts = q.partial ? Math.max(0, Math.round(((hits - wrong) / right.length) * max * 10) / 10) : 0
      return { verdict: pts > 0 ? 'partial' : 'incorrect', pts, max }
    }
    case 'short':
      return share(q.accepted.map(norm).includes(norm(v)) ? 1 : 0, 1)
    case 'math':
      return share(q.accepted.map(normMath).includes(normMath(v)) ? 1 : 0, 1)
    case 'number': {
      const n = Number(String(v).replace(/,/g, ''))
      return share(!Number.isNaN(n) && Math.abs(n - q.accepted) <= (q.tolerance || 0) ? 1 : 0, 1)
    }
    case 'date':
      return share(v === q.accepted ? 1 : 0, 1)
    case 'fill': {
      const blanks = fillParse(q.passage).filter((s) => s.blank !== undefined)
      return share(blanks.filter((b) => b.answers.map(norm).includes(norm(v[b.blank]))).length, blanks.length)
    }
    case 'match':
      return share(q.pairs.filter((p) => norm(v[p.id]) === norm(p.match)).length, q.pairs.length)
    case 'order':
      return share(q.items.filter((it, i) => v[i] === it.id).length, q.items.length)
    default:
      return { verdict: 'manual', pts: 0, max }
  }
}

// The whole attempt. score is the provisional percentage (floored, so 69.6% never shows as 70%).
// result: passed | needs-review | not-yet. With hand-marked answers waiting, the result is Passed
// when the marked answers already reach the pass mark, Not yet when even full marks on the waiting
// answers couldn't, and Needs review in between.
export function scoreAttempt(quiz, answers = {}) {
  const graded = quiz.questions.map((q) => ({ q, ...gradeQuestion(q, answers[q.id]) }))
  const total = graded.reduce((n, g) => n + g.max, 0)
  const earned = graded.reduce((n, g) => n + g.pts, 0)
  const waiting = graded.filter((g) => g.verdict === 'manual')
  const waitingMax = waiting.reduce((n, g) => n + g.max, 0)
  const pct = total ? (earned / total) * 100 : 0
  const best = total ? ((earned + waitingMax) / total) * 100 : 0
  const pass = quiz.settings.passMark
  const result = pct >= pass ? 'passed' : waiting.length && best >= pass ? 'needs-review' : 'not-yet'
  const count = (v) => graded.filter((g) => g.verdict === v).length
  return {
    graded, total, earned: Math.round(earned * 10) / 10, score: Math.floor(pct), result,
    passed: result === 'passed', needsReview: result === 'needs-review', waiting: waiting.length,
    counts: { correct: count('correct'), partial: count('partial'), incorrect: count('incorrect'), skipped: count('skipped'), waiting: waiting.length, unscored: graded.filter((g) => g.max === 0).length },
  }
}

/* ---------- Attempt store (localStorage; every access in try/catch) ---------- */

const keyFor = (slug, lessonId, part) => `sw-quiz:${slug}:${lessonId}:${part}`

function read(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadHistory(slug, lessonId) {
  const seed = quizHistory[slug]?.[lessonId] || []
  const saved = read(keyFor(slug, lessonId, 'history'))
  return [...seed, ...(Array.isArray(saved) ? saved : [])]
}

export function addToHistory(slug, lessonId, attempt) {
  const saved = read(keyFor(slug, lessonId, 'history'))
  const list = Array.isArray(saved) ? saved : []
  if (!list.some((a) => a.id === attempt.id)) list.push(attempt)
  write(keyFor(slug, lessonId, 'history'), list)
}

// The attempt in progress, if any.
export const loadCurrent = (slug, lessonId) => read(keyFor(slug, lessonId, 'current'))
export const saveCurrent = (slug, lessonId, attempt) => write(keyFor(slug, lessonId, 'current'), attempt)
export const clearCurrent = (slug, lessonId) => write(keyFor(slug, lessonId, 'current'), null)

function shuffle(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// A shuffle that never lands on the original order (ordering questions start out of order).
function shuffleAway(list) {
  if (list.length < 2) return list.slice()
  let a = shuffle(list)
  while (a.every((x, i) => x === list[i])) a = shuffle(list)
  return a
}

// A new attempt: question order and option order are fixed for the attempt, so a refresh keeps them.
export function newAttempt(quiz, n) {
  const s = quiz.settings
  const layout = layoutOf(quiz)
  const sections = quizSections(quiz)
  const byId = Object.fromEntries(quiz.questions.map((q) => [q.id, q]))
  // Questions only move within their group, and never when they hang off a passage. The consent box
  // stays last, like the builder keeps structure in place.
  const order = sections.flatMap((sec) => sec.groups.flatMap((g) => {
    const qs = g.questions.map((id) => byId[id]).filter(Boolean)
    const movable = qs.filter((q) => q.type !== 'consent' && !passageOf(quiz, q)).map((q) => q.id)
    const fixed = qs.filter((q) => q.type === 'consent' || passageOf(quiz, q)).map((q) => q.id)
    return s.shuffle ? [...shuffle(movable), ...fixed] : g.questions.filter((id) => byId[id])
  }))
  const consent = order.filter((id) => byId[id].type === 'consent')
  if (s.shuffle) order.splice(0, order.length, ...order.filter((id) => byId[id].type !== 'consent'), ...consent)
  const options = {}
  quiz.questions.forEach((q) => {
    if (['single', 'multi', 'poll'].includes(q.type)) options[q.id] = s.shuffleOptions ? shuffle(q.options.map((o) => o.id)) : q.options.map((o) => o.id)
    if (q.type === 'match') options[q.id] = shuffle([...q.pairs.map((p) => p.match), ...(q.extra || [])])
    if (q.type === 'order' || q.type === 'ranking') options[q.id] = shuffleAway(q.items.map((it) => it.id))
  })
  const startedAt = Date.now()
  const deadline = s.timeLimit ? startedAt + s.timeLimit * 60 * 1000 : null
  return {
    id: `a-${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    n,
    startedAt: new Date(startedAt).toISOString(),
    deadline,
    order,
    options,
    answers: {},
    flagged: [],
    skipped: [],
    index: 0,
    screen: layout === 'sections' ? 'section' : layout === 'all' ? 'page' : 'question',
    // Section by section: the section (page) open now.
    section: 0,
  }
}

// What the lesson's intro card shows.
export function quizSummary(slug, lessonId, { canSave = true } = {}) {
  const quiz = getQuiz(slug, lessonId)
  if (!quiz) return null
  const history = canSave ? loadHistory(slug, lessonId).map((a) => ({ ...a, ...scoreAttempt(quiz, a.answers) })) : []
  const current = canSave ? loadCurrent(slug, lessonId) : null
  const allowed = quiz.settings.attempts || Infinity
  const used = history.length
  const passedOnce = history.some((a) => a.passed)
  const canRetake = quiz.settings.retake !== 'fail' || !passedOnce
  return {
    quiz,
    history,
    current: current && !current.submittedAt ? current : null,
    used,
    allowed,
    left: Math.max(0, allowed - used),
    canStart: used < allowed && (used === 0 || canRetake),
    best: history.length ? Math.max(...history.map((a) => a.score)) : null,
    last: history[history.length - 1] || null,
    passedOnce,
  }
}

export const RESULT_LABEL = { passed: 'Passed', 'needs-review': 'Needs review', 'not-yet': 'Not yet' }

export const formatWhen = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
