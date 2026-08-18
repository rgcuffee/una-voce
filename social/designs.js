const dailyRhythm = 'MORNING <i></i> EVENING <i></i> NIGHT';

function artwork({
  theme = 'cream',
  layout = 'editorial',
  classes = '',
  chrome = 'minimal',
  eyebrow = '',
  title,
  body = '',
  detail = '',
  ornament = '',
  footer = '',
  marginalia = '',
}) {
  return `
    <article class="uv-post uv-post--${theme} uv2 uv2--${layout} uv2--chrome-${chrome} ${classes}">
      <div class="uv-paper-grain" aria-hidden="true"></div>
      <div class="uv-frame" aria-hidden="true"></div>
      <header class="uv-post-header">
        <span class="uv-post-mark" aria-hidden="true"><b></b>☩<b></b></span>
      </header>
      ${marginalia ? `<p class="uv2-marginalia">${marginalia}</p>` : ''}
      <div class="uv-post-copy">
        ${eyebrow ? `<p class="uv-post-eyebrow">${eyebrow}</p>` : ''}
        <h2>${title}</h2>
        ${body ? `<p class="uv-post-body">${body}</p>` : ''}
        ${detail}
      </div>
      ${ornament}
      ${footer ? `<footer class="uv-post-footer">${footer}</footer>` : ''}
    </article>
  `;
}

function wordField(items, className = '') {
  return `<div class="uv2-word-field ${className}">${items.map((item) => `<span>${item}</span>`).join('')}</div>`;
}

function church() {
  return `
    <div class="uv2-church" aria-hidden="true">
      <span class="uv2-church-cross">†</span>
      <i class="uv2-church-spire"></i>
      <i class="uv2-church-tower"><b></b><b></b><b></b></i>
      <i class="uv2-church-nave"></i>
      <i class="uv2-church-aisle"></i>
      <i class="uv2-church-ground"></i>
    </div>
  `;
}

function sunburst(className = '') {
  return `<div class="uv2-sunburst ${className}" aria-hidden="true"><i></i></div>`;
}

function hoursDial() {
  const hours = [
    ['READINGS', 'uv2-hour--readings'],
    ['MORNING', 'uv2-hour--morning'],
    ['MIDMORNING', 'uv2-hour--midmorning'],
    ['MIDDAY', 'uv2-hour--midday'],
    ['MIDAFTERNOON', 'uv2-hour--midafternoon'],
    ['EVENING', 'uv2-hour--evening'],
    ['NIGHT', 'uv2-hour--night'],
  ];
  return `
    <div class="uv2-hours-dial" aria-label="The seven canonical Hours">
      <i aria-hidden="true"></i>
      ${hours.map(([hour, className]) => `<span class="${className}">${hour}</span>`).join('')}
    </div>
  `;
}

function sevenMarks() {
  const labels = ['READINGS', 'MORNING', 'MIDMORNING', 'MIDDAY', 'MIDAFTERNOON', 'EVENING', 'NIGHT'];
  return `
    <div class="uv2-seven-marks" aria-label="Seven Hours, with Morning, Evening, and Night emphasized">
      ${labels.map((label, index) => `<span class="${[1, 5, 6].includes(index) ? 'is-gentle-start' : ''}"><i></i><b>${label}</b></span>`).join('')}
    </div>
  `;
}

function threeMoments() {
  return `
    <div class="uv2-three-moments" aria-hidden="true">
      <span><i class="uv2-sun-symbol"></i><b>MORNING</b></span>
      <span><i class="uv2-horizon-symbol"></i><b>EVENING</b></span>
      <span><i class="uv2-moon-symbol"></i><b>NIGHT</b></span>
    </div>
  `;
}

function lineBook() {
  return `
    <div class="uv2-line-book" aria-hidden="true">
      <i></i><i></i><b>☩</b><span></span><span></span>
    </div>
  `;
}

function voicesField() {
  return `
    <div class="uv2-voices" aria-hidden="true">
      ${Array.from({ length: 15 }, (_, index) => `<i style="--x:${(index * 3.8).toFixed(1)}cqw;--x-wide:${(index * 4.9).toFixed(1)}cqw;--x-mid:${(index * 4.3).toFixed(1)}cqw;--angle:${((7 - index) * 2.8).toFixed(1)}deg;--fade:${(.3 + index * .025).toFixed(3)};--dot:${(index * .34).toFixed(1)}cqw"></i>`).join('')}
      <b>☩</b>
    </div>
  `;
}

