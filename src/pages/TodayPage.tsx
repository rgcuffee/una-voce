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
    description: 'Traditional chant settings from monastic communities.',
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
    title: 'Benedictine Sisters',
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
      <section className="today-flow">
        <DailyProgress prayed={todayInfo.prayedCount} total={todayInfo.totalCount} />

        {todayInfo.liveSession && (
          <LiveCard
            hourName={todayInfo.liveSession.hourName}
            partner={todayInfo.liveSession.partner}
            viewerCount={todayInfo.liveSession.viewerCount}
          />
        )}

        <section className="rail-section source-rail-section" aria-label="Prayer sources">
          <div className="rail-header">
            <h2 className="rail-title">Choose Your Prayer Style</h2>
            <p className="rail-copy">Select how each hour is prayed before joining a community.</p>
          </div>
          <div className="rail-track source-rail-track">
            {SOURCE_STYLES.map((style) => (
              <article key={style.id} className="source-option-card">
                <div className="source-option-tag">{style.label}</div>
                <div className="source-option-copy">{style.description}</div>
                <div className="source-option-availability">{style.availability}</div>
              </article>
            ))}
          </div>
        </section>

        <FeaturedCard
          kicker="Featured Community"
          title="A reverent path into prayer"
          copy="Listen with a community already praying the Liturgy of the Hours."
          imageUrl={FEATURED_IMAGE}
        />

        <section className="rail-section community-rail-section" aria-label="Community highlights">
          <div className="rail-header">
            <h2 className="rail-title">Community Highlights</h2>
            <p className="rail-copy">Explore trusted houses and apostolates currently leading prayer.</p>
          </div>
          <div className="rail-track community-rail-track">
            {COMMUNITY_SPOTLIGHTS.map((community) => (
              <article key={community.id} className="community-spotlight-card">
                <div className="community-spotlight-title">{community.title}</div>
                <div className="community-spotlight-detail">{community.detail}</div>
              </article>
            ))}
          </div>
        </section>

        <main className="hours-list">
          {todayHours.map((hour) => (
            <HourCard key={hour.id} hour={hour} />
          ))}
        </main>
      </section>
    </>
  );
}
