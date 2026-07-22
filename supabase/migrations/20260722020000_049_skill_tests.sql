/*
# Skill tests + pass badges

Lets a freelancer take a short multiple-choice quiz per category and earn a
"Навык подтверждён" badge shown on their profile. Correct answers are kept
in a table with RLS enabled and zero policies (same pattern as app_secrets)
so they're never readable via the REST API — grading happens only inside
the SECURITY DEFINER submit_skill_test() function.
*/

CREATE TABLE IF NOT EXISTS skill_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  questions jsonb NOT NULL, -- [{ "q": "...", "options": ["...","...","...","..."] }, ...]
  pass_score integer NOT NULL DEFAULT 70,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_tests_read" ON skill_tests;
CREATE POLICY "skill_tests_read" ON skill_tests FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS skill_test_answers (
  test_id uuid PRIMARY KEY REFERENCES skill_tests(id) ON DELETE CASCADE,
  correct jsonb NOT NULL -- [0,2,1,3,0] — correct option index per question, same order
);

ALTER TABLE skill_test_answers ENABLE ROW LEVEL SECURITY;
-- No policies: inaccessible via PostgREST to any role. Only the
-- SECURITY DEFINER function below (running as table owner) can read it.

CREATE TABLE IF NOT EXISTS skill_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES skill_tests(id) ON DELETE CASCADE,
  score integer NOT NULL,
  passed boolean NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (user_id, test_id)
);

ALTER TABLE skill_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_test_results_read" ON skill_test_results;
CREATE POLICY "skill_test_results_read" ON skill_test_results FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE policy: rows can only be written via submit_skill_test(),
-- which runs as the table owner and bypasses RLS, so answers can't be
-- gamed by inserting a fabricated "passed" result directly.

CREATE OR REPLACE FUNCTION submit_skill_test(p_test_id uuid, p_answers jsonb)
RETURNS TABLE(score integer, passed boolean)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
  v_correct jsonb;
  v_pass_score int;
  v_total int;
  v_right int := 0;
  i int;
BEGIN
  SELECT correct INTO v_correct FROM skill_test_answers WHERE test_id = p_test_id;
  SELECT st.pass_score INTO v_pass_score FROM skill_tests st WHERE st.id = p_test_id;
  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'test not found';
  END IF;
  v_total := jsonb_array_length(v_correct);
  FOR i IN 0..v_total - 1 LOOP
    IF (p_answers -> i) = (v_correct -> i) THEN
      v_right := v_right + 1;
    END IF;
  END LOOP;
  score := ROUND((v_right::numeric / v_total) * 100);
  passed := score >= v_pass_score;
  INSERT INTO skill_test_results (user_id, test_id, score, passed)
  VALUES (auth.uid(), p_test_id, score, passed)
  ON CONFLICT (user_id, test_id) DO UPDATE SET score = EXCLUDED.score, passed = EXCLUDED.passed, completed_at = now();
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_skill_test(uuid, jsonb) TO authenticated;

