// Content behind the access gate: lesson notes, quizzes, files, community posts and newsletter issues.
// Fictional school, fictional people. Keyed by product slug, then lesson id.

export const lessonContent = {
  'gut-health-reset': {
    // Embedded lessons whose embed code is a video walkthrough board (src/components/player/AnswerBoard.jsx):
    // an optional intro video (e.g. 'Oat bar label overview'), then Part 1, Part 2… each with Overview and A–E, every one a video. Videos come
    // from videoSourceFor(slug, lessonId, 'p<n>-<choice>'); the intro uses part 'intro'. No notes on purpose.
    'label-answers': {
      board: { intro: { title: 'Oat bar label overview' }, parts: 5 },
      notes: [],
    },
    'check-in-answers': {
      board: { parts: 6 },
      notes: [],
    },
    welcome: {
      notes: [
        'Welcome. Over the next six weeks we’ll make one small change at a time, so you can see what helps and what doesn’t.',
        'Watch the lessons in order, keep your symptom tracker beside you and go at a pace that suits your week. There is no falling behind here.',
      ],
      points: ['Lessons take 10–15 minutes', 'New weeks open every Monday', 'Bring questions to the monthly live Q&A'],
    },
    'how-it-works': {
      reading: {
        minutes: 6,
        blocks: [
          { h2: 'One small change at a time' },
          { p: 'Most of us have tried to change everything at once: a new diet, a new routine, a long list of foods to avoid. It rarely lasts, and it makes it hard to tell what actually helped.' },
          { p: 'This programme works the other way round. Each week brings one change. You try it for a few days, note how you feel in your tracker, and decide whether to keep it.' },
          { h2: 'What each week looks like' },
          {
            list: [
              'A short video or reading that explains the idea behind the change',
              'One practical thing to try, sized to fit a busy week',
              'A few minutes with your symptom tracker at the end of the day',
              'An optional practice, like a breathing exercise or a recipe',
            ],
          },
          { quote: 'You don’t need to get this right. You only need to notice.', cite: 'Dr Chidi Okafor' },
          { h2: 'Going at your own pace' },
          { p: 'New weeks open every Monday, but nothing expires. If a week is busy, stay with the change you’re on. Many people repeat a week and find the second time easier.' },
          { h2: 'When to talk to your doctor' },
          { p: 'This programme supports, and never replaces, care from your doctor. If you notice blood in your stool, unexplained weight loss, pain that wakes you at night or anything that worries you, speak to your GP before carrying on.' },
        ],
      },
      notes: ['A short read to set expectations before you begin. Come back to it whenever you need a reminder of how the programme works.'],
    },
    'gut-basics': {
      slides: [
        { title: 'Your gut, gently explained', points: ['A short tour, no biology degree needed', 'Eight slides, about five minutes', 'Use the arrow keys or the buttons to move'] },
        { title: 'What digestion does', points: ['Breaks food down into what your body can use', 'Starts in the mouth, long before the stomach', 'Takes most people one to three days from start to finish'] },
        { title: 'Why pace matters', points: ['Chewing is the first step of digestion', 'Eating quickly can mean swallowing more air', 'Slower meals give fullness signals time to arrive'] },
        { title: 'Rhythm and timing', points: ['Your gut has a daily rhythm, much like sleep', 'Regular meal times often feel more settled', 'Late, heavy dinners are a common trigger'] },
        { title: 'Fibre, the slow way', points: ['Fibre feeds the helpful bacteria in your gut', 'Adding a lot at once is a common cause of bloating', 'We add a little at a time from week three'] },
        { title: 'The gut–brain connection', points: ['Your gut and brain send signals to each other all day', 'Stress can speed digestion up or slow it down', 'A calm breath before meals helps some people'] },
        { title: 'What we won’t do', points: ['Cut out whole food groups without a reason', 'Promise to fix anything in six weeks', 'Replace care from your doctor'] },
        { title: 'Your first step', points: ['Print or open your symptom tracker', 'Fill in the getting-started survey', 'Pick one meal a day to eat a little more slowly'] },
      ],
      notes: ['A quick overview of the ideas behind the whole programme. Each slide links to the week where we explore it properly.'],
    },
    tracker: {
      file: {
        name: 'Symptom tracker.pdf', type: 'PDF', size: '320 KB', pages: '4 pages', pageCount: 4,
        outline: ['How to use your tracker', 'Daily log: food, timing and how you felt', 'Sleep and stress check-in', 'Weekly review: patterns you noticed'],
      },
      notes: [
        'Print the tracker or fill it in on screen. Note what you ate, when, how you felt and how you slept.',
        'You’re not looking for perfect records. A few honest notes a day are enough to spot patterns by week three.',
      ],
    },
    intake: {
      intro: 'There are no right or wrong answers. This helps Chidi understand where you’re starting from, so he can shape the live Q&A and his replies to your assignments.',
      questions: [
        {
          id: 'goal',
          prompt: 'What would you most like help with?',
          options: [
            { value: 'bloating', label: 'Bloating after meals' },
            { value: 'irregular', label: 'Digestion that feels unpredictable' },
            { value: 'triggers', label: 'Knowing which foods upset me' },
            { value: 'rhythm', label: 'Eating at steadier times' },
          ],
        },
        {
          id: 'when',
          prompt: 'When do you usually notice symptoms?',
          hint: 'Choose all that apply.',
          multiple: true,
          options: [
            { value: 'morning', label: 'Mornings' },
            { value: 'lunch', label: 'After lunch' },
            { value: 'evening', label: 'Evenings' },
            { value: 'night', label: 'At night' },
            { value: 'varies', label: 'It varies' },
          ],
        },
        { id: 'stress', prompt: 'How much does stress seem to affect your digestion?', scale: { min: 'Not at all', max: 'A great deal' } },
        { id: 'confidence', prompt: 'How confident do you feel about making small changes to how you eat?', scale: { min: 'Not confident', max: 'Very confident' } },
        { id: 'anything', prompt: 'Is there anything else you’d like Chidi to know?', freeText: true, optional: true },
      ],
      thanks: 'Chidi reads every survey before the monthly live Q&A. You can change your answers at any time from this lesson.',
      notes: ['Five short questions, about three minutes. Answer them before you start week one, then again at the end if you’d like to see what has changed.'],
    },
    'starter-kit': {
      files: [
        { name: 'Meal rhythm planner.pdf', type: 'PDF', size: '410 KB' },
        { name: 'Gentle shopping list.pdf', type: 'PDF', size: '180 KB' },
        { name: 'Symptom tracker, editable.docx', type: 'Word document', size: '52 KB' },
      ],
      notes: [
        'Everything you need for the first fortnight in one place. The editable tracker is the same as the printable one, if you prefer to type.',
        'The shopping list is a starting point, not a rule. Swap anything that doesn’t suit you.',
      ],
    },
    pace: {
      notes: [
        'How fast we eat changes how well we digest. This week’s change is simple: put your fork down between mouthfuls at one meal a day.',
        'Notice how you feel an hour later and jot it in your tracker.',
      ],
      points: ['One meal a day, not every meal', 'Chew until the texture changes', 'Sit down to eat when you can'],
    },
    breathing: {
      audio: { title: 'A calm breath before meals', subtitle: 'Guided by Dr Chidi Okafor' },
      notes: [
        'A short practice to use before one meal a day. Slower breathing can help some people feel calmer at the table, which may make meals more comfortable.',
        'If breathing exercises make you feel light-headed, stop and breathe normally.',
      ],
    },
    timing: {
      notes: [
        'Long gaps and late dinners can both unsettle digestion. We’ll look at a rhythm that fits your working day, not an ideal one.',
        'Try eating your last meal two to three hours before bed for the rest of this week.',
      ],
    },
    // Interactive video (src/components/media/InteractiveVideo.jsx, docs/video-player.md "Interactive video").
    // Cues pause the video at `at` seconds. Types: question (single choice, `correct` is an option id;
    // `required` blocks seeking past it until answered), reflection (optional text), card (a resource
    // with a link), chapter-note (a short note that doesn't pause). Their words are indexed by lesson search.
    'timing-interactive': {
      interactive: {
        captions: [{ src: '/files/meal-timing.en.vtt', srclang: 'en', label: 'English', default: true }],
        chapters: '/files/meal-timing.chapters.vtt',
        cues: [
          {
            id: 'last-meal', at: 8, type: 'question', required: true,
            title: 'Your last meal of the day',
            prompt: 'For most people, when is a comfortable time to finish the last meal of the day?',
            options: [
              { id: 'late', label: 'Just before going to bed', feedback: 'Lying down soon after a large meal is a common trigger for discomfort and reflux.' },
              { id: 'gap', label: 'Two to three hours before bed', feedback: 'A gap of two to three hours gives your stomach time to settle before you lie down.' },
              { id: 'any', label: 'It makes no difference', feedback: 'For many people it does. A gap before bed often helps digestion feel calmer at night.' },
            ],
            correct: 'gap',
          },
          {
            id: 'your-evenings', at: 13, type: 'reflection',
            title: 'Your evenings',
            prompt: 'On a typical weekday, what time do you usually finish eating?',
            hint: 'Only you can see this. There’s no right answer.',
          },
          {
            id: 'steady-gaps', at: 17, type: 'chapter-note',
            title: 'Step 2: steady gaps',
            body: 'Aim for meals at roughly the same times each day, with three to five hours between them.',
          },
          {
            id: 'planner', at: 21, type: 'card',
            title: 'Plan your meal rhythm',
            body: 'The meal planner suggests meal and snack windows around your wake-up time, work hours and bedtime. Sketch a rhythm, then come back to finish the video.',
            action: { label: 'Open the meal planner', href: '/course/gut-health-reset/learn/meal-planner' },
          },
          {
            id: 'small-change', at: 25, type: 'question', required: true,
            title: 'This week’s change',
            prompt: 'Which change fits this week’s step best?',
            options: [
              { id: 'skip', label: 'Skip breakfast to give your gut a rest', feedback: 'Long gaps can unsettle digestion for some people. This week is about steady times, not fewer meals.' },
              { id: 'steady', label: 'Eat at roughly the same times each day', feedback: 'Steady times are the heart of this week. Shifts of half an hour either way are fine.' },
              { id: 'one', label: 'Have one large meal in the evening', feedback: 'A single late, heavy meal is one of the most common triggers. Smaller, steadier meals tend to feel easier.' },
            ],
            correct: 'steady',
          },
        ],
      },
      notes: [
        'A short video that pauses to check in with you: two quick questions, a moment to reflect on your own evenings and a link to the meal planner.',
        'Answer both questions and watch to the end to complete the lesson. Your answers are saved, so you can rewatch without being asked again.',
      ],
      points: ['Finish your last meal two to three hours before bed', 'Keep meals at roughly the same times each day', 'Try your new rhythm for three days'],
    },
    'meal-planner': {
      embed: {
        name: 'Meal Rhythm planner',
        provider: 'Meal Rhythm',
        domain: 'mealrhythm.example',
        url: 'https://mealrhythm.example/planner',
        description: 'Enter when you usually wake, work and go to bed, and the planner suggests meal and snack windows that fit around your day.',
        fields: ['Wake-up time', 'Work or school hours', 'Bedtime'],
      },
      notes: [
        'An outside tool we like for this week’s timing change. Use it to sketch a rhythm, then try it for three days.',
        'Meal Rhythm is run by another company. What you type into it is covered by their privacy policy, not ours.',
      ],
    },
    'rhythm-map': {
      prompt: 'Using the meal-timing planner, write down your usual meal times on a typical weekday and one change you’d like to try this week.',
      submission: {
        graded: true,
        text: 'I usually skip breakfast, have lunch at about 2pm at my desk and eat dinner at 9pm after the gym. I’d like to try a small breakfast by 9am and moving dinner to 8pm on the days I don’t train.',
        file: 'My weekday rhythm.pdf',
        sent: 'Mon 13 Oct',
        gradedOn: 'Wed 15 Oct',
        result: 'Complete',
        feedback: [
          'This is a really clear picture, thank you. Starting with breakfast is a good choice, and it doesn’t need to be big: a yoghurt or a slice of toast counts.',
          'On training days, a small snack around 5pm may make a later dinner feel easier. Try it for a week and note how evenings feel in your tracker.',
        ],
      },
      notes: ['A short written task to put the timing lesson into practice. Chidi reads every answer and replies with a suggestion or two.'],
    },
    coach: {
      name: 'AI practice coach',
      intro: 'Hi, I’m the practice coach for Gut Health Reset. I can help you plan small changes, rehearse tricky moments like eating out, and remind you what the lessons said.',
      suggestions: [
        {
          prompt: 'Help me slow down at lunch at work',
          reply: 'A good place to start is one lunch a week away from your desk, even if it’s ten minutes on a bench. When you eat, try putting your fork down between mouthfuls, as in the eating pace lesson. Would you like to pick which day to try first?',
        },
        {
          prompt: 'What could I eat for a lighter dinner?',
          reply: 'Lighter doesn’t have to mean smaller. Soups, stews and simple grain bowls are often easier in the evening than rich or fried food. The recipe pack in week three has twelve ideas. For now, you could try finishing dinner two to three hours before bed and noting how you sleep.',
        },
        {
          prompt: 'I missed three days. What now?',
          reply: 'Nothing is undone. Pick up with the change you were on, at one meal tomorrow. Missing days is part of real life, and noticing that you want to start again is the important bit.',
        },
      ],
      replies: [
        {
          keywords: ['pain', 'blood', 'vomit', 'weight loss', 'severe'],
          reply: 'That sounds like something to talk to a doctor about, rather than a practice coach. Contact your GP, or call your local urgent care line if it feels serious. You can also message Chidi through the contact page.',
        },
        {
          keywords: ['bloat'],
          reply: 'Bloating is one of the most common reasons people join this programme. In week one we look at eating pace, and in week three at adding fibre slowly. Your tracker will help you see whether it follows certain meals or times of day.',
        },
        {
          keywords: ['coffee', 'caffeine', 'tea'],
          reply: 'Some people find coffee on an empty stomach unsettling, others don’t notice a thing. You could try having it after breakfast for a few days and see what your tracker shows.',
        },
        {
          keywords: ['sleep', 'tired', 'night'],
          reply: 'Sleep and digestion affect each other. Weeks four to six look at this more closely. For now, finishing your last meal two to three hours before bed is a gentle place to start.',
        },
      ],
      fallback: 'Thanks for telling me. I keep to what this programme covers: eating pace, meal timing, fibre, stress and sleep. Could you tell me which of those your question is about? If it’s about a symptom, Chidi or your GP is the right person to ask.',
      disclaimer: 'The coach is an AI, and it can get things wrong.',
      notes: ['Practise planning your changes in a short chat. The coach only knows what’s in this programme, and your conversation isn’t saved after you leave the lesson.'],
    },
    dropin: {
      notes: ['Recorded on Thu 9 Oct. Chidi answers questions from the first fortnight of the programme. Skip to the times below to find a question.'],
      points: [
        '02:10 · Is some bloating normal while I make changes?',
        '14:35 · What if I work shifts?',
        '27:50 · Coffee, tea and digestion',
        '36:20 · Keeping the tracker going on busy days',
      ],
    },
    'quiz-1': {
      passMark: 70,
      attempts: 3,
      questions: [
        {
          id: 'q1',
          prompt: 'What is this week’s main change?',
          options: [
            { value: 'a', label: 'Cutting out a food group' },
            { value: 'b', label: 'Finding a meal rhythm that suits your day' },
            { value: 'c', label: 'Eating six small meals' },
          ],
          answer: 'b',
        },
        {
          id: 'q2',
          prompt: 'How long before bed do we suggest finishing your last meal?',
          options: [
            { value: 'a', label: 'Two to three hours' },
            { value: 'b', label: 'Thirty minutes' },
            { value: 'c', label: 'It doesn’t matter' },
          ],
          answer: 'a',
        },
      ],
      notes: ['A short check-in to make sure the first two weeks have landed. You can retake it, and your answers are only seen by you.'],
    },
    recipes: {
      file: { name: 'Soups and stews recipe pack.pdf', type: 'PDF', size: '6.4 MB', pages: '22 pages' },
      notes: ['Twelve warming recipes that are gentle on digestion, with swaps for common sensitivities.'],
    },
    'food-diary': {
      scorm: {
        module: 'Food diary training',
        version: 'SCORM 1.2 package',
        length: 'about 15 minutes',
        score: 90,
        screens: [
          { title: 'Why keep a food diary', text: 'A food diary helps you see patterns you might miss day to day. It isn’t about judging what you eat. It’s about noticing.' },
          { title: 'What to write down', text: 'Note the time, what you ate and drank, roughly how much, and how you felt one to two hours later. Add sleep and stress if you can.' },
          { title: 'Patterns, not culprits', text: 'One uncomfortable evening rarely points to one food. Look for things that happen again and again over a week or two.' },
          { title: 'Practice: read Sam’s diary', text: 'Sam feels bloated most afternoons. His diary shows he eats lunch at his desk in under ten minutes on those days. What might he try first?' },
          { title: 'Check your understanding', text: 'You’ve finished the training. Your answers are sent to the course so your progress and score are saved.' },
        ],
      },
      notes: ['An interactive training module from our partner school. It opens inside this page and saves your progress, so you can stop and come back.'],
    },
    'fibre-steps': {
      parts: [
        { title: 'Watch: why slow and steady works', video: { duration: '04:20' } },
        {
          title: 'Read: a two-week fibre ladder',
          // Audio part (AudioStage): this part read aloud. `src` would be the school's audio file.
          audio: { title: 'The fibre ladder, read aloud', subtitle: 'Read by Dr Chidi Okafor', duration: '02:40' },
          reading: [
            'Think of fibre as a ladder you climb one rung at a time. Each rung is one small addition, kept for three or four days before you add the next.',
            'Good first rungs are foods many people find gentle: oats, cooked carrots, ripe bananas and a spoonful of ground flaxseed.',
          ],
          list: ['Add one food at a time', 'Drink a little more water as you go', 'Step back a rung if you feel uncomfortable'],
        },
        { title: 'Download: your fibre ladder chart', files: [{ name: 'Fibre ladder chart.pdf', type: 'PDF', size: '240 KB' }] },
        { title: 'Reflect: your first rung', reflection: 'Which one fibre-rich food will you add this week, and at which meal?' },
      ],
      notes: ['Four short parts, about fifteen minutes in all. Work through them in order, then keep the chart somewhere you’ll see it.'],
    },
    handbook: {
      ebook: {
        title: 'The calm gut handbook',
        author: 'Dr Chidi Okafor',
        chapters: [
          {
            title: 'Before you begin',
            pages: [
              [
                'This handbook is a companion to Gut Health Reset. It gathers the ideas from each week into one place, so you can come back to them long after the programme ends.',
                'Read it in order or dip in where you need to. Each chapter is short, and none of it asks you to be perfect.',
              ],
              [
                'A note on care: everything here is about everyday habits. If something feels wrong or new, or simply worries you, your GP is the right first call.',
                'Keep your symptom tracker nearby as you read. Many of the suggestions work best when you can see your own patterns.',
              ],
            ],
          },
          {
            title: 'Eating at your own pace',
            pages: [
              [
                'Digestion begins before the first bite. Smelling and seeing food prepares your body for what is coming, which is one reason rushed meals can feel heavier.',
                'Chewing breaks food into smaller pieces and gives your stomach less work to do. You don’t need to count chews. Aim for the texture to change before you swallow.',
              ],
              [
                'Try this at one meal a day: sit down, put your fork down between mouthfuls and pause halfway through to notice how full you feel.',
                'If that feels awkward at first, that’s normal. Most people find it becomes easier within a week.',
              ],
            ],
          },
          {
            title: 'Finding your rhythm',
            pages: [
              [
                'Your gut has a daily rhythm, much like your sleep. Eating at roughly the same times each day can help it feel more settled.',
                'Rhythm doesn’t mean a strict timetable. It means fewer very long gaps, and a little more space between your last meal and bed.',
              ],
              [
                'Start with whichever meal is easiest to move. For many people that’s breakfast, which can be small: a yoghurt, a piece of fruit or a slice of toast.',
                'Note any change in your tracker for a week before you adjust anything else.',
              ],
            ],
          },
          {
            title: 'Fibre without the fuss',
            pages: [
              [
                'Fibre feeds the helpful bacteria in your gut. Most of us eat less than we could, but adding a lot at once is a common cause of wind and bloating.',
                'Climb slowly. Add one fibre-rich food, keep it for a few days, then add another.',
              ],
              [
                'Gentle first steps include oats, cooked vegetables, lentils in small portions and ripe fruit. Drink a little more water as you go.',
                'If a food doesn’t agree with you, step back for a few days and try again later, or try a different one.',
              ],
            ],
          },
          {
            title: 'Stress, sleep and your gut',
            pages: [
              [
                'Your gut and brain are in constant conversation. When you’re stressed, digestion can speed up, slow down or simply feel less comfortable.',
                'You can’t remove stress from life, but a few calm breaths before a meal can help your body shift into a more relaxed state.',
              ],
              [
                'Sleep matters too. A late, heavy dinner can disturb sleep, and poor sleep can make digestion feel more sensitive the next day.',
                'If you can, finish eating two to three hours before bed and keep evenings a little quieter.',
              ],
            ],
          },
          {
            title: 'Keeping going',
            pages: [
              [
                'The changes that last are the ones that fit your life. Look back at your tracker and choose the two or three that made the most difference.',
                'Expect wobbles. Holidays, busy weeks and illness all knock routines. Coming back to one small habit is enough.',
              ],
              [
                'You’re always welcome to bring questions to the monthly live Q&A, or to book a consultation if you’d like support that’s just for you.',
                'Thank you for reading, and for taking care of yourself.',
              ],
            ],
          },
        ],
      },
      notes: ['Our handbook to keep: every idea from the programme in one short, friendly read. It stays in your library after the course ends.'],
    },
    assignment: {
      prompt: 'In a few sentences, tell us which changes helped most, which you’ll keep, and what you’d like support with next.',
      notes: ['Chidi reads every plan and replies within 5 working days with a few personal suggestions.'],
    },
  },
  'mindful-eating-basics': {
    d1: {
      notes: ['Choose one meal today and eat it without a screen. Notice the colours, smells and textures before the first bite.'],
      points: ['Five minutes is enough', 'Notice, don’t judge'],
    },
    d2: {
      notes: ['Today we use a simple 1 to 10 scale to check in with hunger before, during and after a meal.'],
    },
  },
}

