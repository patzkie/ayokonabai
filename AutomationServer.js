const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const delay = ms => new Promise(res => setTimeout(res, ms));

app.post('/run', async (req, res) => {
    const { origin, destination } = req.body;
    let routeRows = [];
    console.log("Received:", origin, destination);

    const browser = await puppeteer.launch({
        headless: "new", // or true
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ],
        defaultViewport: null,
    });

    const page = await browser.newPage();

    try {
        await page.goto("https://toll.ph/", { waitUntil: "networkidle2", timeout: 0 });

        // ▢ ORIGIN INPUT
        try {
            await page.type('input[placeholder="Enter point of origin"]', origin);
            //   await delay(300);
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Enter");
        } catch {
            throw new Error("Invalid or unrecognized origin.");
        }

        // ▢ DESTINATION INPUT
        try {
            await page.type('input[placeholder="Enter point of destination"]', destination);
            // await delay(300);
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Enter");
        } catch {
            throw new Error("Invalid or unrecognized destination.");
        }

        //  await delay(500);

        // ▢ CALCULATE
        try {
            await page.click('text/Calculate');
            await page.click('text/Calculate');
        } catch {
            throw new Error("Failed to click calculate button.");
        }

        // ▢ RESULT
        let toll;
        try {
            await page.waitForSelector(".text-5xl.font-extrabold.tracking-tight.text-slate-900");

            toll = await page.$eval(
                ".text-5xl.font-extrabold.tracking-tight.text-slate-900",
                el => el.textContent.trim()
            );
        } catch {
            throw new Error("Toll result did not appear. Route may be invalid.");
        }

        try {
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
        } catch (err) {
            console.log("Failed to scrape route rows:", err);
        }

        console.log("Toll Fee:", toll);
        return res.json({ toll, routeRows });

    } catch (error) {
        return res.status(400).json({ error: error.message });
    } finally {
        await browser.close();
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

