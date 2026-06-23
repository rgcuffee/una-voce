import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { morningPrayer } from './prayerTemplates';

export function MorningPrayer() {
  return <PrayerSectionTemplate {...morningPrayer} />;
}
