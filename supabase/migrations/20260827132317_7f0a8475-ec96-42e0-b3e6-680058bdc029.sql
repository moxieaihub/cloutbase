ALTER TABLE public.campaigns
  ALTER COLUMN kpi_target TYPE text USING kpi_target::text;