export const defaultNotes = [
  'Take this lesson at your own pace. Pause whenever you need to, and come back to it as often as you like.',
  'If anything here doesn’t feel right for your body, talk to your practitioner or GP before making changes.',
]

// The Healing Circle community.
export const communityPosts = [
  {
    id: 'p1', author: 'Owen Marsh', practitioner: true, space: 'Weekly wins', time: '2 hours ago',
    text: 'This week’s prompt: what is one small thing you did for yourself that you’d like to keep doing? Share it below, however small it feels.',
    replies: 14,
  },
  {
    id: 'p2', author: 'Rafael K.', space: 'Gut health', time: 'Yesterday',
    text: 'Three weeks of slower lunches and the afternoon bloating has eased a lot. Still working on dinners. Does anyone else find evenings harder?',
    replies: 9,
  },
  {
    id: 'p3', author: 'Pranav S.', space: 'Recipes', time: '2 days ago',
    text: 'Made the red lentil and ginger soup from the recipe pack with extra lemon. It freezes well, so I now have lunches for the week.',
    replies: 6,
  },
  {
    id: 'p4', author: 'Jonah M.', space: 'Midlife and men’s health', time: '4 days ago',
    text: 'Reminder that Owen’s live chat on sleep and midlife energy is this Thursday at 19:00 (GMT). Bring your questions.',
    replies: 3,
  },
]

