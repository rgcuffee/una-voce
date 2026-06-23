import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { eveningPrayer } from './prayerTemplates';

export function EveningPrayer() {
  return <PrayerSectionTemplate {...eveningPrayer} />;
}
