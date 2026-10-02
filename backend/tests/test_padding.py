import pytest
from pydantic import ValidationError
from app.schemas import Layout


def test_old_layout_and_manual_margin_bounds():
    assert Layout().firstPagePaddingTop is None
    assert Layout(paddingX=320, paddingY=480, firstPagePaddingTop=720).firstPagePaddingTop == 720
    assert Layout(paddingX=0, paddingY=0, firstPagePaddingTop=0).paddingY == 0
    for patch in ({'paddingX': 321}, {'paddingY': 481}, {'firstPagePaddingTop': 721}, {'paddingY': -1}):
        with pytest.raises(ValidationError):
            Layout(**patch)
