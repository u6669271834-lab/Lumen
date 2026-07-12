"use client";

import { useMemo, useState } from "react";

type Category = "Все" | "Бизнес" | "Творчество" | "Системы";

const categories: Category[] = ["Все", "Бизнес", "Творчество", "Системы"];

const products = [
  {
    id: "LUM-001",
    category: "Бизнес" as const,
    title: "Brief Engine",
    description:
      "Превращает разрозненный запрос клиента в ясный бриф, критерии результата и следующий шаг.",
    format: "Промпт · инструкция · шаблон",
    price: "1 490 ₽",
  },
  {
    id: "LUM-002",
    category: "Бизнес" as const,
    title: "Inbox Navigator",
    description:
      "Разбирает входящие письма, выделяет решения, срочные ответы и незакрытые обязательства.",
    format: "Компактный промпт",
    price: "590 ₽",
  },
  {
    id: "LUM-003",
    category: "Системы" as const,
    title: "GitHub Architect",
    description:
      "Создаёт структуру репозитория, правила работы и понятные задания для Codex без хаоса в проекте.",
    format: "Системный пакет",
    price: "2 490 ₽",
  },
  {
    id: "LUM-004",
    category: "Творчество" as const,
    title: "Series Architect",
    description:
      "Разворачивает исходную идею в мир, героев, сюжетные линии и устойчивую логику развития.",
    format: "Творческая система",
    price: "1 990 ₽",
  },
  {
    id: "LUM-005",
    category: "Системы" as const,
    title: "Personal Library",
    description:
      "Проектирует личную библиотеку знаний, интересов и материалов, которую ИИ помогает наполнять.",
    format: "Промпт · карта разделов",
    price: "2 490 ₽",
  },
  {
    id: "LUM-006",
    category: "Системы" as const,
    title: "Workspace Starter",
    description:
      "Начальная архитектура совместного пространства человека и ИИ: память, проекты и рабочий цикл.",
    format: "Стартовый комплект",
    price: "4 900 ₽",
  },
];

function telegramLink(product: string) {
  const message = `Здравствуйте! Хочу узнать подробнее о продукте Lumen Store: ${product}.`;
  return `https://t.me/lumen_designstudio?text=${encodeURIComponent(message)}`;
}

export default function Home() {
  const [category, setCategory] = useState<Category>("Все");
  const filteredProducts = useMemo(
    () =>
      category === "Все"
        ? products
        : products.filter((product) => product.category === category),
    [category],
  );

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Lumen Store — наверх">
          Lumen Store
        </a>
        <nav aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#method">Как устроено</a>
          <a href="#about">О Lumen</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="archive-label">
            <span>Архив</span>
            <span>/</span>
            <span>001</span>
          </div>
          <h1>Lumen Store</h1>
          <div className="amber-rule" />
          <p className="hero-statement">
            Промпты, которые
            <br />
            превращают намерение
            <br />в результат
          </p>
          <a className="primary-button" href="#catalog">
            Открыть каталог <span aria-hidden="true">↘</span>
          </a>
        </div>

        <div className="archive-mark" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="index-line index-one"><span>001</span></div>
          <div className="index-line index-two"><span>002</span></div>
          <div className="index-line index-three"><span>003</span></div>
          <div className="light-point" />
        </div>
      </section>

      <section className="category-strip" aria-label="Категории Lumen Store">
        <a href="#catalog" className="category-card">
          <span>01</span>
          <strong>Для бизнеса</strong>
          <i className="category-orbit" aria-hidden="true" />
        </a>
        <a href="#catalog" className="category-card">
          <span>02</span>
          <strong>Для творчества</strong>
          <i className="category-rays" aria-hidden="true" />
        </a>
        <a href="#catalog" className="category-card">
          <span>03</span>
          <strong>Для систем</strong>
          <i className="category-frames" aria-hidden="true" />
        </a>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Первая коллекция</span>
            <h2>Каталог промптов</h2>
          </div>
          <p>
            Не просто текст для копирования. Каждый продукт содержит контекст,
            правила применения и критерии хорошего результата.
          </p>
        </div>

        <div className="filters" role="group" aria-label="Фильтр каталога">
          {categories.map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="product-grid" aria-live="polite">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-meta">
                <span>{product.id}</span>
                <span>{product.category}</span>
              </div>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              <div className="product-bottom">
                <div>
                  <span className="format">{product.format}</span>
                  <strong>{product.price}</strong>
                </div>
                <a
                  href={telegramLink(product.title)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Запросить продукт ${product.title} в Telegram`}
                >
                  Запросить <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Метод Lumen</span>
            <h2>От замысла к действию</h2>
          </div>
        </div>
        <ol className="method-list">
          <li><span>01</span><strong>Вы выбираете результат</strong><p>Не тему, а конкретное изменение, которое должно произойти.</p></li>
          <li><span>02</span><strong>Промпт собирает контекст</strong><p>Задаёт необходимые вопросы и удерживает ограничения задачи.</p></li>
          <li><span>03</span><strong>Вы получаете рабочий артефакт</strong><p>Документ, структуру, решение или следующий проверяемый шаг.</p></li>
        </ol>
      </section>

      <section className="manifesto" id="about">
        <span className="eyebrow">О Lumen Store</span>
        <blockquote>
          Мы продаём не магические формулы. Мы создаём точные способы думать,
          выбирать и доводить работу до результата.
        </blockquote>
        <a href="https://t.me/lumen_designstudio" target="_blank" rel="noreferrer">
          Связаться с Lumen <span aria-hidden="true">↗</span>
        </a>
      </section>

      <footer>
        <a className="wordmark" href="#top">Lumen Store</a>
        <p>Цифровые инструменты для человека и ИИ.</p>
        <span>© 2026 Lumen</span>
      </footer>
    </main>
  );
}
