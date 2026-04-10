-- 収集対象ソーステーブル
create table if not exists subsidy_sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text not null,
  keywords     text[] default '{}',
  active       boolean default true,
  last_crawled_at timestamptz,
  created_at   timestamptz default now()
);

-- 収集済み補助金情報テーブル
create table if not exists collected_subsidies (
  id              uuid primary key default gen_random_uuid(),
  source_id       uuid references subsidy_sources(id) on delete cascade,
  source_url      text not null,
  name            text,
  organizer       text,
  target_business text,
  subsidy_amount  text,
  subsidy_rate    text,
  application_start text,
  application_end   text,
  eligible_expenses text[] default '{}',
  requirements      text[] default '{}',
  procedures        text[] default '{}',
  required_docs     text[] default '{}',
  contact_info      text,
  notes             text[] default '{}',
  summary           text,
  it_related        boolean default false,
  hotel_related     boolean default false,
  is_new            boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- デフォルトの収集ソース（観光庁・IT補助金・中小企業庁など）
insert into subsidy_sources (name, url, keywords) values
  ('観光庁 補助金・助成金',     'https://www.mlit.go.jp/kankocho/shisaku/sangyou/index.html', array['補助金','助成金','宿泊','観光','ホテル','旅館']),
  ('IT導入補助金 公式',         'https://www.it-hojo.jp/',                                     array['IT導入','DX','クラウド','SaaS','中小企業']),
  ('中小企業庁 補助金一覧',     'https://www.chusho.meti.go.jp/koukai/koubo/',                  array['補助金','助成金','IT','デジタル','宿泊']),
  ('小規模持続化補助金',        'https://jizokuka-r3.jp/',                                      array['持続化','小規模','販路','IT']),
  ('ものづくり補助金',          'https://portal.monodukuri-hojo.jp/',                           array['ものづくり','設備','デジタル','省力化'])
on conflict do nothing;

-- RLS
alter table subsidy_sources enable row level security;
alter table collected_subsidies enable row level security;

create policy "auth users can read subsidy_sources"
  on subsidy_sources for select to authenticated using (true);
create policy "auth users can manage subsidy_sources"
  on subsidy_sources for all to authenticated using (true);

create policy "auth users can read collected_subsidies"
  on collected_subsidies for select to authenticated using (true);
create policy "service role can manage collected_subsidies"
  on collected_subsidies for all to service_role using (true);
