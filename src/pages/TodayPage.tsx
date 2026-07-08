import { TodayBanner } from '../components/TodayBanner';
import { DailyProgress } from '../components/DailyProgress';
import { LiveCard } from '../components/LiveCard';
import { FeaturedCard } from '../components/FeaturedCard';
import { HourCard } from '../components/HourCard';
import { todayInfo, todayHours } from '../data/hours';

const FEATURED_IMAGE =
  'https://images.unsplash.com/photo-1528357136257-0c25517acfea?auto=format&fit=crop&w=900&q=80';

const SOURCE_STYLES = [
  {
    id: 'sung',
    label: 'Sung',
    description: 'Hymns and psalm tones with guided cadence.',
    availability: '12 live options',
  },
  {
    id: 'spoken',
    label: 'Spoken',
    description: 'Plain recitation with clear pacing and response cues.',
    availability: '18 live options',
  },
  {
    id: 'gregorian',
    label: 'Gregorian Chant',
    description: 'Chant settings from monastic prayer communities.',
    availability: '7 live options',
  },
];

const COMMUNITY_SPOTLIGHTS = [
  {
    id: 'abbey',
    title: 'Abbey of Our Lady',
    detail: 'Vespers with incense and full choir responses',
  },
  {
    id: 'hours',
    title: 'Sing the Hours',
    detail: 'Accessible chanted office with modern notation',
  },
  {
    id: 'benedictine',
    title: 'Sisters of Dawnfield',
    detail: 'Measured spoken office with contemplative pauses',
  },
];

export function TodayPage() {
  return (
    <>
      <TodayBanner
        feastName={todayInfo.feastName}
        season={todayInfo.season}
        nextHourName={todayInfo.nextHour.name}
        nextHourTime={todayInfo.nextHour.time}
      />
      <section className='today-flow'>
        <DailyProgress
          prayed={todayInfo.prayedCount}
          total={todayInfo.totalCount}
        />

        {todayInfo.liveSession && (
          <LiveCard
            hourName={todayInfo.liveSession.hourName}
            partner={todayInfo.liveSession.partner}
            viewerCount={todayInfo.liveSession.viewerCount}
          />
        )}

        <section
          className='rail-section source-rail-section'
          aria-label='Prayer sources'
        >
          <div className='rail-header'>
            <h2 className='rail-title'>Don't pray alone.</h2>
            <p className='rail-copy'>
              Join monasteries, parishes, ministries, and Catholics around the
              world who are already praying the Hours live.
            </p>
          </div>
          <div className='rail-track source-rail-track'>
            {SOURCE_STYLES.map((style) => (
              <article key={style.id} className='source-option-card'>
                <div className='source-option-tag'>{style.label}</div>
                <div className='source-option-copy'>{style.description}</div>
                <div className='source-option-availability'>
                  {style.availability}
                </div>
              </article>
            ))}
          </div>
        </section>

        <FeaturedCard
          kicker='Featured Community'
          title='Discover the Hours, then keep the rhythm'
          copy='Una Voce helps Catholics discover the Liturgy of the Hours, begin praying it, and connect with communities already praying throughout the world.'
          imageUrl={FEATURED_IMAGE}
        />

        <section
          className='rail-section community-rail-section'
          aria-label='Community highlights'
        >
          <div className='rail-header'>
            <h2 className='rail-title'>Community Highlights</h2>
            <p className='rail-copy'>
              Find live prayer communities without replacing the breviary apps
              and official books you already use.
            </p>
          </div>
          <div className='rail-track community-rail-track'>
            {COMMUNITY_SPOTLIGHTS.map((community) => (
              <article key={community.id} className='community-spotlight-card'>
                <div className='community-spotlight-title'>
                  {community.title}
                </div>
                <div className='community-spotlight-detail'>
                  {community.detail}
                </div>
              </article>
            ))}
          </div>
        </section>

        <main className='hours-list'>
          {todayHours.map((hour) => (
            <HourCard key={hour.id} hour={hour} />
          ))}
        </main>
      </section>
    </>
  );
}
