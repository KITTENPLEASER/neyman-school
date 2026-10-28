"""Заполняет БД тестовыми данными: категории, курсы, свойства, админ.

Запуск (из backend/):  python -m app.seed
"""
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.crud import user as crud_user
from app.database import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.product_property import ProductProperty
from app.models.user import User


CATEGORIES = [
    {"name": "Программирование", "alias": "programming"},
    {"name": "Дизайн", "alias": "design"},
    {"name": "Маркетинг", "alias": "marketing"},
]


COURSES = [
    # category_alias, name, alias, price, short_description, description, image, properties
    ("programming", "HTML и CSS", "html-css", Decimal("9900.00"),
     "Вёрстка сайта с нуля",
     "Научитесь верстать адаптивные сайты на HTML и CSS. Разберёте Flexbox, Grid, БЭМ.",
     "img/python.png",
     [("Длительность", "4 недели", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("programming", "JavaScript", "javascript", Decimal("14900.00"),
     "Интерактив и логика на клиенте",
     "Основы JS: переменные, функции, DOM, события, fetch. Финальный проект — интерактивный сайт.",
     "img/python.png",
     [("Длительность", "6 недель", None), ("Формат", "онлайн", None), ("Уровень", "средний", None)]),
    ("programming", "Python", "python", Decimal("14900.00"),
     "Скрипты и боты",
     "Python с нуля: типы, ООП, работа с файлами, requests, телеграм-боты.",
     "img/python.png",
     [("Длительность", "6 недель", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("design", "Основы UI/UX", "ui-ux", Decimal("12900.00"),
     "Макет в Figma",
     "Принципы UX, композиция, типографика, цвет. Прототип мобильного приложения в Figma.",
     "img/python.png",
     [("Длительность", "5 недель", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("design", "Графический дизайн", "graphic-design", Decimal("11900.00"),
     "Айдентика и брендинг",
     "Логотип, фирменный стиль, брендбук. Adobe Illustrator и Figma.",
     "img/python.png",
     [("Длительность", "5 недель", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("design", "Веб-дизайн", "web-design", Decimal("13900.00"),
     "Лендинги и сайты",
     "Дизайн лендингов, структура, сетки, работа с UI-китами.",
     "img/python.png",
     [("Длительность", "6 недель", None), ("Формат", "онлайн", None), ("Уровень", "средний", None)]),
    ("marketing", "SMM", "smm", Decimal("8900.00"),
     "Продвижение в соцсетях",
     "Контент-план, визуал, работа с аудиторией, реклама.",
     "img/python.png",
     [("Длительность", "4 недели", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("marketing", "SEO", "seo", Decimal("9900.00"),
     "Продвижение в поиске",
     "Аудит сайта, семантика, техническое SEO, ссылки.",
     "img/python.png",
     [("Длительность", "4 недели", None), ("Формат", "онлайн", None), ("Уровень", "с нуля", None)]),
    ("marketing", "Аналитика", "analytics", Decimal("10900.00"),
     "Метрика и отчёты",
     "Яндекс.Метрика, Google Analytics, дашборды, A/B-тесты.",
     "img/python.png",
     [("Длительность", "5 недель", None), ("Формат", "онлайн", None), ("Уровень", "средний", None)]),
]


def seed() -> None:
    db = SessionLocal()
    try:
        # --- Категории ---
        cat_by_alias: dict[str, Category] = {}
        for c in CATEGORIES:
            existing = db.scalar(select(Category).where(Category.alias == c["alias"]))
            if existing:
                cat_by_alias[c["alias"]] = existing
            else:
                cat = Category(name=c["name"], alias=c["alias"])
                db.add(cat)
                db.flush()
                cat_by_alias[c["alias"]] = cat
        db.commit()
        print(f"[seed] categories: {len(cat_by_alias)}")

        # --- Курсы и свойства ---
        count_created = 0
        for cat_alias, name, alias, price, short_desc, desc, img, props in COURSES:
            existing = db.scalar(select(Product).where(Product.alias == alias))
            if existing:
                continue
            product = Product(
                category_id=cat_by_alias[cat_alias].id,
                name=name,
                alias=alias,
                short_description=short_desc,
                description=desc,
                price=price,
                image=img,
                available=True,
                meta_title=name,
                meta_description=short_desc,
                meta_keywords=", ".join([name.lower(), "курс", "онлайн"]),
            )
            db.add(product)
            db.flush()
            for pname, pvalue, pprice in props:
                db.add(
                    ProductProperty(
                        product_id=product.id,
                        property_name=pname,
                        property_value=pvalue,
                        property_price=pprice,
                    )
                )
            count_created += 1
        db.commit()
        print(f"[seed] products created: {count_created}")

        # --- Админ ---
        admin_email = "admin@neyman.school"
        existing_admin = crud_user.get_by_email(db, admin_email)
        if not existing_admin:
            crud_user.create_user(
                db,
                name="Администратор",
                username="admin",
                email=admin_email,
                phone="+70000000000",
                password="admin12345",
                role="admin",
            )
            print(f"[seed] admin created: {admin_email} / admin12345")
        else:
            print(f"[seed] admin already exists: {admin_email}")

        print("[seed] done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()