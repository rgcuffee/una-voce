update public.partners
set onboarding_status = 'active'::public.partner_onboarding_status,
    community_page_enabled = true,
    badge_enabled = true
where slug = 'word-on-fire';
