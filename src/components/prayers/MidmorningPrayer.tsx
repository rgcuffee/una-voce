import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { midmorningPrayer } from './prayerTemplates';

export function MidmorningPrayer() {
  return <PrayerSectionTemplate {...midmorningPrayer} />;
}
