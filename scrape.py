from playwright.async_api import async_playwright
import asyncio

async with async_playwright() as p:
    browser = await p.chromium.launch(headless=False)
    context = await browser.new_context(storage_state="ao3_session.json")
    page = await context.new_page()

    await page.goto("https://archiveofourown.org")

    await browser.close()


asyncio.run(start_browser_with_session())
