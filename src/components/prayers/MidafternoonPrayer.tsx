import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { midafternoonPrayer } from './prayerTemplates';

export function MidafternoonPrayer() {
  return <PrayerSectionTemplate {...midafternoonPrayer} />;
}
