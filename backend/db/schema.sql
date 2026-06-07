create extension if not exists pgcrypto;

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  part text not null default 'unknown',
  zh text not null default '',
  en text not null default '',
  ipa text not null default '',
  level text not null default 'A1',
  tags text[] not null default '{}',
  accepted_answers text[] not null default '{}',
  near_answers text[] not null default '{}',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists examples (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words(id) on delete cascade,
  es text not null,
  zh text not null default '',
  en text not null default '',
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists learners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lookup_history (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learners(id) on delete set null,
  word_id uuid references words(id) on delete set null,
  query text not null,
  source text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learners(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  target_word text not null,
  question_type text not null,
  user_answer text not null default '',
  result text not null check (result in ('correct', 'acceptable', 'incorrect')),
  score numeric not null default 0,
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists word_reviews (
  learner_id uuid not null references learners(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  target_word text not null,
  repetition integer not null default 0,
  interval_days numeric not null default 0,
  ease_factor numeric not null default 2.5,
  due_at timestamptz not null default now(),
  last_quality integer not null default 0,
  last_result text not null default 'incorrect' check (last_result in ('correct', 'acceptable', 'incorrect')),
  updated_at timestamptz not null default now(),
  primary key (learner_id, target_word)
);

create table if not exists verb_vocabulary (
  learner_id uuid not null references learners(id) on delete cascade,
  infinitive text not null,
  created_at timestamptz not null default now(),
  primary key (learner_id, infinitive)
);

create table if not exists learner_vocabulary (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  surface_form text not null,
  lemma text not null,
  form_kind text not null default 'other' check (form_kind in ('lemma', 'conjugated', 'other')),
  mood text,
  tense text,
  person text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, surface_form)
);

create index if not exists examples_word_id_idx on examples(word_id);
create index if not exists lookup_history_learner_created_idx on lookup_history(learner_id, created_at desc);
create index if not exists quiz_attempts_learner_created_idx on quiz_attempts(learner_id, created_at desc);
create index if not exists quiz_attempts_word_idx on quiz_attempts(word_id);
create index if not exists word_reviews_due_idx on word_reviews(learner_id, due_at);
create index if not exists verb_vocabulary_learner_idx on verb_vocabulary(learner_id, created_at desc);
create index if not exists learner_vocabulary_learner_created_idx
  on learner_vocabulary(learner_id, created_at desc);
create index if not exists learner_vocabulary_word_idx on learner_vocabulary(word_id);