-- Seed a handful of real quizzes.
WITH t AS (
  INSERT INTO skill_tests (category, title, questions, pass_score) VALUES
  ('design', 'Основы веб-дизайна', '[
    {"q": "Что такое контраст в дизайне?", "options": ["Разница между цветами шрифта и фона", "Количество слоёв в макете", "Тип шрифта", "Размер холста"]},
    {"q": "Какой формат лучше подходит для логотипа с прозрачным фоном?", "options": ["JPEG", "PNG", "BMP", "GIF без прозрачности"]},
    {"q": "Что такое \"сетка\" (grid) в UI-дизайне?", "options": ["Панель инструментов Figma", "Система выравнивания элементов по колонкам", "Цветовая палитра", "Тип анимации"]},
    {"q": "Правило типографики: минимальный интерлиньяж для читаемого текста примерно равен", "options": ["0.5 от размера шрифта", "1.2–1.5 от размера шрифта", "3 от размера шрифта", "Интерлиньяж не влияет на читаемость"]},
    {"q": "Что такое \"негативное пространство\"?", "options": ["Ошибка в макете", "Пустая область вокруг элементов", "Тёмная тема интерфейса", "Обводка объекта"]}
  ]'::jsonb, 70),
  ('development', 'Основы веб-разработки', '[
    {"q": "Что делает CSS-свойство \"flex\"?", "options": ["Задаёт шрифт", "Создаёт гибкую раскладку элементов", "Меняет цвет фона", "Загружает изображение"]},
    {"q": "Какой HTTP-метод используется для получения данных без изменения состояния сервера?", "options": ["POST", "GET", "DELETE", "PUT"]},
    {"q": "Что такое REST API?", "options": ["Язык программирования", "Архитектурный стиль для веб-сервисов", "База данных", "Фреймворк для CSS"]},
    {"q": "Чем отличается \"==\" от \"===\" в JavaScript?", "options": ["Ничем", "\"===\" сравнивает и тип, и значение", "\"==\" быстрее работает", "\"===\" используется только для чисел"]},
    {"q": "Что такое responsive design?", "options": ["Быстрая загрузка сайта", "Адаптация интерфейса под разные размеры экрана", "Использование только React", "Дизайн без изображений"]}
  ]'::jsonb, 70),
  ('marketing', 'Основы digital-маркетинга', '[
    {"q": "Что такое CTR?", "options": ["Стоимость клика", "Отношение кликов к показам", "Количество подписчиков", "Тип рекламного формата"]},
    {"q": "Что такое таргетированная реклама?", "options": ["Реклама для всех подряд", "Реклама, показываемая выбранной аудитории", "Реклама только в поиске", "Бесплатная реклама"]},
    {"q": "Что измеряет метрика ROI?", "options": ["Скорость сайта", "Окупаемость инвестиций", "Количество лайков", "Длину видео"]},
    {"q": "Что такое лид-магнит?", "options": ["Тип таргетинга", "Бесплатное предложение в обмен на контакт", "Платная подписка", "Формат баннера"]},
    {"q": "Что такое A/B-тестирование?", "options": ["Тест скорости сайта", "Сравнение двух вариантов для выбора лучшего", "Проверка орфографии", "Тип email-рассылки"]}
  ]'::jsonb, 70),
  ('writing', 'Основы копирайтинга', '[
    {"q": "Что такое \"заголовок-крючок\"?", "options": ["Любой заголовок", "Заголовок, цепляющий внимание читателя", "Подзаголовок в конце текста", "Заголовок из одного слова"]},
    {"q": "Что такое tone of voice?", "options": ["Громкость озвучки", "Стиль и манера общения бренда с аудиторией", "Шрифт текста", "Скорость чтения"]},
    {"q": "Зачем нужен призыв к действию (CTA)?", "options": ["Для украшения текста", "Чтобы направить читателя к конкретному действию", "Чтобы увеличить объём текста", "Это часть SEO-разметки"]},
    {"q": "Что такое структура \"проблема — решение\"?", "options": ["Формат резюме", "Приём, где сначала описывается боль читателя, потом решение", "Тип заголовка", "SEO-техника"]},
    {"q": "Что важно проверить перед публикацией текста?", "options": ["Только длину", "Орфографию, факты и логику изложения", "Только ключевые слова", "Ничего, ИИ уже проверил"]}
  ]'::jsonb, 70)
  RETURNING id, category
)
INSERT INTO skill_test_answers (test_id, correct)
SELECT id,
  CASE category
    WHEN 'design' THEN '[0,1,1,1,1]'::jsonb
    WHEN 'development' THEN '[1,1,1,1,1]'::jsonb
    WHEN 'marketing' THEN '[1,1,1,1,1]'::jsonb
    WHEN 'writing' THEN '[1,1,1,1,1]'::jsonb
  END
FROM t;
