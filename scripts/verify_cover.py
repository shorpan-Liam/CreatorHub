"""Check cover crop geometry and pagination in the real Chromium renderer."""
import copy
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.schemas import Brand, Layout


def main():
    payload = {
        'schemaVersion': 1, 'draftId': 'cover-regression', 'revision': 1,
        'document': {'title': '让好的表达，\n好好被看见。', 'sourceFormat': 'plain', 'sourceText': '',
                     'blocks': [{'id': 'body', 'type': 'paragraph', 'runs': [
                         {'text': '给文字一点空间，让每一个观点都清晰可见。' * 180, 'bold': False}]}]},
        'brand': Brand().model_dump(), 'layout': Layout().model_dump(), 'output': {'format': 'png'},
    }
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1080, 'height': 1920}, device_scale_factor=1)
        page.goto('http://127.0.0.1:8000/_render')
        page.wait_for_function('typeof window.renderCreatorHub === "function"')
        count = 0
        for height, top in ((1440, None), (1920, None), (1920, 360), (1920, 720)):
            for has_title in (True, False):
                for has_brand in (True, False):
                    case = copy.deepcopy(payload)
                    case['layout'].update(height=height, preset='portrait-9-16' if height == 1920 else 'portrait-3-4')
                    case['layout']['firstPagePaddingTop'] = top
                    case['brand']['showName'] = has_brand
                    if not has_title:
                        case['document']['title'] = ''
                    page.evaluate('(snapshot) => window.renderCreatorHub(snapshot)', case)
                    result = page.evaluate('window.creatorHubResult')
                    assert 'error' not in result, result
                    manifest = result['manifest']
                    assert manifest['pageCount'] > 1
                    end = 0
                    for output in manifest['pages']:
                        for part in output['fragments']:
                            assert part['startUtf16'] == end
                            end = part['endUtf16']
                    assert end == len(case['document']['blocks'][0]['runs'][0]['text'].encode('utf-16-le')) // 2
                    geometry = page.locator('[data-render-page]').evaluate_all('''pages => pages.map(p => {
                        const box = p.getBoundingClientRect();
                        const flow = p.querySelector('[data-flow]');
                        const first = p.querySelector('header') || flow;
                        const heading = p.querySelector('h1');
                        return {top: first.getBoundingClientRect().top - box.top,
                            titleBottom: heading ? heading.getBoundingClientRect().bottom - box.top : null,
                            fits: [...flow.children].every(c => c.getBoundingClientRect().bottom <= flow.getBoundingClientRect().bottom + .25),
                            width: box.width, height: box.height};
                    })''')
                    inset = 0 if top is None else top - 72
                    assert geometry[0]['top'] == 72 + inset, geometry
                    assert all(g['top'] == 72 for g in geometry[1:]), geometry
                    assert all(g['fits'] and g['width'] == 1080 and g['height'] == height for g in geometry)
                    if has_title:
                        assert geometry[0]['titleBottom'] < height - 72
                    if height == 1920 and top == 360 and has_title and has_brand:
                        output = ROOT / 'storage/cover-verification'
                        output.mkdir(parents=True, exist_ok=True)
                        page.locator('[data-render-page]').first.screenshot(path=str(output / 'cover.png'))
                        box = page.locator('[data-render-page]').first.bounding_box()
                        page.screenshot(path=str(output / 'feed-card.png'), clip={
                            'x': box['x'], 'y': box['y'] + 240, 'width': 1080, 'height': 1440})
                    count += 1
        browser.close()
        print(json.dumps({'cases': count, 'status': 'passed', 'automaticInset': 0}))


if __name__ == '__main__':
    main()
