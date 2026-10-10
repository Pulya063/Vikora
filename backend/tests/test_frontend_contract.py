"""Validate JSON built by the actual TypeScript form helper, not a copied payload."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest
from app.schemas import QuoteRequest


def test_real_frontend_json_validates():
    node = shutil.which('node')
    frontend = Path(__file__).resolve().parents[2] / 'frontend'
    if not node or not (frontend / 'node_modules/typescript').exists():
        pytest.skip('Install frontend dependencies and Node to run the cross-language contract test')
    output = subprocess.run([node, str(frontend/'tests/quote-contract.cjs'), '--json'],
        check=True, capture_output=True, encoding='utf-8', timeout=20)
    consultation, calculator = [QuoteRequest.model_validate(payload) for payload in json.loads(output.stdout)]
    assert consultation.phone == '+380671234567'
    assert consultation.configuration is None
    assert calculator.configuration.dimensions.width_mm == 1400
    assert calculator.needs_delivery is True
    assert calculator.needs_installation is False
