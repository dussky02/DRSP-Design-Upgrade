/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Skill, Profile, Session, Evaluation } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-ui-craft',
    title: 'UI & Craft',
    description: 'Интерфейсная гигиена, компонентные базы в Figma, визуальный стиль, типографика и интерактивная анимация.',
  },
  {
    id: 'cat-ux-research',
    title: 'UX & Research',
    description: 'Параметризация CJM, проектирование интерактивных сценариев пользователей, проведение интервью и тестов.',
  },
  {
    id: 'cat-strategy-team',
    title: 'Strategy & Teamwork',
    description: 'Связывание продуктовых метрик с бизнес-целями, защита решений перед стейкхолдерами и наставничество.',
  }
];

export const INITIAL_SKILLS: Skill[] = [
  // UI & Craft Skills
  {
    id: 'skill-figma-components',
    categoryId: 'cat-ui-craft',
    title: 'Компоненты в Figma',
    description: 'Организация единых баз UI-элементов, применение Variables, Auto-Layout, верстка адаптивных адаптеров.',
    levels: [
      'Уровень 0: Не умеет верстать компоненты; использует хаотичные группы слоев.',
      'Уровень 1 (Junior): Создает простейшие компоненты по готовым стилям под руководством лидера компетенции.',
      'Уровень 2 (Middle): Самостоятельно собирает сложные компоненты с Variants и базовыми Variables, соблюдает гигиену отступов.',
      'Уровень 3 (Senior): Проектирует модульные системные UI-киты, внедряет интерактивные состояния, консультирует разработчиков.',
      'Уровень 4 (Expert): Трансформирует глобальную дизайн-систему компании, настраивает сборку токенов в CSS/JSON, внедряет автоматические плагины.'
    ],
    weight: 0.40
  },
  {
    id: 'skill-visual-language',
    categoryId: 'cat-ui-craft',
    title: 'Визуальный язык',
    description: 'Композиция, психология и баланс цвета, жесткая сетка, соблюдение актуального гайдлайна цифровых медиа.',
    levels: [
      'Уровень 0: Полное отсутствие единого стиля; нарушается визуальная иерархия и контрастность.',
      'Уровень 1 (Junior): Применяет готовые гайды, копирует визуальные решения со смежных макетов.',
      'Уровень 2 (Middle): Самостоятельно развивает стилистику разделов, держит плотную и контрастную композицию без макетной грязи.',
      'Уровень 3 (Senior): Формирует гайдлайны с нуля, определяет арт-дирекшн ключевых лендингов и крупных продуктов.',
      'Уровень 4 (Expert): Задает новые индустриальные стандарты визуального качества интерфейсов, внедряет глобальные дизайн-концепции.'
    ],
    weight: 0.40
  },
  {
    id: 'skill-motion-interactive',
    categoryId: 'cat-ui-craft',
    title: 'Анимация и прототипы',
    description: 'Разработка микро-анимаций, бесшовных переходов экранов и кликабельных высокодетализированных симуляций.',
    levels: [
      'Уровень 0: Переходы между страницами статичны; анимации кнопок и меню отсутствуют.',
      'Уровень 1 (Junior): Собирает простые соединительные линейные прототипы в Figma (On click -> Navigate).',
      'Уровень 2 (Middle): Строит умную анимацию Smart Animate, симулирует модальные окна, выпадающие списки и скроллы.',
      'Уровень 3 (Senior): Переносит сложные переходы в продвинутые инструменты (Protopie/AE), учитывает задержки и кривые скорости (easing).',
      'Уровень 4 (Expert): Формирует кодовую спецификацию анимаций для разработчиков, оптимизирует Lottie/Rive-форматы.'
    ],
    weight: 0.20
  },

  // UX & Research Skills
  {
    id: 'skill-ux-flows',
    categoryId: 'cat-ux-research',
    title: 'Проектирование путей',
    description: 'Моделирование CJM, логических ветвлений, сценариев отказов и обработки деструктивных действий.',
    levels: [
      'У0: Рисует только экраны в вакууме; пользовательские ветвления и пограничные случаи (empty states) игнорирует.',
      'У1 (Junior): Моделирует прямолинейный пользовательский сценарий (Happy Path) по четкому ТЗ.',
      'У2 (Middle): Описывает разветленные блок-схемы, проектирует состояния ошибок, оффлайн-режим, продумывает шаги возврата.',
      'У3 (Senior): Оптимизирует глобальные сценарии крупного продукта, находит «узкие горлышки» конверсии в аналитике и кардинально их сокращает.',
      'У4 (Expert): Пересобирает фреймворки сквозного клиентского опыта группы сервисов, устраняя организационные барьеры.'
    ],
    weight: 0.45
  },
  {
    id: 'skill-user-testing',
    categoryId: 'cat-ux-research',
    title: 'Юзабилити-тестирование',
    description: 'Составление гайда тестов, формулирование заданий, рекрут аудитории, калибровка критических ошибок интерфейса.',
    levels: [
      'У0: Проводит оценку интерфейса исключительно субъективно на основе личного мнения.',
      'У1 (Junior): Участвует в тестах в роли наблюдателя или записывает результаты опросов.',
      'У2 (Middle): Самостоятельно пишет сценарий юзабилити-теста, тестирует 5-7 респондента, структурирует отчет по инсайтам.',
      'У3 (Senior): Организует регулярную систему качественного фидбека (коридорные тесты, регулярная лаба) со сложным сценарием.',
      'У4 (Expert): Курирует исследовательский центр команды, выстраивает процессы бенчмаркинга качества продукта в сравнении с конкурентами.'
    ],
    weight: 0.35
  },
  {
    id: 'skill-quantitative-data',
    categoryId: 'cat-ux-research',
    title: 'Количественные данные',
    description: 'Интерпретация тепловых карт, интерпретация А/Б-тестов, верификация данных в Amplitude/Яндекс Метрике.',
    levels: [
      'У0: Не ориентируется в аналитике, проектирует исключительно по интуиции.',
      'У1 (Junior): Знает базовые показатели (клики, визиты), может заглянуть в готовую аналитическую дашборду.',
      'У2 (Middle): Формулирует дизайн-гипотезы в формате HADI, читает воронки, находит точки отвала в конверсиях.',
      'У3 (Senior): Строит совместные дизайн-эксперименты с аналитиками, инициирует А/Б-тестирования, координирует запуск изменений.',
      'У4 (Expert): Проектирует интерфейсы на базе прогнозных математических моделей поведения, глубоко интегрирует продуктовую аналитику в ДНК процессов дизайна.'
    ],
    weight: 0.20
  },

  // Strategy & Teamwork
  {
    id: 'skill-business-alignment',
    categoryId: 'cat-strategy-team',
    title: 'Бизнес-мышление',
    description: 'Понимание юнит-экономики продукта, LTV, CAC, выявление стейкхолдеров процесса и расчет ценности релиза.',
    levels: [
      'У0: Считает, что цель дизайна — сугубо визуальная красота; о целях бизнеса не задумывается.',
      'У1 (Junior): Имеет общее понимание, как продукт зарабатывает деньги, понимает важность выполнения сроков релиза.',
      'У2 (Middle): Анализирует продуктовые метрики, увязывает дизайн-решения с конкретным этапом воронки продаж.',
      'У3 (Senior): Приоритизирует фичи бэклога на основе RICE/ICE, защищает инвестиционную окупаемость масштабных ИТ-решений перед лидами.',
      'У4 (Expert): Выступает соавтором стратегии компании, трансформирует бизнес-модель через запуск новых цифровых сервисов.'
    ],
    weight: 0.40
  },
  {
    id: 'skill-presentation-arg',
    categoryId: 'cat-strategy-team',
    title: 'Презентация и аргументация',
    description: 'Обоснование решений на языке метрик, когнитивной психологии и пользовательского опыта.',
    levels: [
      'У0: Не умеет отстаивать решения; при малейшей критике обижается или безвольно переделывает макет.',
      'У1 (Junior): Способен последовательно рассказать, что нарисовано на экранах и какие задачи ставились.',
      'У2 (Middle): Аргументирует решения со ссылкой на паттерны UX, результаты исследований и базовые метрики.',
      'У3 (Senior): Уверенно модерирует дебаты, снимает возражения стейкхолдеров любого уровня, находит компромисс между ИТ, бизнесом и дизайном.',
      'У4 (Expert): Ключевой спикер компании, ведет переговоры на высшем уровне (C-Level), осуществляет продажу векторов развития крупного бизнеса.'
    ],
    weight: 0.30
  },
  {
    id: 'skill-mentoring-processes',
    categoryId: 'cat-strategy-team',
    title: 'Наставничество и процессы',
    description: 'Менторинг младших сотрудников, проведение дизайн-ревью, развитие профессионального сообщества.',
    levels: [
      'У0: Замкнут на личных задачах; не готов делиться знаниями, равнодушен к атмосфере в команде.',
      'У1 (Junior): Активно учится сам, принимает конструктивную обратную связь от старших коллег.',
      'У2 (Middle): Помогает джуниорам адаптироваться в Figma, проводит ревью простых макетов у разработчиков после верстки.',
      'У3 (Senior): Систематически курирует индивидуальную карту развития младших дизайнеров, оптимизирует рабочий цикл передачи макетов в ИТ.',
      'У4 (Expert): Архитектор профессионального комьюнити, формирует лучшие образовательные практики в департаменте, меняет культуру работы.'
    ],
    weight: 0.30
  }
];

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'profile-junior',
    title: 'Junior продуктовый дизайнер',
    description: 'Специалист начального уровня. Дизайнер фокусируется на технической реализации макетов по готовым дизайн-библиотекам и создании простых пользовательских сценариев под бдительным сопровождением наставника.',
    nextProfileId: 'profile-middle',
    requirements: [
      { skillId: 'skill-figma-components', targetLevel: 2 },
      { skillId: 'skill-visual-language', targetLevel: 1 },
      { skillId: 'skill-motion-interactive', targetLevel: 1 },
      { skillId: 'skill-ux-flows', targetLevel: 1 },
      { skillId: 'skill-user-testing', targetLevel: 1 },
      { skillId: 'skill-quantitative-data', targetLevel: 0 },
      { skillId: 'skill-business-alignment', targetLevel: 1 },
      { skillId: 'skill-presentation-arg', targetLevel: 1 },
      { skillId: 'skill-mentoring-processes', targetLevel: 0 }
    ]
  },
  {
    id: 'profile-middle',
    title: 'Middle продуктовый дизайнер',
    description: 'Автономная боевая единица. Координирует проектирование целых веток ключевого продукта, проводит собственные локальные юзабилити-тесты, самостоятельно инициирует доработку компонентов в библиотеке.',
    nextProfileId: 'profile-senior',
    requirements: [
      { skillId: 'skill-figma-components', targetLevel: 3 },
      { skillId: 'skill-visual-language', targetLevel: 2 },
      { skillId: 'skill-motion-interactive', targetLevel: 2 },
      { skillId: 'skill-ux-flows', targetLevel: 2 },
      { skillId: 'skill-user-testing', targetLevel: 2 },
      { skillId: 'skill-quantitative-data', targetLevel: 1 },
      { skillId: 'skill-business-alignment', targetLevel: 2 },
      { skillId: 'skill-presentation-arg', targetLevel: 2 },
      { skillId: 'skill-mentoring-processes', targetLevel: 1 }
    ]
  },
  {
    id: 'profile-senior',
    title: 'Senior продуктовый дизайнер',
    description: 'Опытный эксперт команды. Лидирует дизайн целого домена компании. Анализирует метрики Amplitude и выдвигает гипотезы, проектирует архитектуру дизайн-систем, менторит младших и средних дизайнеров.',
    requirements: [
      { skillId: 'skill-figma-components', targetLevel: 4 },
      { skillId: 'skill-visual-language', targetLevel: 3 },
      { skillId: 'skill-motion-interactive', targetLevel: 3 },
      { skillId: 'skill-ux-flows', targetLevel: 3 },
      { skillId: 'skill-user-testing', targetLevel: 3 },
      { skillId: 'skill-quantitative-data', targetLevel: 2 },
      { skillId: 'skill-business-alignment', targetLevel: 3 },
      { skillId: 'skill-presentation-arg', targetLevel: 3 },
      { skillId: 'skill-mentoring-processes', targetLevel: 3 }
    ]
  }
];

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'sess-summer-2026',
    title: 'Оценка продуктовой команды — Лето 2026',
    profileId: 'profile-middle',
    status: 'active',
    shareToken: 'token-summer2026'
  },
  {
    id: 'sess-junior-spring',
    title: 'Аттестация стажеров и джуниоров — Май 2026',
    profileId: 'profile-junior',
    status: 'active',
    shareToken: 'token-junspring2026'
  },
  {
    id: 'sess-archive-2025',
    title: 'Плановая оценка — Зима 2025',
    profileId: 'profile-middle',
    status: 'archived',
    shareToken: 'token-win2025'
  }
];

