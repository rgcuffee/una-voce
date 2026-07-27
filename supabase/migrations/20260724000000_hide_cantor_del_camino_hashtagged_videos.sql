-- Cantor del Camino's full offices use a stable "OFFICE · day/date" title.
-- Shorts do not, and YouTube's Atom feed does not expose their duration.
-- Do not use description hashtags as a signal: full offices use them too.
with cantor_del_camino as (
  select id
  from public.partners
  where slug = 'cantor-del-camino'
)
update public.youtube_videos video
set prayer_type = null,
    display_status = 'hidden',
    updated_at = now()
from cantor_del_camino
where video.partner_id = cantor_del_camino.id
  and (
    video.canonical_url ~* 'youtube\.com/shorts/'
    or video.title !~* '^(🟢[[:space:]]*)?(LAUDES DE HOY|V(I|Í)SPERAS( DE HOY)?|NONA( DE HOY)?|COMPLETAS( DE HOY)?|OFICIO DE LECTURAS( DE HOY)?)[[:space:]]*(·|\||—|-)'
  )
  and (
    video.prayer_type is not null
    or video.display_status is distinct from 'hidden'
  );
