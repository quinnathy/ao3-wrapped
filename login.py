import asyncio
from playwright.async_api import async_playwright

USERNAME = "placeholder"

async def login_to_ao3():
    async with async_playwright() as p:

        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context()

        page = await context.new_page()
        await page.goto("https://archiveofourown.org/users/login")

        print("Please log in manually in the opened browser window.")
        print("Once logged in, return here and press ENTER.")
        input()

        await context.storage_state(path="ao3_session.json")
        print("Session saved to ao3_session.json")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(login_to_ao3())