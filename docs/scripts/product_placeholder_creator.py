import json
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
INGREDIENTS_PATH = BASE_DIR / "true_final_ingredients.json"
PRODUCTS_PATH = BASE_DIR / "products.JSON"


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
        file.write("\n")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"\(([^)]+)\)", r" \1 ", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    value = re.sub(r"-{2,}", "-", value)
    return value


def build_placeholder_product(name: str) -> dict:
    return {
        "id": slugify(name),
        "name": name,
        "description": "PLACEHOLDER",
        "price": 0,
        "available": False,
        "weight": 0,
        "unit": "PLACEHOLDER",
        "category": "other",
        "sameDayDelivery": False,
        "special": False,
        "mealdbIngredient": "PLACEHOLDER",
        "tags": [],
        "img": "",
    }


def main() -> None:
    ingredients = read_json(INGREDIENTS_PATH)
    products = read_json(PRODUCTS_PATH)

    if not isinstance(ingredients, list):
        raise ValueError("Expected true_final_ingredients.json to be an array of strings.")

    if not isinstance(products, list):
        raise ValueError("Expected products.JSON to be an array of product objects.")

    existing_ids = {str(product.get("id", "")).strip().lower() for product in products}
    added = 0

    for raw_name in ingredients:
        name = str(raw_name).strip()
        if not name:
            continue

        product_id = slugify(name)
        if not product_id or product_id in existing_ids:
            continue

        products.append(build_placeholder_product(name))
        existing_ids.add(product_id)
        added += 1

    write_json(PRODUCTS_PATH, products)
    print(f"Added {added} new products from true_final_ingredients.json.")


if __name__ == "__main__":
    main()