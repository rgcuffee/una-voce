import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { nightPrayer } from './prayerTemplates';

export function NightPrayer() {
  return <PrayerSectionTemplate {...nightPrayer} />;
}
