from app.worker import browser_failure


def test_browser_errors_distinguish_missing_installation_and_local_page_failure():
    missing = browser_failure(Exception("Executable doesn't exist at C:/private/path"), 'launching')
    assert missing[0] == 'BROWSER_NOT_INSTALLED'
    assert 'C:/private/path' not in missing[1]
    assert browser_failure(Exception('net::ERR_PROXY_CONNECTION_FAILED'), 'loading')[0] == 'RENDER_PAGE_UNAVAILABLE'
    assert browser_failure(Exception('Target closed'), 'launching')[0] == 'BROWSER_START_FAILED'
    assert browser_failure(Exception('Screenshot timed out'), 'rendering')[0] == 'BROWSER_RENDER_FAILED'
