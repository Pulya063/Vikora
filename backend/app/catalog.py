"""Supplier facts separated from display components. Prices are deliberately mock."""
import json
from functools import lru_cache
from pathlib import Path

CONFIG_DIR = Path(__file__).parent / 'config'

@lru_cache(maxsize=8)
def config(name):
    return json.loads((CONFIG_DIR / f'{name}.json').read_text(encoding='utf-8'))

class ProductService:
    @staticmethod
    def all():
        return config('products')

    @staticmethod
    def get(product_id):
        return next((p for p in ProductService.all() if p['id'] == product_id), None)

    @staticmethod
    def options(product_id):
        product = ProductService.get(product_id)
        if not product:
            raise ValueError('Виріб не знайдено')
        return product['compatibleOptions']
