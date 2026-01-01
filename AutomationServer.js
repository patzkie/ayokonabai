const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

let browser;

// 🔹 Start Puppeteer ONCE
(async () => {
    browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ],
    });
    console.log("✅ Puppeteer browser started");
})();

app.post('/run', async (req, res) => {
    const { origin, destination } = req.body;
    let routeRows = [];
    let page;

    try {
        console.log("Received:", origin, destination);

        page = await browser.newPage();

        await page.goto("https://toll.ph/", {
            waitUntil: "networkidle2",
            timeout: 0
        });

        // ORIGIN
        await page.type('input[placeholder="Enter point of origin"]', origin);
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");

        // DESTINATION
        await page.type('input[placeholder="Enter point of destination"]', destination);
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");

        // CALCULATE
        await page.click('text/Calculate');
        await page.click('text/Calculate');

        // RESULT
        await page.waitForSelector(".text-5xl.font-extrabold.tracking-tight.text-slate-900");

        const toll = await page.$eval(
            ".text-5xl.font-extrabold.tracking-tight.text-slate-900",
            el => el.textContent.trim()
        );

        // ROUTES
        routeRows = await page.evaluate(() => {
            const rows = document.querySelectorAll('div.flex.flex-row.justify-between');
            return Array.from(rows).map(row => {
                const p = row.querySelectorAll('p');
                return {
                    expressway: p[0]?.textContent?.trim() || "",
                    from: p[1]?.textContent?.trim() || "",
                    arrow: p[2]?.textContent?.trim() || "",
                    to: p[3]?.textContent?.trim() || "",
                    price: row.querySelector('p.text-right')?.textContent?.trim() || "",
                    rfid: row.querySelector('button div')?.textContent?.trim() || ""
                };
            });
        });

        return res.json({ toll, routeRows });

    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    } finally {
        if (page) await page.close(); // ✅ CLOSE PAGE ONLY
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
