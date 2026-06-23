import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { middayPrayer } from './prayerTemplates';

export function MiddayPrayer() {
  return <PrayerSectionTemplate {...middayPrayer} />;
}