function rhythmTrack(count = 12) {
  return `<div class="uv2-rhythm-track" aria-hidden="true">${Array.from({ length: count }, (_, index) => `<i style="--size:${(1 + index * .04).toFixed(2)}cqw"></i>`).join('')}</div>`;
}

function prayerLoop() {
  return `
    <div class="uv2-prayer-loop" aria-label="Invitation to prayer, prayer to rhythm, rhythm to invitation">
      <span>INVITATION</span><i>→</i><span>PRAYER</span><i>→</i><span>RHYTHM</span><i>→</i><span>INVITATION</span>
    </div>
  `;
}

export const socialDesigns = [
  {
    id: 'what-is-una-voce',
    number: '01',
    title: 'What Is Una Voce?',
    label: 'Identity carousel',
    caption: `Una Voce means “one voice.”\n\nIt is a place to discover the Liturgy of the Hours and find trusted ways to pray it through audio, video, livestreams, and other prayer pathways.\n\nYou do not need to know where to start. We want to help you begin with one Hour and keep going with the Church.\n\nLearn more at unavoce.net.\n\n#UnaVoce #LiturgyOfTheHours #CatholicPrayer`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'forest',
          layout: 'identity',
          chrome: 'full',
          eyebrow: 'The daily prayer of the Church',
          title: 'What is<br /><em>Una Voce?</em>',
          body: 'A place to discover the Hours, begin praying, and keep going.',
          ornament: church(),
          footer: dailyRhythm,
        }),
      },
      {
        label: 'The name',
        html: artwork({
          layout: 'centered-display',
          classes: 'uv2--name-slide',
          chrome: 'none',
          eyebrow: 'The name',
          title: '<span class="uv2-name">Una Voce</span>',
          body: 'One voice.',
          detail: '<p class="uv2-small-note">Different people, places, and prayer forms. One prayer of the Church.</p>',
          marginalia: 'UNA VOCE / ONE VOICE',
        }),
      },
      {
        label: 'What it is',
        html: artwork({
          theme: 'stone',
          layout: 'statement',
          classes: 'uv2--doorway-slide',
          chrome: 'minimal',
          eyebrow: 'A simple doorway',
          title: 'Find your way<br />into the <em>Hours.</em>',
          body: 'Una Voce helps Catholics discover the daily prayer of the Church without having to know every path in advance.',
          detail: '<div class="uv2-doorway" aria-hidden="true"><i></i></div>',
        }),
      },
      {
        label: 'Prayer pathways',
        html: artwork({
          theme: 'charcoal',
          layout: 'poster-list',
          chrome: 'none',
          eyebrow: 'Trusted prayer pathways',
          title: 'Find a way<br />that helps you <em>pray.</em>',
          detail: wordField(['READ', 'LISTEN', 'WATCH', 'JOIN LIVE', 'PRAY IN PERSON'], 'uv2-word-field--pathways'),
          marginalia: 'AUDIO / VIDEO / LIVE / MORE',
        }),
      },
      {
        label: 'Invitation',
        html: artwork({
          theme: 'forest',
          layout: 'invitation',
          classes: 'uv2--post-one-invitation',
          chrome: 'minimal',
          eyebrow: 'You can begin today',
          title: 'Begin with<br /><em>one Hour.</em>',
          body: 'Keep going with the Church.',
          detail: '<div class="uv2-cross-rule" aria-hidden="true"><i></i>☩<i></i></div>',
          footer: 'PRAY THE CURRENT HOUR NOW · UNAVOCE.NET',
        }),
      },
    ],
  },
  {
    id: 'what-are-the-hours',
    number: '02',
    title: 'What Is the Liturgy of the Hours?',
    label: 'Formation carousel',
    caption: `The Church has a daily rhythm of prayer called the **Liturgy of the Hours**. It is shaped by Scripture, especially the Psalms, with hymns and intercessions offered throughout the day.\n\nAnd despite the name, an **Hour does not mean 60 minutes**. “Hour” refers to a particular time of prayer within the Church’s day. Morning or Evening Prayer can often be prayed in about **10 to 20 minutes**, depending on how you pray.\n\nThis prayer has an architecture. Nearly the whole Psalter unfolds across four weeks, and across the liturgical year its Scripture readings move through the great moments of salvation history.\n\nThat scale can inspire awe, but it does not have to intimidate you.\n\nYou do not have to take in the whole thing at once.\n\n**Begin with one prayer. Let it become part of your day.**\n\n#LiturgyOfTheHours #DivineOffice #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          layout: 'diagram',
          classes: 'uv2--hours-cover',
          chrome: 'minimal',
          eyebrow: 'The daily prayer of the Church',
          title: 'What is the<br /><em>Liturgy of<br />the Hours?</em>',
          body: 'Prayer at different periods of the day.',
          ornament: hoursDial(),
          marginalia: 'PSALMS · SCRIPTURE · HYMN · INTERCESSION',
        }),
      },
      {
        label: 'Daily rhythm',
        html: artwork({
          theme: 'stone',
          layout: 'centered-display',
          chrome: 'none',
          eyebrow: 'From morning through night',
          title: 'The Church has<br />a daily <em>rhythm</em><br />of prayer.',
          ornament: rhythmTrack(10),
          marginalia: 'THE DAILY PRAYER OF THE CHURCH',
        }),
      },
      {
        label: 'The four-week cycle',
        html: artwork({
          layout: 'type-stack',
          classes: 'uv2--psalter-cycle',
          chrome: 'none',
          eyebrow: 'The prayer has an architecture',
          title: '<span class="uv2-cycle-four">4</span><span class="uv2-cycle-copy"><b>weeks.</b><em>Nearly the whole<br />Psalter.</em></span>',
          body: 'Keep praying through the year, and Scripture carries you through the Church’s seasons and the story of salvation.',
          detail: '<div class="uv2-cycle-scale"><span>DAY</span><i></i><span>FOUR WEEKS</span><i></i><span>LITURGICAL YEAR</span></div>',
          marginalia: 'ORDERED PRAYER / NOT RANDOM',
        }),
      },
      {
        label: 'The Hours',
        html: artwork({
          theme: 'forest',
          layout: 'art-field',
          classes: 'uv2--hours-map',
          chrome: 'none',
          eyebrow: 'Seven periods of prayer',
          title: 'The Hours<br /><em>mark the day.</em>',
          ornament: sevenMarks(),
          marginalia: 'OFFICE OF READINGS / LAUDS / TERCE / SEXT / NONE / VESPERS / COMPLINE',
        }),
      },
      {
        label: 'The invitation',
        html: artwork({
          theme: 'gold',
          layout: 'statement',
          classes: 'uv2--allowed-slide',
          chrome: 'minimal',
          eyebrow: 'Priests and religious pray them',
          title: 'Lay Catholics<br />are invited<br /><em>too.</em>',
          body: 'This is the daily prayer of the Church, and you are allowed to enter it.',
        }),
      },
    ],
  },
  {
    id: 'start-with-one',
    number: '03',
    title: 'No, You Do Not Have to Pray All Seven.',
    label: 'Beginner carousel',
    caption: `Here is the part many beginners need to hear first: you do not have to begin by praying every Hour.\n\nChoose Morning Prayer, Evening Prayer, or Night Prayer. Let one honest point in your day become a place to meet the Church in prayer.\n\nOne Hour is not a lesser beginning. It is a real beginning.\n\n#LiturgyOfTheHours #CatholicPrayer #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'stone',
          layout: 'provocation',
          classes: 'uv2--p3-cover',
          chrome: 'none',
          title: '<span>No,</span><br />you do not<i class="uv2-p3-have">have</i>to pray all <em>seven.</em>',
          body: 'Start with one Hour.',
          marginalia: 'A NOTE FOR BEGINNERS',
        }),
      },
      {
        label: 'Start with one',
        html: artwork({
          layout: 'sparse',
          classes: 'uv2--start-one',
          chrome: 'none',
          title: 'Start with<br /><em>one.</em>',
          body: 'That is enough for today.',
          ornament: sunburst('uv2-sunburst--small'),
        }),
      },
      {
        label: 'Three places to begin',
        html: artwork({
          theme: 'forest',
          layout: 'three-part',
          classes: 'uv2--p3-three',
          chrome: 'minimal',
          eyebrow: 'Three gentle places to begin',
          title: 'Morning.<br />Evening.<br /><em>Night.</em>',
          ornament: threeMoments(),
          marginalia: 'LAUDS / VESPERS / COMPLINE',
        }),
      },
      {
        label: 'The full pattern',
        html: artwork({
          layout: 'art-field',
          classes: 'uv2--seven-art',
          chrome: 'none',
          eyebrow: 'The full pattern contains several Hours',
          title: 'You can enter<br />through <em>one.</em>',
          ornament: sevenMarks(),
        }),
      },
      {
        label: 'A real beginning',
        html: artwork({
          theme: 'oxblood',
          layout: 'invitation',
          classes: 'uv2--one-hour',
          chrome: 'none',
          eyebrow: 'No pressure to perform',
          title: 'Praying once<br />is a real <em>beginning.</em>',
          detail: '<div class="uv2-cross-rule" aria-hidden="true"><i></i>☩<i></i></div>',
          footer: 'PRAY THE CURRENT HOUR NOW · UNAVOCE.NET',
        }),
      },
    ],
  },
  {
    id: 'easiest-place-to-begin',
    number: '04',
    title: 'The Easiest Place to Begin.',
    label: 'Practical carousel',
    caption: `The easiest place to begin is usually a moment your life already gives you.\n\nMorning coffee. Getting home from work. The quiet before bed. Match that moment to Morning, Evening, or Night Prayer, then choose a format that feels approachable.\n\nPray. Return tomorrow if possible. Let the invitation stay gentle.\n\n#CatholicPrayer #LiturgyOfTheHours #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          layout: 'journal',
          classes: 'uv2--easiest-cover',
          chrome: 'minimal',
          eyebrow: 'A practical beginning',
          title: 'The easiest<br />place to <em>begin.</em>',
          body: 'Choose a time already present in your life.',
          ornament: threeMoments(),
        }),
      },
      {
        label: 'A present moment',
        html: artwork({
          theme: 'stone',
          layout: 'statement',
          classes: 'uv2--already-slide',
          chrome: 'none',
          eyebrow: 'Begin with the life you have',
          title: 'Start with a<br />moment you<br /><em>already</em> have.',
        }),
      },
      {
        label: 'Three moments',
        html: artwork({
          layout: 'three-part',
          classes: 'uv2--life-moments',
          chrome: 'minimal',
          eyebrow: 'Notice the natural pause',
          title: 'Coffee.<br />Home.<br /><em>Bed.</em>',
          detail: '<div class="uv2-life-notes"><span>MORNING PRAYER</span><span>EVENING PRAYER</span><span>NIGHT PRAYER</span></div>',
          marginalia: 'MATCH THE HOUR TO THE MOMENT',
        }),
      },
      {
        label: 'Choose a format',
        html: artwork({
          theme: 'charcoal',
          layout: 'poster-list',
          chrome: 'none',
          eyebrow: 'Choose what feels approachable',
          title: 'A page.<br />A voice.<br /><em>A place.</em>',
          body: 'Read, listen, watch, sing, or join others.',
        }),
      },
      {
        label: 'Return',
        html: artwork({
          theme: 'forest',
          layout: 'sparse',
          classes: 'uv2--return-tomorrow',
          chrome: 'none',
          title: 'Pray.',
          body: 'Return tomorrow, if possible.',
          detail: '<p class="uv2-small-note">No perfect schedule required.</p>',
          marginalia: 'BEGIN / RETURN / BEGIN AGAIN',
        }),
      },
    ],
  },
  {
    id: 'choose-your-hour',
    number: '05',
    title: 'Morning Prayer, Evening Prayer, or Night Prayer?',
    label: 'Discernment carousel',
    caption: `Which Hour should you pray first?\n\nThere is no need to find the “best” one. Morning Prayer turns the beginning of the day toward God. Evening Prayer gathers the day in thanksgiving. Night Prayer entrusts the day to God before rest.\n\nChoose the Hour that fits the life you actually have.\n\n#MorningPrayer #EveningPrayer #NightPrayer`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'cream',
          layout: 'three-part',
          classes: 'uv2--choose-hour-cover',
          chrome: 'none',
          eyebrow: 'Which Hour should I choose?',
          title: 'Morning.<br />Evening.<br /><em>Night.</em>',
          body: 'Choose the Hour that fits your life.',
          ornament: '<div class="uv2-triptych" aria-hidden="true"><i></i><i></i><i></i></div>',
          marginalia: 'LAUDS / VESPERS / COMPLINE',
        }),
      },
      {
        label: 'Morning Prayer',
        html: artwork({
          theme: 'forest',
          layout: 'hour',
          classes: 'uv2--morning-hour',
          chrome: 'minimal',
          eyebrow: 'Lauds / Morning Prayer',
          title: 'Turn toward<br />God at the<br /><em>beginning.</em>',
          body: 'Receive the day before its noise gathers.',
          ornament: sunburst('uv2-sunburst--half'),
        }),
      },
      {
        label: 'Evening Prayer',
        html: artwork({
          theme: 'stone',
          layout: 'hour',
          classes: 'uv2--evening-hour',
          chrome: 'none',
          eyebrow: 'Vespers / Evening Prayer',
          title: 'Give thanks<br />as the day<br /><em>closes.</em>',
          body: 'Gather what the day held and place it before God.',
          ornament: '<div class="uv2-evening-horizon" aria-hidden="true"><i></i><b></b></div>',
        }),
      },
      {
        label: 'Night Prayer',
        html: artwork({
          theme: 'oxblood',
          layout: 'hour',
          classes: 'uv2--night-hour',
          chrome: 'none',
          eyebrow: 'Compline / Night Prayer',
          title: 'Entrust the<br />day to God<br /><em>before rest.</em>',
          body: 'A brief, quiet Hour at the edge of sleep.',
          ornament: '<div class="uv2-large-moon" aria-hidden="true"><i></i><span>✦</span><span>·</span></div>',
        }),
      },
      {
        label: 'Choose honestly',
        html: artwork({
          layout: 'invitation',
          chrome: 'minimal',
          eyebrow: 'There is no best first Hour',
          title: 'Choose the Hour<br />your actual life<br />can <em>hold.</em>',
          detail: threeMoments(),
        }),
      },
    ],
  },
  {
    id: 'more-than-one-way',
    number: '06',
    title: 'There Is More Than One Way to Pray the Hours.',
    label: 'Discovery carousel',
    caption: `There is more than one faithful way to pray the Hours.\n\nSome people need a page in front of them. Some need a voice to follow. Some are drawn to sung prayer, a monastery livestream, a parish gathering, or a quiet place to pray in person.\n\nUna Voce helps people discover trusted pathways and choose the one that helps them pray.\n\n#LiturgyOfTheHours #CatholicPrayer #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'charcoal',
          layout: 'poster-list',
          classes: 'uv2--ways-cover',
          chrome: 'none',
          eyebrow: 'More than one way in',
          title: 'Read.<br />Listen.<br />Sing.<br /><em>Join.</em>',
          body: 'Choose the form that helps you pray.',
          marginalia: 'THE HOURS / MANY PATHWAYS / ONE PRAYER',
        }),
      },
      {
        label: 'Read',
        html: artwork({
          layout: 'split-motif',
          chrome: 'minimal',
          eyebrow: 'Some people need a page',
          title: 'Read the<br /><em>prayer.</em>',
          body: 'Follow the psalms and readings in a breviary, an app, or a printed guide.',
          ornament: lineBook(),
        }),
      },
      {
        label: 'Listen or sing',
        html: artwork({
          theme: 'forest',
          layout: 'art-field',
          classes: 'uv2--follow-voice',
          chrome: 'none',
          eyebrow: 'Some people need a voice to follow',
          title: 'Listen.<br /><em>Sing.</em>',
          body: 'Let another voice carry the pace while you enter the words.',
          ornament: voicesField(),
        }),
      },
      {
        label: 'Join',
        html: artwork({
          theme: 'stone',
          layout: 'statement',
          chrome: 'minimal',
          eyebrow: 'Some people need a place and a time',
          title: 'Join live.<br />Pray in<br /><em>person.</em>',
          body: 'A monastery, ministry, parish, or small group can become the doorway.',
          detail: '<div class="uv2-architecture-lines" aria-hidden="true"><i></i><i></i><i></i><b>☩</b></div>',
        }),
      },
      {
        label: 'Trusted pathways',
        html: artwork({
          theme: 'gold',
          layout: 'invitation',
          chrome: 'none',
          eyebrow: 'Una Voce helps you discover',
          title: 'Many trusted<br />ways into<br /><em>one prayer.</em>',
          detail: '<div class="uv2-cross-rule" aria-hidden="true"><i></i>☩<i></i></div>',
        }),
      },
    ],
  },
  {
    id: 'whole-church',
    number: '07',
    title: 'What Does It Mean to Pray with the Whole Church?',
    label: 'Ecclesial carousel',
    caption: `When you pray the Hours, your prayer is personal, but it is not isolated.\n\nAcross the world, priests, religious communities, parishes, families, and lay people are entering this same daily prayer. Some are gathered. Some are praying alone before work or before bed.\n\nDifferent places. Different voices. One prayer of the Church.\n\n#TheChurchAtPrayer #LiturgyOfTheHours #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          layout: 'poetic',
          classes: 'uv2--whole-church-cover',
          chrome: 'none',
          eyebrow: 'The prayer is larger than the room',
          title: 'What does it mean<br />to pray with the<br /><em>whole Church?</em>',
          ornament: voicesField(),
          marginalia: 'THE CHURCH AT PRAYER / UNA VOCE',
        }),
      },
      {
        label: 'Not alone',
        html: artwork({
          theme: 'forest',
          layout: 'sparse',
          classes: 'uv2--not-alone',
          chrome: 'none',
          title: 'You are not<br /><em>praying alone.</em>',
          body: 'Even when the room is quiet.',
          detail: '<span class="uv2-lone-cross" aria-hidden="true">☩</span>',
        }),
      },
      {
        label: 'Across the world',
        html: artwork({
          theme: 'stone',
          layout: 'poster-list',
          classes: 'uv2--praying-places',
          chrome: 'minimal',
          eyebrow: 'Across the world',
          title: 'Monastery.<br />Parish.<br />Home.<br /><em>Hidden room.</em>',
          body: 'Priests, religious, families, and lay people are praying this daily prayer.',
        }),
      },
      {
        label: 'One prayer',
        html: artwork({
          layout: 'art-field',
          classes: 'uv2--voices-converge',
          chrome: 'none',
          eyebrow: 'Different places. Different voices.',
          title: 'One prayer<br />of the <em>Church.</em>',
          ornament: voicesField(),
        }),
      },
      {
        label: 'Una Voce',
        html: artwork({
          theme: 'forest',
          layout: 'centered-display',
          classes: 'uv2--one-voice-final',
          chrome: 'none',
          title: '<span class="uv2-name">Una Voce.</span>',
          body: 'One voice.',
          detail: '<div class="uv2-cross-rule" aria-hidden="true"><i></i>☩<i></i></div>',
          marginalia: 'DIFFERENT PLACES / DIFFERENT VOICES / ONE PRAYER',
        }),
      },
    ],
  },
  {
    id: 'what-is-a-devotion',
    number: '08',
    title: 'What Is a Devotion?',
    label: 'Community carousel',
    caption: `Sometimes it is easier to begin something together.\n\nA parish, school, diocese, ministry, or community can use a Devotion to invite people into a shared period of prayer. Everyone can participate wherever they are and choose the prayer method that works for them.\n\nThe invitation is simple: we are praying Morning Prayer together this week.\n\n#CatholicCommunity #LiturgyOfTheHours #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'stone',
          layout: 'centered-display',
          classes: 'uv2--devotion-cover',
          chrome: 'minimal',
          eyebrow: 'A shared invitation to prayer',
          title: 'What is a<br /><span class="uv2-devotion-word">Devotion?</span>',
          body: 'A community begins a rhythm together.',
          detail: '<div class="uv2-gathering-marks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><b>☩</b></div>',
        }),
      },
      {
        label: 'Begin together',
        html: artwork({
          theme: 'forest',
          layout: 'statement',
          chrome: 'none',
          title: 'Sometimes it is<br />easier to begin<br /><em>together.</em>',
          body: 'An invitation can make the first return feel possible.',
          marginalia: 'PARISH / SCHOOL / DIOCESE / MINISTRY / COMMUNITY',
        }),
      },
      {
        label: 'Example invitation',
        html: artwork({
          layout: 'journal',
          classes: 'uv2--seven-days',
          chrome: 'full',
          eyebrow: 'An example Devotion',
          title: 'Morning Prayer<br /><em>for 7 Days.</em>',
          body: 'We are praying together this week. Join wherever you are.',
          detail: '<div class="uv2-seven-day-row" aria-label="Seven days"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
          footer: 'A SHARED INVITATION · NOT A STREAK',
        }),
      },
      {
        label: 'Participate anywhere',
        html: artwork({
          theme: 'charcoal',
          layout: 'poster-list',
          chrome: 'none',
          eyebrow: 'Participate wherever you are',
          title: 'Your place.<br />Your format.<br /><em>Shared prayer.</em>',
          body: 'Read, listen, join live, or pray in person.',
        }),
      },
      {
        label: 'Support a rhythm',
        html: artwork({
          theme: 'gold',
          layout: 'invitation',
          classes: 'uv2--shared-rhythm',
          chrome: 'none',
          eyebrow: 'A community can support the return',
          title: 'A shared<br />invitation can<br />become a <em>rhythm.</em>',
          body: 'Una Voce helps communities support participation and learn whether people are finding their way back to prayer.',
        }),
      },
    ],
  },
  {
    id: 'prayer-becomes-rhythm',
    number: '09',
    title: 'Prayer Can Become a Rhythm.',
    label: 'Vision carousel',
    caption: `A life of prayer often begins with one return. Then another.\n\nOver time, prayer can become part of the shape of the day. A community invitation may help someone begin. A quiet rhythm may take root. One day, that person may invite someone else.\n\nThe goal is not to finish a challenge. The goal is to begin a life of prayer.\n\n#PrayerRhythm #CatholicLife #UnaVoce`,
    slides: [
      {
        label: 'Cover',
        html: artwork({
          theme: 'charcoal',
          layout: 'poetic',
          classes: 'uv2--rhythm-cover',
          chrome: 'none',
          eyebrow: 'A quiet vision',
          title: 'Prayer can<br />become a<br /><em>rhythm.</em>',
          ornament: rhythmTrack(14),
          marginalia: 'BEGIN / RETURN / CONTINUE',
        }),
      },
      {
        label: 'Begin once',
        html: artwork({
          layout: 'sparse',
          classes: 'uv2--begin-once',
          chrome: 'none',
          title: 'Begin<br /><em>once.</em>',
          body: 'One honest prayer can be the first mark.',
          detail: '<span class="uv2-first-mark" aria-hidden="true"></span>',
        }),
      },
      {
        label: 'Return again',
        html: artwork({
          theme: 'stone',
          layout: 'statement',
          classes: 'uv2--return-again',
          chrome: 'none',
          eyebrow: 'No performance. No perfect record.',
          title: 'Return tomorrow.<br /><em>Return again.</em>',
          body: 'Over time, prayer can become part of the shape of the day.',
          ornament: rhythmTrack(9),
        }),
      },
      {
        label: 'The rhythm continues',
        html: artwork({
          theme: 'forest',
          layout: 'flow',
          chrome: 'none',
          eyebrow: 'A rhythm can open outward',
          title: 'Prayer becomes<br /><em>invitation.</em>',
          detail: prayerLoop(),
        }),
      },
      {
        label: 'The goal',
        html: artwork({
          layout: 'centered-display',
          classes: 'uv2--life-of-prayer',
          chrome: 'minimal',
          eyebrow: 'The larger hope',
          title: 'The goal is not to<br />finish a challenge.',
          body: 'The goal is to begin a life of prayer.',
          detail: '<div class="uv2-cross-rule" aria-hidden="true"><i></i>☩<i></i></div>',
        }),
      },
    ],
  },
];