// The Sunday Letter, paid edition.
export const newsletterIssues = [
  {
    id: 'i86', date: 'Sun 12 Oct', title: 'Soup season, and a 10-minute evening wind-down',
    excerpt: 'A simple miso and greens soup, a breathing practice for the end of a long day and your questions about bloating after exercise.',
  },
  {
    id: 'i85', date: 'Sun 5 Oct', title: 'What to do when you fall off the routine',
    excerpt: 'Why missing a few days doesn’t undo anything, plus overnight oats three ways and a short body scan.',
  },
  {
    id: 'i84', date: 'Sun 28 Sep', title: 'Morning light and steadier energy',
    excerpt: 'How a short walk before breakfast can help your sleep, a savoury breakfast bowl and reader questions on caffeine.',
  },
]

// 1:1 coaching next steps after approval.
export const coachingSteps = [
  { label: 'Fill in your intake form', description: 'About 15 minutes. It helps us make the most of your first session.' },
  { label: 'Book your first consultation', description: '75 minutes on a video call with Dr Chidi Okafor.' },
  { label: 'Get your written plan', description: 'We send it within 2 working days of each session.' },
]

// StateNotice copy when a product can't be bought or opened right now (never Not found).
export const unavailableCopy = {
  'sold-out': { reason: 'This is sold out', detail: 'Every place has been taken. Join the waitlist on the details page and we’ll email you if a place opens.' },
  'sales-ended': { reason: 'Sales have ended', detail: 'This programme is no longer on sale. Anything you bought before stays in My programmes.' },
  'enrolment-closed': { reason: 'Enrollment is closed', detail: 'Enrolment opens twice a year. Join the intake list on the details page to hear first.' },
}
