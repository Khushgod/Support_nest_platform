// Allyship LMS content — the source of truth for module text + the quiz.
// The DB (AllyshipModules) stores metadata + per-user progress; the actual
// content lives here so it can be edited without a migration.

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correct: number;
}

export interface AllyshipModuleContent {
  slug: string;
  order: number;
  title: string;
  description: string;
  durationMinutes: number;
  type: 'content' | 'quiz';
  contentHtml?: string;
  quiz?: { questions: QuizQuestion[]; passPct: number };
}

export const ALLYSHIP_MODULES: AllyshipModuleContent[] = [
  {
    slug: 'foundations',
    order: 1,
    title: 'Neurodiversity foundations',
    description: 'What autism and ADHD actually are — beyond the stereotypes.',
    durationMinutes: 35,
    type: 'content',
    contentHtml: `
      <h3>Neurodiversity foundations</h3>
      <p>Neurodiversity is the idea that neurological differences — like autism and
      ADHD — are natural variations in how human brains work, not defects to be fixed.
      Roughly 15–20% of people are neurodivergent.</p>
      <h4>Autism</h4>
      <p>Autistic people often bring deep focus, pattern recognition, honesty, and
      strong systemising skills. Differences can include sensory sensitivity, a
      preference for routine and clarity, and literal interpretation of language.</p>
      <h4>ADHD</h4>
      <p>People with ADHD frequently bring creativity, energy, and the ability to
      hyperfocus on engaging problems. Differences can include variable attention,
      working-memory load, and a need for stimulation and movement.</p>
      <h4>Why it matters at work</h4>
      <p>Traditional hiring and management often filter <em>for</em> neurotypical
      social performance rather than actual job ability. Small, intentional changes
      unlock a large, under-tapped talent pool — and make work better for everyone.</p>
    `,
  },
  {
    slug: 'communication',
    order: 2,
    title: 'Communicating across styles',
    description: 'Clear, direct, and flexible communication that works for everyone.',
    durationMinutes: 28,
    type: 'content',
    contentHtml: `
      <h3>Communicating across styles</h3>
      <p>Communication breakdowns are rarely about ability — they're about mismatched
      defaults. A few habits remove most friction:</p>
      <ul>
        <li><strong>Be explicit.</strong> Say what you mean directly; avoid hints,
        sarcasm, or "read between the lines" expectations.</li>
        <li><strong>Put it in writing.</strong> Follow verbal conversations with a
        short written summary of decisions and next steps.</li>
        <li><strong>Give processing time.</strong> Not every answer needs to be
        immediate; "let me get back to you" is fine.</li>
        <li><strong>Separate the work from the person.</strong> Feedback is about the
        task, never about character.</li>
      </ul>
      <p>These are universal-design wins: clearer for neurodivergent colleagues, and
      genuinely better for the whole team.</p>
    `,
  },
  {
    slug: 'accommodation',
    order: 3,
    title: 'Everyday accommodations',
    description: 'Low-cost, high-impact adjustments that help people do their best work.',
    durationMinutes: 22,
    type: 'content',
    contentHtml: `
      <h3>Everyday accommodations</h3>
      <p>Most effective accommodations are simple and cost little or nothing:</p>
      <ul>
        <li><strong>Environment:</strong> quiet space or noise-cancelling headphones;
        control over lighting.</li>
        <li><strong>Focus:</strong> fewer interruptions, "focus blocks", async-first
        updates instead of real-time chat pressure.</li>
        <li><strong>Structure:</strong> clear scope, written briefs, predictable
        routines and deadlines.</li>
        <li><strong>Flexibility:</strong> movement breaks, flexible hours, task
        chunking for larger projects.</li>
      </ul>
      <p>Ask the person what helps — they're the expert on their own needs. Treat
      accommodations as standard practice, not special favours.</p>
    `,
  },
  {
    slug: 'feedback',
    order: 4,
    title: 'Feedback that lands',
    description: 'How to give feedback that is specific, kind, and actually useful.',
    durationMinutes: 30,
    type: 'content',
    contentHtml: `
      <h3>Feedback that lands</h3>
      <p>Vague or indirect feedback creates anxiety and rarely changes anything.
      Strong feedback is:</p>
      <ul>
        <li><strong>Specific:</strong> point to the exact behaviour or output, with
        an example.</li>
        <li><strong>Actionable:</strong> say what "good" looks like next time.</li>
        <li><strong>Timely and private:</strong> sooner is better; criticism in
        private, praise in public.</li>
        <li><strong>Direct but kind:</strong> clarity is a kindness. Don't bury the
        message in hedging.</li>
      </ul>
      <p>Example: instead of "be more proactive," try "when a ticket is blocked,
      post in #team within the hour so we can unblock it."</p>
    `,
  },
  {
    slug: 'certification',
    order: 5,
    title: 'Certification check',
    description: 'A short scenario-based quiz. Pass to earn your allyship certificate.',
    durationMinutes: 15,
    type: 'quiz',
    quiz: {
      passPct: 50,
      questions: [
        {
          prompt:
            'A new autistic teammate asks for the meeting agenda in advance. What is the best response?',
          options: [
            'Tell them meetings are usually informal, so there isn’t one',
            'Share a written agenda ahead of time as a standard practice',
            'Suggest they just "go with the flow"',
            'Ask why they need it',
          ],
          correct: 1,
        },
        {
          prompt: 'Which feedback is most useful?',
          options: [
            '"You need to communicate better."',
            '"Be more of a team player."',
            '"When a task is blocked, post in #team within the hour."',
            '"Everyone else seems fine with how things work."',
          ],
          correct: 2,
        },
        {
          prompt: 'A colleague with ADHD does their best deep work mid-morning with music. You should:',
          options: [
            'Require everyone to follow the same 9am stand-up-heavy routine',
            'Allow flexible focus blocks and async updates where possible',
            'Ask them to stop using headphones',
            'Schedule more real-time meetings',
          ],
          correct: 1,
        },
        {
          prompt: 'Most workplace accommodations are:',
          options: [
            'Expensive and complex',
            'Only for a small number of people',
            'Low-cost adjustments that often help the whole team',
            'A legal risk best avoided',
          ],
          correct: 2,
        },
      ],
    },
  },
];

export function getModuleContent(slug: string): AllyshipModuleContent | undefined {
  return ALLYSHIP_MODULES.find((m) => m.slug === slug);
}
