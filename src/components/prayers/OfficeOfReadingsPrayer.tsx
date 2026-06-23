import { PrayerSectionTemplate } from './PrayerSectionTemplate';
import { officeOfReadings } from './prayerTemplates';

export function OfficeOfReadingsPrayer() {
  return <PrayerSectionTemplate {...officeOfReadings} />;
}