export const INITIAL_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-designer-ivan',
    sessionId: 'sess-summer-2026',
    designerName: 'Иван Воронов',
    selfScores: {
      'skill-figma-components': 3,
      'skill-visual-language': 3,
      'skill-motion-interactive': 2,
      'skill-ux-flows': 2,
      'skill-user-testing': 1,
      'skill-quantitative-data': 1,
      'skill-business-alignment': 1,
      'skill-presentation-arg': 2,
      'skill-mentoring-processes': 1
    },
    calibratedScores: {
      'skill-figma-components': 3,
      'skill-visual-language': 2, // Calibrated down from 3
      'skill-motion-interactive': 2,
      'skill-ux-flows': 2,
      'skill-user-testing': 2, // Calibrated up from 1
      'skill-quantitative-data': 1,
      'skill-business-alignment': 1,
      'skill-presentation-arg': 2,
      'skill-mentoring-processes': 1
    },
    calibrationJustifications: {
      'skill-visual-language': 'В последних двух релизах были замечены грубые баги в сетке и неконтрастные кнопки. Снижаю до Уровня 2 — крепкий Middle, но нужно больше аккуратности.',
      'skill-user-testing': 'Иван отлично подготовил и провел 8 качественных исследований в мае без моей помощи. Повышаю до Уровня 2.'
    },
    actionPlan: 'Ивану рекомендуется пройти курс по продвинутой аналитике данных для дизайнеров для развития навыка "Количественные данные". Также нужно поработать над макетной гигиеной в Figma, чтобы зафиксировать твердый профиль Middle.',
    status: 'calibrated',
    dateSubmitted: '2026-06-01',
    dateCalibrated: '2026-06-05'
  },
  {
    id: 'eval-designer-anna',
    sessionId: 'sess-summer-2026',
    designerName: 'Анна Кузнецова',
    selfScores: {
      'skill-figma-components': 3,
      'skill-visual-language': 2,
      'skill-motion-interactive': 1,
      'skill-ux-flows': 3,
      'skill-user-testing': 3,
      'skill-quantitative-data': 2,
      'skill-business-alignment': 2,
      'skill-presentation-arg': 2,
      'skill-mentoring-processes': 2
    },
    calibratedScores: {
      'skill-figma-components': 3,
      'skill-visual-language': 2,
      'skill-motion-interactive': 1,
      'skill-ux-flows': 3,
      'skill-user-testing': 3,
      'skill-quantitative-data': 2,
      'skill-business-alignment': 2,
      'skill-presentation-arg': 2,
      'skill-mentoring-processes': 2
    },
    calibrationJustifications: {},
    actionPlan: '',
    status: 'submitted', // Just submitted, needs calibration!
    dateSubmitted: '2026-06-09'
  },
  {
    id: 'eval-designer-petr',
    sessionId: 'sess-junior-spring',
    designerName: 'Петр Сидоров',
    selfScores: {
      'skill-figma-components': 2,
      'skill-visual-language': 1,
      'skill-motion-interactive': 1,
      'skill-ux-flows': 1,
      'skill-user-testing': 1,
      'skill-quantitative-data': 0,
      'skill-business-alignment': 1,
      'skill-presentation-arg': 1,
      'skill-mentoring-processes': 0
    },
    calibratedScores: {
      'skill-figma-components': 2,
      'skill-visual-language': 1,
      'skill-motion-interactive': 1,
      'skill-ux-flows': 1,
      'skill-user-testing': 1,
      'skill-quantitative-data': 0,
      'skill-business-alignment': 1,
      'skill-presentation-arg': 1,
      'skill-mentoring-processes': 0
    },
    calibrationJustifications: {},
    actionPlan: 'Отличный базовый уровень для младшего дизайнера. Навык Figma развит прекрасно (Уровень 2). Рекомендуется улучшить визуальный баланс и изучить основы количественного UX.',
    status: 'calibrated',
    dateSubmitted: '2026-05-20',
    dateCalibrated: '2026-05-25'
  }
];
